"""
core/routing.py - Re-Hardwire Routing V4 (Adaptive Protocols) - Patched Single File

Features:
- Weighted ML scoring (semantic + keyword + recency + user prefs)
- OpenAI embeddings integration (optional) with fallback to sentence-transformers
- Adaptive protocol switching (online weight updates based on feedback/performance)
- Crisis and somatic high-priority handling
- Streamlit session_state integration for persistence
- Backwards-compatible wrappers: semantic_route, auto_route
- Exports: route_message, get_user_state, semantic_route, auto_route, submit_feedback, debug_state
"""

from __future__ import annotations
import os
import time
import math
import json
import logging
from typing import Dict, Any, List, Tuple, Optional

import numpy as np

try:
    import streamlit as st
except Exception:  # allow importing in non-streamlit contexts for testing
    st = None  # type: ignore

# Optional OpenAI client usage (only if env var present)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
USE_OPENAI = bool(OPENAI_API_KEY)

# Try to import OpenAI SDK if available
openai = None
if USE_OPENAI:
    try:
        import openai as _openai

        _openai.api_key = OPENAI_API_KEY
        openai = _openai
    except Exception:
        openai = None
        USE_OPENAI = False

# Fallback to sentence-transformers
USE_SBERT = False
sbert_model = None
if not USE_OPENAI:
    try:
        from sentence_transformers import SentenceTransformer, util

        sbert_model = SentenceTransformer("all-MiniLM-L6-v2")
        USE_SBERT = True
    except Exception:
        USE_SBERT = False

# ---------------------------
# Configuration and constants
# ---------------------------
DEFAULT_PROTOCOL = "CBT"
PROTOCOLS = ["CRISIS", "SOMATIC", "CBT", "DBT", "ACT"]

# Keyword lists (expand as needed)
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

# Semantic examples for each protocol (used for quick semantic matching)
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

# Precompute embeddings cache (populated on first use)
_EMBED_CACHE: Dict[str, np.ndarray] = {}

# Adaptive weights stored in session_state; default weights
DEFAULT_WEIGHTS = {
    "semantic": 0.5,
    "keyword": 0.3,
    "recency": 0.1,
    "user_pref": 0.1,
}

# Minimum semantic score threshold to consider semantic routing decisive
SEMANTIC_DECISIVE_THRESHOLD = 0.45

# Logging
logger = logging.getLogger("routing_v4")
logger.setLevel(logging.INFO)


# ---------------------------
# Utilities
# ---------------------------
def _st_get(key: str, default: Any = None) -> Any:
    if st is None:
        return default
    return st.session_state.get(key, default)


def _st_set(key: str, value: Any) -> None:
    if st is None:
        return
    st.session_state[key] = value


def _ensure_session_defaults():
    """Ensure adaptive state exists in session_state."""
    if st is None:
        return
    if "routing_weights" not in st.session_state:
        st.session_state.routing_weights = DEFAULT_WEIGHTS.copy()
    if "protocol_performance" not in st.session_state:
        # store simple performance metrics: {protocol: {"wins": int, "calls": int}}
        st.session_state.protocol_performance = {p: {"wins": 0, "calls": 0} for p in PROTOCOLS}
    if "message_history" not in st.session_state:
        st.session_state.message_history = []
    if "active_state" not in st.session_state:
        st.session_state.active_state = DEFAULT_PROTOCOL
    if "auto_routing" not in st.session_state:
        st.session_state.auto_routing = True


def _normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec
    return vec / norm


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    a_n = _normalize(a)
    b_n = _normalize(b)
    return float(np.dot(a_n, b_n))


# ---------------------------
# Embedding helpers
# ---------------------------
def _embed_with_openai(texts: List[str]) -> List[np.ndarray]:
    """
    Use OpenAI embeddings API to embed texts.
    Returns list of numpy arrays.
    """
    if openai is None:
        raise RuntimeError("OpenAI client not available")
    model = "text-embedding-3-small"
    response = openai.Embedding.create(input=texts, model=model)
    embeddings = [np.array(item["embedding"], dtype=np.float32) for item in response["data"]]
    return embeddings


def _embed_with_sbert(texts: List[str]) -> List[np.ndarray]:
    if sbert_model is None:
        raise RuntimeError("SBERT model not available")
    embs = sbert_model.encode(texts, convert_to_numpy=True)
    return [np.array(e, dtype=np.float32) for e in embs]


