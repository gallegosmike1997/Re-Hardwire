"""LLM client for Re-Hardwire.

Defaults to a deterministic, local response generator so the whole stack runs
with zero external dependencies and zero API keys. Point ``LLM_PROVIDER`` at a
real backend later and implement :func:`_remote_response` - the public
signatures stay identical either way.
"""
from __future__ import annotations

from typing import Iterable, Iterator, List, Mapping, Optional

from app.core.config import settings

from .prompts import last_user_message

CRISIS_TERMS = (
    "kill myself", "end my life", "suicide", "suicidal", "self harm",
    "self-harm", "hurt myself", "no reason to live", "better off dead",
)

CRISIS_REPLY = (
    "I want to stop and be straight with you: what you have just described is "
    "bigger than a coaching session.\n\n"
    "Please contact emergency services or a crisis line right now - in the US "
    "call or text 988, in the UK call 111 and ask for the mental health team, "
    "or go to your nearest emergency department.\n\n"
    "If you can, tell one person near you tonight, out loud, what you told me "
    "here. I will stay with you in this conversation, but a human needs to know."
)

REFLECTIONS = {
    "stable": "You sound settled - like the ground is under you again.",
    "activated": "Your system sounds switched on and running hot.",
    "overwhelmed": "That sounds like far too much arriving at once.",
    "depleted": "You sound like the tank is genuinely empty, not just low.",
    "numb": "That sounds flat - more switched off than wound up.",
    "mixed": "There is real drive in this, and real weight sitting on top of it.",
}

ACTION_BODIES = {
    "ground_and_reset": (
        "Before anything else gets solved, we bring the volume down. Sit with "
        "both feet flat, breathe in for four, out for six, and do that six "
        "times. Nothing gets decided until that is done."
    ),
    "reduce_load": (
        "The move now is subtraction, not effort. Pick one commitment this "
        "week that you can move, shorten or cancel - and do it before you feel "
        "ready to."
    ),
    "continue_protocol": (
        "Keep the reps boring and repeatable. Same time, same shape, small "
        "enough that a bad day cannot break it. That consistency is what "
        "rebuilds the baseline."
    ),
    "log_micro_win": (
        "You are moving, and movement you do not record disappears. Write down "
        "one thing that went right today, however small, in one sentence."
    ),
    "reflect_and_reframe": (
        "There is something here you are circling rather than touching. Name it "
        "in one plain sentence, without softening it, and then we can work on it."
    ),
    "escalate_support": (
        "This is not a load to carry alone. Think of one specific person and "
        "send them a message today that says something true about how you are."
    ),
}

STEPS = {
    "ground_and_reset": "Right now: six slow breaths, four in and six out.",
    "reduce_load": "Right now: name the one thing you are dropping this week.",
    "continue_protocol": "Right now: put the next rep in your calendar.",
    "log_micro_win": "Right now: write the one-line win down.",
    "reflect_and_reframe": "Right now: write the sentence you have been avoiding.",
    "escalate_support": "Right now: send one message to one person.",
}

DEFAULT_CONTENT = (
    "I am here. Tell me what the last few days have actually looked like - not "
    "the summary, the detail."
)


def is_crisis(text: str) -> bool:
    """Return True when the text contains explicit self-harm language."""
    lowered = text.lower()
    return any(term in lowered for term in CRISIS_TERMS)


def _local_response(
    user_text: str,
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
) -> str:
    """Compose a coach reply from the routing decision."""
    if is_crisis(user_text):
        return CRISIS_REPLY
    if not user_text.strip():
        return DEFAULT_CONTENT

    reflection = REFLECTIONS.get(
        emotional_state or "",
        "Thanks for laying that out - I hear you.",
    )
    body = ACTION_BODIES.get(next_action or "", ACTION_BODIES["continue_protocol"])
    step = STEPS.get(next_action or "", STEPS["continue_protocol"])

    parts = [reflection, body]
    if protocol:
        parts.append(f"We are working the {protocol} protocol.")
    parts.append(step)
    return "\n\n".join(parts)


def _remote_response(messages: List[dict]) -> str:  # pragma: no cover - no provider wired up
    """Hook for a hosted model. Raises until a provider is implemented."""
    raise NotImplementedError(
        f"LLM provider '{settings.llm_provider}' is not implemented. "
        "Set LLM_PROVIDER=local or implement _remote_response()."
    )


def stream_llm_response(
    messages: Iterable[Mapping[str, object]],
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
) -> str:
    """Return the assistant reply for a conversation.

    Signature is backwards compatible: ``stream_llm_response(messages)`` still
    works exactly as it did before.
    """
    message_list = [dict(message) for message in messages]
    user_text = last_user_message(message_list)

    if settings.llm_provider != "local":
        return _remote_response(message_list)

    return _local_response(user_text, protocol, emotional_state, next_action)


def generate_response(
    messages: Iterable[Mapping[str, object]],
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
) -> str:
    """Alias for :func:`stream_llm_response` with a non-streaming name."""
    return stream_llm_response(messages, protocol, emotional_state, next_action)


def stream_chunks(text: str) -> Iterator[str]:
    """Split a reply into word chunks so the UI can render token by token."""
    words = text.split(" ")
    for index, word in enumerate(words):
        yield word if index == 0 else f" {word}"