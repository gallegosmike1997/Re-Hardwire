import streamlit as st
import time
import asyncio
from tools.pdf_export import generate_pdf

if st.button("Export PDF"):
    pdf_bytes = asyncio.run(generate_pdf("http://localhost:8501"))
    st.download_button(
        "Download PDF",
        pdf_bytes,
        file_name="Re-Hardwire.pdf",
        mime="application/pdf"
    )
    
# Optional chat theme hook
try:
    from ui.theme import apply_chat_theme
except Exception:
    def apply_chat_theme():
        pass

# Routing + TTS
from core.routing import auto_route
from audio.tts import TTSEngine

tts_engine = TTSEngine()


# ---------------------------------------------------------
# SESSION INITIALIZATION
# ---------------------------------------------------------

def _ensure_chat_session():
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "last_protocol" not in st.session_state:
        st.session_state.last_protocol = None
    if "last_details" not in st.session_state:
        st.session_state.last_details = {}


# ---------------------------------------------------------
# RENDER CHAT HISTORY
# ---------------------------------------------------------

def render_chat_history():
    apply_chat_theme()
    _ensure_chat_session()

    for i, msg in enumerate(st.session_state.messages):
        role = msg.get("role", "assistant")
        content = msg.get("content", "")
        ts = msg.get("ts", i)

        avatar = ":material/person:" if role == "user" else ":material/smart_toy:"

        with st.chat_message(role, avatar=avatar):
            st.markdown(content)

            # TTS button for assistant messages
            if role == "assistant":
                if st.button("🔊 Speak Response", key=f"tts_{ts}_{role}"):
                    wav_path = tts_engine.synthesize(content)
                    st.audio(wav_path)

            # Protocol metadata
            if role == "assistant":
                details = msg.get("routing_details", {})
                proto = details.get("protocol")
                reason = details.get("reason")
                score = details.get("score")

                if proto:
                    st.caption(
                        f"Protocol: **{proto}** · Reason: `{reason}` · Score: `{score:.3f}`"
                    )


# ---------------------------------------------------------
# RENDER CHAT INPUT (USER ONLY)
# ---------------------------------------------------------

def render_chat_input():
    apply_chat_theme()
    _ensure_chat_session()

    user_input = st.chat_input("Type your message…")
    if not user_input:
        return None

    # Record user message
    st.session_state.messages.append({
        "role": "user",
        "content": user_input,
        "ts": time.time(),
    })

    # Route message through adaptive routing engine
    routing_result = auto_route(user_input, user_context={})

    # Store routing metadata for app.py to use
    st.session_state.last_protocol = routing_result.get("protocol")
    st.session_state.last_details = routing_result

    return user_input, routing_result


# ---------------------------------------------------------
# APPEND ASSISTANT MESSAGE (LLM OUTPUT)
# ---------------------------------------------------------

def append_assistant_message(text, routing_result):
    """
    Called by app.py after LLM generates the assistant reply.
    """
    st.session_state.messages.append({
        "role": "assistant",
        "content": text,
        "ts": time.time(),
        "routing_details": {
            "protocol": routing_result.get("protocol"),
            "reason": routing_result.get("reason"),
            "score": routing_result.get("score"),
            "details": routing_result.get("details", {}),
        },
    })


# ---------------------------------------------------------
# SELF-GUIDED CONTROLS
# ---------------------------------------------------------

def render_self_guided_controls():
    apply_chat_theme()
    _ensure_chat_session()

    with st.sidebar:
        st.markdown("### Self-Guided Tools")
        if st.button("🏅 Start Self-Guided Achievement"):
            st.toast("Self-guided achievement flow starting…")