def get_embeddings(texts: List[str]) -> List[np.ndarray]:
    """
    Get embeddings for a list of texts. Tries OpenAI first (if configured),
    otherwise falls back to SBERT. Caches results in memory for the process.
    """
    results = []
    to_fetch = []
    fetch_indices = []

    # Check cache
    for i, t in enumerate(texts):
        if t in _EMBED_CACHE:
            results.append(_EMBED_CACHE[t])
        else:
            results.append(None)
            to_fetch.append(t)
            fetch_indices.append(i)

    if not to_fetch:
        return results  # type: ignore

    # Fetch embeddings
    try:
        if USE_OPENAI and openai is not None:
            fetched = _embed_with_openai(to_fetch)
        elif USE_SBERT:
            fetched = _embed_with_sbert(to_fetch)
        else:
            raise RuntimeError("No embedding backend available")
    except Exception as e:
        logger.exception("Embedding fetch failed: %s", e)
        # As a last resort, use simple character-level hashing vector (deterministic)
        fetched = []
        for t in to_fetch:
            vec = np.frombuffer(t.encode("utf-8"), dtype=np.uint8).astype(np.float32)
            if vec.size == 0:
                vec = np.zeros(128, dtype=np.float32)
            else:
                vec = np.pad(vec, (0, max(0, 128 - vec.size)))[:128]
            fetched.append(vec)

    # Store in cache and results
    for idx, emb in zip(fetch_indices, fetched):
        _EMBED_CACHE[texts[idx]] = emb
        results[idx] = emb

    return results  # type: ignore


# Precompute example embeddings for semantic examples
def _ensure_example_embeddings():
    if "_example_embs" in globals() and globals()["_example_embs"]:
        return
    global _example_embs
    _example_embs = {}
    all_texts = []
    mapping = []
    for proto, examples in SEMANTIC_EXAMPLES.items():
        for ex in examples:
            mapping.append((proto, ex))
            all_texts.append(ex)
    if not all_texts:
        _example_embs = {}
        return
    embs = get_embeddings(all_texts)
    # group by protocol
    idx = 0
    for proto, examples in SEMANTIC_EXAMPLES.items():
        _example_embs[proto] = []
        for _ in examples:
            _example_embs[proto].append(embs[idx])
            idx += 1


# ---------------------------
# Scoring functions
# ---------------------------
def keyword_score(text: str, protocol: str) -> float:
    """Return a normalized keyword match score [0,1] for a protocol."""
    kws = KEYWORD_MAP.get(protocol, [])
    if not kws:
        return 0.0
    text_lower = text.lower()
    matches = 0
    for kw in kws:
        if kw in text_lower:
            matches += 1
    return float(matches) / max(1, len(kws))


def semantic_scores(text: str) -> Dict[str, float]:
    """
    Compute semantic similarity scores between text and each protocol's examples.
    Returns dict protocol -> max_similarity.
    """
    _ensure_example_embeddings()
    text_emb = get_embeddings([text])[0]
    scores = {}
    for proto, embs in _example_embs.items():
        best = 0.0
        for e in embs:
            try:
                s = _cosine(text_emb, e)
            except Exception:
                s = 0.0
            if s > best:
                best = s
        scores[proto] = float(best)
    return scores


def recency_score(history: List[Dict[str, Any]], protocol: str) -> float:
    """
    Give higher score if the protocol was recently active.
    Simple decay function: if last N messages used protocol, boost.
    """
    if not history:
        return 0.0
    boost = 0.0
    now = time.time()
    for i, msg in enumerate(reversed(history[-10:])):
        if msg.get("protocol") == protocol:
            age = now - msg.get("timestamp", now)
            pos_weight = 1.0 / (i + 1)
            time_weight = 1.0 / (1.0 + age / 60.0)
            boost += pos_weight * time_weight
    return float(min(1.0, boost))


def user_pref_score(user_state: Dict[str, Any], protocol: str) -> float:
    """
    If user has explicitly selected a preferred protocol, boost it.
    user_state may contain 'preferred_protocol' or 'active_state'.
    """
    pref = user_state.get("preferred_protocol") or user_state.get("active_state")
    if not pref:
        return 0.0
    return 1.0 if pref == protocol else 0.0


# ---------------------------
# Adaptive weight update
# ---------------------------
def _update_weights_on_feedback(chosen_protocol: str, success: bool, learning_rate: float = 0.05):
    """
    Update routing_weights in session_state based on feedback.
    If success is True, increase weights that favored the chosen protocol.
    If False, decrease them slightly.
    """
    if st is None:
        return
    _ensure_session_defaults()
    weights = st.session_state.routing_weights
    perf = st.session_state.protocol_performance

    perf[chosen_protocol]["calls"] += 1
    if success:
        perf[chosen_protocol]["wins"] += 1

    calls = perf[chosen_protocol]["calls"]
    wins = perf[chosen_protocol]["wins"]
    success_ratio = wins / max(1, calls)

    if success:
        if success_ratio >= 0.5:
            weights["semantic"] = min(0.9, weights["semantic"] + learning_rate)
            weights["keyword"] = max(0.0, weights["keyword"] - learning_rate / 2)
        else:
            weights["keyword"] = min(0.9, weights["keyword"] + learning_rate)
            weights["semantic"] = max(0.0, weights["semantic"] - learning_rate / 2)
    else:
        dominant = max(weights, key=weights.get)
        weights[dominant] = max(0.0, weights[dominant] - learning_rate)

    total = sum(weights.values()) or 1.0
    for k in weights:
        weights[k] = weights[k] / total

    st.session_state.routing_weights = weights
    st.session_state.protocol_performance = perf


