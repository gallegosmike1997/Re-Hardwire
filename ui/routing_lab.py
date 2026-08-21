"""
ui/routing_lab.py - Routing Lab Page for Re-Hardwire
"""

import streamlit as st
from PIL import Image

from core.routing import get_user_state
from core.routing_viz import routing_inspector


def render_routing_lab():
    st.header("Routing Lab")

    text = st.text_area("User Text", "")
    visual_file = st.file_uploader("Somatic Visual (optional)", type=["png", "jpg", "jpeg"])

    visual_img = None
    if visual_file:
        visual_img = Image.open(visual_file).convert("RGB")

    if st.button("Run Routing"):
        routing_inspector(text, visual_img)

    st.markdown("---")
    st.subheader("User State")
    st.json(get_user_state())
