"""Astrologer-facing API: apply, upload documents, assessment, availability.

Everything here is scoped to the *caller's own* application. There is no path
that takes an astrologer id from the client for reads or writes, so one
practitioner cannot read or edit another's application.
"""


from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.rate_limit import limiter
from ..db.database import get_db
from ..db.models import (
    ROLE_ASTROLOGER,
    STATUS_APPLIED,
    STATUS_ASSESSMENT_PENDING,
    STATUS_DRAFT,
    Astrologer,
    AstrologerAssessment,
    AstrologerAvailability,
    AstrologerDocument,
    User,
)
from ..services import assessment as assessment_service
from ..services import astrologer_service as svc
from ..services import jobs
from ..services.auth_service import get_current_user
from ..services.storage_service import (
    ALLOWED_CONTENT_TYPES,
    StorageError,
    delete_file,
    read_upload,
    store_file,
)

router = APIRouter(prefix="/api/v1/astrologer", tags=["astrologer"])


class ProfileUpdate(BaseModel):
    headline: str = Field(default="", max_length=200)
    bio: str = Field(default="", max_length=5000)
    experience_years: int = Field(default=0, ge=0, le=80)
    languages: list[str] = Field(default_factory=list)
    specialties: list[str] = Field(default_factory=list)
    location: str = Field(default="", max_length=255)


class AvailabilityIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_minute: int = Field(ge=0, le=1440)
    end_minute: int = Field(ge=0, le=1440)
    timezone_offset: float = Field(default=5.5, ge=-12, le=14)
    slot_minutes: int = Field(default=30, ge=5, le=240)
    is_active: bool = True


def _my_profile(db: Session, user: User) -> Astrologer:
    return svc.get_or_create_profile(db, user)


def _serialise_profile(db: Session, profile: Astrologer) -> dict:
    docs = db.query(AstrologerDocument).filter(
        AstrologerDocument.astrologer_id == profile.id
    ).all()
    attempts = db.query(AstrologerAssessment).filter(
        AstrologerAssessment.astrologer_id == profile.id
    ).all()
    avail = db.query(AstrologerAvailability).filter(
        AstrologerAvailability.astrologer_id == profile.id,
        AstrologerAvailability.is_active.is_(True),
    ).all()
    return {
        "id": profile.id,
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
            {
                "id": d.id,
                "kind": d.kind,
                "identity_status": d.identity_status,
                "original_filename": d.original_filename,
                "uploaded_at": str(d.uploaded_at),
                "reviewer_note": d.reviewer_note,
            }
            for d in docs
        ],
        "availability": [
            {
                "id": a.id,
                "weekday": a.weekday,
                "start_minute": a.start_minute,
                "end_minute": a.end_minute,
                "timezone_offset": a.timezone_offset,
                "slot_minutes": a.slot_minutes,
            }
            for a in avail
        ],
        "next_step": svc.next_step_for(
            profile,
            has_documents=bool(docs),
            has_assessment=bool(attempts),
        ),
        "is_practising": svc.is_practising(profile),
    }


