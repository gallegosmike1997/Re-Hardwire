"""
ui/sidebar.py - Unified Sidebar Navigation for Re-Hardwire

Provides:
- Page navigation (Chat, Routing Lab, Protocol Tuning)
- Routing state snapshot
- Profile save controls
- Developer tools toggle + route selection
"""

import streamlit as st
from core.routing import get_user_state


def render_sidebar(history_file, user_profile_file, save_profile_to_disk):
    # -----------------------------
    # MAIN NAVIGATION
    # -----------------------------
    st.sidebar.title("Re‑Hardwire Navigation")

    page = st.sidebar.radio(
        "Select Page",
        ["Chat", "Routing Lab", "Protocol Tuning"],
        key="active_page"
    )

    # -----------------------------
    # ROUTING STATE SNAPSHOT
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Routing State")
    st.sidebar.json(get_user_state())

    # -----------------------------
    # PROFILE MANAGEMENT
    # -----------------------------
    st.sidebar.markdown("---")
    st.sidebar.subheader("Profile")

    if st.sidebar.button("Save Profile"):
        save_profile_to_disk(user_profile_file)
        st.sidebar.success("Profile saved.")

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
