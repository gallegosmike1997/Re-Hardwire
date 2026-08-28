"""
Re-Hardwire Routing V5 — SBERT + Visual Somatic Integration (Optimized)
"""

from __future__ import annotations
import time
import logging
from typing import Dict, Any, List

import numpy as np
import torch
import streamlit as st
from sentence_transformers import SentenceTransformer

# ============================================================
# SBERT MODEL + CACHE
# ============================================================

_sbert = SentenceTransformer("all-MiniLM-L6-v2")
_EMBED_CACHE: Dict[str, np.ndarray] = {}

logger = logging.getLogger("routing_v5")
logger.setLevel(logging.INFO)

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

# ============================================================
# STREAMLIT SESSION HELPERS
# ============================================================

def _ensure_session_defaults():
    ss = st.session_state
    ss.setdefault("routing_weights", DEFAULT_WEIGHTS.copy())
    ss.setdefault("protocol_performance", {p: {"wins": 0, "calls": 0} for p in PROTOCOLS})
    ss.setdefault("message_history", [])
    ss.setdefault("active_state", DEFAULT_PROTOCOL)
    ss.setdefault("auto_routing", True)

# ============================================================
# PURE PYTORCH IMAGE TRANSFORMS
# ============================================================

def pil_to_tensor(img):
    arr = np.array(img).astype("float32") / 255.0
    if arr.ndim == 2:
        arr = arr[..., None]
    return torch.from_numpy(arr).permute(2, 0, 1)

def resize_tensor(tensor, size):
    return torch.nn.functional.interpolate(
        tensor.unsqueeze(0),
        size=size,
        mode="bilinear",
        align_corners=False
    ).squeeze(0)

def normalize_tensor(tensor):
    mean = torch.tensor([0.485, 0.456, 0.406])[:, None, None]
    std = torch.tensor([0.229, 0.224, 0.225])[:, None, None]
    return (tensor - mean) / std

def crop_tensor(tensor, top, left, height, width):
    return tensor[:, top:top+height, left:left+width]

# ============================================================
# VISUAL SOMATIC EMBEDDING
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
# SBERT EMBEDDINGS (Optimized)
# ============================================================

def get_embeddings(texts: List[str]) -> List[np.ndarray]:
    results = []
    to_compute = []
    idxs = []

    for i, t in enumerate(texts):
        if t in _EMBED_CACHE:
            results.append(_EMBED_CACHE[t])
        else:
            results.append(None)
            to_compute.append(t)
            idxs.append(i)

    if to_compute:
        try:
            fetched = _sbert.encode(to_compute, convert_to_numpy=True)
        except Exception as e:
            logger.error("SBERT failure: %s", e)
            fetched = [np.zeros(384, dtype=np.float32) for _ in to_compute]

        for i, emb in zip(idxs, fetched):
            emb = np.array(emb, dtype=np.float32)
            _EMBED_CACHE[texts[i]] = emb
            results[i] = emb

    return results

# ============================================================
# SEMANTIC EXAMPLE EMBEDDINGS (Cached)
# ============================================================

_example_embs = None

def _ensure_example_embeddings():
    global _example_embs
    if _example_embs is not None:
        return

    _example_embs = {}
    all_texts = []

    for proto, examples in SEMANTIC_EXAMPLES.items():
        all_texts.extend(examples)

    embs = get_embeddings(all_texts)

    idx = 0
    for proto, examples in SEMANTIC_EXAMPLES.items():
        _example_embs[proto] = []
        for ex in examples:
            _EMBED_CACHE.setdefault(ex, embs[idx])
            _example_embs[proto].append(embs[idx])
            idx += 1

# ============================================================
# SCORING FUNCTIONS (Optimized)
# ============================================================

def _cosine(a, b):
    na = a / (np.linalg.norm(a) + 1e-8)
    nb = b / (np.linalg.norm(b) + 1e-8)
    return float(np.dot(na, nb))

def keyword_score(text, protocol):
    t = text.lower()
    kws = KEYWORD_MAP[protocol]
    return sum(kw in t for kw in kws) / len(kws)

def semantic_scores(text):
    _ensure_example_embeddings()
    text_emb = get_embeddings([text])[0]
    return {
        proto: max(_cosine(text_emb, e) for e in embs)
        for proto, embs in _example_embs.items()
    }

def recency_score(history, protocol):
    if not history:
        return 0.0
    now = time.time()
    boost = 0.0

    for i, msg in enumerate(reversed(history[-10:])):
        if msg["protocol"] == protocol:
            age = now - msg["timestamp"]
            boost += (1 / (i + 1)) * (1 / (1 + age / 60))

    return min(boost, 1.0)

def user_pref_score(user_state, protocol):
    pref = user_state.get("preferred_protocol") or user_state["active_state"]
    return 1.0 if pref == protocol else 0.0

# ============================================================
# ADAPTIVE WEIGHT UPDATES
# ============================================================

