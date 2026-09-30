"""Authentication API endpoints."""

import re
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models import User
from ..services.auth_service import (
    MAX_PASSWORD_BYTES,
    burn_password_verification,
    create_access_token,
    get_current_user,
    hash_password,
    password_is_oversized,
    verify_password,
)
from ..core.rate_limit import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$")


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    # min_length is characters and max_length is also characters; the handler
    # then rejects anything over 72 bytes, because bcrypt uses only those.
    password: str = Field(..., min_length=8, max_length=1024)


class LoginRequest(BaseModel):
    email: EmailStr
    # Bounded so a single request cannot hand a multi-megabyte string to
    # bcrypt. The meaningful limit is 72 bytes (see MAX_PASSWORD_BYTES), which
    # the handler enforces; this is a generous ceiling on the request itself.
    password: str = Field(..., max_length=1024)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=1024)
    new_password: str = Field(..., min_length=8, max_length=1024)


@router.post("/register")
# Deliberately looser than /login. Registration is not the endpoint worth
# attacking -- each call only creates a row -- and a tight limit here locks out
# a real person who mistypes a password twice. The stricter limit belongs on
# /login, which is what credential-stuffing actually targets.
@limiter.limit("20/hour", error_message="Too many accounts created from this address. Please try again later.")
async def register(request: Request, register_data: RegisterRequest, db: Session = Depends(get_db)):
    if not PASSWORD_REGEX.match(register_data.password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one number",
        )
    if password_is_oversized(register_data.password):
        # bcrypt hashes only the first 72 bytes, so a longer password would be
        # stored as a hash of its prefix and authenticate against it.
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )

    existing = db.query(User).filter(User.email == register_data.email).first()
    if existing is None:
        user = User(
            email=register_data.email,
            name=register_data.name,
            hashed_password=hash_password(register_data.password),
        )
        db.add(user)
        db.commit()

    # Generic response in both cases: prevents email enumeration via
    # "already registered" oracle. Client proceeds to login afterwards.
    return {
        "message": "If this email is new, your account was created. Please log in to continue.",
    }


@router.post("/login")
# Tight on purpose: this is the endpoint worth attacking. Combined with a
# generic failure message it is the main brake on credential stuffing.
@limiter.limit("10/minute", error_message="Too many sign-in attempts. Please wait a minute and try again.")
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()

    # Spend the same bcrypt work whether or not the account exists.
    #
    # `if not user or not verify_password(...)` short-circuits: an address with
    # no account returned in a database round trip, while one with an account
    # took a full bcrypt verification. The two cases returned the same 401, but
    # the timings did not, which is enough to enumerate registered addresses
    # without ever seeing a failure.
    if not user:
        burn_password_verification(login_data.password)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if password_is_oversized(login_data.password):
        # Rejected before verification, so the answer does not depend on
        # whether the stored hash happens to be shorter.
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )

    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "email": user.email, "version": getattr(user, "token_version", 0) or 0})

    return {
        "message": "Login successful",
        "token": token,
        # `role` is included so the client can render role-gated UI immediately,
        # without a second round trip to /auth/me.
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": getattr(user, "role", "client") or "client",
        },
    }


@router.post("/logout")
async def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all sessions for the current user (bumps token version)."""
    user.token_version = (getattr(user, "token_version", 0) or 0) + 1
    db.add(user)
    db.commit()
    return {"message": "Logged out from all sessions"}


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(request: Request, data: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Change password (requires current password); revokes all sessions."""
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if not PASSWORD_REGEX.match(data.new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one number",
        )
    if password_is_oversized(data.new_password):
        # Registration caps this at 128 characters, but bcrypt uses only the
        # first 72 bytes, so anything longer must be refused rather than
        # silently truncated to a weaker prefix.
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )
    user.hashed_password = hash_password(data.new_password)
    user.token_version = (getattr(user, "token_version", 0) or 0) + 1
    db.add(user)
    db.commit()
    return {"message": "Password changed. Please log in again."}


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": getattr(user, "role", "client"),
        "created_at": str(user.created_at),
    }
