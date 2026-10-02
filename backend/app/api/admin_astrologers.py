"""Reviewer API: work the onboarding queue.

Every route requires reviewer or admin rights via `require_reviewer`. The whole
surface is deliberately driven by the status field rather than by separate
queues, so an application can only be in one place at a time and there is no way
to skip a stage.
"""

from datetime import date, datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.rate_limit import limiter
from ..db.database import get_db
from ..db.models import (
    STATUS_DRAFT,
    STATUS_MOCK_PENDING,
    STATUS_SUSPENDED,
    Astrologer,
    AstrologerAssessment,
    AstrologerDocument,
    AstrologerMockConsult,
    OnboardingEvent,
    User,
)
from ..services import astrologer_service as svc
from ..services import jobs
from ..services.auth_service import require_reviewer
from ..services.storage_service import StorageError, open_file

router = APIRouter(prefix="/api/v1/admin/astrologers", tags=["admin-astrologers"])


class StatusChange(BaseModel):
    to_status: str
    rejection_reason: str | None = Field(default=None, max_length=2000)
    probation_days: int | None = Field(default=None, ge=1, le=365)


class DocumentReview(BaseModel):
    identity_status: str = Field(description="admin_verified | rejected")
    reviewer_note: str | None = Field(default=None, max_length=2000)


class MockConsultIn(BaseModel):
    scenario: str = Field(min_length=10, max_length=5000)
    response: str = Field(min_length=10, max_length=20000)
    score_accuracy: int = Field(ge=1, le=5)
    score_clarity: int = Field(ge=1, le=5)
    score_empathy: int = Field(ge=1, le=5)
    score_structure: int = Field(ge=1, le=5)
    verdict: str = Field(description="pass | conditional | fail")
    notes: str | None = Field(default=None, max_length=5000)


def _serialise_admin(profile: Astrologer, docs, mocks, events, attempts=()) -> dict:
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "slug": profile.slug,
        "headline": profile.headline,
        "bio": profile.bio,
        "experience_years": profile.experience_years,
        "languages": profile.languages or [],
        "specialties": profile.specialties or [],
        "location": profile.location,
        "status": profile.status,
        "rejection_reason": profile.rejection_reason,
        "probation_until": profile.probation_until.isoformat() if profile.probation_until else None,
        "accuracy": {
            "score": profile.accuracy_score,
            "scale": "0-10",
            "assessment_pass_rate": profile.assessment_pass_rate,
            "total_assessments": profile.total_assessments,
            "mock_consultations": profile.mock_consultation_count,
        },
        "documents": [
            {"id": d.id, "kind": d.kind, "identity_status": d.identity_status,
             "original_filename": d.original_filename, "size_bytes": d.size_bytes,
             "uploaded_at": str(d.uploaded_at), "reviewer_note": d.reviewer_note,
             "reviewed_at": str(d.reviewed_at) if d.reviewed_at else None}
            for d in docs
        ],
        "mock_consultations": [
            {"id": m.id, "verdict": m.verdict, "scores": {
                "accuracy": m.score_accuracy, "clarity": m.score_clarity,
                "empathy": m.score_empathy, "structure": m.score_structure},
             "notes": m.notes, "evaluated_at": str(m.evaluated_at)}
            for m in mocks
        ],
        # Attempts are included so a reviewer can see the score, and override it
        # when auto-grading was unfair. Without the attempt id the override
        # endpoint was unreachable from any client.
        #
        # `answers` and `questions_snapshot` are deliberately NOT sent: the key
        # lives in the snapshot, so including either would leak the answers.
        "assessments": [
            {"id": a.id, "attempt_no": a.attempt_no, "score": a.score,
             "max_score": a.max_score, "passed": a.passed, "pass_mark": a.pass_mark,
             "overridden_by": a.overridden_by, "override_note": a.override_note,
             "submitted_at": str(a.submitted_at)}
            for a in attempts
        ],
        "events": [
            {"id": e.id, "event_type": e.event_type, "from_status": e.from_status,
             "to_status": e.to_status, "actor_user_id": e.actor_user_id,
             "created_at": str(e.created_at)}
            for e in events
        ],
    }


