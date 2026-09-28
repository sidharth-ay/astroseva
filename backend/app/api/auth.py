"""Authentication API endpoints."""

import re
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db.models import User
from ..services.auth_service import (
    hash_password, verify_password, create_access_token, get_current_user
)
from ..core.rate_limit import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$")


class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, register_data: RegisterRequest, db: Session = Depends(get_db)):
    if not PASSWORD_REGEX.match(register_data.password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one number",
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
@limiter.limit("10/minute")
async def login(request: Request, login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "email": user.email, "version": getattr(user, "token_version", 0) or 0})

    return {
        "message": "Login successful",
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name},
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
        "created_at": str(user.created_at),
    }
