"""
ui/routing_lab.py — Polished Routing Lab for Re‑Hardwire

Provides:
- Text + optional visual input
- Adaptive routing preview
- Cinematic routing result panel
- Full routing inspector
- User state snapshot
"""

from __future__ import annotations
import streamlit as st
from PIL import Image

from core.routing import auto_route, get_user_state
from core.routing_viz import routing_inspector   # FIXED IMPORT


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
# Main Routing Lab UI
# ---------------------------------------------------------

def render_routing_lab():
    st.header("Routing Lab")
    st.caption("Test how the adaptive routing engine responds to text and optional somatic visuals.")

    # ---------------------------------------------------------
    # INPUTS
    # ---------------------------------------------------------

    text = st.text_area("User text", "", height=160)

    visual_file = st.file_uploader(
        "Somatic visual (optional)",
        type=["png", "jpg", "jpeg"]
    )

    visual_img = None
    if visual_file is not None:
        visual_img = Image.open(visual_file).convert("RGB")
        st.image(
            visual_img,
            caption="Uploaded Somatic Visual",
            use_column_width=True
        )

    # ---------------------------------------------------------
    # RUN ROUTING
    # ---------------------------------------------------------

    if st.button("Run Routing"):
        if not text.strip():
            st.warning("Please enter text before running routing.")
            return

        routing_result = auto_route(text, user_context={}, visual=visual_img)

        proto = routing_result.get("protocol")  # detected protocol only
        reason = routing_result.get("reason", "No reasoning provided.")
        score = routing_result.get("score", 0.0)
        details = routing_result.get("details", {})

        # ---------------------------------------------------------
        # CINEMATIC RESULT PANEL
        # ---------------------------------------------------------

        st.markdown("### Routing Result")

        if proto:
            st.markdown(_badge(proto), unsafe_allow_html=True)
        else:
            st.info("No protocol detected.")

        st.markdown("#### Confidence Score")
        st.progress(min(max(score, 0.0), 1.0))
        st.caption(f"Routing confidence: **{score:.3f}**")

        st.markdown("#### Why This Protocol Was Chosen")
        st.write(reason)

        # ---------------------------------------------------------
        # FULL INSPECTOR
        # ---------------------------------------------------------

        st.markdown("---")
        st.markdown("### Routing Inspector")
        routing_inspector(text, visual_img)

        # ---------------------------------------------------------
        # USER STATE SNAPSHOT
        # ---------------------------------------------------------

        st.markdown("---")
        st.markdown("### User State Snapshot")
        st.json(get_user_state())

        # ---------------------------------------------------------
        # ADVANCED METADATA
        # ---------------------------------------------------------

        if details:
            with st.expander("Advanced Routing Metadata", expanded=False):
                st.json(details)

        # ---------------------------------------------------------
        # FOOTER
        # ---------------------------------------------------------

        st.markdown("---")
        st.caption(
            "The Routing Lab helps you understand how Re‑Hardwire blends CBT, DBT, ACT, and Somatic tools "
            "based on your current cognitive and emotional signals."
        )
