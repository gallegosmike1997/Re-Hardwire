"""Conversation history persistence.

Records match the ``HistoryEntry`` interface in ``frontend/lib/api.ts``::

    { id, sessionId, messages: [{ role, content, created_at }],
      createdAt, protocolUsed }

Field names stay camelCase in the stored JSON so the API can return them
untouched.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings

from ._json import new_id, read_json, write_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_all() -> List[dict]:
    records = read_json(settings.history_file, [])
    return records if isinstance(records, list) else []


def list_history(session_id: Optional[str] = None) -> List[dict]:
    """Return stored sessions, newest first, optionally filtered by session."""
    records = _load_all()
    if session_id:
        records = [item for item in records if item.get("sessionId") == session_id]
    records.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
    return records[: settings.history_limit]


def get_history(entry_id: str) -> Optional[dict]:
    """Return a single session by its record id."""
    for item in _load_all():
        if item.get("id") == entry_id:
            return item
    return None


def save_history(session: dict) -> dict:
    """Persist a session, assigning an id and timestamps when missing."""
    records = _load_all()

    record = {
        "id": session.get("id") or new_id("session", [r.get("id", "") for r in records]),
        "sessionId": session.get("sessionId") or new_id("thread"),
        "messages": _normalise_messages(session.get("messages")),
        "createdAt": session.get("createdAt") or _now(),
        "protocolUsed": session.get("protocolUsed"),
    }

    for index, item in enumerate(records):
        if item.get("id") == record["id"]:
            records[index] = record
            break
    else:
        records.append(record)

    write_json(settings.history_file, records[-settings.history_limit :])
    return record


def delete_history(entry_id: str) -> bool:
    """Remove a session. Returns True when something was deleted."""
    records = _load_all()
    remaining = [item for item in records if item.get("id") != entry_id]
    if len(remaining) == len(records):
        return False
    write_json(settings.history_file, remaining)
    return True


def clear_history() -> None:
    """Remove every stored session."""
    write_json(settings.history_file, [])


def _normalise_messages(messages: Optional[List[dict]]) -> List[dict]:
    """Coerce stored messages into ``{role, content, created_at}`` shape."""
    normalised: List[dict] = []
    for message in messages or []:
        if not isinstance(message, dict):
            continue
        normalised.append(
            {
                "role": str(message.get("role", "user")),
                "content": str(message.get("content", "")),
                "created_at": message.get("created_at") or _now(),
            }
        )
    return normalised