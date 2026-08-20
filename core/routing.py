"""
Re-Hardwire Routing V5 — SBERT + Visual Somatic Integration (Offline)

Enhancements over V4:
- Added full visual somatic-experience embedding pipeline (pure PyTorch)
- No torchvision dependency
- Offline-safe SBERT-only backend
- Preserved all adaptive routing logic (semantic, keyword, recency, user-pref)
- Preserved crisis + somatic overrides
- Preserved weighted ML scoring
- Added optional visual context fusion into semantic routing
"""

from __future__ import annotations
import time
import logging
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import torch
import streamlit as st
from sentence_transformers import SentenceTransformer

# ============================================================
# SBERT MODEL (OFFLINE)
# ============================================================

_sbert = SentenceTransformer("all-MiniLM-L6-v2")
_EMBED_CACHE: Dict[str, np.ndarray] = {}

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

logger = logging.getLogger("routing_v5")
logger.setLevel(logging.INFO)

# ============================================================
# STREAMLIT SESSION HELPERS
# ============================================================

def _st_get(key, default=None):
    return st.session_state.get(key, default)

def _st_set(key, value):
    st.session_state[key] = value

def _ensure_session_defaults():
    if "routing_weights" not in st.session_state:
        st.session_state.routing_weights = DEFAULT_WEIGHTS.copy()
    if "protocol_performance" not in st.session_state:
        st.session_state.protocol_performance = {p: {"wins": 0, "calls": 0} for p in PROTOCOLS}
    if "message_history" not in st.session_state:
        st.session_state.message_history = []
    if "active_state" not in st.session_state:
        st.session_state.active_state = DEFAULT_PROTOCOL
    if "auto_routing" not in st.session_state:
        st.session_state.auto_routing = True

# ============================================================
# PURE PYTORCH IMAGE TRANSFORMS (NO TORCHVISION)
# ============================================================

def pil_to_tensor(img):
    arr = np.array(img).astype("float32") / 255.0
    if arr.ndim == 2:
        arr = np.expand_dims(arr, -1)
    return torch.from_numpy(arr).permute(2, 0, 1)

def resize_tensor(tensor, size):
    return torch.nn.functional.interpolate(
        tensor.unsqueeze(0),
        size=size,
        mode="bilinear",
        align_corners=False
    ).squeeze(0)

def normalize_tensor(
    tensor,
    mean=(0.485, 0.456, 0.406),
    std=(0.229, 0.224, 0.225),
):
    mean_t = torch.tensor(mean)[:, None, None]
    std_t = torch.tensor(std)[:, None, None]
    return (tensor - mean_t) / std_t

def crop_tensor(tensor, top, left, height, width):
    return tensor[:, top:top+height, left:left+width]

# ============================================================
# VISUAL SOMATIC EMBEDDING PIPELINE
# ============================================================

def somatic_visual_embedding(pil_image):
    t = pil_to_tensor(pil_image)
    t = resize_tensor(t, (128, 128))
    t = normalize_tensor(t)

    h, w = t.shape[1], t.shape[2]
    crop_h, crop_w = 96, 96
    top = (h - crop_h) // 2
    left = (w - crop_w) // 2
    t = crop_tensor(t, top, left, crop_h, crop_w)

    return t.flatten().float()

# ============================================================
# SBERT EMBEDDINGS
# ============================================================

def get_embeddings(texts: List[str]) -> List[np.ndarray]:
    results = []
    to_fetch = []
    idxs = []

    for i, t in enumerate(texts):
        if t in _EMBED_CACHE:
            results.append(_EMBED_CACHE[t])
        else:
            results.append(None)
            to_fetch.append(t)
            idxs.append(i)

    if to_fetch:
        try:
            fetched = _sbert.encode(to_fetch, convert_to_numpy=True)
            fetched = [np.array(e, dtype=np.float32) for e in fetched]
        except Exception as e:
            logger.exception("SBERT failure: %s", e)
            fetched = [np.zeros(384, dtype=np.float32) for _ in to_fetch]

        for i, emb in zip(idxs, fetched):
            _EMBED_CACHE[texts[i]] = emb
            results[i] = emb

    return results

# ============================================================
# SEMANTIC EXAMPLE EMBEDDINGS
# ============================================================

_example_embs = None

