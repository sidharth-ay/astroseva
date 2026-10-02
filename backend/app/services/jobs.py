"""A minimal in-process background job runner.

Scope is deliberate. This exists so the marketplace can fire-and-forget a
notification or a score recompute without blocking the request. It is NOT a
durable queue: jobs live in the request process and a restart drops anything
still pending.

Why not Celery/RQ now: Redis is not actually running in the dev environment
(its connection is refused on every request), so a Redis-brokered queue would
fail on first use. When queueing, callback and SLA tracking land in a later
phase, those need real durability and should move to a proper worker -- at which
point this module becomes the seam to swap.

Every attempt is recorded in `job_runs` so a failure is visible rather than
silently lost, which is the main thing a fire-and-forget runner usually gets
wrong.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy.orm import Session

from ..db.database import SessionLocal
from ..db.models import JobRun

logger = logging.getLogger(__name__)

# Registry of job_type -> handler. Handlers take a fresh DB session and payload.
_HANDLERS: dict[str, Callable[[Session, dict], None]] = {}

MAX_ATTEMPTS = 3

# How long a job may run before it is abandoned, so one bad handler cannot pin
# a worker coroutine forever.
JOB_TIMEOUT_SECONDS = 30


def register(job_type: str):
    """Decorator to register a handler for `job_type`."""

    def wrap(fn):
        _HANDLERS[job_type] = fn
        return fn

    return wrap


def enqueue(db: Session, job_type: str, payload: dict | None = None) -> int:
    """Record a job and schedule it. Returns the job_runs id.

    Scheduling is best-effort: if the loop is not running (a background thread,
    a test) the row stays pending and can be swept later, which is preferable to
    losing the record.
    """
    if job_type not in _HANDLERS:
        raise KeyError(f"No handler registered for job type {job_type!r}")
    run = JobRun(job_type=job_type, payload=payload or {}, status="pending")
    db.add(run)
    db.commit()
    try:
        asyncio.get_running_loop().create_task(_execute(run.id, job_type, payload or {}))
    except RuntimeError:
        logger.info("No running loop; job %s (%s) left pending", run.id, job_type)
    return run.id


async def _execute(job_id: int, job_type: str, payload: dict) -> None:
    """Run a job with retries, recording the outcome in job_runs."""
    handler = _HANDLERS[job_type]
    db = SessionLocal()
    try:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            job = db.query(JobRun).filter(JobRun.id == job_id).first()
            if job is None:
                return
            job.status = "running"
            job.attempts = attempt
            db.commit()
            try:
                await asyncio.wait_for(
                    asyncio.to_thread(handler, db, payload), timeout=JOB_TIMEOUT_SECONDS
                )
                job.status = "succeeded"
                job.last_error = None
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
                return
            except Exception as e:  # noqa: BLE001 - recorded, not swallowed
                logger.warning("Job %s (%s) attempt %s failed: %s", job_id, job_type, attempt, e)
                job.last_error = f"{type(e).__name__}: {e}"[:2000]
                db.commit()
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if job is not None:
            job.status = "failed"
            db.commit()
    except Exception:
        logger.exception("Job %s (%s) aborted", job_id, job_type)
    finally:
        db.close()


def pending_count(db: Session) -> int:
    """Jobs that never ran because no event loop was available. Sweepable."""
    return db.query(JobRun).filter(JobRun.status == "pending").count()


def run_now(job_id: int) -> bool:
    """Execute a pending job synchronously. Used by tests and the sweep path."""
    db = SessionLocal()
    try:
        job = db.query(JobRun).filter(JobRun.id == job_id).first()
        if job is None or job.job_type not in _HANDLERS:
            return False
        job.status = "running"
        job.attempts += 1
        db.commit()
        try:
            _HANDLERS[job.job_type](db, job.payload or {})
            job.status = "succeeded"
        except Exception as e:  # noqa: BLE001
            job.status = "failed"
            job.last_error = f"{type(e).__name__}: {e}"[:2000]
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        return True
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Recovery
#
# `enqueue` schedules the work as an asyncio task on the request's event loop.
# That works, but it is not durable in two ways, and both were reachable in
# production code:
#
#  * a task is lost if the process restarts before it runs, and
#  * a row stays `running` forever if the process dies *inside* the handler.
#
# The module docstring already claimed the row "can be swept later", and
# `pending_count`/`run_now` existed for exactly that -- but nothing ever called
# them, so `onboarding_submitted` and `onboarding_status_changed` could be lost
# silently with no way to find out. The functions below are that missing caller.
# ---------------------------------------------------------------------------

# A `running` row older than this cannot still be running: the handler is
# abandoned after JOB_TIMEOUT_SECONDS, so twice that is generous.
STALE_RUNNING_SECONDS = JOB_TIMEOUT_SECONDS * 2

# How often the background sweep runs.
SWEEP_INTERVAL_SECONDS = int(os.getenv("JOB_SWEEP_INTERVAL_SECONDS", "60"))

# How many pending jobs one sweep will run, so a large backlog cannot starve the
# event loop in a single pass.
SWEEP_BATCH = int(os.getenv("JOB_SWEEP_BATCH", "25"))


def reclaim_stale(db: Session) -> int:
    """Return rows stuck in `running` to `pending` and report how many.

    Without this a crash mid-handler leaves a row that no sweep will ever
    collect, because a sweep looks for `pending`. The attempts counter is kept so
    a job that reliably kills the worker still converges on `failed` rather than
    looping forever.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=STALE_RUNNING_SECONDS)
    stale = (
        db.query(JobRun)
        .filter(JobRun.status == "running", JobRun.run_at < cutoff)
        .all()
    )
    for job in stale:
        job.status = "failed" if job.attempts >= MAX_ATTEMPTS else "pending"
        if job.status == "failed":
            job.last_error = "abandoned: worker stopped while the job was running"
            job.finished_at = datetime.now(timezone.utc)
    if stale:
        db.commit()
        logger.warning("Reclaimed %s stale job(s) left running by a restart", len(stale))
    return len(stale)


async def sweep_pending(limit: int = SWEEP_BATCH) -> int:
    """Run jobs that are pending but were never scheduled. Returns the count.

    Called on startup and then on an interval. Handlers run in a thread so a
    slow one cannot stall the API's event loop -- which is the same defect that
    made the whole application feel frozen during a festival scan.
    """
    db = SessionLocal()
    try:
        reclaim_stale(db)
        pending = (
            db.query(JobRun)
            .filter(JobRun.status == "pending")
            .order_by(JobRun.id)
            .limit(limit)
            .all()
        )
        ids = [job.id for job in pending]
    finally:
        db.close()

    if not ids:
        return 0

    executed = 0
    for job_id in ids:
        try:
            if await asyncio.to_thread(run_now, job_id):
                executed += 1
        except Exception:  # noqa: BLE001
            # One bad job must not stop the rest of the batch.
            logger.exception("Job sweep failed on job %s", job_id)
    logger.info("Job sweep ran %s of %s pending job(s)", executed, len(ids))
    return executed


async def sweep_forever(stop: asyncio.Event, interval: float = SWEEP_INTERVAL_SECONDS) -> None:
    """Run `sweep_pending` until `stop` is set."""
    while not stop.is_set():
        try:
            # Waiting on the event rather than sleeping means shutdown is prompt
            # instead of blocked until the next tick.
            await asyncio.wait_for(stop.wait(), timeout=interval)
            return  # stop was set
        except asyncio.TimeoutError:
            pass
        try:
            await sweep_pending()
        except Exception:  # noqa: BLE001
            logger.exception("Job sweep pass failed")
