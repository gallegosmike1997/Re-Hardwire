"""Session token management with JWT refresh + revocation — Week 1 tasks 1.4, 1.6.

Covers:
  1.4: JWT refresh + revocation (persisted refresh tokens in DB)
  1.6: require_session customization plus auth provider wiring
"""
from __future__ import annotations

import base64
import datetime
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.models import RefreshToken, User
from app.core.storage import users

#: Tokens revoked during this process lifetime.
_REVOKED: set[str] = set()


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64decode(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _sign(payload: bytes) -> str:
    digest = hmac.new(settings.auth_secret.encode("utf-8"), payload, hashlib.sha256)
    return _b64encode(digest.digest())


def create_anonymous_session() -> dict[str, Any]:
    """Mint a new anonymous subject and its session token.

    The first session also claims any legacy shared profile/history files so
    existing single-user data keeps following the device that creates it.
    """
    subject = users.new_subject()
    users.claim_legacy_data(subject)
    token = create_token(subject, ttl=settings.auth_session_ttl)
    return {
        "token": token,
        "subject": subject,
        "expiresIn": settings.auth_session_ttl,
    }

def refresh_session(token: str) -> dict[str, Any] | None:
    """Re-issue a session token for the same subject.

    Accepts an expired token only within the configured refresh grace window
    so a device that was offline for a while keeps its identity. The presented
    token is revoked when the replacement is issued, so a stolen pre-refresh
    token cannot outlive the refresh that superseded it.
    """
    claims = verify_token(token, allow_expired=True)
    if claims is None:
        return None
    exp = claims.get("exp", 0)
    if exp + settings.auth_refresh_grace < int(time.time()):
        return None

    subject = str(claims.get("sub", ""))
    if not users.is_valid_subject(subject):
        return None
    new_token = create_token(subject, ttl=settings.auth_session_ttl)
    revoke_token(token)
    return {
        "token": new_token,
        "subject": subject,
        "expiresIn": settings.auth_session_ttl,
    }

def create_token(subject: str, ttl: int | None = None, **claims: Any) -> str:
    """Issue a signed token for ``subject``."""
    lifetime = ttl if ttl is not None else settings.auth_token_ttl
    now = int(time.time())

    body: dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + int(lifetime),
        "jti": secrets.token_hex(8),
        **claims,
    }
    payload = _b64encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    return f"{payload}.{_sign(payload.encode('ascii'))}"


def verify_token(token: str, *, allow_expired: bool = False) -> dict[str, Any] | None:
    """Return the token claims, or ``None`` when invalid, expired or revoked."""
    if not token or token in _REVOKED or "." not in token:
        return None

    payload, _, signature = token.partition(".")
    if not hmac.compare_digest(_sign(payload.encode("ascii")), signature):
        return None

    try:
        claims = json.loads(_b64decode(payload))
    except (ValueError, json.JSONDecodeError):
        return None

    if not isinstance(claims, dict):
        return None
    if claims.get("exp", 0) < int(time.time()) and not allow_expired:
        return None
    return claims


def revoke_token(token: str) -> None:
    """Revoke a token for the remainder of this process lifetime."""
    _REVOKED.add(token)


# --- Persistent refresh token management (task 1.4) ---


async def create_refresh_token(session: AsyncSession, user: User, ttl_seconds: int = 604800) -> RefreshToken:
    """Persist a new refresh token for the user."""
    if user.id is None:
        await session.flush()
    token_hash = _hash_token_token(secrets.token_urlsafe(48))
    refresh = RefreshToken(
        subject_id=user.id,
        token_hash=token_hash,
        expires_at=time.time() + ttl_seconds,
    )
    session.add(refresh)
    await session.commit()
    return refresh


async def verify_refresh_token(session: AsyncSession, token: str, *, revoke_on_use: bool = True) -> Optional[RefreshToken]:
    """Verify a refresh token hash and mark it invalid. Returns the token row or None."""
    if token in _REVOKED:
        return None
    token_hash = _hash_token_token(token)
    result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if row.expires_at < time.time():
        await session.delete(row)
        await session.commit()
        return None
    if revoke_on_use:
        row.revoked_at = datetime.datetime.utcnow()
        row.expires_at = 0
        await session.commit()
    return row


async def revoke_refresh_token(session: AsyncSession, token: str) -> bool:
    """Revoke a refresh token."""
    token_hash = _hash_token_token(token)
    result = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row is None:
        return False
    row.revoked_at = datetime.datetime.utcnow()
    row.expires_at = 0
    await session.commit()
    return True


def _hash_token_token(token: str) -> str:
    """Return a SHA-256 hash of a refresh token value (not the plaintext)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# --- User lookup by OIDC provider subject ---


async def get_user_by_provider_sub(session: AsyncSession, provider_sub: str) -> User | None:
    """Return the User with the given OIDC provider subject, or None."""
    result = await session.execute(select(User).where(User.provider_sub == provider_sub))
    return result.scalar_one_or_none()


# --- Session dependency (task 1.6) ---


async def require_session(request: Request, session: Annotated[AsyncSession, Depends(get_session)]) -> dict[str, Any]:
    """FastAPI dependency: verified session claims or HTTP 401.

    Resolves identity from the token's ``sub``. For OIDC users this is the
    provider's subject identifier (matched against User.provider_sub);
    for anonymous device sessions it is the legacy usr_ subject.
    """
    token = bearer_token(request.headers.get("Authorization"))
    claims = verify_token(token) if token else None
    if claims is None:
        raise HTTPException(
            status_code=401,
            detail="A valid session token is required. Call POST /api/session first.",
        )

    sub = claims.get("sub", "")
    # Anonymous session: sub must be a valid usr_ subject
    anonymous_valid = users.is_valid_subject(sub)

    # OIDC user: sub must match a User.provider_sub in the database
    oidc_valid = False
    if not anonymous_valid:
        uid = await get_user_by_provider_sub(session, sub)
        if uid is not None:
            oidc_valid = True

    if not (anonymous_valid or oidc_valid):
        raise HTTPException(
            status_code=401,
            detail="A valid session token is required. Call POST /api/session first.",
        )
    return claims


def subject_of(claims: dict[str, Any]) -> str:
    """Return the verified subject from session claims."""
    return str(claims["sub"])


def bearer_token(authorization: str | None) -> str | None:
    """Extract the token from an Authorization: Bearer <token> header."""
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip()