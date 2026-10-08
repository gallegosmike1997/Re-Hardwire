"""Conversation history endpoints."""
from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.core.storage import history as store
from app.services import analytics

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
def list_sessions(sessionId: Optional[str] = Query(default=None, max_length=100)) -> List[dict]:
    """List stored sessions, newest first, optionally filtered by sessionId."""
    return store.list_history(sessionId)


@router.post("")
def create_session(payload: HistoryCreate) -> dict:
    """Persist a session and return the stored record."""
    record = store.save_history(payload.model_dump(by_alias=True))
    analytics.record_event(
        "history.save",
        {"sessionId": record["sessionId"], "messages": len(record["messages"])},
    )
    return record


@router.get("/{entry_id}")
def get_session(entry_id: str) -> dict:
    """Fetch a single stored session."""
    record = store.get_history(entry_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return record


@router.delete("/{entry_id}")
def delete_session(entry_id: str) -> dict:
    """Delete a stored session."""
    if not store.delete_history(entry_id):
        raise HTTPException(status_code=404, detail="Session not found")
    analytics.record_event("history.delete", {"id": entry_id})
    return {"deleted": True, "id": entry_id}
