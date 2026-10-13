"""Anonymous device session endpoints.

``POST /api/session`` mints a fresh anonymous subject and token;
``POST /api/session/refresh`` re-issues for the same subject while the old
token is inside its expiry grace window, and revokes the presented token when
the replacement is issued. Neither endpoint reads or writes
personal data beyond the subject identifier.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.services import analytics, auth

router = APIRouter(tags=["session"])


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(..., min_length=1, max_length=4096)


class SessionResponse(BaseModel):
    token: str
    subject: str
    expiresIn: int


@router.post("", response_model=SessionResponse)
def create_session() -> SessionResponse:
    """Create a new anonymous session. The first one claims legacy shared data."""
    session = auth.create_anonymous_session()
    analytics.record_event("session.create", {})
    return SessionResponse(**session)


@router.post("/refresh", response_model=SessionResponse)
def refresh(payload: RefreshRequest) -> SessionResponse:
    """Exchange an existing (possibly briefly expired) token for a new one."""
    session = auth.refresh_session(payload.token)
    if session is None:
        raise HTTPException(
            status_code=401,
            detail="The session token is invalid or expired beyond the refresh window.",
        )
    return SessionResponse(**session)


@router.get("/whoami")
def whoami(claims: dict = Depends(auth.require_session)) -> dict:
    """Return the verified subject for the presented token."""
    return {"subject": auth.subject_of(claims)}
