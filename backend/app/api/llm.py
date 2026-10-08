"""LLM conversation endpoints."""
from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.core.llm.client import ProviderError, stream_llm_response
from app.core.routing.engine import route_text
from app.services import analytics

router = APIRouter(tags=["llm"])


class LLMMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Callers may provide conversation turns, but never their own system prompt.
    role: Literal["user", "assistant"] = "user"
    content: str = Field(default="", max_length=4000)
    created_at: Optional[str] = Field(default=None, max_length=50)


class LLMRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messages: List[LLMMessage] = Field(default_factory=list, max_length=40)
    protocol: Optional[str] = Field(default=None, max_length=100)


def _latest_user_text(payload: LLMRequest) -> str:
    """Require a fresh user turn before generating any assistant reply."""
    if not payload.messages or payload.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="The latest message must be from the user")
    text = payload.messages[-1].content.strip()
    if not text:
        raise HTTPException(status_code=422, detail="A nonempty user message is required")
    return text


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
    last_user = _latest_user_text(payload)

    decision = route_text(last_user, payload.protocol)

    try:
        content = stream_llm_response(
            [message.model_dump() for message in payload.messages],
            protocol=decision.protocol,
            emotional_state=decision.emotional_state,
            next_action=decision.next_action,
        )
    except ProviderError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None

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


@router.post("/stream")
async def generate_stream(payload: LLMRequest):
    """NDJSON: route, delta*, done OR error. Disconnect cancels upstream I/O."""
    import json
    from fastapi.responses import StreamingResponse
    from app.core.llm.streaming import stream_reply

    last_user = _latest_user_text(payload)
    decision = route_text(last_user, payload.protocol)
    route = {"protocol": decision.protocol, "confidence": decision.confidence,
             "tags": decision.tags, "emotionalState": decision.emotional_state,
             "nextAction": decision.next_action}

    def event(kind, **values):
        return json.dumps({"type": kind, **values}) + "\n"

    async def events():
        yield event("route", route=route)
        try:
            async for content in stream_reply(
                [m.model_dump() for m in payload.messages], decision.protocol,
                decision.emotional_state, decision.next_action,
            ):
                yield event("delta", content=content)
        except ProviderError as exc:
            yield event("error", error=str(exc))
            return
        yield event("done")

    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
