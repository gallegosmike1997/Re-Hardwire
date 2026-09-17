"""Domain models for the Re-Hardwire routing engine."""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EmotionalState(str, Enum):
    """Coarse emotional read produced by the routing engine."""

    STABLE = "stable"
    ACTIVATED = "activated"
    OVERWHELMED = "overwhelmed"
    DEPLETED = "depleted"
    NUMB = "numb"
    MIXED = "mixed"


class NextAction(str, Enum):
    """What the coach should do directly after a routed turn."""

    CONTINUE_PROTOCOL = "continue_protocol"
    REDUCE_LOAD = "reduce_load"
    GROUND_AND_RESET = "ground_and_reset"
    LOG_MICRO_WIN = "log_micro_win"
    REFLECT_AND_REFRAME = "reflect_and_reframe"
    ESCALATE_SUPPORT = "escalate_support"


class Signal(str, Enum):
    """Scored dimensions extracted from free text."""

    STRESS = "stress"
    CLARITY = "clarity"
    ENERGY = "energy"
    MOMENTUM = "momentum"
    SUPPORT = "support"
    AVOIDANCE = "avoidance"


class Protocol(BaseModel):
    """A named resilience protocol from the Re-Hardwire catalogue."""

    name: str
    level: int
    focus: str
    description: str
    tags: List[str]
    intensity: int = Field(ge=1, le=10)


PROTOCOL_CATALOG: List[Protocol] = [
    Protocol(
        name="Stabilise & Breathe",
        level=1,
        focus="safety",
        description="Down-regulate first. Short breath cycles, no problem solving yet.",
        tags=["grounding", "breath", "safety"],
        intensity=2,
    ),
    Protocol(
        name="Ground & Regulate",
        level=2,
        focus="regulation",
        description="Bring the nervous system back into range before any forward motion.",
        tags=["grounding", "regulation", "routine"],
        intensity=3,
    ),
    Protocol(
        name="Resilience Builder Level 3",
        level=3,
        focus="stability",
        description="Steady load, steady reps. Build the baseline that survives bad days.",
        tags=["mindset", "stability", "focus"],
        intensity=5,
    ),
    Protocol(
        name="Momentum & Load",
        level=4,
        focus="growth",
        description="Push into stretch while protecting recovery windows.",
        tags=["momentum", "growth", "discipline"],
        intensity=7,
    ),
    Protocol(
        name="Pressure Performance",
        level=5,
        focus="performance",
        description="High-load execution with active monitoring for overload signals.",
        tags=["performance", "pressure", "execution"],
        intensity=9,
    ),
]

PROTOCOLS_BY_NAME = {protocol.name: protocol for protocol in PROTOCOL_CATALOG}
PROTOCOLS_BY_LEVEL = {protocol.level: protocol for protocol in PROTOCOL_CATALOG}


def get_protocol(name: Optional[str], level: Optional[int] = None) -> Protocol:
    """Resolve a protocol by name, falling back to a level then to level 3."""
    if name and name in PROTOCOLS_BY_NAME:
        return PROTOCOLS_BY_NAME[name]
    if level is not None and level in PROTOCOLS_BY_LEVEL:
        return PROTOCOLS_BY_LEVEL[level]
    return PROTOCOLS_BY_LEVEL[3]


class SignalBundle(BaseModel):
    """Normalised 0.0-1.0 scores for every routing signal."""

    stress: float = 0.0
    clarity: float = 0.0
    energy: float = 0.0
    momentum: float = 0.0
    support: float = 0.0
    avoidance: float = 0.0

    def as_dict(self) -> dict[str, float]:
        return {
            Signal.STRESS.value: self.stress,
            Signal.CLARITY.value: self.clarity,
            Signal.ENERGY.value: self.energy,
            Signal.MOMENTUM.value: self.momentum,
            Signal.SUPPORT.value: self.support,
            Signal.AVOIDANCE.value: self.avoidance,
        }


class RouteRequest(BaseModel):
    """Incoming routing request. Mirrors ``RouteRequest`` in ``lib/api.ts``."""

    model_config = ConfigDict(populate_by_name=True)

    user_text: str = Field(alias="userText", min_length=1)
    protocol: Optional[str] = None


class RouteResult(BaseModel):
    """Routing decision returned to the client.

    Field aliases match ``RouteResponse`` in ``frontend/lib/api.ts`` so the
    JSON payload uses ``nextAction`` / ``emotionalState``.
    """

    model_config = ConfigDict(populate_by_name=True)

    protocol: str
    confidence: float = Field(ge=0.0, le=1.0)
    tags: List[str] = Field(default_factory=list)
    next_action: str = Field(alias="nextAction")
    emotional_state: str = Field(alias="emotionalState")

    signals: Optional[SignalBundle] = None
    rationale: Optional[str] = None