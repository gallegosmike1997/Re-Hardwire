"""
core/routing_viz.py — Polished Routing Visualization for Re‑Hardwire

Provides:
- Protocol badge
- Semantic similarity heatmap
- Keyword match indicators
- Recency + preference bars
- Somatic visual embedding viewer
- Full routing breakdown
"""

from __future__ import annotations
import streamlit as st
import numpy as np
from PIL import Image


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
# Main Routing Inspector
# ---------------------------------------------------------

def routing_inspector(text: str, visual_img: Image.Image | None):
    st.markdown("### Routing Inspector")

    # ---------------------------------------------------------
    # PROTOCOL BADGE
    # ---------------------------------------------------------

    st.markdown("#### Protocol")
    proto = st.session_state.last_details.get("protocol")
    if proto:
        st.markdown(_badge(proto), unsafe_allow_html=True)
    else:
        st.info("No protocol detected.")

    # ---------------------------------------------------------
    # SEMANTIC SIMILARITY HEATMAP
    # ---------------------------------------------------------

    semantic_scores = st.session_state.last_details.get("semantic_scores")
    if semantic_scores is not None:
        st.markdown("#### Semantic Similarity")
        st.caption("Higher values indicate stronger semantic alignment with protocol exemplars.")

        arr = np.array(semantic_scores).reshape(1, -1)
        st.dataframe(arr, height=80)

    # ---------------------------------------------------------
    # KEYWORD MATCH INDICATORS
    # ---------------------------------------------------------

    keyword_score = st.session_state.last_details.get("keyword_score")
    if keyword_score is not None:
        st.markdown("#### Keyword Match")
        st.progress(min(max(keyword_score, 0.0), 1.0))
        st.caption(f"Keyword match score: **{keyword_score:.3f}**")

    # ---------------------------------------------------------
    # RECENCY + USER PREFERENCE
    # ---------------------------------------------------------

    recency_score = st.session_state.last_details.get("recency_score")
    user_pref_score = st.session_state.last_details.get("user_pref_score")

    st.markdown("#### Recency & Preference Signals")

    if recency_score is not None:
        st.progress(min(max(recency_score, 0.0), 1.0))
        st.caption(f"Recency score: **{recency_score:.3f}**")

    if user_pref_score is not None:
        st.progress(min(max(user_pref_score, 0.0), 1.0))
        st.caption(f"User preference score: **{user_pref_score:.3f}**")

    # ---------------------------------------------------------
    # SOMATIC VISUAL EMBEDDING VIEWER
    # ---------------------------------------------------------

    if visual_img is not None:
        st.markdown("#### Somatic Visual Embedding")
        st.caption("Embedding preview for the uploaded somatic visual.")

        try:
            from core.visual_somatic import somatic_visual_embedding
            emb = somatic_visual_embedding(visual_img)

            st.json({"embedding_dim": len(emb), "preview": emb[:16]})
        except Exception:
            st.warning("Somatic visual embedding unavailable.")

    # ---------------------------------------------------------
    # FULL ROUTING DETAILS
    # ---------------------------------------------------------

    st.markdown("---")
    st.markdown("### Full Routing Metadata")

    details = st.session_state.last_details.get("details", {})
    st.json(details)

    st.markdown("---")
    st.caption(
        "Routing Inspector visualizes how Re‑Hardwire blends semantic, keyword, recency, "
        "preference, and somatic signals to determine the active protocol."
    )
