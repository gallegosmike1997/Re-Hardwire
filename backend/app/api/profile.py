"""User profile endpoints."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Body

from app.core.storage import profile as store
from app.services import analytics, auth

router = APIRouter(tags=["profile"])


@router.get("")
def get_profile() -> Dict[str, Any]:
    """Return the active profile, seeding a default on first call."""
    return store.load_profile()


@router.put("")
def update_profile(updates: Dict[str, Any] = Body(default_factory=dict)) -> Dict[str, Any]:
    """Merge partial updates into the profile and return the result."""
    merged = store.save_profile(updates)
    analytics.record_event("profile.update", {"keys": sorted(updates.keys())})
    return merged


@router.post("/session")
def create_session() -> Dict[str, Any]:
    """Issue a signed session token for the current profile."""
    profile = store.load_profile()
    session = auth.issue_session(profile)
    analytics.record_event("profile.session", {"subject": session["subject"]})
    return session


@router.post("/reset")
def reset_profile() -> Dict[str, Any]:
    """Restore the default profile."""
    profile = store.reset_profile()
    analytics.record_event("profile.reset", {})
    return profile