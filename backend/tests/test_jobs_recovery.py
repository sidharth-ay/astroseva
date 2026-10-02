"""Durable job execution, testing the recovery path.

The fire-and-forget runner leaves rows `pending` if the process restarts before
they run, or `running` if it dies while handling them. Without a sweep, a
marketplace onboarding status change is lost forever.
"""
import asyncio
from datetime import datetime, timedelta, UTC

import pytest
from sqlalchemy.orm import Session

from app.db.models import JobRun
from app.services import jobs


@pytest.fixture(autouse=True)
def clean_jobs(db_session: Session, monkeypatch):
    """The tests here count runs, so the table must be empty."""
    import app.services.jobs as jobs_mod

    # Bind the background worker to the isolated test database.
    monkeypatch.setattr(jobs_mod, "SessionLocal", lambda: db_session)

    db_session.query(JobRun).delete()
    db_session.commit()
    # Also unregister test handlers.
    old = dict(jobs._HANDLERS)
    yield
    jobs._HANDLERS.clear()
    jobs._HANDLERS.update(old)
    db_session.query(JobRun).delete()
    db_session.commit()


def test_sweep_collects_a_job_that_was_never_scheduled(db_session: Session):
    executed = []

    @jobs.register("test_pending")
    def _handle(db, payload):
        executed.append(payload["msg"])

    # Simulate a crash before the task could start.
    db_session.add(JobRun(job_type="test_pending", payload={"msg": "first"}, status="pending"))
    db_session.add(JobRun(job_type="test_pending", payload={"msg": "second"}, status="pending"))
    db_session.commit()

    count = asyncio.run(jobs.sweep_pending(limit=5))
    assert count == 2
    assert set(executed) == {"first", "second"}

    # They do not run twice.
    assert asyncio.run(jobs.sweep_pending(limit=5)) == 0


def test_reclaim_resets_a_stale_running_row(db_session: Session):
    """A process dying mid-handler leaves the row 'running' forever."""

    @jobs.register("test_stale")
    def _handle(db, payload):
        pass

    now = datetime.now(UTC)
    old = now - timedelta(seconds=jobs.STALE_RUNNING_SECONDS + 5)
    fresh = now - timedelta(seconds=jobs.STALE_RUNNING_SECONDS - 5)

    # 1. Stuck for an hour -> recovered.
    db_session.add(JobRun(job_type="test_stale", status="running", run_at=old, attempts=1))
    # 2. Just started -> left alone, another worker is presumably handling it.
    db_session.add(JobRun(job_type="test_stale", status="running", run_at=fresh, attempts=1))
    db_session.commit()

    reclaimed = jobs.reclaim_stale(db_session)
    assert reclaimed == 1

    # The old row is back to pending and will be picked up by the next sweep.
    old_row = db_session.query(JobRun).filter(JobRun.run_at == old).one()
    assert old_row.status == "pending"

    fresh_row = db_session.query(JobRun).filter(JobRun.run_at == fresh).one()
    assert fresh_row.status == "running"


def test_a_poison_job_is_abandoned_rather_than_reclaimed_forever(db_session: Session):
    """If a job reliably kills the worker, recovering it is a death loop."""

    @jobs.register("test_poison")
    def _handle(db, payload):
        pass

    old = datetime.now(UTC) - timedelta(seconds=jobs.STALE_RUNNING_SECONDS + 5)

    # It has already exhausted its retries.
    db_session.add(JobRun(
        job_type="test_poison", status="running", run_at=old, attempts=jobs.MAX_ATTEMPTS
    ))
    db_session.commit()

    reclaimed = jobs.reclaim_stale(db_session)
    assert reclaimed == 1

    # It was closed rather than re-queued.
    row = db_session.query(JobRun).first()
    assert row.status == "failed"
    assert "abandoned" in row.last_error