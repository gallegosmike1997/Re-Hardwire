import json
import os

PROFILE_PATH = "user_profile.json"


def load_profile_from_disk():
    """
    Load user profile from disk.
    Returns a dict with defaults if file does not exist.
    """
    if not os.path.exists(PROFILE_PATH):
        return {
            "preferred_protocol": None,
            "auto_routing": True,
            "notes": "",
        }

    try:
        with open(PROFILE_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return {
            "preferred_protocol": None,
            "auto_routing": True,
            "notes": "",
        }


def save_profile_to_disk(profile: dict):
    """
    Save user profile to disk.
    """
    try:
        with open(PROFILE_PATH, "w") as f:
            json.dump(profile, f, indent=4)
        return True
    except Exception:
        return False


def load_user_profile():
    return load_profile_from_disk()


def save_user_profile(profile):
    return save_profile_to_disk(profile)
