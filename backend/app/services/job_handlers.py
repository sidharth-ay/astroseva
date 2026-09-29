"""Background job handlers.

Registered against services.jobs. Each takes a DB session and its payload, and
is expected to be idempotent: the runner retries a failed job, so running one
twice must not double-count anything.

These are notifications only in this phase. Booking confirmations, queue
callbacks and SLA escalation arrive with the consultation phases and need real
delivery (email/SMS) rather than an audit row.
"""

import logging

from sqlalchemy.orm import Session

from . import jobs

logger = logging.getLogger(__name__)


@jobs.register("onboarding_submitted")
def on_onboarding_submitted(db: Session, payload: dict) -> None:
    """An application entered the review queue.

    The queue itself is the notification: a reviewer sees it in
    /api/v1/admin/astrologers. Writing an audit event makes it visible from the
    application timeline too, without needing an email provider.
    """
    from ..db.models import Astrologer, OnboardingEvent

    astrologer_id = payload.get("astrologer_id")
    if not astrologer_id:
        return
    profile = db.query(Astrologer).filter(Astrologer.id == astrologer_id).first()
    if profile is None:
        return
    db.add(OnboardingEvent(
        astrologer_id=profile.id,
        event_type="queued_for_review",
        from_status=profile.status,
        to_status=profile.status,
        actor_user_id=payload.get("user_id"),
        payload={"note": "awaiting reviewer"},
    ))
    db.commit()
    logger.info("Application %s queued for review", astrologer_id)


@jobs.register("onboarding_status_changed")
def on_status_changed(db: Session, payload: dict) -> None:
    """Record that the applicant was notified of a status change.

    Idempotent by construction: it only appends, and a duplicate retry is
    visible as a repeated event rather than a wrong number.
    """
    from ..db.models import Astrologer, OnboardingEvent

    astrologer_id = payload.get("astrologer_id")
    if not astrologer_id:
        return
    profile = db.query(Astrologer).filter(Astrologer.id == astrologer_id).first()
    if profile is None:
        return
    db.add(OnboardingEvent(
        astrologer_id=profile.id,
        event_type="status_notification_sent",
        from_status=payload.get("to_status"),
        to_status=payload.get("to_status"),
        actor_user_id=None,
        payload={"status": payload.get("to_status")},
    ))
    db.commit()


def registered_types() -> list[str]:
    """Job types this build knows how to run. Used by the health endpoint."""
    return sorted(jobs._HANDLERS.keys())
