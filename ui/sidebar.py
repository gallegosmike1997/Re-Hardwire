"""
ui/sidebar.py - Enhanced Sidebar Navigation for Re-Hardwire

Provides:
- Page navigation
- Routing state snapshot
- Device permission toggles
- AuthLink login buttons (Google, iCloud, GitHub)
- Profile save controls
- Clear chat history
- Developer tools toggle + route selection
"""

import streamlit as st
from core.routing import get_user_state
from core.storage import save_history_to_disk


def render_sidebar(history_file, user_profile_file, save_profile_to_disk):
    st.sidebar.title("Re‑Hardwire Navigation")

    # -----------------------------
    # MAIN NAVIGATION
    # -----------------------------
    page = st.sidebar.radio(
        "Select Page",
        ["Chat", "Routing Lab", "Protocol Tuning", "Profile", "Developer Tools"],
        key="active_page"
    )

    # -----------------------------
    # ROUTING STATE SNAPSHOT
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Routing State")
    st.sidebar.json(get_user_state())

    # -----------------------------
    # DEVICE PERMISSIONS
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Device Permissions")

    st.sidebar.toggle("Location Access", key="loc_permission")
    st.sidebar.toggle("Notification Access", key="notif_permission")
    st.sidebar.toggle("Microphone Access", key="mic_permission")

    # -----------------------------
    # AUTHLINK LOGIN BUTTONS
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Account Login")

    st.sidebar.link_button("🔐 Sign in with Google", "https://accounts.google.com/signin")
    st.sidebar.link_button("🍎 Sign in with iCloud", "https://www.icloud.com/")
    st.sidebar.link_button("🐙 Sign in with GitHub", "https://github.com/login")

    # -----------------------------
    # PROFILE MANAGEMENT
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Profile")

    if st.sidebar.button("Save Profile"):
        save_profile_to_disk(user_profile_file)
        st.sidebar.success("Profile saved.")

    # -----------------------------
    # CLEAR CHAT HISTORY
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Chat History")

    if st.sidebar.button("Clear Chat History"):
        st.session_state.messages = []
        save_history_to_disk(history_file, [])
        st.sidebar.success("Chat history cleared.")

    # -----------------------------
    # DEVELOPER MODE
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Developer Tools")

    st.sidebar.checkbox("Enable Developer Mode", key="developer_mode")

    if st.session_state.developer_mode:
        st.sidebar.radio(
            "Developer Route",
            ["Console", "Inspector", "Tester", "None"],
            key="dev_route"
        )

    return page