def _update_weights_on_feedback(proto, success, lr=0.05):
    weights = st.session_state.routing_weights
    perf = st.session_state.protocol_performance

    perf[proto]["calls"] += 1
    if success:
        perf[proto]["wins"] += 1

    ratio = perf[proto]["wins"] / max(1, perf[proto]["calls"])

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

    total = sum(weights.values())
    for k in weights:
        weights[k] /= total

# ============================================================
# MESSAGE HISTORY
# ============================================================

def _record_message(text, protocol, reason, score, details):
    st.session_state.message_history.append({
        "timestamp": time.time(),
        "text": text,
        "protocol": protocol,
        "reason": reason,
        "score": float(score),
        "details": details,
    })

# ============================================================
# CORE ROUTING (Optimized)
# ============================================================

def route_message(user_text, user_context=None, visual=None):
    _ensure_session_defaults()

    if not user_text.strip():
        return {
            "protocol": st.session_state.active_state,
            "reason": "empty_text",
            "score": 0.0,
            "details": {},
            "text": user_text,
        }

    if not st.session_state.auto_routing:
        return {
            "protocol": st.session_state.active_state,
            "reason": "manual_override",
            "score": 1.0,
            "details": {"manual": True},
            "text": user_text,
        }

    t = user_text.lower()

    # Crisis override
    if any(k in t for k in CRISIS_KEYWORDS):
        st.session_state.detected_protocol = "CRISIS"
        _record_message(user_text, "CRISIS", "crisis_keyword", 1.0, {})
        return {
            "protocol": "CRISIS",
            "reason": "crisis_keyword",
            "score": 1.0,
            "details": {},
            "text": user_text,
        }

    # Somatic override
    if any(k in t for k in SOMATIC_KEYWORDS):
        st.session_state.detected_protocol = "SOMATIC"
        _record_message(user_text, "SOMATIC", "somatic_keyword", 0.95, {})
        return {
            "protocol": "SOMATIC",
            "reason": "somatic_keyword",
            "score": 0.95,
            "details": {},
            "text": user_text,
        }

    sem_scores = semantic_scores(user_text)

    visual_score = 0.0
    if visual is not None:
        try:
            vis_emb = somatic_visual_embedding(visual)
            visual_score = float(torch.mean(torch.abs(vis_emb)))
        except Exception as e:
            logger.warning("Visual embedding failed: %s", e)

    kw_scores = {p: keyword_score(user_text, p) for p in PROTOCOLS}
    rec_scores = {p: recency_score(st.session_state.message_history, p) for p in PROTOCOLS}

    user_state = {
        "preferred_protocol": user_context.get("preferred_protocol") if user_context else None,
        "active_state": st.session_state.active_state,
    }
    pref_scores = {p: user_pref_score(user_state, p) for p in PROTOCOLS}

    weights = st.session_state.routing_weights

    final_scores = {
        p: (
            weights["semantic"] * sem_scores[p]
            + weights["keyword"] * kw_scores[p]
            + weights["recency"] * rec_scores[p]
            + weights["user_pref"] * pref_scores[p]
            + 0.1 * visual_score
        )
        for p in PROTOCOLS
    }

    if sem_scores["CRISIS"] >= SEMANTIC_DECISIVE_THRESHOLD:
        st.session_state.detected_protocol = "CRISIS"
        _record_message(user_text, "CRISIS", "semantic_crisis", sem_scores["CRISIS"], {})
        return {
            "protocol": "CRISIS",
            "reason": "semantic_crisis",
            "score": float(sem_scores["CRISIS"]),
            "details": {},
            "text": user_text,
        }

    chosen_protocol = max(final_scores, key=final_scores.get)
    chosen_score = final_scores[chosen_protocol]

    if chosen_score < 0.05:
        chosen_protocol = DEFAULT_PROTOCOL
        chosen_score = 0.0
        reason = "low_confidence_fallback"
    else:
        reason = "weighted_aggregation"

    st.session_state.detected_protocol = chosen_protocol

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
    scores = semantic_scores(text)
    best = max(scores, key=scores.get)
    return best, float(scores[best])

def auto_route(user_text, user_context=None, visual=None):
    return route_message(user_text, user_context=user_context, visual=visual)

# ============================================================
# FEEDBACK
# ============================================================

def submit_feedback(message_index=None, success=True):
    _ensure_session_defaults()
    history = st.session_state.message_history

    if not history:
        return {"status": "no_history"}

    idx = message_index if message_index is not None else -1
    if idx < -len(history) or idx >= len(history):
        return {"status": "bad_index"}

    proto = history[idx]["protocol"]
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
    ss = st.session_state
    return {
        "active_state": ss.active_state,
        "auto_routing": ss.auto_routing,
        "routing_weights": dict(ss.routing_weights),
        "protocol_performance": dict(ss.protocol_performance),
        "history_len": len(ss.message_history),
    }
