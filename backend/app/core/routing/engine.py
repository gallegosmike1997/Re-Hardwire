"""Scoring-based routing engine for Re-Hardwire.

The engine turns a free-text turn into six normalised signals, maps those
signals onto a load/drive space, and then picks a protocol, an emotional read
and a single next action.

Nothing in here calls out to a network or a model, so the routing decision is
fully deterministic and unit-testable. Swap :func:`extract_signals` for a real
classifier when one is available.
"""
from __future__ import annotations

import re
from typing import Dict, Iterable, List, Tuple

from .models import (
    EmotionalState,
    NextAction,
    Protocol,
    RouteResult,
    SignalBundle,
    get_protocol,
)

# --------------------------------------------------------------------------- #
# Lexicons
# --------------------------------------------------------------------------- #

LEXICON: Dict[str, Tuple[str, ...]] = {
    "stress": (
        "overwhelmed", "overwhelming", "anxious", "anxiety", "panic", "panicking",
        "stressed", "stress", "pressure", "burnt out", "burnout", "spiral",
        "spiralling", "spiraling", "dread", "scared", "afraid", "fear",
        "racing", "frantic", "tense", "on edge", "snapping", "too much",
        "drowning", "buried", "snowed under", "no time", "piling up", "chaos",
    ),
    "clarity": (
        "clear", "clearly", "focused", "focus", "know what", "know how", "plan",
        "planned", "understand", "decided", "decision", "priority", "priorities",
        "step by step", "list", "mapped out", "figured out", "makes sense",
    ),
    "energy": (
        "energised", "energized", "motivated", "awake", "fresh", "rested",
        "slept well", "alive", "buzzing", "ready", "raring", "charged",
    ),
    "momentum": (
        "started", "shipped", "progress", "on track", "finished", "done",
        "momentum", "keep going", "streak", "completed", "achieved", "smashed",
        "moving forward", "gaining", "better than", "win", "won",
    ),
    "support": (
        "friend", "friends", "family", "partner", "team", "therapist", "coach",
        "support", "helped", "someone", "we talked", "reached out", "not alone",
        "colleague", "mentor",
    ),
    "avoidance": (
        "later", "tomorrow", "procrastinating", "procrastinate", "avoiding",
        "avoid", "putting off", "can't face", "cant face", "ignoring", "ignored",
        "delaying", "distracted", "doomscrolling", "numbing", "skipping",
    ),
}

# Low-energy / shutdown wording that should not read as plain "calm".
DEPLETION_TERMS: Tuple[str, ...] = (
    "tired", "exhausted", "empty", "drained", "flat", "no energy", "wiped",
    "spent", "sleepless", "can't sleep", "cant sleep", "running on fumes",
    "nothing left",
)

NUMB_TERMS: Tuple[str, ...] = (
    "numb", "blank", "hollow", "disconnected", "don't care", "dont care",
    "nothing matters", "going through the motions", "shut down", "shutdown",
)

NEGATIONS: Tuple[str, ...] = (
    "not", "no", "never", "don't", "dont", "can't", "cant", "hardly", "barely",
)

# Soft cap used to normalise raw keyword counts into 0.0-1.0 scores.
_SATURATION = 3.0

_WORD_RE = re.compile(r"[a-z0-9']+")


def _tokenize(text: str) -> List[str]:
    return _WORD_RE.findall(text.lower())


def _count_hits(tokens: List[str], terms: Iterable[str]) -> int:
    """Count term occurrences, honouring a one-word negation prefix."""
    joined = " ".join(tokens)
    hits = 0
    for term in terms:
        if " " in term:
            hits += joined.count(term)
            continue
        pattern = re.compile(rf"\b{re.escape(term)}\b")
        for match in pattern.finditer(joined):
            prefix = joined[: match.start()].split()
            negated = bool(prefix) and prefix[-1] in NEGATIONS
            hits += -1 if negated else 1
    return hits


def _normalise(hits: int) -> float:
    return max(0.0, min(1.0, hits / _SATURATION))


def extract_signals(user_text: str) -> SignalBundle:
    """Turn free text into a :class:`SignalBundle` of 0.0-1.0 scores."""
    tokens = _tokenize(user_text)

    scores = {
        name: _normalise(_count_hits(tokens, terms))
        for name, terms in LEXICON.items()
    }

    depletion = _normalise(_count_hits(tokens, DEPLETION_TERMS))
    numb = _normalise(_count_hits(tokens, NUMB_TERMS))

    # Depletion drags energy down and stress up; numbness suppresses drive.
    scores["energy"] = max(0.0, scores["energy"] - depletion)
    scores["stress"] = min(1.0, scores["stress"] + 0.5 * depletion + 0.4 * numb)
    scores["momentum"] = max(0.0, scores["momentum"] - 0.6 * numb)
    scores["clarity"] = max(0.0, scores["clarity"] - 0.4 * numb)

    return SignalBundle(**scores)


