"""
ui/protocol_tuning.py - Protocol Tuning UI for Re-Hardwire Routing V5
"""

import streamlit as st
from core.routing import get_user_state


def render_protocol_tuning():
    st.header("Protocol Tuning")

    state = get_user_state()
    weights = state["routing_weights"]
    perf = state["protocol_performance"]

    st.subheader("Routing Weights")

    semantic = st.slider("Semantic Weight", 0.0, 1.0, float(weights["semantic"]), 0.01)
    keyword = st.slider("Keyword Weight", 0.0, 1.0, float(weights["keyword"]), 0.01)
    recency = st.slider("Recency Weight", 0.0, 1.0, float(weights["recency"]), 0.01)
    user_pref = st.slider("User Preference Weight", 0.0, 1.0, float(weights["user_pref"]), 0.01)

    total = semantic + keyword + recency + user_pref or 1.0
    new_weights = {
        "semantic": semantic / total,
        "keyword": keyword / total,
        "recency": recency / total,
        "user_pref": user_pref / total,
    }

    if st.button("Apply Weights"):
        st.session_state.routing_weights = new_weights
        st.success("Routing weights updated.")

    st.subheader("Protocol Performance")
    st.json(perf)
