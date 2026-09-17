"""Routing endpoints."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.core.routing.engine import route_text
from app.core.routing.models import PROTOCOL_CATALOG, Protocol, RouteRequest, RouteResult
from app.services import analytics

router = APIRouter(tags=["routing"])


@router.post("", response_model=RouteResult)
def route_turn(payload: RouteRequest) -> RouteResult:
    """Route a single user turn to a protocol, state and next action."""
    text = payload.user_text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="userText must not be empty")

    result = route_text(text, payload.protocol)
    analytics.record_event(
        "route",
        {
            "protocol": result.protocol,
            "confidence": result.confidence,
            "emotionalState": result.emotional_state,
            "nextAction": result.next_action,
        },
    )
    return result


@router.get("/protocols", response_model=List[Protocol])
def list_protocols() -> List[Protocol]:
    """Return the full protocol catalogue, ordered by level."""
    return sorted(PROTOCOL_CATALOG, key=lambda protocol: protocol.level)


@router.get("/stats")
def route_stats() -> dict:
    """Aggregate routing activity for the Lab and Dev dashboards."""
    return analytics.summary()