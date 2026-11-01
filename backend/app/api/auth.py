"""Authentication endpoints — Week 1 task 1.3.

Registration, login, and logout endpoints that integrate with the OIDC
provider abstraction and issue self-signed JWT sessions.
"""
from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.models import User
from app.services import auth
from app.services.oidc import OIDCAuthProvider

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=256)
    provider: str = Field(default="oidc")
    token: str | None = Field(default=None)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.rsplit("@", 1)[1]:
            raise ValueError("Invalid email address")
        return v


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str | None = Field(default=None, max_length=254)
    password: str | None = Field(default=None, min_length=8, max_length=256)
    login_method: str = Field(default="email_password")
    token: str | None = Field(default=None)


class AuthResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expiresIn: int
    subject: str
    provider: str


class LogoutResponse(BaseModel):
    success: bool
    detail: str = ""


_oidc_provider: OIDCAuthProvider | None = None


def get_oidc_provider() -> OIDCAuthProvider:
    global _oidc_provider
    if _oidc_provider is None:
        raise HTTPException(status_code=503, detail="OIDC provider not configured")
    return _oidc_provider


def init_oidc_provider(provider: OIDCAuthProvider) -> None:
    global _oidc_provider
    _oidc_provider = provider


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, session: Annotated[AsyncSession, Depends(get_session)]):
    provider = get_oidc_provider()
    if payload.provider != "oidc":
        raise HTTPException(status_code=400, detail="Unsupported registration provider")
    if payload.token is None:
        raise HTTPException(status_code=400, detail="OIDC authorization code required")

    auth_result = await provider.authenticate(payload.token)
    claims = auth_result["payload"]
    userinfo = auth_result["userinfo"]
    subject = await provider.normalize_subject(claims.get("sub", ""))

    existing = await auth.get_user_by_provider_sub(session, subject)
    if existing is not None:
        token = auth.create_token(subject, ttl=settings.auth_session_ttl)
        return {"token": token, "token_type": "Bearer", "expiresIn": settings.auth_session_ttl, "subject": subject, "provider": provider.name}

    new_user = User(provider_sub=subject, email=payload.email, mfa_enabled=False)
    session.add(new_user)
    await session.commit()

    token = auth.create_token(subject, ttl=settings.auth_session_ttl)
    return {"token": token, "token_type": "Bearer", "expiresIn": settings.auth_session_ttl, "subject": subject, "provider": provider.name}


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, session: Annotated[AsyncSession, Depends(get_session)]):
    provider = get_oidc_provider()
    if payload.token is not None:
        auth_result = await provider.authenticate(payload.token)
        claims = auth_result["payload"]
        subject = await provider.normalize_subject(claims.get("sub", ""))
    elif payload.email is not None:
        if payload.login_method != "email_password":
            raise HTTPException(status_code=400, detail="Unsupported login method")
        raise HTTPException(status_code=400, detail="Email/password login requires provider implementation")
    else:
        raise HTTPException(status_code=400, detail="Either email or OIDC token is required")

    user = await auth.get_user_by_provider_sub(session, subject)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found. Please register first.")

    token = auth.create_token(subject, ttl=settings.auth_session_ttl)
    return {"token": token, "token_type": "Bearer", "expiresIn": settings.auth_session_ttl, "subject": subject, "provider": provider.name}


@router.post("/logout", response_model=LogoutResponse)
async def logout(payload: LoginRequest, session: Annotated[AsyncSession, Depends(get_session)], request: Request | None = None):
    if payload.token is not None:
        try:
            await auth.revoke_refresh_token(session, payload.token)
        except Exception:
            pass
        return LogoutResponse(success=True, detail="Session revoked")

    claims = None
    if request is not None:
        from app.services.auth import bearer_token, verify_token

        tok = bearer_token(request.headers.get("Authorization"))
        claims = verify_token(tok) if tok else None
    if claims is not None:
        auth.revoke_token(claims.get("jti", ""))
        return LogoutResponse(success=True, detail="Session revoked")
    return LogoutResponse(success=False, detail="No active session")


async def get_current_user(claims: Annotated[dict[str, Any], Depends(auth.require_session)]) -> dict[str, Any]:
    return claims