def _ensure_example_embeddings():
    global _example_embs
    if _example_embs is not None:
        return

    _example_embs = {}
    all_texts = []
    mapping = []

    for proto, examples in SEMANTIC_EXAMPLES.items():
        for ex in examples:
            mapping.append((proto, ex))
            all_texts.append(ex)

    embs = get_embeddings(all_texts)
    idx = 0

    for proto, examples in SEMANTIC_EXAMPLES.items():
        _example_embs[proto] = []
        for _ in examples:
            _example_embs[proto].append(embs[idx])
            idx += 1

# ============================================================
# SCORING FUNCTIONS
# ============================================================

def _normalize(v):
    n = np.linalg.norm(v)
    return v if n == 0 else v / n

def _cosine(a, b):
    return float(np.dot(_normalize(a), _normalize(b)))

def keyword_score(text, protocol):
    kws = KEYWORD_MAP.get(protocol, [])
    t = text.lower()
    matches = sum(1 for kw in kws if kw in t)
    return matches / max(1, len(kws))

def semantic_scores(text):
    _ensure_example_embeddings()
    text_emb = get_embeddings([text])[0]
    scores = {}

    for proto, embs in _example_embs.items():
        best = 0.0
        for e in embs:
            try:
                best = max(best, _cosine(text_emb, e))
            except Exception:
                pass
        scores[proto] = best

    return scores

def recency_score(history, protocol):
    if not history:
        return 0.0
    boost = 0.0
    now = time.time()

    for i, msg in enumerate(reversed(history[-10:])):
        if msg.get("protocol") == protocol:
            age = now - msg.get("timestamp", now)
            pos_w = 1.0 / (i + 1)
            time_w = 1.0 / (1.0 + age / 60.0)
            boost += pos_w * time_w

    return min(1.0, boost)

def user_pref_score(user_state, protocol):
    pref = user_state.get("preferred_protocol") or user_state.get("active_state")
    return 1.0 if pref == protocol else 0.0

# ============================================================
# ADAPTIVE WEIGHT UPDATES
# ============================================================

def _update_weights_on_feedback(proto, success, lr=0.05):
    weights = _st_get("routing_weights")
    perf = _st_get("protocol_performance")

    perf[proto]["calls"] += 1
    if success:
        perf[proto]["wins"] += 1

    calls = perf[proto]["calls"]
    wins = perf[proto]["wins"]
    ratio = wins / max(1, calls)

    if success:
        if ratio >= 0.5:
            weights["semantic"] = min(0.9, weights["semantic"] + lr)
            weights["keyword"] = max(0.0, weights["keyword"] - lr / 2)
        else:
            weights["keyword"] = min(0.9, weights["keyword"] + lr)
            weights["semantic"] = max(0.0, weights["semantic"] - lr / 2)
    else:
        dom = max(weights, key=weights.get)
        weights[dom] = max(0.0, weights[dom] - lr)

    total = sum(weights.values()) or 1.0
    for k in weights:
        weights[k] /= total

    _st_set("routing_weights", weights)
    _st_set("protocol_performance", perf)

# ============================================================
# MESSAGE HISTORY
# ============================================================

def _record_message(text, protocol, reason="", score=0.0, details=None):
    rec = {
        "timestamp": time.time(),
        "text": text,
        "protocol": protocol,
        "reason": reason,
        "score": float(score),
        "details": details or {},
    }
    st.session_state.message_history.append(rec)

# ============================================================
# CORE ROUTING (WITH VISUAL FUSION)
# ============================================================

