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
    Render the Re-Hardwire hero header with:
    - Dynamic title
    - Glow animation
    - Perfect spacing
    - Gradient text
    - Glass-card container
    """

    logo_uri = get_svg_data_uri(logo_path)

    st.markdown(
        f"""
        <style>

        /* Glow animation */
        @keyframes rhGlow {{
            0% {{
                text-shadow: 0 0 6px rgba(13,148,136,0.45),
                             0 0 12px rgba(13,148,136,0.35),
                             0 0 18px rgba(13,148,136,0.25);
            }}
            50% {{
                text-shadow: 0 0 12px rgba(13,148,136,0.65),
                             0 0 20px rgba(13,148,136,0.45),
                             0 0 28px rgba(13,148,136,0.35);
            }}
            100% {{
                text-shadow: 0 0 6px rgba(13,148,136,0.45),
                             0 0 12px rgba(13,148,136,0.35),
                             0 0 18px rgba(13,148,136,0.25);
            }}
        }}

        /* Perfect spacing */
        .hero-container {{
            margin-top: 14px;
            margin-bottom: 22px;
        }}

        </style>

        <div class="hero-container" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 22px 24px;
        ">

            <!-- Glass-card container -->
            <div style="
                backdrop-filter: blur(18px);
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 24px;
                padding: 32px 48px;
                text-align: center;
                box-shadow: 0 12px 40px rgba(0,0,0,0.25);
            ">

                <!-- Logo -->
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
                    <img src="{logo_uri}" style="width: 42px; height: 42px;" />
                </div>

                <!-- Dynamic Title with Gradient + Glow -->
                <h1 style="
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

                <!-- Subtitle -->
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
        </div>
        """,
        unsafe_allow_html=True,
    )
