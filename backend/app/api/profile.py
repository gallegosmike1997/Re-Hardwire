"""User profile endpoints, scoped to the verified session subject."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.storage import profile as store
from app.services import analytics, auth

router = APIRouter(tags=["profile"])


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=254)
    preferences: Optional[Dict[str, Any]] = Field(default=None, max_length=30)
    permissions: Optional[List[str]] = Field(default=None, max_length=20)

    @field_validator("preferences")
    @classmethod
    def bound_preferences(cls, value):
        if value is None:
            return value
        try:
            size = len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8"))
        except (TypeError, ValueError):
            raise ValueError("preferences must contain valid JSON values") from None
        if size > 8192:
            raise ValueError("preferences is too large")
        return value

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, value):
        if value is None:
            return value
        supported = {"chat", "history", "tts", "analytics", "voice_input"}
        if any(len(permission) > 50 or permission not in supported for permission in value):
            raise ValueError("permissions contains an unsupported capability")
        return value


@router.get("")
def get_profile(claims: dict = Depends(auth.require_session)) -> Dict[str, Any]:
    """Return the caller's profile, seeding a default on first call."""
    return store.load_profile(auth.subject_of(claims))


@router.put("")
def update_profile(
    payload: ProfileUpdate,
    claims: dict = Depends(auth.require_session),
) -> Dict[str, Any]:
    """Merge partial updates into the caller's profile and return the result."""
    subject = auth.subject_of(claims)
    updates = payload.model_dump(exclude_unset=True)
    merged = store.save_profile(subject, updates)
    analytics.record_event("profile.update", {"keys": sorted(updates.keys())})
    return merged


@router.post("/reset")
def reset_profile(claims: dict = Depends(auth.require_session)) -> Dict[str, Any]:
    """Restore the caller's default profile."""
    profile = store.reset_profile(auth.subject_of(claims))
    analytics.record_event("profile.reset", {})
    return profile