def route_message(user_text, user_context=None, visual=None):
    _ensure_session_defaults()
    user_context = user_context or {}

    if not user_text.strip():
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

    t = user_text.lower()

    # Crisis override
    if any(k in t for k in CRISIS_KEYWORDS):
        _st_set("active_state", "CRISIS")
        _record_message(user_text, "CRISIS", "crisis_keyword", 1.0)
        return {
            "protocol": "CRISIS",
            "reason": "crisis_keyword",
            "score": 1.0,
            "details": {"matched_keywords": [k for k in CRISIS_KEYWORDS if k in t]},
            "text": user_text,
        }

    # Somatic override
    if any(k in t for k in SOMATIC_KEYWORDS):
        _st_set("active_state", "SOMATIC")
        _record_message(user_text, "SOMATIC", "somatic_keyword", 0.95)
        return {
            "protocol": "SOMATIC",
            "reason": "somatic_keyword",
            "score": 0.95,
            "details": {"matched_keywords": [k for k in SOMATIC_KEYWORDS if k in t]},
            "text": user_text,
        }

    # Semantic scores
    sem_scores = semantic_scores(user_text)

    # Visual fusion (optional)
    visual_score = 0.0
    if visual is not None:
        try:
            vis_emb = somatic_visual_embedding(visual)
            visual_score = float(torch.mean(torch.abs(vis_emb)))
        except Exception as e:
            logger.warning("Visual embedding failed: %s", e)

    # Keyword scores
    kw_scores = {p: keyword_score(user_text, p) for p in PROTOCOLS}

    # Recency scores
    history = _st_get("message_history", [])
    rec_scores = {p: recency_score(history, p) for p in PROTOCOLS}

    # User preference scores
    user_state = {
        "preferred_protocol": user_context.get("preferred_protocol"),
        "active_state": _st_get("active_state"),
    }
    pref_scores = {p: user_pref_score(user_state, p) for p in PROTOCOLS}

    # Weighted aggregation
    weights = _st_get("routing_weights", DEFAULT_WEIGHTS.copy())
    final_scores = {}

    for p in PROTOCOLS:
        score = (
            weights["semantic"] * sem_scores.get(p, 0.0)
            + weights["keyword"] * kw_scores.get(p, 0.0)
            + weights["recency"] * rec_scores.get(p, 0.0)
            + weights["user_pref"] * pref_scores.get(p, 0.0)
            + 0.1 * visual_score
        )
        final_scores[p] = float(score)

    # Semantic crisis amplification
    if sem_scores.get("CRISIS", 0.0) >= SEMANTIC_DECISIVE_THRESHOLD:
        _st_set("active_state", "CRISIS")
        _record_message(user_text, "CRISIS", "semantic_crisis", sem_scores["CRISIS"])
        return {
            "protocol": "CRISIS",
            "reason": "semantic_crisis",
            "score": float(sem_scores["CRISIS"]),
            "details": {"semantic_score": sem_scores["CRISIS"]},
            "text": user_text,
        }

    # Choose best protocol
    chosen_protocol, chosen_score = max(final_scores.items(), key=lambda kv: kv[1])

    if chosen_score < 0.05:
        chosen_protocol = DEFAULT_PROTOCOL
        chosen_score = 0.0
        reason = "low_confidence_fallback"
    else:
        reason = "weighted_aggregation"

    _st_set("active_state", chosen_protocol)

    _record_message(user_text, chosen_protocol, reason, chosen_score, {
        "final_scores": final_scores,
        "semantic_scores": sem_scores,
        "keyword_scores": kw_scores,
        "recency_scores": rec_scores,
        "pref_scores": pref_scores,
        "weights": weights,
        "visual_score": visual_score,
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
            "visual_score": visual_score,
        },
        "text": user_text,
    }

# ============================================================
# WRAPPERS
# ============================================================

def semantic_route(text):
    try:
        scores = semantic_scores(text)
        best = max(scores.items(), key=lambda kv: kv[1])
        return best[0], float(best[1])
    except Exception:
        return None, 0.0

def auto_route(user_text, user_context=None, visual=None):
    try:
        return route_message(user_text, user_context=user_context, visual=visual)
    except Exception as e:
        return {
            "protocol": DEFAULT_PROTOCOL,
            "reason": "auto_route_error",
            "score": 0.0,
            "details": {"error": str(e)},
            "text": user_text,
        }

# ============================================================
# FEEDBACK
# ============================================================

def submit_feedback(message_index=None, success=True):
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

    return {
        "status": "ok",
        "protocol": proto,
        "success": success,
        "routing_weights": st.session_state.routing_weights,
    }

# ============================================================
# USER STATE ACCESSOR
# ============================================================

def get_user_state() -> dict:
    _ensure_session_defaults()
    return {
        "active_state": st.session_state.active_state,
        "auto_routing": st.session_state.auto_routing,
        "routing_weights": dict(st.session_state.routing_weights),
        "protocol_performance": dict(st.session_state.protocol_performance),
        "history_len": len(st.session_state.message_history),
    }
