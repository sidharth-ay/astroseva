"""User, Chart and astrologer-marketplace database models."""

from sqlalchemy import (
    Column, Integer, String, DateTime, Float, ForeignKey, Text, JSON, Boolean, Date,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..core.houses import DEFAULT_HOUSE_SYSTEM
from .database import Base

# Account kinds. Stored as a plain string rather than a database Enum because the
# rest of this schema uses no enums, and a native PG enum complicates migrations.
ROLE_CLIENT = "client"
ROLE_ASTROLOGER = "astrologer"
ROLE_REVIEWER = "reviewer"
ROLE_ADMIN = "admin"
ROLES = (ROLE_CLIENT, ROLE_ASTROLOGER, ROLE_REVIEWER, ROLE_ADMIN)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    # client | astrologer | reviewer | admin
    role = Column(String(32), nullable=False, default=ROLE_CLIENT, index=True)
    token_version = Column(Integer, nullable=False, default=0)
    email_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    charts = relationship("SavedChart", back_populates="owner")
    # astrologers references users twice (user_id and reviewed_by), so the
    # join has to be stated explicitly or SQLAlchemy cannot resolve it.
    astrologer_profile = relationship(
        "Astrologer",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="Astrologer.user_id",
    )


class SavedChart(Base):
    __tablename__ = "saved_charts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    birth_date = Column(String(20), nullable=False)
    birth_time = Column(String(10), nullable=False)
    birth_place = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timezone_offset = Column(Float, nullable=False)
    chart_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="charts")


# --- astrologer marketplace -------------------------------------------------
#
# Onboarding lifecycle, as a single status string on `astrologers`. Every
# transition is recorded in `onboarding_events` with the actor and the from/to
# status, so "who approved this and why" stays answerable.

STATUS_DRAFT = "draft"
STATUS_APPLIED = "applied"
STATUS_UNDER_REVIEW = "under_review"
STATUS_ASSESSMENT_PENDING = "assessment_pending"
STATUS_MOCK_PENDING = "mock_pending"
STATUS_VERIFIED = "verified"
STATUS_PROBATION = "probation"
STATUS_REJECTED = "rejected"
STATUS_SUSPENDED = "suspended"

ONBOARDING_STATUSES = (
    STATUS_DRAFT, STATUS_APPLIED, STATUS_UNDER_REVIEW,
    STATUS_ASSESSMENT_PENDING, STATUS_MOCK_PENDING,
    STATUS_VERIFIED, STATUS_PROBATION, STATUS_REJECTED, STATUS_SUSPENDED,
)

# Statuses in which the practitioner may act as an astrologer.
PRACTISING_STATUSES = (STATUS_VERIFIED, STATUS_PROBATION)


class Astrologer(Base):
    """Public practitioner profile, 1:1 with a user account."""

    __tablename__ = "astrologers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    slug = Column(String(120), nullable=False, unique=True, index=True)

    headline = Column(String(200), nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    experience_years = Column(Integer, nullable=False, default=0)
    languages = Column(JSON, nullable=False, default=list)
    specialties = Column(JSON, nullable=False, default=list)
    avatar_key = Column(String(255), nullable=True)
    # Declared city/place, for display and later matching. Not yet used for
    # timezone-aware availability, which lives in astrologer_availability.
    location = Column(String(255), nullable=False, default="")

    status = Column(String(32), nullable=False, default=STATUS_DRAFT, index=True)
    rejection_reason = Column(Text, nullable=True)
    # Set for STATUS_PROBATION; a verified practitioner on probation.
    probation_until = Column(Date, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Derived accuracy figures, recomputed by astrologer_service.
    accuracy_score = Column(Float, nullable=False, default=0.0)
    assessment_pass_rate = Column(Float, nullable=False, default=0.0)
    mock_consultation_count = Column(Integer, nullable=False, default=0)
    total_assessments = Column(Integer, nullable=False, default=0)
    score_computed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="astrologer_profile",
                        foreign_keys=[user_id])
    documents = relationship(
        "AstrologerDocument", back_populates="astrologer", cascade="all, delete-orphan"
    )
    availability = relationship(
        "AstrologerAvailability", back_populates="astrologer", cascade="all, delete-orphan"
    )
    assessments = relationship(
        "AstrologerAssessment", back_populates="astrologer", cascade="all, delete-orphan"
    )
    mock_consults = relationship(
        "AstrologerMockConsult", back_populates="astrologer", cascade="all, delete-orphan"
    )


class AstrologerDocument(Base):
    """Self-declared identity and credential documents.

    This is deliberately NOT identity verification. No document is checked
    against a government register; an admin approves them by eye. The distinction
    matters legally, so `verification_kind` records how a document was checked.
    """

    __tablename__ = "astrologer_documents"

    id = Column(Integer, primary_key=True, index=True)
    astrologer_id = Column(Integer, ForeignKey("astrologers.id"), nullable=False, index=True)

    # identity: aadhaar | pan | address_proof
    # credential: degree_certificate | professional_cert | experience_letter | other
    kind = Column(String(60), nullable=False, index=True)
    storage_key = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False, default="")
    content_type = Column(String(120), nullable=False, default="")
    size_bytes = Column(Integer, nullable=False, default=0)

    # Pending approval, self-declared, admin_verified, or rejected.
    identity_status = Column(String(32), nullable=False, default="self_declared", index=True)
    reviewer_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    astrologer = relationship("Astrologer", back_populates="documents")


