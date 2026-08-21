"""
routing_viz.py — Streamlit Visualization Dashboard for Re-Hardwire Routing V5

Provides:
- Protocol score visualization
- Semantic similarity heatmap
- Keyword match indicators
- Recency + user preference breakdown
- Visual somatic embedding viewer
- Full routing decision inspector
"""

from __future__ import annotations
import numpy as np
import torch
import streamlit as st
from PIL import Image

# Routing imports
    user_pref_score,
    auto_route,
    get_user_state,
)

# Visual somatic imports
from core.visual_somatic import somatic_visual_embedding


# ------------------------------------------------------------
# Utility
# ------------------------------------------------------------
def _section(title: str):
    st.markdown(f"### {title}")


def _sub(text: str):
    st.markdown(f"**{text}**")


# ------------------------------------------------------------
# Protocol Score Bars
# ------------------------------------------------------------
def show_protocol_scores(final_scores: dict):
    _section("Protocol Score Breakdown")

    for proto, score in final_scores.items():
        st.write(f"{proto}: {score:.4f}")
        st.progress(min(1.0, score))


# ------------------------------------------------------------
# Semantic Heatmap
# ------------------------------------------------------------
def show_semantic_heatmap(semantic_scores: dict):
    _section("Semantic Similarity Heatmap")

    protos = list(semantic_scores.keys())
    values = np.array([semantic_scores[p] for p in protos])

    st.bar_chart(values, height=200)


# ------------------------------------------------------------
# Keyword Match Indicators
# ------------------------------------------------------------
def show_keyword_matches(text: str, keyword_scores: dict):
    _section("Keyword Match Indicators")

    for proto, score in keyword_scores.items():
        st.write(f"{proto}: {score:.4f}")
        st.progress(min(1.0, score))


# ------------------------------------------------------------
# Recency + User Preference Breakdown
# ------------------------------------------------------------
def show_recency_pref(recency_scores: dict, pref_scores: dict):
    _section("Recency & User Preference Influence")

    st.write("**Recency Scores**")
    for proto, score in recency_scores.items():
        st.write(f"{proto}: {score:.4f}")

    st.write("**User Preference Scores**")
    for proto, score in pref_scores.items():
        st.write(f"{proto}: {score:.4f}")


# ------------------------------------------------------------
# Visual Somatic Embedding Viewer
# ------------------------------------------------------------
def show_visual_embedding(img: Image.Image):
    _section("Visual Somatic Embedding")

    st.image(img, caption="Somatic Experience Visual", use_column_width=True)

    emb = somatic_visual_embedding(img)
    st.write("Embedding shape:", emb.shape)
    st.write("Embedding mean:", float(emb.mean()))
    st.write("Embedding norm:", float(emb.norm()))

    # Show histogram
    st.write("Embedding Distribution")
    st.line_chart(emb.numpy())


# ------------------------------------------------------------
# Full Routing Inspector
# ------------------------------------------------------------
def routing_inspector(text: str, visual: Image.Image | None = None):
    _section("Routing Inspector")

    result = auto_route(text, visual=visual)
    details = result["details"]

    st.write("**Chosen Protocol:**", result["protocol"])
    st.write("**Reason:**", result["reason"])
    st.write("**Score:**", result["score"])

    # Protocol scores
    show_protocol_scores(details["final_scores"])

    # Semantic heatmap
    show_semantic_heatmap(details["semantic_scores"])

    # Keyword matches
    show_keyword_matches(text, details["keyword_scores"])

    # Recency + user preference
    show_recency_pref(details["recency_scores"], details["pref_scores"])

    # Visual embedding (if provided)
    if visual is not None:
        show_visual_embedding(visual)

    # Raw details
    _section("Raw Routing Details")
    st.json(details)


# ------------------------------------------------------------
# Standalone Streamlit App
# ------------------------------------------------------------
def run_viz_app():
    st.title("Re-Hardwire Routing V5 — Visualization Dashboard")

    text = st.text_area("Enter user text:", "")
    visual_file = st.file_uploader("Upload somatic visual (optional):", type=["png", "jpg", "jpeg"])

    visual_img = None
    if visual_file:
        visual_img = Image.open(visual_file).convert("RGB")

    if st.button("Run Routing"):
        routing_inspector(text, visual_img)

    st.markdown("---")
    st.markdown("**User State:**")
    st.json(get_user_state())


if __name__ == "__main__":
    run_viz_app()
