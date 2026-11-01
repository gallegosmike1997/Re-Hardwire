"""Anonymous device session endpoints."""
from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings
from app.services import analytics, auth

router = APIRouter(tags=["session"])


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(..., min_length=1, max_length=4096)


class SessionResponse(BaseModel):
    token: str
    subject: str
    expiresIn: int
    subject_type: str


@router.post("", response_model=SessionResponse)
def create_session() -> SessionResponse:
    """Create a fresh anonymous device identity."""
    session = auth.create_anonymous_session()
    analytics.record_event("session.create", {})
    return SessionResponse(
        token=session["token"],
        subject=session["subject"],
        expiresIn=session["expiresIn"],
        subject_type="anonymous",
    )


@router.post("/refresh", response_model=SessionResponse)
def refresh(payload: RefreshRequest) -> SessionResponse:
    """Refresh an existing device token while retaining its subject."""
    session = auth.refresh_session(payload.token)
    if session is None:
        raise HTTPException(status_code=401, detail="The session token is invalid or expired.")
    return SessionResponse(
        token=session["token"],
        subject=session["subject"],
        expiresIn=session["expiresIn"],
        subject_type="anonymous",
    )


@router.get("/whoami")
def whoami(claims: dict = Depends(auth.require_session)) -> Dict[str, str]:
    """Return the subject associated with the verified current token."""
    return {"subject": auth.subject_of(claims), "subject_type": "anonymous"}


@router.post("/logout", response_model=Dict[str, str])
def logout(request: Request, claims: dict = Depends(auth.require_session)) -> Dict[str, str]:
    """Revoke the current device token."""
    token = auth.bearer_token(request.headers.get("Authorization"))
    if token:
        auth.revoke_token(token)
    return {"status": "success"}