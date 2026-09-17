"""Minimal HMAC-signed session tokens.

This is deliberately dependency-free and is **not** a replacement for a real
identity provider: tokens are self-signed with a shared secret, there is no
key rotation and revocation is in-memory only. It exists so local and packaged
builds can carry a session identity without pulling in an auth stack.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional

from app.core.config import settings

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


def verify_token(token: str) -> Optional[Dict[str, Any]]:
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

    if not isinstance(claims, dict) or claims.get("exp", 0) < int(time.time()):
        return None
    return claims


def revoke_token(token: str) -> None:
    """Revoke a token for the remainder of this process lifetime."""
    _REVOKED.add(token)


def issue_session(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Create a session bundle for a profile record."""
    subject = str(profile.get("id", "anonymous"))
    token = create_token(subject, permissions=list(profile.get("permissions") or []))
    return {
        "token": token,
        "subject": subject,
        "expiresIn": settings.auth_token_ttl,
    }


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract the token from an ``Authorization: Bearer <token>`` header."""
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value:
        return None
    return value.strip()