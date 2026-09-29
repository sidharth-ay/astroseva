"""Astrologer onboarding: status transitions and derived accuracy scoring.

The status is a single string on `astrologers`, but it is not a free-for-all.
:data:`LEGAL_TRANSITIONS` is the whole state machine, and every move is written
to `onboarding_events` with the actor and the from/to status. That audit trail is
the compliance backbone -- it is what lets you answer "who approved this
application, when, and on what grounds" after the fact.

Flow
----
    draft -> applied -> under_review -> assessment_pending -> mock_pending
                                                      -> verified | probation
                                                      -> rejected

A ``probation`` astrologer may practise, exactly like ``verified``; the
difference is that the approval carried conditions and ``probation_until`` is
set.

This phase is deliberately *not* identity verification. Identity documents are
self-declared and approved by eye. That is recorded honestly in
``astrologer_documents.identity_status`` rather than presented as KYC.
"""

import re
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from ..db.models import (
    PRACTISING_STATUSES,
    STATUS_APPLIED,
    STATUS_ASSESSMENT_PENDING,
    STATUS_DRAFT,
    STATUS_MOCK_PENDING,
    STATUS_PROBATION,
    STATUS_REJECTED,
    STATUS_SUSPENDED,
    STATUS_UNDER_REVIEW,
    STATUS_VERIFIED,
    Astrologer,
    OnboardingEvent,
)

# from_status -> {to_status, ...}
LEGAL_TRANSITIONS: dict[str, set[str]] = {
    STATUS_DRAFT: {STATUS_APPLIED, STATUS_REJECTED},
    STATUS_APPLIED: {STATUS_UNDER_REVIEW, STATUS_REJECTED, STATUS_DRAFT},
    STATUS_UNDER_REVIEW: {
        STATUS_ASSESSMENT_PENDING, STATUS_REJECTED, STATUS_APPLIED,
    },
    STATUS_ASSESSMENT_PENDING: {STATUS_MOCK_PENDING, STATUS_REJECTED},
    STATUS_MOCK_PENDING: {
        STATUS_VERIFIED, STATUS_PROBATION, STATUS_REJECTED,
    },
    STATUS_VERIFIED: {STATUS_SUSPENDED, STATUS_PROBATION},
    STATUS_PROBATION: {STATUS_VERIFIED, STATUS_SUSPENDED},
    STATUS_REJECTED: {STATUS_DRAFT},
    STATUS_SUSPENDED: {STATUS_UNDER_REVIEW, STATUS_REJECTED},
}

# Mock consultation scores are each 1-5; the scale is shared.
MOCK_SCORE_MIN, MOCK_SCORE_MAX = 1, 5

# Document kinds. The identity set is self-declared in this phase, not verified.
IDENTITY_DOC_KINDS = ("aadhaar", "pan", "address_proof")
CREDENTIAL_DOC_KINDS = (
    "degree_certificate", "professional_cert", "experience_letter", "other",
)
DOC_KINDS = IDENTITY_DOC_KINDS + CREDENTIAL_DOC_KINDS


class TransitionError(Exception):
    """An illegal status move, or a move missing required evidence."""


def slugify(name: str, fallback_id: int) -> str:
    """URL-safe slug from a display name, with the id as a uniqueness suffix."""
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return f"{base or 'astrologer'}-{fallback_id}"


def get_or_create_profile(db: Session, user) -> Astrologer:
    """The caller's astrologer profile, created as a draft on first use."""
    profile = db.query(Astrologer).filter(Astrologer.user_id == user.id).first()
    if profile is not None:
        return profile
    profile = Astrologer(user_id=user.id, slug=slugify(user.name, user.id))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    record_event(db, profile, "profile_created", None, STATUS_DRAFT, user.id, {})
    return profile


def can_transition(current: str, target: str) -> bool:
    return target in LEGAL_TRANSITIONS.get(current, set())


def record_event(
    db: Session,
    profile: Astrologer,
    event_type: str,
    from_status: str | None,
    to_status: str | None,
    actor_user_id: int | None,
    payload: dict | None = None,
) -> OnboardingEvent:
    """Append to the audit trail. Never mutates the profile itself."""
    event = OnboardingEvent(
        astrologer_id=profile.id,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        actor_user_id=actor_user_id,
        payload=payload or {},
    )
    db.add(event)
    return event


def apply_status(
    db: Session,
    profile: Astrologer,
    target: str,
    actor_user_id: int | None,
    payload: dict | None = None,
    rejection_reason: str | None = None,
    probation_until: date | None = None,
) -> Astrologer:
    """Move the profile to `target`, refusing illegal moves.

    Commit is the caller's job so a rejected transition cannot leave a half
    applied audit row behind.
    """
    current = profile.status
    if not can_transition(current, target):
        raise TransitionError(f"Cannot move an astrologer from {current} to {target}")

    profile.status = target
    now = datetime.now(timezone.utc)
    if target in (STATUS_VERIFIED, STATUS_PROBATION):
        profile.verified_at = now
        profile.rejection_reason = None
    if target == STATUS_PROBATION:
        profile.probation_until = probation_until
    if target == STATUS_REJECTED:
        profile.rejection_reason = rejection_reason or "Not stated by reviewer"
    if target in (STATUS_UNDER_REVIEW, STATUS_VERIFIED, STATUS_PROBATION, STATUS_REJECTED):
        profile.reviewed_at = now
        profile.reviewed_by = actor_user_id

    record_event(db, profile, "status_changed", current, target, actor_user_id, payload or {})
    return profile