def load_drive(signals: SignalBundle) -> Tuple[float, float]:
    """Collapse signals into a ``(load, drive)`` coordinate pair."""
    load = (
        0.45 * signals.stress
        + 0.25 * (1.0 - signals.energy)
        + 0.15 * signals.avoidance
        + 0.15 * (1.0 - signals.clarity)
    )
    drive = 0.40 * signals.momentum + 0.30 * signals.clarity + 0.30 * signals.energy
    return max(0.0, min(1.0, load)), max(0.0, min(1.0, drive))


def select_level(signals: SignalBundle) -> int:
    """Map signals onto a protocol level between 1 and 5."""
    load, drive = load_drive(signals)

    if load >= 0.72:
        return 1
    if load >= 0.58:
        return 2
    if signals.avoidance >= 0.60 and drive < 0.50:
        return 2
    if drive >= 0.72 and load < 0.35:
        return 5
    if drive >= 0.55:
        return 4
    return 3


def read_emotional_state(signals: SignalBundle) -> EmotionalState:
    """Derive a coarse emotional read from the signal bundle."""
    # No evidence is not the same as a bad read. Without any signal mass the
    # honest answer is "stable", not "depleted" or "numb".
    if sum(signals.as_dict().values()) < 0.15:
        return EmotionalState.STABLE

    if signals.stress >= 0.60 and signals.energy <= 0.30:
        return EmotionalState.OVERWHELMED
    if signals.stress >= 0.60:
        return EmotionalState.ACTIVATED
    if signals.energy <= 0.30 and signals.support <= 0.30:
        return EmotionalState.DEPLETED
    if signals.clarity <= 0.20 and signals.momentum <= 0.20 and signals.energy <= 0.40:
        return EmotionalState.NUMB

    load, drive = load_drive(signals)
    if load >= 0.50 and drive >= 0.50:
        return EmotionalState.MIXED
    return EmotionalState.STABLE


def plan_next_action(signals: SignalBundle, level: int) -> NextAction:
    """Choose the single next action the coach should take."""
    if level <= 1:
        return NextAction.GROUND_AND_RESET
    if level == 2:
        return NextAction.REDUCE_LOAD
    if signals.avoidance >= 0.50:
        return NextAction.REFLECT_AND_REFRAME
    if signals.stress >= 0.75 and signals.support <= 0.20:
        return NextAction.ESCALATE_SUPPORT
    if signals.momentum >= 0.50:
        return NextAction.LOG_MICRO_WIN
    return NextAction.CONTINUE_PROTOCOL


def compute_confidence(signals: SignalBundle, level: int) -> float:
    """Confidence grows with signal volume and how polarised the read is."""
    total = sum(signals.as_dict().values())
    load, drive = load_drive(signals)

    confidence = 0.45 + 0.06 * min(total, 3.0)
    confidence += 0.12 * abs(drive - load)  # a polarised read is easier to trust
    if level in (1, 5):
        confidence += 0.05  # the extremes are the most defensible calls
    return round(max(0.35, min(0.97, confidence)), 2)


def build_tags(protocol: Protocol, signals: SignalBundle) -> List[str]:
    """Combine protocol tags with the signals that actually fired."""
    tags = list(protocol.tags)
    for name, value in signals.as_dict().items():
        if value >= 0.34 and name not in tags:
            tags.append(name)
    return tags[:6]


def route_text(user_text: str, protocol: str | None = None) -> RouteResult:
    """Full routing pass: text in, :class:`RouteResult` out.

    ``protocol`` is honoured as an explicit override when it names a protocol
    in the catalogue; otherwise the engine selects the level itself.
    """
    signals = extract_signals(user_text)
    level = select_level(signals)

    override = get_protocol(protocol) if protocol else None
    if override is not None:
        selected, level = override, override.level
    else:
        selected = get_protocol(None, level)

    emotional_state = read_emotional_state(signals)
    next_action = plan_next_action(signals, level)
    confidence = compute_confidence(signals, level)
    load, drive = load_drive(signals)

    rationale = (
        f"load={load:.2f} drive={drive:.2f} -> level {level} "
        f"({selected.focus}); next={next_action.value}"
    )

    return RouteResult(
        protocol=selected.name,
        confidence=confidence,
        tags=build_tags(selected, signals),
        nextAction=next_action.value,
        emotionalState=emotional_state.value,
        signals=signals,
        rationale=rationale,
    )


def auto_route(user_text: str) -> dict:
    """Dict-shaped convenience wrapper used by the API and legacy callers."""
    return route_text(user_text).model_dump(by_alias=True)