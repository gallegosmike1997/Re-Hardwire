"""Lightweight local analytics.

Every routed turn, LLM reply and TTS render is appended to
``data/analytics.json``. There is no third-party telemetry: the store is a
plain local file and can be wiped with :func:`reset`.

Privacy rule: analytics payloads must NEVER contain user transcripts,
message content, names, emails, or free-text fields. Only coarse counters
and routing labels are stored. :func:`record_event` enforces this with a
denylist and redacts violations instead of storing them.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings

from app.core.storage._json import read_json, write_json

#: Hard cap on retained events so the store cannot grow without bound.
MAX_EVENTS = 500

#: Payload keys that must never reach the analytics store. Any event
#: carrying one of these is stored with the value replaced by "[redacted]"
#: and the key flagged, so a future code change cannot silently start
#: persisting transcripts or personal data.
FORBIDDEN_PAYLOAD_KEYS = frozenset({
    "messages",
    "message",
    "content",
    "text",
    "user_text",
    "userText",
    "transcript",
    "history",
    "name",
    "email",
    "preferences",
    "answers",
    "plan",
    "support_plan",
    "supportPlan",
})

#: Payload keys allowed without review. Anything else is dropped so new
#: free-text fields fail closed instead of leaking into the store.
ALLOWED_PAYLOAD_KEYS = frozenset({
    "engine",
    "protocol",
    "confidence",
    "emotionalState",
    "emotional_state",
    "nextAction",
    "next_action",
    "detected_state",
    "reason",
    "tags",
    "semantic_scores",
    "keyword_scores",
    "success",
    "previous_weights",
    "updated_weights",
    "sessionId",
    "messages_count",
    "words",
    "duration",
    "voice",
    "keys",
    "subject",
    "id",
    "redacted_keys",
})


def _scrub_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Allowlist payload keys; redact denylisted values instead of storing them."""
    scrubbed: Dict[str, Any] = {}
    redacted: List[str] = []
    for key, value in payload.items():
        if key in FORBIDDEN_PAYLOAD_KEYS:
            redacted.append(key)
            continue
        if key not in ALLOWED_PAYLOAD_KEYS:
            redacted.append(key)
            continue
        scrubbed[key] = value
    if redacted:
        scrubbed["redacted_keys"] = sorted(redacted)
    return scrubbed


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> Dict[str, Any]:
    store = read_json(settings.analytics_file, None)
    if not isinstance(store, dict):
        store = {"startedAt": _now(), "events": []}
    store.setdefault("startedAt", _now())
    store.setdefault("events", [])
    return store


def record_event(name: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Append an event to the local store and return the stored record.

    Payloads are scrubbed: transcript-like or unknown keys are dropped and
    listed under ``redacted_keys`` so leaks fail closed.
    """
    store = _load()
    event = {"name": name, "at": _now(), "payload": _scrub_payload(payload or {})}

    events: List[Dict[str, Any]] = store["events"]
    events.append(event)
    store["events"] = events[-MAX_EVENTS:]

    write_json(settings.analytics_file, store)
    return event


def list_events(limit: int = 100) -> List[Dict[str, Any]]:
    """Return the most recent events, newest first."""
    store = _load()
    events = store["events"]
    return list(reversed(events[-limit:]))


def summary() -> Dict[str, Any]:
    """Aggregate the event store for the Dev and Lab dashboards."""
    store = _load()
    events: List[Dict[str, Any]] = store["events"]

    by_name = Counter(event["name"] for event in events)
    protocols = Counter()
    states = Counter()
    confidences: List[float] = []

    for event in events:
        payload = event.get("payload") or {}
        if payload.get("protocol"):
            protocols[str(payload["protocol"])] += 1
        if payload.get("emotionalState"):
            states[str(payload["emotionalState"])] += 1
        if isinstance(payload.get("confidence"), (int, float)):
            confidences.append(float(payload["confidence"]))

    average = round(sum(confidences) / len(confidences), 4) if confidences else 0.0

    return {
        "startedAt": store["startedAt"],
        "events": len(events),
        "byName": dict(by_name),
        "protocols": dict(protocols),
        "emotionalStates": dict(states),
        "avgConfidence": average,
    }


def reset() -> None:
    """Clear all recorded events."""
    write_json(settings.analytics_file, {"startedAt": _now(), "events": []})