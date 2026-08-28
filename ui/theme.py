import streamlit as st


def apply_theme(logo_path: str, mode: str):
    """
    Apply the Re‑Hardwire global theme.
    Supports:
    - Dark mode (default)
    - Light mode
    """

    dark = mode.lower() == "dark"

    # -----------------------------
    # COLOR PALETTE
    # -----------------------------
    if dark:
        bg = "#0B0F12"
        card_bg = "rgba(255,255,255,0.06)"
        border = "rgba(255,255,255,0.12)"
        text = "#F4F4F5"
        subtext = "#A1A1AA"
        accent = "#0D9488"
        bubble_user = "rgba(13,148,136,0.22)"
        bubble_assistant = "rgba(255,255,255,0.08)"
    else:
        bg = "#F8F8FA"
        card_bg = "rgba(255,255,255,0.65)"
        border = "rgba(0,0,0,0.12)"
        text = "#1F1F1F"
        subtext = "#4B5563"
        accent = "#0D9488"
        bubble_user = "rgba(13,148,136,0.18)"
        bubble_assistant = "rgba(0,0,0,0.05)"

    # -----------------------------
    # GLOBAL CSS INJECTION
    # -----------------------------
    css = f"""
    <style>

        /* Global background */
        .stApp {{
            background: {bg};
        }}

        /* Glass-card blocks */
        .glass-card {{
            backdrop-filter: blur(18px);
            background: {card_bg};
            border: 1px solid {border};
            border-radius: 24px;
            padding: 32px 48px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        }}

        /* Text colors */
        h1, h2, h3, h4, h5, h6, p, span, div {{
            color: {text};
        }}

        .subtext {{
            color: {subtext};
        }}

        /* Chat input */
        textarea {{
            background: {card_bg} !important;
            color: {text} !important;
            border-radius: 12px !important;
            border: 1px solid {border} !important;
        }}

        /* Chat bubbles */
        .stChatMessage {{
            border-radius: 18px !important;
            padding: 16px !important;
            margin-bottom: 12px !important;
        }}

        .stChatMessage.user {{
            background: {bubble_user} !important;
        }}

        .stChatMessage.assistant {{
            background: {bubble_assistant} !important;
        }}

        /* Sidebar */
        section[data-testid="stSidebar"] {{
            background: {bg};
            border-right: 1px solid {border};
        }}

        /* Buttons */
        button[kind="primary"] {{
            background: {accent} !important;
            color: white !important;
            border-radius: 10px !important;
        }}

        button {{
            border-radius: 10px !important;
        }}

    </style>
    """

    st.markdown(css, unsafe_allow_html=True)
