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
    return (
        "data:image/svg+xml;utf8,"
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2314B8A6'>"
        "<path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' "
        "stroke='%2314B8A6' stroke-width='2' fill='none'/></svg>"
    )


def apply_theme(logo_path: str, theme_mode: str):
    logo_uri = get_svg_data_uri(logo_path)
    is_light_theme = theme_mode == "Light"

    bg_color = "#FFFFFF" if is_light_theme else "#0E1117"
    text_color = "#18181B" if is_light_theme else "#FAFAFA"
    chat_box_bg = "#F4F4F5" if is_light_theme else "#161B22"
    chat_box_border = "#D4D4D8" if is_light_theme else "#30363D"
    chat_hover_bg = "#E4E4E7" if is_light_theme else "#21262D"
    avatar_bg = "#E4E4E7" if is_light_theme else "#21262D"
    auth_bg = "#F4F4F5" if is_light_theme else "#18181B"
    auth_border = "#D4D4D8" if is_light_theme else "#3F3F46"
    auth_svg_fill = "#52525B" if is_light_theme else "#A1A1AA"
    title_gradient = (
        "linear-gradient(180deg, #18181B 10%, #3F3F46 50%, #71717A 100%)"
        if is_light_theme
        else "linear-gradient(180deg, #FFFFFF 10%, #F4F4F5 50%, #A1A1AA 100%)"
    )
    subtitle_color = "#52525B" if is_light_theme else "#A1A1AA"
    input_bg = "#FFFFFF" if is_light_theme else "#161B22"

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
        .stChatMessage {{
            background-color: {chat_box_bg} !important;
            color: {text_color} !important;
            border: 1px solid {chat_box_border} !important;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }}
        .stChatMessage p, .stChatMessage div, .stChatMessage span, .stChatMessage li, .stChatMessage label {{
            color: {text_color} !important;
        }}
        .stChatMessage:hover {{
            background-color: {chat_hover_bg} !important;
        }}
        [data-testid="stChatMessageAvatarUser"], [data-testid="stChatMessageAvatarAssistant"] {{
            background-color: {avatar_bg} !important;
            color: {text_color} !important;
            border: 1px solid {chat_box_border} !important;
        }}
        [data-testid="stChatInput"] {{
            background-color: {input_bg} !important;
            border: 1px solid {chat_box_border} !important;
            border-radius: 12px !important;
            color: {text_color} !important;
        }}
        [data-testid="stChatInput"] textarea {{
            background-color: {input_bg} !important;
            color: {text_color} !important;
            -webkit-text-fill-color: {text_color} !important;
            caret-color: {text_color} !important;
        }}
        [data-testid="stChatInput"] textarea::placeholder {{
            color: {subtitle_color} !important;
            -webkit-text-fill-color: {subtitle_color} !important;
        }}
        .hero-container {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin-top: 1rem;
            margin-bottom: 16px;
            padding: 4px 15px;
        }}
        .hero-logo-wrapper {{
            width: 68px;
            height: 68px;
            border-radius: 50%;
            background-color: {chat_box_bg};
            border: 1px solid {chat_box_border};
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
            transition: all 0.3s ease;
        }}
        .hero-logo {{
            width: 40px;
            height: 40px;
        }}
        .hero-title {{
            font-size: 2.7rem;
            font-weight: 900;
            letter-spacing: -0.02em;
            font-family: 'Montserrat', 'Inter', system-ui, -apple-system, sans-serif;
            text-transform: uppercase;
            background: {title_gradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            -webkit-text-stroke: 2.4px #0D9488;
            text-shadow:
                0 4px 16px rgba(0, 0, 0, 0.15),
                0 0 25px rgba(13, 148, 136, 0.25);
            margin: 0;
            padding: 0;
        }}
        .hero-subtitle {{
            font-size: 0.88rem;
            color: {subtitle_color};
            margin-top: 6px;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .auth-footer-container {{
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 30px;
            margin-bottom: 15px;
            width: 100%;
        }}
        .auth-circle {{
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: {auth_bg};
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 1px solid {auth_border};
        }}
        .auth-circle svg {{
            width: 16px;
            height: 16px;
            fill: {auth_svg_fill};
            transition: fill 0.3s ease;
        }}
        .auth-circle:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
            border-color: #14B8A6;
            background-color: {chat_hover_bg};
        }}
        .auth-circle:hover svg {{
            fill: #14B8A6;
        }}
        </style>

        <div class="hero-container">
            <div class="hero-logo-wrapper">
                <img src="{logo_uri}" class="hero-logo" alt="Re-Hardwire Logo">
            </div>
            <a href="?" class="hero-title-link">
                <h1 class="hero-title">Re-Hardwire</h1>
            </a>
            <div class="hero-subtitle">
                Private Cognitive Routing Engine &bull; CBT &bull; DBT &bull; ACT &bull; Somatic
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
