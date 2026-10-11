"""Minimal HMAC-signed session tokens.

This is deliberately dependency-free and is **not** a replacement for a real
identity provider: tokens are self-signed with a shared secret, there is no
key rotation and revocation is in-memory only. It exists so local and packaged
builds can carry a session identity without pulling in an auth stack.

Anonymous device flow: ``create_anonymous_session`` mints a random subject
plus a long-lived token; ``refresh_session`` re-issues for the same subject
within an expiry grace window. Private routes resolve the owner exclusively
from the verified token subject via :func:`require_session`.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request

from app.core.config import settings
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


def create_token(subject: str, ttl: Optional[int] = None, **claims: Any) -> str:
    """Issue a signed token for ``subject``."""
    lifetime = ttl if ttl is not None else settings.auth_token_ttl
    now = int(time.time())

    body: Dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": now + int(lifetime),
        **claims,
    }
    payload = _b64encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    return f"{payload}.{_sign(payload.encode('ascii'))}"


def verify_token(token: str, *, allow_expired: bool = False) -> Optional[Dict[str, Any]]:
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


def create_anonymous_session() -> Dict[str, Any]:
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


def refresh_session(token: str) -> Optional[Dict[str, Any]]:
    """Re-issue a session token for the same subject.

    Accepts an expired token only within the configured refresh grace window
    so a device that was offline for a while keeps its identity.
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
    return {
        "token": new_token,
        "subject": subject,
        "expiresIn": settings.auth_session_ttl,
    }


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the token from an ``Authorization: Bearer <token>`` header."""
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip()


def require_session(request: Request) -> Dict[str, Any]:
    """FastAPI dependency: verified session claims or HTTP 401.

    Callers must derive ownership from the returned ``sub`` only; request
    bodies never carry identity.
    """
    token = bearer_token(request.headers.get("Authorization"))
    claims = verify_token(token) if token else None
    if claims is None or not users.is_valid_subject(claims.get("sub")):
        raise HTTPException(
            status_code=401,
            detail="A valid session token is required. Call POST /api/session first.",
        )
    return claims


def subject_of(claims: Dict[str, Any]) -> str:
    """Return the verified subject from session claims."""
    return str(claims["sub"])