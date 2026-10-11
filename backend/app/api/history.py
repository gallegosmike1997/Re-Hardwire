"""Conversation history endpoints."""
from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.core.storage import history as store
from app.services import analytics, auth

router = APIRouter(tags=["history"])


class StoredMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"] = "user"
    content: str = Field(default="", max_length=8000)
    created_at: Optional[str] = Field(default=None, max_length=50)


class HistoryCreate(BaseModel):
    """Body for ``POST /api/history`` - mirrors ``Omit<HistoryEntry, 'id'>``."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    session_id: Optional[str] = Field(default=None, alias="sessionId", max_length=100)
    messages: List[StoredMessage] = Field(default_factory=list, max_length=400)
    created_at: Optional[str] = Field(default=None, alias="createdAt", max_length=50)
    protocol_used: Optional[str] = Field(default=None, alias="protocolUsed", max_length=100)


@router.get("")
def list_sessions(
    sessionId: Optional[str] = Query(default=None, max_length=100),
    claims: dict = Depends(auth.require_session),
) -> List[dict]:
    """List the caller's stored sessions, newest first, optionally filtered."""
    return store.list_history(auth.subject_of(claims), sessionId)


@router.post("")
def create_session(
    payload: HistoryCreate,
    claims: dict = Depends(auth.require_session),
) -> dict:
    """Persist a session for the caller and return the stored record."""
    record = store.save_history(auth.subject_of(claims), payload.model_dump(by_alias=True))
    analytics.record_event(
        "history.save",
        {"sessionId": record["sessionId"], "messages": len(record["messages"])},
    )
    return record


@router.get("/{entry_id}")
def get_session(entry_id: str, claims: dict = Depends(auth.require_session)) -> dict:
    """Fetch a single stored session belonging to the caller."""
    record = store.get_history(auth.subject_of(claims), entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return record


@router.delete("/{entry_id}")
def delete_session(entry_id: str, claims: dict = Depends(auth.require_session)) -> dict:
    """Delete a stored session belonging to the caller."""
    if not store.delete_history(auth.subject_of(claims), entry_id):
        raise HTTPException(status_code=404, detail="Session not found")
    analytics.record_event("history.delete", {"id": entry_id})
    return {"deleted": True, "id": entry_id}
