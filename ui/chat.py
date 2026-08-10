import streamlit as st
from datetime import datetime

from core.routing import route_message
from core.storage import get_history, add_message
from ui.theme import apply_chat_theme


def render_chat_ui():
    """
    Main chat interface for Re-Hardwire.
    Handles:
    - Displaying chat history
    - Accepting user input
    - Routing messages through LLM
    - Storing messages in session state
    """

    apply_chat_theme()

    st.markdown("<h2 style='text-align:center;'>Re‑Hardwire Assistant</h2>", unsafe_allow_html=True)

    # Load chat history
    history = get_history()

    # Display chat messages ABOVE the input box
    for msg in history:
        if msg["role"] == "user":
            st.markdown(
                f"""
                <div style="padding:10px; margin-bottom:8px; background:#1e1e1e; border-radius:8px;">
                    <strong>You:</strong><br>{msg['content']}
                </div>
                """,
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                f"""
                <div style="padding:10px; margin-bottom:8px; background:#2b2b2b; border-radius:8px;">
                    <strong>Assistant:</strong><br>{msg['content']}
                </div>
                """,
                unsafe_allow_html=True
            )

    # Chat input box
    user_input = st.text_input("Message:", key="chat_input")

    # When user sends a message
    if user_input:
        timestamp = datetime.utcnow().isoformat()

        # Store user message
        add_message("user", user_input, timestamp)

        # Route message through LLM
        assistant_reply = route_message(user_input)

        # Store assistant reply
        add_message("assistant", assistant_reply, timestamp)

        # Force rerender so messages appear immediately
        st.experimental_rerun()
