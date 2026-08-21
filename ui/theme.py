import streamlit as st

def apply_theme(logo_path: str, mode: str = "Dark"):
    """
    Apply global theme styles + spacing improvements.
    """

    base_css = """
    <style>

    /* Global spacing under header */
    .hero-container + div {
        margin-top: 24px !important;
    }

    /* Improve chat input spacing */
    .stChatInputContainer {
        margin-top: 18px !important;
    }

    /* Improve sidebar spacing */
    section[data-testid="stSidebar"] {
        padding-top: 12px !important;
    }

    /* Body padding */
    .main {
        padding-top: 10px !important;
    }

    </style>
    """

    st.markdown(base_css, unsafe_allow_html=True)
