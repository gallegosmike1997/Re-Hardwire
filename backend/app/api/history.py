"""Conversation history endpoints."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from app.core.storage import history as store
from app.services import analytics

router = APIRouter(tags=["history"])


class StoredMessage(BaseModel):
    role: str = "user"
    content: str = ""
    created_at: Optional[str] = None


class HistoryCreate(BaseModel):
    """Body for ``POST /api/history`` - mirrors ``Omit<HistoryEntry, 'id'>``."""

    model_config = ConfigDict(populate_by_name=True)

    session_id: Optional[str] = Field(default=None, alias="sessionId")
    messages: List[StoredMessage] = Field(default_factory=list)
    created_at: Optional[str] = Field(default=None, alias="createdAt")
    protocol_used: Optional[str] = Field(default=None, alias="protocolUsed")


@router.get("")
def list_sessions(sessionId: Optional[str] = Query(default=None)) -> List[dict]:
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