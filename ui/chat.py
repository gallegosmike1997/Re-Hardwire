import streamlit as st
import time
from core.routing import auto_route
from audio.tts import TTSEngine

tts_engine = TTSEngine()


# ---------------------------------------------------------
# SESSION INITIALIZATION
# ---------------------------------------------------------

def _ensure_chat_session():
    ss = st.session_state
    ss.setdefault("messages", [])
    ss.setdefault("last_protocol", None)
    ss.setdefault("last_details", {})


# ---------------------------------------------------------
# SELF-GUIDED CONTROLS (TOP OF CHAT)
# ---------------------------------------------------------

def render_self_guided_controls():
    _ensure_chat_session()

    st.markdown("### Conversation Settings")

    col1, col2 = st.columns([2, 1])

    with col1:
        st.selectbox(
            "Active Protocol",
            ["CBT", "DBT", "ACT", "Somatic"],
            key="active_state",
            help="Choose the primary protocol focus for this conversation."
        )

    with col2:
        st.toggle(
            "Auto-routing",
            key="auto_routing",
            help="Let Re‑Hardwire adaptively switch protocols based on your messages."
        )

        user_proto = st.session_state.get("active_state", "CBT")
        detected_proto = st.session_state.get("last_protocol") or "—"
        reason = st.session_state.get("last_details", {}).get("reason") or "—"
        score = st.session_state.get("last_details", {}).get("score")
        score_text = f"{score:.3f}" if isinstance(score, (int, float)) else "—"

        st.caption(
            f"User Protocol: **{user_proto}** · "
            f"Detected Protocol: **{detected_proto}** · "
            f"Reason: `{reason}` · Score: `{score_text}`"
        )



# ---------------------------------------------------------
# RENDER CHAT HISTORY
# ---------------------------------------------------------

def render_chat_history():
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    _ensure_chat_session()

    messages = st.session_state.messages

    if not messages:
        st.info("No messages yet. Start by typing how things have been feeling lately.")
        return

    for msg in messages:
        role = msg.get("role", "assistant")
        content = msg.get("content", "")
        ts = msg.get("ts", None)
        details = msg.get("routing_details", {})

        avatar = ":material/person:" if role == "user" else ":material/smart_toy:"

        with st.chat_message(role, avatar=avatar):
            st.markdown(content)

            # Assistant extras
            if role == "assistant":

                # TTS button
                if st.button("🔊 Speak", key=f"tts_{ts}"):
                    wav_path = tts_engine.synthesize(content)
                    st.audio(wav_path)

                # Routing metadata
                user_proto = st.session_state.get("active_state")
                detected_proto = st.session_state.get("detected_protocol")
                reason = details.get("reason")
                score = details.get("score")

                proto = details.get("protocol") or detected_proto
                if proto:
                    score_text = f"{score:.3f}" if isinstance(score, (int, float)) else "—"
                    st.caption(
                        f"Protocol: **{proto}** · Reason: `{reason}` · Score: `{score_text}`"
                    )


# ---------------------------------------------------------
# RENDER CHAT INPUT
# ---------------------------------------------------------

def render_chat_input():
    user_text = st.chat_input("Message:")
    if user_text:
        # Do NOT append user message to chat history
        return user_text
    return None

    ensure_chat_session() 

    # Record user message
    st.session_state.messages.append({
        "role": "user",
        "content": user_text,
        "ts": time.time(),
    })

    # Route message through adaptive routing engine
    routing_result = auto_route(user_text, user_context={})

    # Store routing metadata for app.py to use
    st.session_state.last_protocol = routing_result.get("protocol")
    st.session_state.last_details = routing_result

    return user_text, routing_result


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
