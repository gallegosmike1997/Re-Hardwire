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

from . import users
from ._json import new_id, read_json, write_json


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load_all(subject: str) -> List[dict]:
    records = read_json(users.history_file(subject), [])
    return records if isinstance(records, list) else []


def list_history(subject: str, session_id: Optional[str] = None) -> List[dict]:
    """Return the subject's stored sessions, newest first, optionally filtered."""
    records = _load_all(subject)
    if session_id:
        records = [item for item in records if item.get("sessionId") == session_id]
    records.sort(key=lambda item: item.get("createdAt", ""), reverse=True)
    return records[: settings.history_limit]


def get_history(subject: str, entry_id: str) -> Optional[dict]:
    """Return a single session by its record id within the subject's store."""
    for item in _load_all(subject):
        if item.get("id") == entry_id:
            return item
    return None


def save_history(subject: str, session: dict) -> dict:
    """Persist a session for ``subject``, assigning an id and timestamps."""
    records = _load_all(subject)

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

    write_json(users.history_file(subject), records[-settings.history_limit :])
    return record


def delete_history(subject: str, entry_id: str) -> bool:
    """Remove a session from the subject's store. True when something was deleted."""
    records = _load_all(subject)
    remaining = [item for item in records if item.get("id") != entry_id]
    if len(remaining) == len(records):
        return False
    write_json(users.history_file(subject), remaining)
    return True


def clear_history(subject: str) -> None:
    """Remove every stored session for the subject."""
    write_json(users.history_file(subject), [])


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