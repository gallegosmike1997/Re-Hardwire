"""Prompt construction for the Re-Hardwire coach.

The prompt layer is deliberately separate from the client so the wording can be
tuned (or swapped for a hosted model) without touching request plumbing.
"""
from __future__ import annotations

from typing import Iterable, List, Mapping, Optional

BASE_SYSTEM_PROMPT = (
    "You are the Re-Hardwire coach. You help people rebuild resilience after "
    "sustained overload.\n"
    "\n"
    "Operating rules:\n"
    "1. Stabilise before you strategise. Never push problem-solving on someone "
    "who is still activated.\n"
    "2. One idea per turn. Short sentences. No lists longer than three items.\n"
    "3. Name what you notice in their words before offering anything.\n"
    "4. Never diagnose, never prescribe medication, never promise outcomes.\n"
    "5. If there is any signal of crisis or self-harm, stop coaching and point "
    "to emergency support immediately.\n"
    "6. Close every turn with a single concrete, small next step.\n"
)

PROTOCOL_GUIDANCE: Mapping[str, str] = {
    "Stabilise & Breathe": (
        "Protocol: Stabilise & Breathe (level 1). The only goal is "
        "down-regulation. Offer one breath or grounding cue. Do not ask about "
        "goals, plans or progress."
    ),
    "Ground & Regulate": (
        "Protocol: Ground & Regulate (level 2). Re-establish range. Offer a "
        "short routine or sensory anchor. Reduce the number of open loops in "
        "their day before adding anything new."
    ),
    "Resilience Builder Level 3": (
        "Protocol: Resilience Builder Level 3. Steady reps at a steady load. "
        "Reflect the pattern you see, then commit them to one repeatable "
        "practice they can hold on a bad day."
    ),
    "Momentum & Load": (
        "Protocol: Momentum & Load (level 4). They have capacity. Push the "
        "stretch, but protect the recovery window explicitly before they "
        "overreach."
    ),
    "Pressure Performance": (
        "Protocol: Pressure Performance (level 5). High load, high drive. "
        "Focus on execution quality and early warning signs of overload. Be "
        "direct and concrete."
    ),
}

STATE_GUIDANCE: Mapping[str, str] = {
    "stable": "They read as steady. Match their pace and keep it grounded.",
    "activated": (
        "They read as activated - sympathetic arousal is up. Slow the tempo of "
        "your reply and shorten your sentences."
    ),
    "overwhelmed": (
        "They read as overwhelmed. Do not add options. Choose one thing for "
        "them and make it very small."
    ),
    "depleted": (
        "They read as depleted. Treat rest as productive work and lower the bar "
        "deliberately."
    ),
    "numb": (
        "They read as numb or shut down. Use concrete sensory detail rather "
        "than abstract motivation."
    ),
    "mixed": (
        "They read as mixed - load and drive are both high. Name that tension "
        "out loud before choosing a direction."
    ),
}

NEXT_ACTION_GUIDANCE: Mapping[str, str] = {
    "continue_protocol": "Next action: continue the current protocol.",
    "reduce_load": "Next action: reduce load - remove one commitment this week.",
    "ground_and_reset": "Next action: a grounding reset, right now, in under two minutes.",
    "log_micro_win": "Next action: capture one micro-win so the progress is visible.",
    "reflect_and_reframe": "Next action: name the thing being avoided, in one plain sentence.",
    "escalate_support": "Next action: reach out to one specific human today.",
}


def build_system_prompt(
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
) -> str:
    """Assemble the system prompt for the current routing decision."""
    parts: List[str] = [BASE_SYSTEM_PROMPT]

    if protocol and protocol in PROTOCOL_GUIDANCE:
        parts.append(PROTOCOL_GUIDANCE[protocol])
    if emotional_state and emotional_state in STATE_GUIDANCE:
        parts.append(STATE_GUIDANCE[emotional_state])
    if next_action and next_action in NEXT_ACTION_GUIDANCE:
        parts.append(NEXT_ACTION_GUIDANCE[next_action])

    return "\n\n".join(parts)


def build_messages(
    messages: Iterable[Mapping[str, object]],
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
) -> List[dict]:
    """Prepend the system prompt and normalise the conversation history."""
    history = [
        {
            "role": str(message.get("role", "user")),
            "content": str(message.get("content", "")),
        }
        for message in messages
    ]
    system = {
        "role": "system",
        "content": build_system_prompt(protocol, emotional_state, next_action),
    }
    return [system, *history]


def last_user_message(messages: Iterable[Mapping[str, object]]) -> str:
    """Return the most recent user turn, or an empty string."""
    for message in reversed(list(messages)):
        if str(message.get("role")) == "user":
            return str(message.get("content", ""))
    return ""