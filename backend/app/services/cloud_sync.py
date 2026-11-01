"""Google Drive cloud sync for Re-Hardwire user data.

Syncs profile.json and history.json to Google Drive per user with offline-first design.
- Files are stored under ``users/<subject>/`` directory structure in Drive
- Local files are primary; cloud is authoritative when online
- Conflict resolution: last-write-wins with timestamp metadata
"""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pathlib import Path

from app.core.config import settings
from app.core.storage import users, profile as profile_store, history as history_store

from app.core.storage._json import read_json, write_json

#: Base path in Google Drive for Re-Hardwire user data
_DRIVE_BASE_FOLDER_ID = "app_re_hardwire_user_data"  # Will be created on first sync

#: Lock for concurrent sync operations
_sync_lock = threading.Lock()


def _get_user_drive_path(subject: str) -> str:
    """Return the Google Drive path for a user's data."""
    # Normalize subject: usr_ or reg_ prefix
    if subject.startswith("reg_"):
        return f"registered/{subject}/"
    return f"anonymous/{subject}/"


def _get_profile_drive_path(subject: str) -> str:
    """Return the full Drive path for a user's profile."""
    return f"{_get_user_drive_path(subject)}profile.json"


def _get_history_drive_path(subject: str) -> str:
    """Return the full Drive path for a user's history."""
    return f"{_get_user_drive_path(subject)}history.json"


def _ensure_drive_folder() -> str:
    """Ensure the base Drive folder exists, return its ID.

    In a full implementation, this would use GOOGLEDRIVE_FIND_FILE or
    GOOGLEDRIVE_CREATE_PERMISSION. For now, we use a placeholder folder ID.
    """
    # TODO: Implement actual folder creation/verification
    return _DRIVE_BASE_FOLDER_ID


def sync_profile_to_drive(subject: str) -> Dict[str, Any]:
    """Sync the user's profile to Google Drive.

    Returns metadata about the uploaded file.
    """
    with _sync_lock:
        profile = profile_store.load_profile(subject)

        # Write profile to a temp file, then upload
        profile_path = users.profile_file(subject)
        if not profile_path.exists():
            return {"error": "profile file does not exist locally"}

        # Read the profile JSON
        with open(profile_path, "r", encoding="utf-8") as f:
            profile_data = json.load(f)

        # Upload to Google Drive
        # TODO: Use GOOGLEDRIVE_UPLOAD_FILE tool
        # For now, return structure indicating what would happen

        result = {
            "subject": subject,
            "drive_path": _get_profile_drive_path(subject),
            "profile_name": profile.get("name", "Unknown"),
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "file_size_bytes": len(json.dumps(profile_data).encode("utf-8")),
        }

        return result


def sync_history_to_drive(subject: str) -> Dict[str, Any]:
    """Sync the user's conversation history to Google Drive.

    Returns metadata about the uploaded file.
    """
    with _sync_lock:
        history_records = history_store._load_all(subject)

        # History file path
        history_path = users.history_file(subject)

        # Read the history JSON
        if history_path.exists():
            with open(history_path, "r", encoding="utf-8") as f:
                history_data = json.load(f)
        else:
            history_data = []

        # Upload to Google Drive
        # TODO: Use GOOGLEDRIVE_UPLOAD_FILE tool
        result = {
            "subject": subject,
            "drive_path": _get_history_drive_path(subject),
            "entry_count": len(history_data),
            "syncedAt": datetime.now(timezone.utc).isoformat(),
        }

        return result


def sync_user_data_to_drive(subject: str) -> Dict[str, Any]:
    """Sync both profile and history to Google Drive for a user."""
    profile_result = sync_profile_to_drive(subject)
    history_result = sync_history_to_drive(subject)

    return {
        "subject": subject,
        "profile": profile_result,
        "history": history_result,
    }


def fetch_profile_from_drive(subject: str) -> Optional[dict]:
    """Fetch profile from Google Drive, returning None if not available.

    Implements offline-first: returns local profile if cloud sync is
    unavailable or outdated.
    """
    # TODO: Use GOOGLEDRIVE_DOWNLOAD_FILE or GOOGLEDRIVE_GET_FILE_METADATA
    # For now, return None to indicate not implemented
    return None


def fetch_history_from_drive(subject: str) -> Optional[list]:
    """Fetch history from Google Drive, returning None if not available."""
    # TODO: Use GOOGLEDRIVE_DOWNLOAD_FILE or GOOGLEDRIVE_GET_FILE_METADATA
    # For now, return None to indicate not implemented
    return None


def resolve_sync_conflict(
    subject: str, local_profile: dict, cloud_profile: dict
) -> dict:
    """Resolve sync conflict between local and cloud profile data.

    Strategy: last-write-wins based on syncedAt timestamp.
    """
    local_updated = local_profile.get("updatedAt", local_profile.get("createdAt", ""))
    cloud_updated = cloud_profile.get("updatedAt", cloud_profile.get("createdAt", ""))

    # Compare ISO format timestamps
    try:
        local_time = datetime.fromisoformat(local_updated.replace("Z", "+00:00"))
        cloud_time = datetime.fromisoformat(cloud_updated.replace("Z", "+00:00"))

        if cloud_time > local_time:
            return cloud_profile  # Cloud is newer
    except (ValueError, AttributeError):
        pass  # If timestamps can't be parsed, keep local

    return local_profile  # Default to local