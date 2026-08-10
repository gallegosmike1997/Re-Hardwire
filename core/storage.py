import json
import os
from typing import Any

DEFAULT_PROFILE = {
    "name": "",
    "thoughts": [],
    "feelings": [],
    "goals": "",
    "hobbies": [],
}

MAX_HISTORY = 300


def _safe_read_json(path: str, default: Any):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return default
    return default


def _safe_write_json(path: str, data: Any):
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def load_saved_history(history_file: str):
    return _safe_read_json(history_file, [])


def save_history_to_disk(history_file: str, history_data):
    if not isinstance(history_data, list):
        history_data = []
    if len(history_data) > MAX_HISTORY:
        history_data = history_data[-MAX_HISTORY:]
    _safe_write_json(history_file, history_data)


def load_saved_profile(profile_file: str):
    return _safe_read_json(profile_file, DEFAULT_PROFILE.copy())


def save_profile_to_disk(profile_file: str, profile_data):
    if not isinstance(profile_data, dict):
        profile_data = DEFAULT_PROFILE.copy()
    _safe_write_json(profile_file, profile_data)