@router.get("")
@limiter.limit("60/minute")
async def list_applications(
    request: Request,
    status: str | None = None,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """The onboarding queue, oldest first within a status.

    Drafts are excluded. A draft means someone opened the form and did not
    finish, which is not a submission and there is nothing for a reviewer to
    decide. Including them buried the real queue under empty rows. A draft can
    still be inspected by id, and it enters the queue the moment it is
    submitted (`draft -> applied`).
    """
    q = db.query(Astrologer).filter(Astrologer.status != STATUS_DRAFT)
    if status:
        q = q.filter(Astrologer.status == status)
    rows = q.order_by(Astrologer.created_at.asc()).all()

    out = []
    for p in rows:
        docs = db.query(AstrologerDocument).filter(
            AstrologerDocument.astrologer_id == p.id).all()
        mocks = db.query(AstrologerMockConsult).filter(
            AstrologerMockConsult.astrologer_id == p.id).all()
        events = db.query(OnboardingEvent).filter(
            OnboardingEvent.astrologer_id == p.id).order_by(
            OnboardingEvent.created_at.desc()).all()
        attempts = db.query(AstrologerAssessment).filter(
            AstrologerAssessment.astrologer_id == p.id).order_by(
            AstrologerAssessment.attempt_no.desc()).all()
        out.append(_serialise_admin(p, docs, mocks, events, attempts))
    return {"count": len(out), "applications": out}


@router.get("/counts")
@limiter.limit("60/minute")
async def queue_counts(request: Request, db: Session = Depends(get_db),
                        reviewer: User = Depends(require_reviewer)):
    from ..db.models import ONBOARDING_STATUSES
    # Drafts are excluded to match the queue, so the two agree. Otherwise the
    # tab badges would count rows the reviewer cannot see.
    rows = db.query(Astrologer).filter(Astrologer.status != STATUS_DRAFT).all()
    return {
        "counts": {s: sum(1 for p in rows if p.status == s) for s in ONBOARDING_STATUSES},
        "total": len(rows),
        "drafts": db.query(Astrologer).filter(Astrologer.status == STATUS_DRAFT).count(),
    }


@router.get("/{astrologer_id}")
@limiter.limit("60/minute")
async def get_application(astrologer_id: int, request: Request,
                          db: Session = Depends(get_db),
                          reviewer: User = Depends(require_reviewer)):
    p = _load(db, astrologer_id)
    docs = db.query(AstrologerDocument).filter(AstrologerDocument.astrologer_id == p.id).all()
    mocks = db.query(AstrologerMockConsult).filter(AstrologerMockConsult.astrologer_id == p.id).all()
    events = db.query(OnboardingEvent).filter(OnboardingEvent.astrologer_id == p.id).order_by(
        OnboardingEvent.created_at.desc()).all()
    attempts = db.query(AstrologerAssessment).filter(
        AstrologerAssessment.astrologer_id == p.id).order_by(
        AstrologerAssessment.attempt_no.desc()).all()
    return _serialise_admin(p, docs, mocks, events, attempts)


@router.post("/{astrologer_id}/status")
@limiter.limit("60/minute")
async def change_status(astrologer_id: int, payload: StatusChange, request: Request,
                        db: Session = Depends(get_db),
                        reviewer: User = Depends(require_reviewer)):
    """Move an application to a new status, refusing illegal moves.

    The response states the legal target statuses on a 409, so the reviewer UI
    can be driven without duplicating the state machine.
    """
    p = _load(db, astrologer_id)
    if payload.to_status == STATUS_SUSPENDED and p.status not in svc.PRACTISING_STATUSES:
        raise HTTPException(
            status_code=409,
            detail="Only a verified or probationary astrologer can be suspended",
        )

    probation_until = None
    if payload.to_status == svc.STATUS_PROBATION:
        days = payload.probation_days or 90
        probation_until = date.today() + timedelta(days=days)

    try:
        svc.apply_status(
            db, p, payload.to_status, reviewer.id,
            payload={"note": payload.rejection_reason},
            rejection_reason=payload.rejection_reason,
            probation_until=probation_until,
        )
    except svc.TransitionError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"{e}. From '{p.status}' the legal targets are: "
                   f"{', '.join(sorted(svc.LEGAL_TRANSITIONS.get(p.status, set()))) or 'none'}",
        ) from e

    svc.recompute_accuracy(db, p)
    db.commit()
    jobs.enqueue(db, "onboarding_status_changed",
                 {"astrologer_id": p.id, "user_id": p.user_id, "to_status": p.status})
    return {"id": p.id, "status": p.status}


