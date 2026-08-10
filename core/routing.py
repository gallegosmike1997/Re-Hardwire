import streamlit as st
from sentence_transformers import SentenceTransformer, util
import torch

# ---------------------------------------------------------
# MODEL INITIALIZATION
# ---------------------------------------------------------

# Lightweight semantic model
model = SentenceTransformer("all-MiniLM-L6-v2")

MODULES = ["CBT", "DBT", "ACT", "SOMATIC", "CRISIS"]

SEMANTIC_EXAMPLES = {
    "CBT": [
        "negative thoughts", "cognitive distortions", "overthinking",
        "catastrophizing", "self doubt", "rumination"
    ],
    "DBT": [
        "emotion regulation", "distress tolerance", "mindfulness",
        "wise mind", "cope", "skills", "interpersonal conflict"
    ],
    "ACT": [
        "values", "acceptance", "present moment", "avoidance",
        "commitment", "defusion", "purpose"
    ],
    "SOMATIC": [
        "tight chest", "panic", "heart racing", "breathing",
        "body sensations", "grounding", "tension"
    ],
    "CRISIS": [
        "suicide", "kill myself", "end it all", "want to die",
        "hopeless", "no way out", "self harm"
    ]
}

# Precompute embeddings for semantic routing
EMBEDDINGS = {
    m: model.encode(SEMANTIC_EXAMPLES[m], convert_to_tensor=True)
    for m in MODULES
}

# ---------------------------------------------------------
# SEMANTIC ROUTING ENGINE
# ---------------------------------------------------------

def semantic_route(text: str):
    """
    Computes semantic similarity between user text and module examples.
    Returns best module, confidence score, and full score map.
    """
    text_emb = model.encode(text, convert_to_tensor=True)
    scores = {}

    for module in MODULES:
        sims = util.cos_sim(text_emb, EMBEDDINGS[module])
        scores[module] = float(torch.max(sims))

    # Crisis amplification
    crisis_hit = any(k in text.lower() for k in SEMANTIC_EXAMPLES["CRISIS"])
    if crisis_hit:
        scores["CRISIS"] += 0.25

    best = max(scores, key=scores.get)
    confidence = scores[best]

    return best, confidence, scores

# ---------------------------------------------------------
# AUTO ROUTING LOGIC
# ---------------------------------------------------------

def auto_route(user_text: str) -> str:
    """
    Full auto-routing logic combining semantic routing + keyword routing.
    """

    text_lower = user_text.lower()

    # 1. Crisis override
    if any(k in text_lower for k in SEMANTIC_EXAMPLES["CRISIS"]):
        st.session_state.active_state = "CRISIS"
        return "CRISIS"

    # 2. Somatic detection
    if any(k in text_lower for k in SEMANTIC_EXAMPLES["SOMATIC"]):
        st.session_state.active_state = "SOMATIC"
        return "SOMATIC"

    # 3. Semantic routing
    module, confidence, _ = semantic_route(user_text)

    # 4. Confidence fallback
    if confidence < 0.25:
        st.session_state.active_state = "CBT"
        return "CBT"

    st.session_state.active_state = module
    return module

# ---------------------------------------------------------
# PUBLIC ROUTING API
# ---------------------------------------------------------

def route_message(user_text: str) -> dict:
    """
    Main routing function used by the UI.
    Returns a dict describing routing results.
    """

    auto = st.session_state.get("auto_routing", True)

    # Manual override
    if not auto:
        active = st.session_state.get("active_state", "CBT")
        return {
            "protocol": active,
            "reason": "manual_selection",
            "text": user_text,
        }

    # Auto routing
    module = auto_route(user_text)
    return {
        "protocol": module,
        "reason": "auto_routing",
        "text": user_text,
    }

# ---------------------------------------------------------
# USER STATE SNAPSHOT
# ---------------------------------------------------------

def get_user_state() -> dict:
    """
    Returns a stable snapshot of user state for UI + routing.
    Ensures all keys exist.
    """

    return {
        "active_state": st.session_state.get("active_state", "CBT"),
        "auto_routing": st.session_state.get("auto_routing", True),
        "feelings": st.session_state.get("user_profile", {}).get("feelings", []),
        "thoughts": st.session_state.get("user_profile", {}).get("thoughts", []),
        "goals": st.session_state.get("user_profile", {}).get("goals", ""),
        "hobbies": st.session_state.get("user_profile", {}).get("hobbies", []),
        "loc_permission": st.session_state.get("loc_permission", False),
        "notif_permission": st.session_state.get("notif_permission", False),
        "mic_permission": st.session_state.get("mic_permission", False),
    }
