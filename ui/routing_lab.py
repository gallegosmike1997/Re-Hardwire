"""
ui/routing_lab.py - Routing Lab Page for Re-Hardwire

Provides:
- Text + optional visual input
- Full routing inspector view
- Live routing preview
"""

from __future__ import annotations
import streamlit as st
from PIL import Image

from core.routing import auto_route, get_user_state
from core.routing_viz import routing_inspector   # FIXED IMPORT


def render_routing_lab():
    st.header("Routing Lab")

    st.markdown(
        """
        Use the Routing Lab to test how the adaptive routing engine responds
        to different text inputs and optional somatic visuals.
        """
    )

    # -----------------------------
    # INPUTS
    # -----------------------------
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

    # -----------------------------
    # RUN ROUTING
    # -----------------------------
    if st.button("Run Routing"):
        if not text.strip():
            st.warning("Please enter text before running routing.")
            return

        routing_result = auto_route(text, user_context={}, visual=visual_img)

        proto = routing_result.get("protocol")
        reason = routing_result.get("reason")
        score = routing_result.get("score")

        st.subheader("Routing Result")
        st.success(f"Protocol: **{proto}**")
        st.write(f"Reason: `{reason}`")
        st.write(f"Score: `{score:.3f}`")

        # Full inspector
        st.markdown("---")
        st.subheader("Routing Inspector")
        routing_inspector(text, visual_img)

        # User state snapshot
        st.markdown("---")
        st.subheader("User State")
        st.json(get_user_state())
