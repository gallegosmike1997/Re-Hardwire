"""
ui/theme.py - Global Theme Styling for Re-Hardwire
"""

import streamlit as st


def apply_theme(logo_path, mode="Dark"):
    """
    Apply global theme styles + spacing improvements.
    """

    css = """
    <style>

    /* Spacing under header */
    .hero-container + div {
        margin-top: 28px !important;
    }

    /* Chat input spacing */
    .stChatInputContainer {
        margin-top: 20px !important;
    }

    /* Metallic accent borders */
    .stButton > button {
        border: 1px solid rgba(255,255,255,0.25) !important;
        background: linear-gradient(180deg, #1f1f1f, #0d0d0d) !important;
        color: #e5e5e5 !important;
    }

    /* Sidebar spacing */
    section[data-testid="stSidebar"] {
        padding-top: 16px !important;
    }

    </style>
    """

    st.markdown(css, unsafe_allow_html=True)