@router.post("/documents/{document_id}/review")
@limiter.limit("60/minute")
async def review_document(document_id: int, payload: DocumentReview, request: Request,
                          db: Session = Depends(get_db),
                          reviewer: User = Depends(require_reviewer)):
    """Approve or reject an uploaded document.

    Approval here is a human looking at a self-declared scan. It is recorded as
    `admin_verified`, not as government-issued identity verification.
    """
    if payload.identity_status not in ("admin_verified", "rejected"):
        raise HTTPException(status_code=400, detail="identity_status must be admin_verified or rejected")
    doc = db.query(AstrologerDocument).filter(AstrologerDocument.id == document_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    profile = _load(db, doc.astrologer_id)
    doc.identity_status = payload.identity_status
    doc.reviewer_note = payload.reviewer_note
    doc.reviewed_at = datetime.now(UTC)
    doc.reviewed_by = reviewer.id
    svc.record_event(db, profile, "document_reviewed", profile.status, profile.status,
                     reviewer.id,
                     {"document_id": doc.id, "kind": doc.kind,
                      "identity_status": payload.identity_status})
    db.commit()
    return {"id": doc.id, "identity_status": doc.identity_status}


@router.get("/documents/{document_id}/content")
@limiter.limit("30/minute")
async def document_content(document_id: int, request: Request,
                           db: Session = Depends(get_db),
                           reviewer: User = Depends(require_reviewer)):
    """Fetch an uploaded document so a reviewer can actually look at it.

    Reviewer-only and never public: these are identity documents.
    """
    doc = db.query(AstrologerDocument).filter(AstrologerDocument.id == document_id).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        data = open_file(doc.storage_key)
    except StorageError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    from fastapi.responses import Response
    return Response(content=data, media_type=doc.content_type or "application/octet-stream",
                    headers={"Content-Disposition":
                             f'inline; filename="{doc.original_filename or "document"}"'})


@router.post("/{astrologer_id}/mock-consults")
@limiter.limit("30/minute")
async def add_mock_consult(astrologer_id: int, payload: MockConsultIn, request: Request,
                           db: Session = Depends(get_db),
                           reviewer: User = Depends(require_reviewer)):
    """Record the evaluation of a live mock consultation.

    Only meaningful while the application is at the mock stage; scoring someone
    before they get there would let a reviewer short-circuit the process.
    """
    p = _load(db, astrologer_id)
    if p.status != STATUS_MOCK_PENDING:
        raise HTTPException(
            status_code=409,
            detail=f"Mock consultation can only be recorded while status is "
                   f"'{STATUS_MOCK_PENDING}', currently '{p.status}'",
        )
    if payload.verdict not in ("pass", "conditional", "fail"):
        raise HTTPException(status_code=400, detail="verdict must be pass, conditional or fail")

    row = AstrologerMockConsult(astrologer_id=p.id, evaluator_id=reviewer.id, **payload.model_dump())
    db.add(row)
    svc.record_event(db, p, "mock_consult_evaluated", p.status, p.status, reviewer.id,
                     {"verdict": payload.verdict})
    db.flush()
    svc.recompute_accuracy(db, p)
    db.commit()
    return {"id": row.id, "verdict": row.verdict,
            "accuracy": svc.recompute_accuracy(db, p)}


@router.post("/{astrologer_id}/assessments/{attempt_id}/override")
@limiter.limit("30/minute")
async def override_assessment(astrologer_id: int, attempt_id: int, request: Request,
                              passed: bool, note: str = "", db: Session = Depends(get_db),
                              reviewer: User = Depends(require_reviewer)):
    """Override an auto-graded attempt, always with a written reason."""
    from ..db.models import AstrologerAssessment
    p = _load(db, astrologer_id)
    attempt = db.query(AstrologerAssessment).filter(
        AstrologerAssessment.id == attempt_id,
        AstrologerAssessment.astrologer_id == p.id,
    ).first()
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if not note.strip():
        raise HTTPException(status_code=400, detail="A written reason is required")
    attempt.passed = passed
    attempt.overridden_by = reviewer.id
    attempt.override_note = note
    svc.record_event(db, p, "assessment_overridden", p.status, p.status, reviewer.id,
                     {"attempt_id": attempt.id, "passed": passed, "note": note})
    db.flush()
    svc.recompute_accuracy(db, p)
    db.commit()
    return {"id": attempt.id, "passed": attempt.passed}


@router.get("/{astrologer_id}/audit")
@limiter.limit("30/minute")
async def audit_trail(astrologer_id: int, request: Request,
                      db: Session = Depends(get_db),
                      reviewer: User = Depends(require_reviewer)):
    p = _load(db, astrologer_id)
    events = db.query(OnboardingEvent).filter(
        OnboardingEvent.astrologer_id == p.id
    ).order_by(OnboardingEvent.created_at.desc()).all()
    return {"events": [
        {"id": e.id, "event_type": e.event_type, "from_status": e.from_status,
         "to_status": e.to_status, "actor_user_id": e.actor_user_id,
         "payload": e.payload, "created_at": str(e.created_at)}
        for e in events
    ]}


def _load(db: Session, astrologer_id: int) -> Astrologer:
    p = db.query(Astrologer).filter(Astrologer.id == astrologer_id).first()
    if p is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return p
