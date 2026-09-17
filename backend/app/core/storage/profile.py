"""User profile persistence.

Matches the ``UserProfile`` interface in ``frontend/lib/api.ts``::

    { id, name, email, preferences, permissions, createdAt }
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings

from ._json import read_json, write_json

PROFILE_ID = "profile_primary"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_profile() -> dict:
    """The profile handed out on a fresh install."""
    return {
        "id": PROFILE_ID,
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


def load_profile() -> dict:
    """Load the stored profile, seeding a default one when absent."""
    stored = read_json(settings.profile_file, None)
    if not isinstance(stored, dict):
        profile = default_profile()
        write_json(settings.profile_file, profile)
        return profile

    # Backfill any keys added since the file was written.
    merged = {**default_profile(), **stored}
    merged["preferences"] = {
        **default_profile()["preferences"],
        **(stored.get("preferences") or {}),
    }
    merged["permissions"] = list(stored.get("permissions") or settings.default_permissions)
    return merged


def save_profile(updates: Dict[str, Any]) -> dict:
    """Merge ``updates`` into the stored profile and persist it."""
    current = load_profile()

    for key in ("name", "email"):
        if updates.get(key) is not None:
            current[key] = updates[key]

    if isinstance(updates.get("preferences"), dict):
        current["preferences"] = {**current["preferences"], **updates["preferences"]}

    if isinstance(updates.get("permissions"), list):
        current["permissions"] = _unique(updates["permissions"])

    write_json(settings.profile_file, current)
    return current


def set_permission(permission: str, enabled: bool) -> dict:
    """Grant or revoke a single permission."""
    current = load_profile()
    permissions = set(current["permissions"])
    if enabled:
        permissions.add(permission)
    else:
        permissions.discard(permission)
    return save_profile({"permissions": sorted(permissions)})


def has_permission(permission: str) -> bool:
    """Check whether the profile currently grants ``permission``."""
    return permission in load_profile()["permissions"]


def reset_profile() -> dict:
    """Restore the default profile."""
    profile = default_profile()
    write_json(settings.profile_file, profile)
    return profile


def _unique(values: List[Any]) -> List[str]:
    seen: List[str] = []
    for value in values:
        text = str(value)
        if text and text not in seen:
            seen.append(text)
    return seen