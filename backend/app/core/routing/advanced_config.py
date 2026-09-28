"""Experimental semantic routing configuration (not a clinical assessment)."""

from __future__ import annotations

from threading import Lock
from typing import Dict
import math

# Load the optional model only when semantic routing is requested. Normal
# application startup and protocol metadata must not download model weights.
_sbert = None
_MODEL_LOCK = Lock()


def get_model():
    global _sbert
    with _MODEL_LOCK:
        if _sbert is None:
            try:
                from sentence_transformers import SentenceTransformer

                _sbert = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as exc:
                raise RuntimeError("Semantic routing model is unavailable") from exc
    return _sbert


def normalize_weights(overrides: Dict[str, float] | None = None) -> Dict[str, float]:
    """Merge partial overrides and reject invalid or unbounded scores."""
    overrides = overrides or {}
    if set(overrides) - set(DEFAULT_WEIGHTS):
        raise ValueError("Unknown routing weight")
    weights = {**DEFAULT_WEIGHTS, **overrides}
    if any(not math.isfinite(value) or value < 0 for value in weights.values()):
        raise ValueError("Routing weights must be finite and non-negative")
    total = sum(weights.values())
    if not math.isfinite(total) or total <= 0:
        raise ValueError("Routing weights must have a finite positive total")
    return {key: value / total for key, value in weights.items()}

# ============================================================
# PROTOCOL DEFINITIONS
# ============================================================

DEFAULT_PROTOCOL = "CBT"
PROTOCOLS = ["CRISIS", "SOMATIC", "CBT", "DBT", "ACT"]

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end it", "can't go on", "hurt myself",
    "self harm", "overdose", "want to die", "die by suicide", "no reason to live"
]

SOMATIC_KEYWORDS = [
    "tight chest", "panic", "heart racing", "breathing", "dizzy",
    "nausea", "sweating", "trembling", "grounding", "body"
]

CBT_KEYWORDS = [
    "thought", "thinking", "overthinking", "rumination", "catastrophiz",
    "belief", "distortion", "cognitive", "reframe"
]

DBT_KEYWORDS = [
    "emotion", "regulation", "distress", "cope", "skills", "mindfulness",
    "wise mind", "interpersonal", "validation"
]

ACT_KEYWORDS = [
    "values", "acceptance", "present", "avoidance", "commitment",
    "defusion", "psychological flexibility"
]

KEYWORD_MAP = {
    "CRISIS": CRISIS_KEYWORDS,
    "SOMATIC": SOMATIC_KEYWORDS,
    "CBT": CBT_KEYWORDS,
    "DBT": DBT_KEYWORDS,
    "ACT": ACT_KEYWORDS,
}

SEMANTIC_EXAMPLES = {
    "CRISIS": [
        "I want to hurt myself",
        "I can't go on",
        "I feel like ending my life",
        "I'm thinking about suicide",
    ],
    "SOMATIC": [
        "My chest feels tight and I'm panicking",
        "I feel my heart racing and I can't breathe",
        "I need grounding techniques for panic",
    ],
    "CBT": [
        "I keep having negative thoughts about the future",
        "I think in extremes and catastrophize",
        "I want to challenge my unhelpful beliefs",
    ],
    "DBT": [
        "My emotions are overwhelming and I need skills",
        "I need distress tolerance strategies",
        "I want to practice mindfulness to regulate emotion",
    ],
    "ACT": [
        "I want to live according to my values",
        "I'm avoiding feelings and need acceptance",
        "I want to commit to actions aligned with values",
    ],
}

DEFAULT_WEIGHTS = {
    "semantic": 0.5,
    "keyword": 0.3,
    "recency": 0.1,
    "user_pref": 0.1,
}

SEMANTIC_DECISIVE_THRESHOLD = 0.45