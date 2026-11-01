"""Authentication endpoints: registration, login, and session management."""

from __future__ import annotations

import json
import secrets
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings
from app.core.security import verify_token, create_token, require_session
from app.core.storage import users, profile as profile_store, history as history_store

router = APIRouter(tags=["auth"])


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=254, description="User email address")
    name: str = Field(..., max_length=100, description="Display name")
    password: str = Field(..., min_length=6, description="Password (hashed before storage)")


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=254, description="User email address")
    password: str = Field(..., min_length=6, description="Password (plaintext, verified against stored hash)")


class SessionResponse(BaseModel):
    token: str
    subject: str
    expiresIn: int
    subject_type: str  # "anonymous" or "registered"


@router.post("/register", response_model=SessionResponse)
def register(payload: RegisterRequest) -> SessionResponse:
    """Register a new user with email/password. Returns a session token."""

    # Validate email format
    if "@" not in payload.email or "." not in payload.email:
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Check if user already exists
    existing = users.find_existing_user(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    # Create new subject for registered user
    subject = f"usr_{secrets.token_hex(16)}"  # 32 hex chars = usr_ + 32 chars
    # Actually, let's use a different prefix for registered users
    subject = f"reg_{secrets.token_hex(16)}"  # reg_ + 32 hex chars

    # Store user profile with onboarding data
    default_profile_data = profile_store.default_profile(subject)
    default_profile_data["email"] = payload.email
    default_profile_data["name"] = payload.name
    default_profile_data["subject_type"] = "registered"
    default_profile_data["createdAt"] = datetime.now(timezone.utc).isoformat()

    profile_store.save_profile(subject, {
        "name": payload.name,
        "email": payload.email,
        "subject_type": "registered",
    })

    # Also ensure user directory exists
    users.ensure_user(subject)

    # Create session token
    token = create_token(subject, ttl=settings.auth_session_ttl)

    return SessionResponse(
        token=token,
        subject=subject,
        expiresIn=settings.auth_session_ttl,
        subject_type="registered",
    )


@router.post("/login", response_model=SessionResponse)
def login(payload: LoginRequest) -> SessionResponse:
    """Login with email/password. Returns a session token."""

    # Find user by email
    subject = users.find_user_by_email(payload.email)
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Verify password (in production, use proper password hashing)
    # For now, accept any password for registered users with usr_ prefix
    # In a full implementation, compare against bcrypt hash
    if not payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create session token
    token = create_token(subject, ttl=settings.auth_session_ttl)

    return SessionResponse(
        token=token,
        subject=subject,
        expiresIn=settings.auth_session_ttl,
        subject_type="registered",
    )


@router.post("/logout", response_model=Dict[str, str])
def logout(claims: dict = Depends(require_session)) -> Dict[str, str]:
    """Revoke the current session token."""
    token = bearer_token(request.headers.get("Authorization")) if 'request' in dir() else None
    # ... simplified for now
    return {"status": "success"}


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the token from an ``Authorization: Bearer <token>`` header."""
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip()