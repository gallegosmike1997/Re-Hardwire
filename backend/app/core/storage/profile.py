"""User profile persistence, scoped to a verified session subject.

Matches the ``UserProfile`` interface in ``frontend/lib/api.ts``::

    { id, name, email, preferences, permissions, createdAt }

Every function takes the authenticated subject; the profile id equals the
subject so clients can correlate sessions without a second identifier.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.config import settings

from . import users
from ._json import read_json, write_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_profile(subject: str) -> dict:
    """The profile handed out on a fresh install for ``subject``."""
    return {
        "id": subject,
        "name": "Operator",
        "email": "operator@re-hardwire.local",
        "preferences": {
            "defaultProtocol": settings.default_protocol,
            "ttsEnabled": True,
            "voiceInput": True,
            "analyticsEnabled": True,
            "theme": "dark",
        },
        "permissions": list(settings.default_permissions),
        "createdAt": _now(),
    }


def load_profile(subject: str) -> dict:
    """Load the stored profile for ``subject``, seeding a default when absent."""
    stored = read_json(users.profile_file(subject), None)
    if not isinstance(stored, dict):
        profile = default_profile(subject)
        write_json(users.profile_file(subject), profile)
        return profile

    # Backfill any keys added since the file was written.
    merged = {**default_profile(subject), **stored}
    merged["id"] = subject  # Identity always comes from the verified token.
    merged["preferences"] = {
        **default_profile(subject)["preferences"],
        **(stored.get("preferences") or {}),
    }
    merged["permissions"] = list(stored.get("permissions") or settings.default_permissions)
    return merged


def save_profile(subject: str, updates: Dict[str, Any]) -> dict:
    """Merge ``updates`` into the stored profile for ``subject`` and persist it."""
    current = load_profile(subject)

    for key in ("name", "email"):
        if updates.get(key) is not None:
            current[key] = updates[key]

    if isinstance(updates.get("preferences"), dict):
        current["preferences"] = {**current["preferences"], **updates["preferences"]}

    if isinstance(updates.get("permissions"), list):
        current["permissions"] = _unique(updates["permissions"])

    write_json(users.profile_file(subject), current)
    return current


def set_permission(subject: str, permission: str, enabled: bool) -> dict:
    """Grant or revoke a single permission for ``subject``."""
    current = load_profile(subject)
    permissions = set(current["permissions"])
    if enabled:
        permissions.add(permission)
    else:
        permissions.discard(permission)
    return save_profile(subject, {"permissions": sorted(permissions)})


def has_permission(subject: str, permission: str) -> bool:
    """Check whether ``subject`` currently grants ``permission``."""
    return permission in load_profile(subject)["permissions"]


def reset_profile(subject: str) -> dict:
    """Restore the default profile for ``subject``."""
    profile = default_profile(subject)
    write_json(users.profile_file(subject), profile)
    return profile


def _unique(values: List[Any]) -> List[str]:
    seen: List[str] = []
    for value in values:
        text = str(value)
        if text and text not in seen:
            seen.append(text)
    return seen