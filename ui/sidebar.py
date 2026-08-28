import streamlit as st
from core.routing import get_user_state
from tools.console import launch_console
from tools.inspector import launch_inspector
from tools.tester import launch_tester
from core.storage import save_history_to_disk


def render_sidebar(history_file, user_profile_file, save_profile_to_disk):

    st.sidebar.title("Re‑Hardwire")

    # ---------------------------------------------------------
    # CASCADE TABS
    # ---------------------------------------------------------
    tab = st.sidebar.radio(
        "Menu",
        ["Account & Permissions", "Chat", "Dev"],
        key="sidebar_tab"
    )

    # ---------------------------------------------------------
    # ACCOUNT & PERMISSIONS TAB
    # ---------------------------------------------------------
    if tab == "Account & Permissions":
        st.sidebar.subheader("Appearance")
        st.sidebar.toggle("Dark Mode", key="dark_mode")

        st.sidebar.subheader("User Information")
        st.sidebar.text_input("Name", key="user_name")
        st.sidebar.text_input("Email", key="user_email")

        if st.sidebar.button("Save Profile"):
            save_profile_to_disk(user_profile_file)
            st.sidebar.success("Profile saved.")

        st.sidebar.subheader("Permissions")
        st.sidebar.toggle("Location Access", key="loc_permission")
        st.sidebar.toggle("Notification Access", key="notif_permission")
        st.sidebar.toggle("Microphone Access", key="mic_permission")

    # ---------------------------------------------------------
    # CHAT TAB
    # ---------------------------------------------------------
    if tab == "Chat":
        st.sidebar.subheader("Conversation Tools")

        if st.sidebar.button("Clear Chat History"):
            st.session_state.messages = []
            save_history_to_disk(history_file, [])
            st.sidebar.success("Chat history cleared.")

        if st.sidebar.button("Refresh Conversation"):
            st.session_state.messages = []
            st.sidebar.success("Conversation refreshed.")

        if st.sidebar.button("Download TXT History"):
            st.sidebar.download_button(
                "Download Chat History",
                "\n".join([m["content"] for m in st.session_state.messages]),
                file_name="chat_history.txt"
            )

    # ---------------------------------------------------------
    # DEV TAB
    # ---------------------------------------------------------
    if tab == "Dev":
        st.sidebar.subheader("Developer Mode")
        st.sidebar.toggle("Enable Developer Mode", key="developer_mode")

        if st.session_state.developer_mode:
            st.sidebar.subheader("Developer Tools")
            tool = st.sidebar.radio(
                "Select Tool",
                ["Console", "Inspector", "Tester"],
                key="dev_tool"
            )

            if tool == "Console":
                launch_console()
            elif tool == "Inspector":
                launch_inspector()
            elif tool == "Tester":
                launch_tester()
