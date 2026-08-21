"""
ui/protocol_tuning.py - Protocol Tuning UI for Re-Hardwire

Lets you:
- Inspect current routing weights
- Manually adjust weights via sliders
- View protocol performance (wins/calls)
- Live preview of weighted routing output
"""

from __future__ import annotations
import streamlit as st

from core.routing import get_user_state, auto_route


def render_protocol_tuning():
    st.header("Protocol Tuning")

    state = get_user_state()
    weights = state["routing_weights"]
    perf = state["protocol_performance"]

    # -----------------------------
    # CURRENT WEIGHTS
    # -----------------------------
    st.subheader("Routing Weights")

    semantic = st.slider(
        "Semantic weight",
        0.0, 1.0, float(weights["semantic"]), 0.01
    )
    keyword = st.slider(
        "Keyword weight",
        0.0, 1.0, float(weights["keyword"]), 0.01
    )
    recency = st.slider(
        "Recency weight",
        0.0, 1.0, float(weights["recency"]), 0.01
    )
    user_pref = st.slider(
        "User preference weight",
        0.0, 1.0, float(weights["user_pref"]), 0.01
    )

    total = semantic + keyword + recency + user_pref or 1.0
    new_weights = {
        "semantic": semantic / total,
        "keyword": keyword / total,
        "recency": recency / total,
        "user_pref": user_pref / total,
    }

    if st.button("Apply weights"):
        st.session_state.routing_weights = new_weights
        st.success("Routing weights updated.")

    # -----------------------------
    # PERFORMANCE
    # -----------------------------
    st.markdown("---")
    st.subheader("Protocol Performance")
    st.json(perf)

    # -----------------------------
    # LIVE PREVIEW
    # -----------------------------
    st.markdown("---")
    st.subheader("Live Routing Preview")

    preview_text = st.text_area("Preview text", "", height=120)

    if st.button("Run Preview"):
        if not preview_text.strip():
            st.warning("Enter text to preview routing.")
        else:
            result = auto_route(preview_text)
            proto = result.get("protocol")
            reason = result.get("reason")
            score = result.get("score")

            st.success(f"Protocol: **{proto}**")
            st.write(f"Reason: `{reason}`")
            st.write(f"Score: `{score:.3f}`")

            st.json(result.get("details", {}))
