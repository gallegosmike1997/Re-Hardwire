"""Per-user storage directories and legacy shared-data migration.

Subjects are the verified token subject (``sub``) issued by
:mod:`app.services.auth`. They are validated against a strict pattern before
being used as directory names so a crafted token can never escape the
``users/`` tree via path traversal.
"""
from __future__ import annotations

import os
import re
import threading
import uuid
from pathlib import Path

from app.core.config import settings

from ._json import read_json, write_json

#: ``usr_`` followed by a uuid4 hex string; the only shape used as a directory.
_SUBJECT_RE = re.compile(r"usr_[0-9a-f]{32}")

_MIGRATION_MARKER = "legacy-claimed.json"
_MIGRATION_LOCK = threading.Lock()


def new_subject() -> str:
    """Mint a fresh anonymous subject identifier."""
    return f"usr_{uuid.uuid4().hex}"


def is_valid_subject(subject: object) -> bool:
    """Return True when ``subject`` is a safe per-user directory name."""
    return isinstance(subject, str) and bool(_SUBJECT_RE.fullmatch(subject))


def user_dir(subject: str) -> Path:
    """Return the storage directory for ``subject`` (not created)."""
    if not is_valid_subject(subject):
        raise ValueError("invalid subject")
    return settings.users_dir / subject


def profile_file(subject: str) -> Path:
    """Return the per-user profile file path."""
    return user_dir(subject) / "profile.json"


def history_file(subject: str) -> Path:
    """Return the per-user history file path."""
    return user_dir(subject) / "history.json"


def ensure_user(subject: str) -> None:
    """Create the per-user directory with owner-only permissions."""
    path = user_dir(subject)
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.name != "nt":
        os.chmod(path, 0o700)


def claim_legacy_data(subject: str) -> bool:
    """One-time migration: the first session inherits the legacy shared files.

    A marker file records the claim so later subjects never receive the same
    data. Returns True when this call performed the migration.
    """
    with _MIGRATION_LOCK:
        marker = settings.users_dir / _MIGRATION_MARKER
        if marker.exists():
            return False

        ensure_user(subject)
        claimed = False

        legacy_profile = read_json(settings.profile_file, None)
        if isinstance(legacy_profile, dict):
            legacy_profile["id"] = subject
            write_json(profile_file(subject), legacy_profile)
            claimed = True

        legacy_history = read_json(settings.history_file, None)
        if isinstance(legacy_history, list) and legacy_history:
            write_json(history_file(subject), legacy_history)
            claimed = True

        write_json(marker, {"subject": subject, "claimedAnyData": claimed})
        return True