class AstrologerAssessment(Base):
    """Written assessment attempt. Auto-graded, question set frozen per attempt."""

    __tablename__ = "astrologer_assessments"

    id = Column(Integer, primary_key=True, index=True)
    astrologer_id = Column(Integer, ForeignKey("astrologers.id"), nullable=False, index=True)
    attempt_no = Column(Integer, nullable=False, default=1)

    # Frozen so a retry is comparable with the previous attempt.
    questions_snapshot = Column(JSON, nullable=False, default=list)
    answers = Column(JSON, nullable=False, default=dict)
    score = Column(Integer, nullable=False, default=0)
    max_score = Column(Integer, nullable=False, default=0)
    passed = Column(Boolean, nullable=False, default=False)
    pass_mark = Column(Integer, nullable=False, default=0)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Set only when an admin overrides the auto-graded outcome.
    overridden_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    override_note = Column(Text, nullable=True)

    astrologer = relationship("Astrologer", back_populates="assessments")


class AstrologerMockConsult(Base):
    """Evaluation of a live mock consultation given by a reviewer."""

    __tablename__ = "astrologer_mock_consults"

    id = Column(Integer, primary_key=True, index=True)
    astrologer_id = Column(Integer, ForeignKey("astrologers.id"), nullable=False, index=True)
    evaluator_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    scenario = Column(Text, nullable=False, default="")
    response = Column(Text, nullable=False, default="")
    # Each 1-5.
    score_accuracy = Column(Integer, nullable=False, default=0)
    score_clarity = Column(Integer, nullable=False, default=0)
    score_empathy = Column(Integer, nullable=False, default=0)
    score_structure = Column(Integer, nullable=False, default=0)
    verdict = Column(String(32), nullable=False, default="fail")
    notes = Column(Text, nullable=True)
    evaluated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    astrologer = relationship("Astrologer", back_populates="mock_consults")


class AstrologerAvailability(Base):
    """Recurring weekly availability window, in the astrologer's own timezone."""

    __tablename__ = "astrologer_availability"

    id = Column(Integer, primary_key=True, index=True)
    astrologer_id = Column(Integer, ForeignKey("astrologers.id"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)          # 0 = Monday
    start_minute = Column(Integer, nullable=False)     # minutes from midnight
    end_minute = Column(Integer, nullable=False)
    timezone_offset = Column(Float, nullable=False, default=5.5)
    slot_minutes = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    astrologer = relationship("Astrologer", back_populates="availability")


class OnboardingEvent(Base):
    """Append-only audit trail of every onboarding status transition.

    This is the compliance backbone: it answers who moved an application, when,
    from which state to which, and why.
    """

    __tablename__ = "onboarding_events"

    id = Column(Integer, primary_key=True, index=True)
    astrologer_id = Column(Integer, ForeignKey("astrologers.id"), nullable=False, index=True)
    event_type = Column(String(60), nullable=False, index=True)
    from_status = Column(String(32), nullable=True)
    to_status = Column(String(32), nullable=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class JobRun(Base):
    """Record of a background job. See services/jobs.py."""

    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True, index=True)
    job_type = Column(String(80), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
    status = Column(String(32), nullable=False, default="pending", index=True)
    attempts = Column(Integer, nullable=False, default=0)
    last_error = Column(Text, nullable=True)
    run_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
finished_at = Column(DateTime, nullable=True)


class AuthToken(Base):
    """Single-use tokens for password resets and email verification."""
    __tablename__ = "auth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    purpose = Column(String(32), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserSession(Base):
    """Active sessions for refresh token rotation and device tracking."""
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    refresh_token_hash = Column(String(255), nullable=False, unique=True, index=True)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserSettings(Base):
    """Per-user calculation settings.

    One row per user, written on first save rather than at registration, so
    existing accounts pick up the defaults with no backfill.
    """

    __tablename__ = "user_settings"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    # whole-sign | equal -- see app.core.houses.HOUSE_SYSTEMS
    house_system = Column(String(32), nullable=False, default=DEFAULT_HOUSE_SYSTEM)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
