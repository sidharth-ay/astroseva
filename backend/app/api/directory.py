"""Astrologer directory and public profile.

Requires a login, consistent with every other feature. The directory only ever
returns practitioners in a practising status, so a half-completed application is
never visible, and a rejected or suspended profile disappears without having to
clean it up.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, cast
from sqlalchemy.orm import Session, joinedload

from ..core.rate_limit import limiter
from ..db.database import get_db
from ..db.models import (
    PRACTISING_STATUSES,
    STATUS_PROBATION,
    Astrologer,
    AstrologerAvailability,
    User,
)
from ..services.auth_service import get_current_user

router = APIRouter(prefix="/api/v1/astrologers", tags=["astrologers"])


@router.get("")
@limiter.limit("60/minute")
async def list_astrologers(
    request: Request,
    specialty: str | None = None,
    language: str | None = None,
    min_experience: int = Query(None, ge=0, le=80),
    search: str | None = Query(None, max_length=80),
    on_probation: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Filterable directory of verified practitioners."""
    q = (
        db.query(Astrologer)
        .options(joinedload(Astrologer.user))
        .filter(Astrologer.status.in_(PRACTISING_STATUSES))
    )

    if specialty:
        # specialties/languages are JSON columns. `ilike` directly on a JSON
        # column works on SQLite but there is no json ~~* operator on
        # PostgreSQL, so the value is cast to text first. The quoted-element
        # pattern keeps "ved" from matching "Advanced".
        q = q.filter(cast(Astrologer.specialties, String).ilike(f'%"{specialty}"%'))
    if language:
        q = q.filter(cast(Astrologer.languages, String).ilike(f'%"{language}"%'))
    if min_experience is not None:
        q = q.filter(Astrologer.experience_years >= min_experience)
    if on_probation is not None:
        # `on_probation=false` means "everyone except those on probation".
        # The old code set `target = None` for that case and then filtered
        # `status != None`, which in SQL compares against NULL and matches no
        # rows at all: the request returned an empty directory instead of the
        # verified-and-not-probationary practitioners.
        if on_probation:
            q = q.filter(Astrologer.status == STATUS_PROBATION)
        else:
            q = q.filter(Astrologer.status != STATUS_PROBATION)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Astrologer.headline.ilike(like))
            | (Astrologer.bio.ilike(like))
            | (Astrologer.location.ilike(like))
        )

    total = q.count()
    rows = q.order_by(Astrologer.accuracy_score.desc(), Astrologer.experience_years.desc()) \
          .offset(offset).limit(limit).all()

    return {
        "count": len(rows),
        "total": total,
        "offset": offset,
        "limit": limit,
        "astrologers": [_summary(p) for p in rows],
    }


@router.get("/specialties")
@limiter.limit("30/minute")
async def list_specialties(request: Request, db: Session = Depends(get_db),
                           user: User = Depends(get_current_user)):
    """The speciality and language values actually present, for filter dropdowns."""
    rows = db.query(Astrologer).filter(Astrologer.status.in_(PRACTISING_STATUSES)).all()
    specs, langs = set(), set()
    for p in rows:
        specs.update(p.specialties or [])
        langs.update(p.languages or [])
    return {"specialties": sorted(specs), "languages": sorted(langs)}


@router.get("/{slug}")
@limiter.limit("60/minute")
async def get_profile(slug: str, request: Request, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    """A single practitioner profile with their accuracy breakdown."""
    p = (
        db.query(Astrologer)
        .options(joinedload(Astrologer.user))
        .filter(Astrologer.slug == slug)
        .first()
    )
    if p is None or p.status not in PRACTISING_STATUSES:
        # 404 rather than 403 so an unlisted profile is indistinguishable from
        # one that never existed.
        raise HTTPException(status_code=404, detail="Astrologer not found")

    avail = db.query(AstrologerAvailability).filter(
        AstrologerAvailability.astrologer_id == p.id,
        AstrologerAvailability.is_active.is_(True),
    ).order_by(AstrologerAvailability.weekday, AstrologerAvailability.start_minute).all()

    return {
        **_summary(p),
        "bio": p.bio,
        "is_on_probation": p.status == STATUS_PROBATION,
        "probation_until": p.probation_until.isoformat() if p.probation_until else None,
        "accuracy": {
            "score": p.accuracy_score,
            "scale": "0-10",
            "assessment_pass_rate": p.assessment_pass_rate,
            "total_assessments": p.total_assessments,
            "mock_consultations": p.mock_consultation_count,
        },
        "availability": [
            {"weekday": a.weekday, "start_minute": a.start_minute,
             "end_minute": a.end_minute, "timezone_offset": a.timezone_offset,
             "slot_minutes": a.slot_minutes}
            for a in avail
        ],
    }


def _summary(p: Astrologer) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        # The name lives on the user row; joinedload() in the list query keeps
        # this from becoming one extra query per card.
        "name": p.user.name if p.user else None,
        "headline": p.headline,
        "experience_years": p.experience_years,
        "languages": p.languages or [],
        "specialties": p.specialties or [],
        "location": p.location,
        "status": p.status,
        "is_on_probation": p.status == STATUS_PROBATION,
        "accuracy_score": p.accuracy_score,
    }