@router.get("/me")
@limiter.limit("60/minute")
async def my_application(request: Request, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    """The caller's own application. Read-only: this creates no row.

    A caller with no application gets ``has_application: false`` and a null
    profile rather than an error, so a page can ask the question without
    having to catch a 404. Writing here would mean that simply loading the
    form created a draft, leaving an empty application in the reviewer's queue
    for everyone who took a look and left.
    """
    profile = svc.find_profile(db, user)
    if profile is None:
        return {"has_application": False, "application": None}
    return {"has_application": True, "application": _serialise_profile(db, profile)}


@router.get("/me/exists")
@limiter.limit("120/minute")
async def application_exists(request: Request, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    """Whether the caller has started an application. Never writes.

    This backs the "Become an Astrologer" / "My Application" label on the
    services page, so it has to be safe to call while merely rendering a page
    that anyone can visit.
    """
    return {"has_application": svc.has_application(db, user)}


@router.post("/me/start")
@limiter.limit("10/minute")
async def start_application(request: Request, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    """Begin an application, creating the draft. Idempotent.

    The only endpoint that creates an application row, and it runs on
    deliberate intent rather than on a page view.
    """
    profile = svc.start_application(db, user)
    return _serialise_profile(db, profile)


@router.put("/me")
@limiter.limit("30/minute")
async def update_profile(request: Request, payload: ProfileUpdate, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    """Edit the profile.

    Only allowed while still in draft, or after a rejection where the
    practitioner may fix and resubmit. Once an application is under review the
    details are frozen so a reviewer is not looking at a moving target.
    """
    profile = _my_profile(db, user)
    if profile.status not in (STATUS_DRAFT, svc.STATUS_REJECTED):
        raise HTTPException(
            status_code=409,
            detail=f"Profile is locked while status is '{profile.status}'",
        )
    profile.headline = payload.headline
    profile.bio = payload.bio
    profile.experience_years = payload.experience_years
    profile.languages = payload.languages
    profile.specialties = payload.specialties
    profile.location = payload.location
    svc.record_event(db, profile, "profile_updated", profile.status, profile.status, user.id, {})
    db.commit()
    return _serialise_profile(db, profile)


@router.post("/apply")
@limiter.limit("10/minute")
async def submit_application(request: Request, db: Session = Depends(get_db),
                             user: User = Depends(get_current_user)):
    """Submit the application for review (draft -> applied)."""
    profile = _my_profile(db, user)
    try:
        svc.assert_can_submit(db, profile)
        svc.apply_status(db, profile, STATUS_APPLIED, user.id)
    except svc.TransitionError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e

    user.role = ROLE_ASTROLOGER
    db.commit()
    jobs.enqueue(db, "onboarding_submitted", {"astrologer_id": profile.id, "user_id": user.id})
    return _serialise_profile(db, profile)


@router.post("/documents")
@limiter.limit("20/minute")
async def upload_document(
    request: Request,
    kind: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a self-declared identity or credential document.

    Note this is explicitly NOT identity verification: no document is checked
    against a government register. A reviewer approves these by eye.
    """
    if kind not in svc.DOC_KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of: {', '.join(svc.DOC_KINDS)}")
    profile = _my_profile(db, user)
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Allowed types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )
    # Read with the limit applied DURING the read. An unbounded read returned
    # the whole body, so the size check in `store_file` only ran once the
    # entire upload was already in memory.
    try:
        data = read_upload(file.file)
        stored = store_file(
            f"astrologers/{profile.id}", content_type, file.filename or "", data
        )
    except StorageError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    doc = AstrologerDocument(
        astrologer_id=profile.id,
        kind=kind,
        storage_key=stored.key,
        original_filename=stored.original_filename,
        content_type=stored.content_type,
        size_bytes=stored.size_bytes,
        identity_status="self_declared",
    )
    db.add(doc)
    svc.record_event(db, profile, "document_uploaded", profile.status, profile.status, user.id,
                     {"kind": kind, "key": stored.key})
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id, "kind": doc.kind, "identity_status": doc.identity_status,
        "original_filename": doc.original_filename, "size_bytes": doc.size_bytes,
    }


@router.delete("/documents/{document_id}")
@limiter.limit("20/minute")
async def delete_document(request: Request, document_id: int, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    """Remove one of your own documents."""
    profile = _my_profile(db, user)
    doc = db.query(AstrologerDocument).filter(
        AstrologerDocument.id == document_id,
        AstrologerDocument.astrologer_id == profile.id,
    ).first()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    key = doc.storage_key
    db.delete(doc)
    svc.record_event(db, profile, "document_deleted", profile.status, profile.status, user.id, {})
    db.commit()
    try:
        delete_file(key)
    except StorageError:
        pass  # the row is gone; an orphaned blob is preferable to a 500
    return {"deleted": True}


@router.get("/assessment")
@limiter.limit("30/minute")
async def get_assessment(request: Request, db: Session = Depends(get_db),
                          user: User = Depends(get_current_user)):
    """The question set. Contains no answer key."""
    profile = _my_profile(db, user)
    attempts = db.query(AstrologerAssessment).filter(
        AstrologerAssessment.astrologer_id == profile.id
    ).order_by(AstrologerAssessment.attempt_no.desc()).all()
    latest = attempts[0] if attempts else None
    return {
        "questions": assessment_service.get_questions(),
        "pass_mark": assessment_service.pass_mark(),
        "attempts": len(attempts),
        "latest": None if latest is None else {
            "attempt_no": latest.attempt_no,
            "score": latest.score,
            "max_score": latest.max_score,
            "passed": latest.passed,
            "submitted_at": str(latest.submitted_at),
        },
    }


@router.post("/assessment")
@limiter.limit("10/minute")
async def submit_assessment(request: Request, answers: dict, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    """Submit answers. Auto-graded immediately against a frozen question set."""
    profile = _my_profile(db, user)
    if profile.status not in (STATUS_ASSESSMENT_PENDING, STATUS_APPLIED, svc.STATUS_REJECTED):
        raise HTTPException(
            status_code=409,
            detail=f"Assessment not open while status is '{profile.status}'",
        )
    snapshot = assessment_service.snapshot()
    result = assessment_service.grade(answers or {}, snapshot)

    attempt_no = 1 + db.query(AstrologerAssessment).filter(
        AstrologerAssessment.astrologer_id == profile.id
    ).count()
    attempt = AstrologerAssessment(
        astrologer_id=profile.id,
        attempt_no=attempt_no,
        questions_snapshot=snapshot,
        answers=answers or {},
        score=result["score"],
        max_score=result["max_score"],
        passed=result["passed"],
        pass_mark=result["pass_mark"],
    )
    db.add(attempt)
    svc.record_event(db, profile, "assessment_submitted", profile.status, profile.status, user.id,
                     {"attempt_no": attempt_no, "score": result["score"],
                      "max_score": result["max_score"], "passed": result["passed"]})
    db.flush()
    svc.recompute_accuracy(db, profile)
    db.commit()

    return {
        "attempt_no": attempt_no,
        "score": result["score"],
        "max_score": result["max_score"],
        "pass_mark": result["pass_mark"],
        "passed": result["passed"],
        # Explanations are returned only after submission, so a retry is still
        # possible without the answers being exposed up front.
        "details": result["details"],
    }


@router.get("/availability")
@limiter.limit("30/minute")
async def list_availability(request: Request, db: Session = Depends(get_db),
                            user: User = Depends(get_current_user)):
    profile = _my_profile(db, user)
    rows = db.query(AstrologerAvailability).filter(
        AstrologerAvailability.astrologer_id == profile.id
    ).order_by(AstrologerAvailability.weekday, AstrologerAvailability.start_minute).all()
    return {"availability": [
        {"id": a.id, "weekday": a.weekday, "start_minute": a.start_minute,
         "end_minute": a.end_minute, "timezone_offset": a.timezone_offset,
         "slot_minutes": a.slot_minutes, "is_active": a.is_active}
        for a in rows
    ]}


@router.post("/availability")
@limiter.limit("30/minute")
async def add_availability(request: Request, payload: AvailabilityIn, db: Session = Depends(get_db),
                           user: User = Depends(get_current_user)):
    profile = _my_profile(db, user)
    if payload.end_minute <= payload.start_minute:
        raise HTTPException(status_code=400, detail="end_minute must be after start_minute")
    clash = db.query(AstrologerAvailability).filter(
        AstrologerAvailability.astrologer_id == profile.id,
        AstrologerAvailability.weekday == payload.weekday,
        AstrologerAvailability.start_minute < payload.end_minute,
        AstrologerAvailability.end_minute > payload.start_minute,
    ).first()
    if clash is not None:
        raise HTTPException(status_code=409, detail="Overlaps an existing window that day")
    row = AstrologerAvailability(astrologer_id=profile.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.delete("/availability/{row_id}")
@limiter.limit("30/minute")
async def remove_availability(request: Request, row_id: int, db: Session = Depends(get_db),
                              user: User = Depends(get_current_user)):
    profile = _my_profile(db, user)
    row = db.query(AstrologerAvailability).filter(
        AstrologerAvailability.id == row_id,
        AstrologerAvailability.astrologer_id == profile.id,
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Window not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@router.get("/timeline")
@limiter.limit("30/minute")
async def my_timeline(request: Request, db: Session = Depends(get_db),
                       user: User = Depends(get_current_user)):
    """The caller's own onboarding audit trail."""
    from ..db.models import OnboardingEvent

    profile = _my_profile(db, user)
    events = db.query(OnboardingEvent).filter(
        OnboardingEvent.astrologer_id == profile.id
    ).order_by(OnboardingEvent.created_at.desc()).all()
    return {"events": [
        {"id": e.id, "event_type": e.event_type, "from_status": e.from_status,
         "to_status": e.to_status, "created_at": str(e.created_at),
         "payload": e.payload}
        for e in events
    ]}
