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
from datetime import datetime, timezone
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