# ---------------------------
# Message history helpers
# ---------------------------
def _record_message(text: str, protocol: str, reason: str = "", score: float = 0.0, details: Optional[Dict] = None):
    """Append a message record to session history with timestamp."""
    if st is None:
        return
    _ensure_session_defaults()
    rec = {
        "timestamp": time.time(),
        "text": text,
        "protocol": protocol,
        "reason": reason,
        "score": float(score),
        "details": details or {},
    }
    st.session_state.message_history.append(rec)


# ---------------------------
# Core routing function
# ---------------------------
def route_message(user_text: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Main entry point for routing a user message.

    Returns a dict:
    {
        "protocol": str,
        "reason": str,
        "score": float,
        "details": { ... },
        "text": user_text
    }
    """
    _ensure_session_defaults()
    if user_context is None:
        user_context = {}

    if not user_text or not user_text.strip():
        return {
            "protocol": _st_get("active_state", DEFAULT_PROTOCOL),
            "reason": "empty_text",
            "score": 0.0,
            "details": {},
            "text": user_text,
        }

    if not _st_get("auto_routing", True):
        proto = _st_get("active_state", DEFAULT_PROTOCOL)
        return {
            "protocol": proto,
            "reason": "manual_override",
            "score": 1.0,
            "details": {"manual": True},
            "text": user_text,
        }

    text_lower = user_text.lower()

    # High-priority crisis detection via keywords
    if any(k in text_lower for k in CRISIS_KEYWORDS):
        _st_set("active_state", "CRISIS")
        _record_message(user_text, "CRISIS", reason="crisis_keyword", score=1.0)
        return {
            "protocol": "CRISIS",
            "reason": "crisis_keyword",
            "score": 1.0,
            "details": {"matched_keywords": [k for k in CRISIS_KEYWORDS if k in text_lower]},
            "text": user_text,
        }

    # Somatic immediate detection
    if any(k in text_lower for k in SOMATIC_KEYWORDS):
        _st_set("active_state", "SOMATIC")
        _record_message(user_text, "SOMATIC", reason="somatic_keyword", score=0.95)
        return {
            "protocol": "SOMATIC",
            "reason": "somatic_keyword",
            "score": 0.95,
            "details": {"matched_keywords": [k for k in SOMATIC_KEYWORDS if k in text_lower]},
            "text": user_text,
        }

    # Compute feature scores
    sem_scores = semantic_scores(user_text)  # protocol -> similarity
    kw_scores = {p: keyword_score(user_text, p) for p in PROTOCOLS}
    history = _st_get("message_history", [])
    rec_scores = {p: recency_score(history, p) for p in PROTOCOLS}
    user_state = {"preferred_protocol": user_context.get("preferred_protocol"), "active_state": _st_get("active_state")}
    pref_scores = {p: user_pref_score(user_state, p) for p in PROTOCOLS}

    weights = _st_get("routing_weights", DEFAULT_WEIGHTS.copy())

    # Weighted aggregation
    final_scores = {}
    for p in PROTOCOLS:
        s_sem = sem_scores.get(p, 0.0)
        s_kw = kw_scores.get(p, 0.0)
        s_rec = rec_scores.get(p, 0.0)
        s_pref = pref_scores.get(p, 0.0)

        score = (
            weights["semantic"] * s_sem
            + weights["keyword"] * s_kw
            + weights["recency"] * s_rec
            + weights["user_pref"] * s_pref
        )
        final_scores[p] = float(score)

    # Crisis amplification via semantic if above threshold
    if sem_scores.get("CRISIS", 0.0) >= SEMANTIC_DECISIVE_THRESHOLD:
        _st_set("active_state", "CRISIS")
        _record_message(user_text, "CRISIS", reason="semantic_crisis", score=sem_scores["CRISIS"])
        return {
            "protocol": "CRISIS",
            "reason": "semantic_crisis",
            "score": float(sem_scores["CRISIS"]),
            "details": {"semantic_score": sem_scores["CRISIS"]},
            "text": user_text,
        }

    # Choose best protocol by final_scores
    chosen = max(final_scores.items(), key=lambda kv: kv[1])
    chosen_protocol, chosen_score = chosen[0], chosen[1]

    if chosen_score < 0.05:
        chosen_protocol = DEFAULT_PROTOCOL
        chosen_score = 0.0
        reason = "low_confidence_fallback"
    else:
        reason = "weighted_aggregation"

    _st_set("active_state", chosen_protocol)

    _record_message(user_text, chosen_protocol, reason=reason, score=chosen_score, details={
        "final_scores": final_scores,
        "semantic_scores": sem_scores,
        "keyword_scores": kw_scores,
        "recency_scores": rec_scores,
        "pref_scores": pref_scores,
        "weights": weights,
    })

    return {
        "protocol": chosen_protocol,
        "reason": reason,
        "score": float(chosen_score),
        "details": {
            "final_scores": final_scores,
            "semantic_scores": sem_scores,
            "keyword_scores": kw_scores,
            "recency_scores": rec_scores,
            "pref_scores": pref_scores,
            "weights": weights,
        },
        "text": user_text,
    }


# ---------------------------
# Backwards-compatible wrappers
# ---------------------------
def semantic_route(text: str) -> Tuple[Optional[str], float]:
    """
    Backwards-compatible wrapper that returns the best semantic match and score.
    Returns (protocol_name, score).
    """
    try:
        scores = semantic_scores(text)  # returns dict protocol -> similarity
        if not scores:
            return None, 0.0
        best = max(scores.items(), key=lambda kv: kv[1])
        return best[0], float(best[1])
    except Exception:
        return None, 0.0


def auto_route(user_text: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Backwards-compatible wrapper that behaves like the older auto_route API:
    returns the same dict structure as route_message.
    """
    try:
        return route_message(user_text, user_context=user_context)
    except Exception as e:
        return {
            "protocol": DEFAULT_PROTOCOL,
            "reason": "auto_route_error",
            "score": 0.0,
            "details": {"error": str(e)},
            "text": user_text,
        }


# ---------------------------
# Feedback API
# ---------------------------
def submit_feedback(message_index: Optional[int] = None, success: bool = True):
    """
    Submit feedback for a routed message. If message_index is None, use last message.
    This updates adaptive weights and protocol performance.
    """
    if st is None:
        return {"status": "no_streamlit", "message": "Streamlit not available"}

    _ensure_session_defaults()
    history = st.session_state.message_history
    if not history:
        return {"status": "no_history", "message": "No messages to give feedback on"}

    if message_index is None:
        idx = -1
    else:
        if message_index < 0 or message_index >= len(history):
            return {"status": "bad_index", "message": "message_index out of range"}
        idx = message_index

    rec = history[idx]
    proto = rec.get("protocol")
    _update_weights_on_feedback(proto, success)
    return {"status": "ok", "protocol": proto, "success": success, "routing_weights": st.session_state.routing_weights}


# ---------------------------
# Session accessor
# ---------------------------
def get_user_state() -> Dict[str, Any]:
    """
    Return a compact snapshot of routing-related user state.
    """
    _ensure_session_defaults()
    return {
        "active_state": _st_get("active_state", DEFAULT_PROTOCOL),
        "auto_routing": _st_get("auto_routing", True),
        "routing_weights": _st_get("routing_weights", DEFAULT_WEIGHTS.copy()),
        "protocol_performance": _st_get("protocol_performance", {p: {"wins": 0, "calls": 0} for p in PROTOCOLS}),
        "history_len": len(_st_get("message_history", [])),
    }


# ---------------------------
# Utility: debug print (safe)
# ---------------------------
def debug_state() -> Dict[str, Any]:
    """Return internal debug info for development (not for production logs)."""
    _ensure_session_defaults()
    return {
        "session_state": None if st is None else dict(st.session_state),
        "example_embs_cached": bool(_EMBED_CACHE),
        "weights": _st_get("routing_weights", DEFAULT_WEIGHTS.copy()),
    }


# ---------------------------
# If run as script, simple demo
# ---------------------------
if __name__ == "__main__":
    print("Routing V4 demo. Using OpenAI:", USE_OPENAI, "SBERT:", USE_SBERT)
    while True:
        try:
            txt = input("\nEnter message (or 'quit'): ").strip()
        except EOFError:
            break
        if not txt or txt.lower() in ("quit", "exit"):
            break
        # run routing (no streamlit context)
        class DummySession(dict):
            pass

        if st is None:
            import types

            class _Dummy:
                session_state = DummySession()

            st = _Dummy()  # type: ignore

        out = route_message(txt, user_context={})
        print(json.dumps(out, indent=2))
