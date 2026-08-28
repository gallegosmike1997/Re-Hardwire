import streamlit as st
import base64


def load_svg(svg_path: str) -> str:
    """Load an SVG file and return it as a base64 data URI."""
    try:
        with open(svg_path, "r", encoding="utf-8") as f:
            svg_data = f.read()
        encoded = base64.b64encode(svg_data.encode("utf-8")).decode("utf-8")
        return f"data:image/svg+xml;base64,{encoded}"
    except Exception:
        return ""


def render_header(logo_path: str, title: str):
    """Render the Re‑Hardwire dynamic header block."""

    svg_uri = load_svg(logo_path)

    header_html = f"""
    <style>
        @keyframes rhGlow {{
            0% {{
                text-shadow: 0 0 4px rgba(13,148,136,0.45),
                             0 0 12px rgba(13,148,136,0.35);
            }}
            50% {{
                text-shadow: 0 0 10px rgba(13,148,136,0.65),
                             0 0 22px rgba(13,148,136,0.45);
            }}
            100% {{
                text-shadow: 0 0 4px rgba(13,148,136,0.45),
                             0 0 12px rgba(13,148,136,0.35);
            }}
        }}
    </style>

    <div style="
        backdrop-filter: blur(18px);
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 24px;
        padding: 32px 48px;
        text-align: center;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        margin-bottom: 32px;
    ">

        <div style="
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background-color: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px auto;
            box-shadow: 0 4px 12px rgba(13,148,136,0.35);
        ">
            <img src="{svg_uri}" style="width: 42px; height: 42px;" />
        </div>

        <h1 id="rh-title" style="
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
            animation: rhGlow 3.2s ease-in-out infinite;
        ">
            {title}
        </h1>

        <div style="
            font-size: 0.88rem;
            color: #A1A1AA;
            margin-top: 10px;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            font-weight: 600;
        ">
            Adaptive Cognitive Routing Engine • CBT • DBT • ACT • Somatic
        </div>

    </div>
    """

    st.markdown(header_html, unsafe_allow_html=True)
