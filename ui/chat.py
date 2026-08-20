import streamlit as st
import time

# Optional chat theme hook
try:
    from ui.theme import apply_chat_theme
except Exception:
    def apply_chat_theme():
        pass

# Routing + TTS
from core.routing import auto_route
from audio.tts import TTSEngine

tts = TTSEngine()
wav_path = tts.synthesize("Hello Michael, your routing engine is now stable.")


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
    """
    Render the chat history using Streamlit's chat_message API.
    """
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
                    wav_path = tts_engine.speak(content)
                    st.audio(wav_path)

            # Optional: show protocol metadata for assistant messages
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
# RENDER CHAT INPUT + ROUTING
# ---------------------------------------------------------

def render_chat_input():
    """
    Render the chat input box, route the message, and append to history.
    Returns the latest assistant reply (or None).
    """
    apply_chat_theme()
    _ensure_chat_session()

    user_input = st.chat_input("Type your message…")
    if not user_input:
        return None

    # Record user message
    st.session_state.messages.append(
        {
            "role": "user",
            "content": user_input,
            "ts": time.time(),
        }
    )

    # Route message through adaptive routing engine
    routing_result = auto_route(user_input, user_context={})
    protocol = routing_result.get("protocol")
    reason = routing_result.get("reason")
    score = routing_result.get("score", 0.0)

    # Simple assistant reply stub (you can replace with LLM call)
    assistant_reply = (
        f"Routing you to **{protocol}** protocol.\n\n"
        f"_Reason_: `{reason}` · _Score_: `{score:.3f}`\n\n"
        f"Your message:\n> {user_input}"
    )

    # Store routing metadata
    st.session_state.last_protocol = protocol
    st.session_state.last_details = routing_result

    # Append assistant message
    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": assistant_reply,
            "ts": time.time(),
            "routing_details": {
                "protocol": protocol,
                "reason": reason,
                "score": score,
                "details": routing_result.get("details", {}),
            },
        }
    )

    return assistant_reply


# ---------------------------------------------------------
# OPTIONAL: SELF-GUIDED ACHIEVEMENT BUTTON
# ---------------------------------------------------------

def render_self_guided_controls():
    """
    Render a simple self-guided achievement button stub.
    Wire this into your actual achievement system as needed.
    """
    apply_chat_theme()
    _ensure_chat_session()

    with st.sidebar:
        st.markdown("### Self-Guided Tools")
        if st.button("🏅 Start Self-Guided Achievement"):
            st.toast("Self-guided achievement flow starting…")
