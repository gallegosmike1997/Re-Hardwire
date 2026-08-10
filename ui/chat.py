import streamlit as st
import time

# Optional chat theme hook
try:
    from ui.theme import apply_chat_theme
except Exception:
    def apply_chat_theme():
        pass


# ---------------------------------------------------------
# RENDER CHAT HISTORY
# ---------------------------------------------------------

def render_chat_history(messages):
    """
    Render the chat history using Streamlit's chat_message API.
    """
    apply_chat_theme()

    for msg in messages:
        role = msg.get("role", "assistant")
        content = msg.get("content", "")
        ts = msg.get("ts", None)

        avatar = ":material/person:" if role == "user" else ":material/smart_toy:"

        with st.chat_message(role, avatar=avatar):
            st.markdown(content)


# ---------------------------------------------------------
# RENDER CHAT INPUT
# ---------------------------------------------------------

def render_chat_input():
    """
    Render the chat input box and return user text.
    """
    apply_chat_theme()

    user_input = st.chat_input("Type your message…")
    return user_input
