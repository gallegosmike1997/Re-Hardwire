import json
import os
from typing import Any

# ---------------------------------------------------------
# DEFAULTS
# ---------------------------------------------------------

DEFAULT_PROFILE = {
    "name": "",
    "thoughts": [],
    "feelings": [],
    "goals": "",
    "hobbies": [],
}

MAX_HISTORY = 300

# ---------------------------------------------------------
# SAFE JSON HELPERS
# ---------------------------------------------------------

def _safe_read_json(path: str, default: Any):
    """Safely read JSON from disk with fallback."""
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return default
    return default


def _safe_write_json(path: str, data: Any):
    """Atomic JSON write to prevent corruption."""
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)

# ---------------------------------------------------------
# HISTORY STORAGE API
# ---------------------------------------------------------

def load_saved_history(history_file: str):
    """Load full chat history from disk."""
    return _safe_read_json(history_file, [])


def save_history_to_disk(history_file: str, history_data):
    """Save chat history with trimming + safety."""
    if not isinstance(history_data, list):
        history_data = []

    # Trim history to MAX_HISTORY
    if len(history_data) > MAX_HISTORY:
        history_data = history_data[-MAX_HISTORY:]

    _safe_write_json(history_file, history_data)


def get_history(history_file: str) -> list:
    """Public API used by UI/chat to fetch history."""
    return load_saved_history(history_file)


def add_message(history_file: str, role: str, content: str):
    """Append a message to history and save."""
    history = load_saved_history(history_file)
    history.append({"role": role, "content": content})
    save_history_to_disk(history_file, history)

# ---------------------------------------------------------
# PROFILE STORAGE API
# ---------------------------------------------------------

def load_saved_profile(profile_file: str):
    """Load user profile with defaults."""
    return _safe_read_json(profile_file, DEFAULT_PROFILE.copy())


def save_profile_to_disk(profile_file: str, profile_data):
    """Save user profile safely."""
    if not isinstance(profile_data, dict):
        profile_data = DEFAULT_PROFILE.copy()
    _safe_write_json(profile_file, profile_data)
