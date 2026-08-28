"""
ui/protocol_tuning.py — Polished Protocol Tuning UI for Re‑Hardwire

Provides:
- Inspect current routing weights
- Adjust weights via sliders
- View protocol performance
- Live routing preview
"""

from __future__ import annotations
import streamlit as st

from core.routing import get_user_state, auto_route


# ---------------------------------------------------------
# Small reusable badge component
# ---------------------------------------------------------

def _badge(text, color="#0D9488"):
    return f"""
    <span style="
        display:inline-block;
        padding:4px 10px;
        border-radius:12px;
        background:{color};
        color:white;
        font-size:0.78rem;
        font-weight:600;
        letter-spacing:0.03em;
        margin-right:6px;
    ">{text}</span>
    """


# ---------------------------------------------------------
# Main Protocol Tuning UI
# ---------------------------------------------------------

def render_protocol_tuning():
    st.header("Protocol Tuning")
    st.caption("Adjust how Re‑Hardwire blends semantic, keyword, recency, and preference signals.")

    # ---------------------------------------------------------
    # FETCH CURRENT STATE
    # ---------------------------------------------------------

    state = get_user_state()
    weights = state["routing_weights"]
    perf = state["protocol_performance"]

    # ---------------------------------------------------------
    # BADGES
    # ---------------------------------------------------------

    st.markdown(
        _badge("Semantic", "#0D9488")
        + _badge("Keyword", "#9333EA")
        + _badge("Recency", "#2563EB")
        + _badge("User Pref", "#EA580C"),
        unsafe_allow_html=True
    )

    st.markdown("---")

    # ---------------------------------------------------------
    # WEIGHT SLIDERS
    # ---------------------------------------------------------

    st.markdown("### Routing Weights")

    col1, col2 = st.columns(2)

    with col1:
        semantic = st.slider(
            "Semantic weight",
            0.0, 1.0, float(weights["semantic"]), 0.01
        )
        keyword = st.slider(
            "Keyword weight",
            0.0, 1.0, float(weights["keyword"]), 0.01
        )

    with col2:
        recency = st.slider(
            "Recency weight",
            0.0, 1.0, float(weights["recency"]), 0.01
        )
        user_pref = st.slider(
            "User preference weight",
            0.0, 1.0, float(weights["user_pref"]), 0.01
        )

    # Normalize weights
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

    # ---------------------------------------------------------
    # BLEND VISUALIZATION
    # ---------------------------------------------------------

    st.markdown("### Current Blend")

    st.progress(new_weights["semantic"])
    st.caption(f"Semantic: {new_weights['semantic']*100:.1f}%")

    st.progress(new_weights["keyword"])
    st.caption(f"Keyword: {new_weights['keyword']*100:.1f}%")

    st.progress(new_weights["recency"])
    st.caption(f"Recency: {new_weights['recency']*100:.1f}%")

    st.progress(new_weights["user_pref"])
    st.caption(f"User Pref: {new_weights['user_pref']*100:.1f}%")

    # ---------------------------------------------------------
    # PERFORMANCE DASHBOARD
    # ---------------------------------------------------------

    st.markdown("---")
    st.markdown("### Protocol Performance")
    st.json(perf)

    # ---------------------------------------------------------
    # LIVE ROUTING PREVIEW
    # ---------------------------------------------------------

    st.markdown("---")
    st.markdown("### Live Routing Preview")

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

            with st.expander("Advanced Routing Metadata", expanded=False):
                st.json(result.get("details", {}))

    # ---------------------------------------------------------
    # FOOTER
    # ---------------------------------------------------------

    st.markdown("---")
    st.caption(
        "Protocol Tuning allows you to shape how Re‑Hardwire blends semantic, keyword, recency, "
        "and preference signals to match your preferred therapeutic style."
    )
    detected = st.session_state.get("detected_protocol")
    st.caption(f"Detected Protocol: **{detected}**")
