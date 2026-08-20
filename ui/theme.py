import os
import base64
import streamlit as st


def get_svg_data_uri(file_path: str) -> str:
    if os.path.exists(file_path):
        try:
            with open(file_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/svg+xml;base64,{encoded}"
        except Exception:
            pass

    # Fallback SVG
    return (
        "data:image/svg+xml;utf8,"
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2314B8A6'>"
        "<path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' "
        "stroke='%2314B8A6' stroke-width='2' fill='none'/></svg>"
    )


def apply_theme(logo_path: str, theme_mode: str):
    """
    Apply global theme + chat styling.
    Header is now handled separately in header.py.
    """
    logo_uri = get_svg_data_uri(logo_path)
    is_light = theme_mode == "Light"

    bg_color = "#FFFFFF" if is_light else "#0E1117"
    text_color = "#18181B" if is_light else "#FAFAFA"
    chat_bg = "#F4F4F5" if is_light else "#161B22"
    chat_border = "#D4D4D8" if is_light else "#30363D"
    chat_hover = "#E4E4E7" if is_light else "#21262D"
    avatar_bg = "#E4E4E7" if is_light else "#21262D"
    subtitle_color = "#52525B" if is_light else "#A1A1AA"
    input_bg = "#FFFFFF" if is_light else "#161B22"

    st.markdown(
        f"""
        <style>
        .stApp {{
            background-color: {bg_color};
            color: {text_color};
        }}

        div.block-container {{
            padding-top: 1.5rem !important;
            padding-bottom: 2rem !important;
        }}

        /* Chat bubbles */
        .stChatMessage {{
            background-color: {chat_bg} !important;
            border: 1px solid {chat_border} !important;
            border-radius: 12px !important;
            padding: 14px !important;
            margin-bottom: 12px !important;
            transition: all 0.2s ease;
        }}

        .stChatMessage:hover {{
            background-color: {chat_hover} !important;
        }}

        /* Avatar styling */
        [data-testid="stChatMessageAvatarUser"],
        [data-testid="stChatMessageAvatarAssistant"] {{
            background-color: {avatar_bg} !important;
            border: 1px solid {chat_border} !important;
        }}

        /* Chat input */
        [data-testid="stChatInput"] {{
            background-color: {input_bg} !important;
            border: 1px solid {chat_border} !important;
            border-radius: 12px !important;
        }}

        [data-testid="stChatInput"] textarea {{
            background-color: {input_bg} !important;
            color: {text_color} !important;
            caret-color: {text_color} !important;
        }}

        [data-testid="stChatInput"] textarea::placeholder {{
            color: {subtitle_color} !important;
        }}
        </style>
        """,
        unsafe_allow_html=True,
    )
