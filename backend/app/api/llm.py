"""LLM conversation endpoints."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.llm.client import stream_llm_response
from app.core.routing.engine import route_text
from app.services import analytics

router = APIRouter(tags=["llm"])


class LLMMessage(BaseModel):
    role: str = "user"
    content: str = ""
    created_at: Optional[str] = None


class LLMRequest(BaseModel):
    messages: List[LLMMessage] = Field(default_factory=list)
    protocol: Optional[str] = None


class LLMResponse(BaseModel):
    content: str
    protocol: Optional[str] = None
    confidence: Optional[float] = None
    tags: Optional[List[str]] = None
    emotionalState: Optional[str] = None
    nextAction: Optional[str] = None


@router.post("", response_model=LLMResponse)
def generate(payload: LLMRequest) -> LLMResponse:
    """Produce the coach reply for a conversation.

    The last user turn is routed first so the reply is grounded in the current
    protocol, emotional read and next action.
    """
    last_user = next(
        (message.content for message in reversed(payload.messages) if message.role == "user"),
        "",
    )
    if not payload.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    decision = route_text(last_user or " ", payload.protocol)

    content = stream_llm_response(
        [message.model_dump() for message in payload.messages],
        protocol=decision.protocol,
        emotional_state=decision.emotional_state,
        next_action=decision.next_action,
    )

    analytics.record_event(
        "llm",
        {
            "protocol": decision.protocol,
            "confidence": decision.confidence,
            "emotionalState": decision.emotional_state,
        },
    )

    return LLMResponse(
        content=content,
        protocol=decision.protocol,
        confidence=decision.confidence,
        tags=decision.tags,
        emotionalState=decision.emotional_state,
        nextAction=decision.next_action,
    )