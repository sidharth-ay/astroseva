"""Authentication utilities."""

import os
import uuid
from functools import lru_cache
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..db.models import (
    ROLE_ADMIN,
    ROLE_ASTROLOGER,
    ROLE_CLIENT,
    ROLE_REVIEWER,
    User,
)
from ..db.database import get_db

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is required")
ALGORITHM = "HS256"
ISSUER = "astroseva"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# Bearer token security (manual 401 handling for consistent status codes)
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against hash."""
    return pwd_context.verify(plain_password, hashed_password)


# bcrypt silently truncates its input at 72 bytes. A password longer than that
# would therefore authenticate against any password sharing its first 72 bytes,
# so the length is rejected outright instead. `hash_password` and every caller
# that compares an existing password go through here.
MAX_PASSWORD_BYTES = 72

def password_is_oversized(password: str) -> bool:
    return len((password or "").encode("utf-8")) > MAX_PASSWORD_BYTES


def burn_password_verification(password: str) -> None:
    """Perform a verification that will fail, to equalise response time.

    A login for an address with no account has no hash to compare against, so
    without this it returns in a database round trip while a login for a real
    address takes a full bcrypt comparison. Both raise the same 401, but the
    timings differ enough to enumerate registered accounts.

    The dummy hash is generated once at import from a value derived from the
    process, rather than being a literal. A hardcoded string is a liability
    here: if it is not a well-formed hash for the configured backend,
    `verify_password` returns almost immediately having done no work, which
    silently restores the oracle this is meant to close.
    """
    try:
        pwd_context.verify(password or "", _dummy_hash())
    except Exception:
        pass


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    """A bcrypt hash no one can present a matching password for."""
    import uuid

    return pwd_context.hash(uuid.uuid4().hex + uuid.uuid4().hex)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with jti/iat/iss claims."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": ISSUER,
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token (signature, expiry, issuer)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], issuer=ISSUER)
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from the JWT token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(credentials.credentials)
    raw_sub = payload.get("sub")
    try:
        user_id = int(raw_sub)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    # Token version check: logout-all / password change invalidates old tokens.
    token_version = payload.get("version", 0)
    current_version = getattr(user, "token_version", 0) or 0
    if token_version != current_version:
        raise HTTPException(status_code=401, detail="Session revoked, please log in again")
    return user


# --- role-based authorisation ------------------------------------------------
#
# `users.role` is a single string (client | astrologer | reviewer | admin). These
# dependencies are the only access-control mechanism; every marketplace router
# composes one of them so an endpoint can never be accidentally public.
#
# "Astrologer" here means an account that is entitled to practise. It requires
# an onboarding application in a practising status (verified or probation), not
# merely the role string, so an approved-but-not-yet-verified applicant cannot
# act as an astrologer.

def _role_of(user: User) -> str:
    return (getattr(user, "role", None) or ROLE_CLIENT).strip().lower()


def is_admin(user: User) -> bool:
    """Admin check via the user's role.

    This previously consulted an `ADMIN_EMAILS` environment allowlist, which
    sat alongside `users.role` and took precedence: an address in the
    environment variable was an administrator whatever its role said, and
    anyone holding the `admin` role was an administrator whatever the variable
    said. Two sources of truth for one property, with the environment one
    granting access implicitly.

    `users.role` is now the only authority. A deployment with no admin at all
    is a safe state, and the first administrator is set deliberately with
    `python -m app.cli set-admin <email>`.
    """
    return _role_of(user) == ROLE_ADMIN


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require administrator rights."""
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Administrator privileges required")
    return user


async def require_reviewer(user: User = Depends(get_current_user)) -> User:
    """Require reviewer or administrator rights (runs onboarding assessments)."""
    if _role_of(user) in (ROLE_REVIEWER, ROLE_ADMIN):
        return user
    raise HTTPException(status_code=403, detail="Reviewer privileges required")


async def require_astrologer_account(user: User = Depends(get_current_user)) -> User:
    """Require the astrologer role, before onboarding status is considered."""
    if is_admin(user) or _role_of(user) == ROLE_ASTROLOGER:
        return user
    raise HTTPException(status_code=403, detail="Astrologer account required")


async def require_practising_astrologer(user: User = Depends(get_current_user),
                                        db: Session = Depends(get_db)) -> User:
    """Require an astrologer whose application is verified or on probation."""
    from ..db.models import PRACTISING_STATUSES, Astrologer

    if _role_of(user) != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Astrologer account required")
    profile = db.query(Astrologer).filter(Astrologer.user_id == user.id).first()
    if profile is None or profile.status not in PRACTISING_STATUSES:
        raise HTTPException(
            status_code=403,
            detail="Your astrologer application is not yet verified",
        )
    return user