def assert_can_submit(db: Session, profile: Astrologer) -> None:
    """Guard the draft -> applied move: an application needs substance."""
    from ..db.models import AstrologerDocument

    if not profile.headline.strip():
        raise TransitionError("Add a headline before applying")
    if not profile.bio.strip():
        raise TransitionError("Add a biography before applying")
    if not profile.languages:
        raise TransitionError("Select at least one language")
    if not profile.specialties:
        raise TransitionError("Select at least one speciality")
    if profile.experience_years < 0:
        raise TransitionError("Experience cannot be negative")

    identity = db.query(AstrologerDocument).filter(
        AstrologerDocument.astrologer_id == profile.id,
        AstrologerDocument.kind.in_(IDENTITY_DOC_KINDS),
    ).count()
    if not identity:
        raise TransitionError(
            "Upload at least one identity document: " + ", ".join(IDENTITY_DOC_KINDS)
        )

    credential = db.query(AstrologerDocument).filter(
        AstrologerDocument.astrologer_id == profile.id,
        AstrologerDocument.kind.in_(CREDENTIAL_DOC_KINDS),
    ).count()
    if not credential:
        raise TransitionError(
            "Upload at least one credential: " + ", ".join(CREDENTIAL_DOC_KINDS)
        )


def recompute_accuracy(db: Session, profile: Astrologer) -> dict:
    """Derive the public accuracy figures. Returns them for the caller to use.

    Two components, both explainable rather than arbitrary:
      * assessment pass rate -- share of written attempts that passed
      * mock consultation average -- mean of the four reviewer scores (1-5)

    These are combined into a 0-10 scale. It is intentionally simple and
    documented rather than a weighted black box, so a profile can show its
    working.
    """
    from ..db.models import AstrologerAssessment, AstrologerMockConsult

    attempts = db.query(AstrologerAssessment).filter(
        AstrologerAssessment.astrologer_id == profile.id
    ).all()
    mocks = db.query(AstrologerMockConsult).filter(
        AstrologerMockConsult.astrologer_id == profile.id
    ).all()

    total = len(attempts)
    passed = sum(1 for a in attempts if a.passed)
    pass_rate = (passed / total) if total else 0.0

    if mocks:
        scores = []
        for m in mocks:
            for field in ("score_accuracy", "score_clarity", "score_empathy", "score_structure"):
                scores.append(getattr(m, field))
        scored = [s for s in scores if MOCK_SCORE_MIN <= s <= MOCK_SCORE_MAX]
        mock_average = (sum(scored) / len(scored)) if scored else 0.0
    else:
        mock_average = 0.0

    # Each component contributes up to 5.0.
    score = (pass_rate * 5.0) + ((mock_average / MOCK_SCORE_MAX) * 5.0)
    score = round(score, 2)

    profile.total_assessments = total
    profile.assessment_pass_rate = round(pass_rate * 100, 2)
    profile.mock_consultation_count = len(mocks)
    profile.accuracy_score = score
    profile.score_computed_at = datetime.now(timezone.utc)

    return {
        "accuracy_score": score,
        "scale": "0-10",
        "assessment_pass_rate": round(pass_rate * 100, 2),
        "total_assessments": total,
        "assessments_passed": passed,
        "mock_consultations": len(mocks),
        "mock_average_score": round(mock_average, 2),
        "components": {
            "assessment": round(pass_rate * 5.0, 2),
            "mock_consultation": round((mock_average / MOCK_SCORE_MAX) * 5.0, 2),
        },
    }


def is_practising(profile: Astrologer) -> bool:
    return profile.status in PRACTISING_STATUSES


def next_step_for(profile: Astrologer, *, has_documents: bool, has_assessment: bool) -> str:
    """Plain-language next step, so the practitioner dashboard needs no rules."""
    if profile.status == STATUS_DRAFT:
        return "Complete your profile and submit the application"
    if profile.status == STATUS_APPLIED:
        return "Waiting for a reviewer to pick up your application"
    if profile.status == STATUS_UNDER_REVIEW:
        return "A reviewer is checking your documents"
    if profile.status == STATUS_ASSESSMENT_PENDING:
        return "Take the written assessment"
    if profile.status == STATUS_MOCK_PENDING:
        return "Schedule your mock consultation"
    if profile.status == STATUS_REJECTED:
        return "Application rejected - you may edit and resubmit"
    if profile.status == STATUS_SUSPENDED:
        return "Account suspended - contact support"
    if profile.status == STATUS_PROBATION:
        return f"Serving probationary period until {profile.probation_until}"
    if profile.status == STATUS_VERIFIED:
        if not has_assessment:
            return "Verified - complete your written assessment to raise your score"
        if not has_documents:
            return "Verified - upload supporting credentials to raise your score"
        return "Verified and available to clients"
    return ""
