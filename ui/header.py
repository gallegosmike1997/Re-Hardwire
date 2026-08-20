import streamlit as st
import base64
import os


def get_svg_data_uri(file_path: str) -> str:
    """
    Load an SVG and convert it to a data URI.
    Falls back to a minimal inline SVG if missing.
    """
    if os.path.exists(file_path):
        try:
            with open(file_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/svg+xml;base64,{encoded}"
        except Exception:
            pass

    # Fallback inline SVG
    return (
        "data:image/svg+xml;utf8,"
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2314B8A6'>"
        "<path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' "
        "stroke='%2314B8A6' stroke-width='2' fill='none'/></svg>"
    )


def render_header(logo_path: str, title: str = "Re‑Hardwire"):
    """
    Render the Re-Hardwire hero header with dynamic page title.
    """
    logo_uri = get_svg_data_uri(logo_path)

    st.markdown(
        f"""
        <div class="hero-container" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin-top: 1rem;
            margin-bottom: 16px;
            padding: 4px 15px;
        ">
            <div class="hero-logo-wrapper" style="
                width: 68px;
                height: 68px;
                border-radius: 50%;
                background-color: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.12);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
            ">
                <img src="{logo_uri}" class="hero-logo" style="width: 40px; height: 40px;" />
            </div>

            <h1 class="hero-title" style="
                font-size: 2.7rem;
                font-weight: 900;
                letter-spacing: -0.02em;
                font-family: 'Montserrat', 'Inter', sans-serif;
                text-transform: uppercase;
                background: linear-gradient(180deg, #FFFFFF 10%, #F4F4F5 50%, #A1A1AA 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                -webkit-text-stroke: 2.4px #0D9488;
                margin: 0;
                padding: 0;
            ">
                {title}
            </h1>

            <div class="hero-subtitle" style="
                font-size: 0.88rem;
                color: #A1A1AA;
                margin-top: 6px;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                font-weight: 600;
            ">
                Adaptive Cognitive Routing Engine • CBT • DBT • ACT • Somatic
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
