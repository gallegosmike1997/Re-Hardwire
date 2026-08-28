"""
ui/sidebar.py - PDF-safe Sidebar Navigation for Re-Hardwire

Removes header-like elements to prevent PDF duplication.
"""

import streamlit as st
from core.routing import get_user_state
from core.storage import save_history_to_disk


def render_sidebar(history_file, user_profile_file, save_profile_to_disk):

    # Neutral container to prevent PDF merging
    with st.sidebar.container():

        # -----------------------------
        # MAIN NAVIGATION
        # -----------------------------
        st.markdown("**Navigation**")
        page = st.radio(
            "Select Page",
            ["Chat", "Routing Lab", "Protocol Tuning", "Profile", "Developer Tools"],
            key="active_page"
        )

        # -----------------------------
        # ROUTING STATE SNAPSHOT
        # -----------------------------
        st.markdown("---")
        st.markdown("**Routing State**")
        st.json(get_user_state())

        # -----------------------------
        # DEVICE PERMISSIONS
        # -----------------------------
        st.markdown("---")
        st.markdown("**Device Permissions**")

        st.toggle("Location Access", key="loc_permission")
        st.toggle("Notification Access", key="notif_permission")
        st.toggle("Microphone Access", key="mic_permission")

        # -----------------------------
        # AUTHLINK LOGIN BUTTONS
        # -----------------------------
        st.markdown("---")
        st.markdown("**Account Login**")

        st.link_button("🔐 Sign in with Google", "https://accounts.google.com/signin")
        st.link_button("🍎 Sign in with iCloud", "https://www.icloud.com/")
        st.link_button("🐙 Sign in with GitHub", "https://github.com/login")

        # -----------------------------
        # PROFILE MANAGEMENT
        # -----------------------------
        st.markdown("---")
        st.markdown("**Profile**")

        if st.button("Save Profile"):
            save_profile_to_disk(user_profile_file)
            st.success("Profile saved.")

        # -----------------------------
        # CLEAR CHAT HISTORY
        # -----------------------------
        st.markdown("---")
        st.markdown("**Chat History**")

        if st.button("Clear Chat History"):
            st.session_state.messages = []
            save_history_to_disk(history_file, [])
            st.success("Chat history cleared.")

        # -----------------------------
        # DEVELOPER MODE
        # -----------------------------
        st.markdown("---")
        st.markdown("**Developer Tools**")

        st.checkbox("Enable Developer Mode", key="developer_mode")

        if st.session_state.developer_mode:
            st.radio(
                "Developer Route",
                ["Console", "Inspector", "Tester", "None"],
                key="dev_route"
            )

    return page
