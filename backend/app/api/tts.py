"""Text-to-speech endpoints."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.core.tts.engine import pace_label, synthesize
from app.services import analytics

router = APIRouter(tags=["tts"])


class TTSRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., min_length=1, max_length=4000)
    voice: Optional[str] = Field(default=None, max_length=100)
    speed: Optional[float] = Field(default=None, ge=0.5, le=2.0)


class TTSResponse(BaseModel):
    audioUrl: str
    duration: float
    voice: Optional[str] = None
    speed: Optional[float] = None
    pace: Optional[str] = None


@router.post("", response_model=TTSResponse)
def speak(payload: TTSRequest) -> TTSResponse:
    """Render text to an audio file and describe it."""
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="text must not be empty")

    rendered = synthesize(text, payload.voice, payload.speed)
    words = len(text.split())

    analytics.record_event(
        "tts",
        {"voice": rendered["voice"], "duration": rendered["duration"], "words": words},
    )

    return TTSResponse(pace=pace_label(rendered["duration"], words), **rendered)
