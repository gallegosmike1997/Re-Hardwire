import streamlit as st
from core.storage import save_history_to_disk


def render_sidebar(history_file: str, user_profile_file: str, save_profile_to_disk):
    with st.sidebar:
        st.header("Controls & Settings")
        st.divider()

        with st.expander("👤 User Account & Profile", expanded=False):
            st.subheader("Account Information")
            user_name = st.text_input(
                "Name / Alias",
                value=st.session_state.user_profile.get("name", ""),
                key="profile_name_input",
            )

            st.divider()
            st.subheader("Current State Selection")

            feelings_options = [
                "Anxious", "Overwhelmed", "Stressed", "Calm", "Motivated",
                "Frustrated", "Sad", "Hopeful", "Fatigued", "Focused",
            ]
            selected_feelings = st.multiselect(
                "Current Feelings",
                options=feelings_options,
                default=st.session_state.user_profile.get("feelings", []),
                key="profile_feelings_select",
            )

            thoughts_options = [
                "Catastrophizing", "Black-and-White Thinking", "Overthinking",
                "Rumination", "Self-Doubt", "Creative Flow", "Problem Solving",
                "Seeking Clarity",
            ]
            selected_thoughts = st.multiselect(
                "Current Thought Patterns",
                options=thoughts_options,
                default=st.session_state.user_profile.get("thoughts", []),
                key="profile_thoughts_select",
            )

            user_goals = st.text_area(
                "Current Goals",
                value=st.session_state.user_profile.get("goals", ""),
                placeholder="What are you trying to accomplish or overcome right now?",
                key="profile_goals_input",
            )

            hobbies_options = [
                "Coding", "Reading", "Gaming", "Writing", "Fitness / Exercise",
                "Art & Design", "Music", "Meditation / Mindfulness",
            ]
            selected_hobbies = st.multiselect(
                "Hobbies & Interests",
                options=hobbies_options,
                default=st.session_state.user_profile.get("hobbies", []),
                key="profile_hobbies_select",
            )

            if st.button("💾 Save Profile", use_container_width=True, key="save_profile_btn"):
                st.session_state.user_profile = {
                    "name": user_name,
                    "feelings": selected_feelings,
                    "thoughts": selected_thoughts,
                    "goals": user_goals,
                    "hobbies": selected_hobbies,
                }
                save_profile_to_disk(user_profile_file, st.session_state.user_profile)
                st.success("Profile saved!")

        st.divider()
        st.subheader("Appearance")
        is_light = st.toggle(
            "☀️ Light Mode",
            value=(st.session_state.theme_mode == "Light"),
            key="sidebar_theme_toggle",
        )
        new_theme = "Light" if is_light else "Dark"
        if new_theme != st.session_state.theme_mode:
            st.session_state.theme_mode = new_theme
            st.experimental_rerun()

        st.divider()
        st.subheader("Session Management")
        if st.button(
            "🗑️ Clear Current Chat",
            use_container_width=True,
            key="sidebar_clear_chat",
            help="Erase current chat history",
        ):
            st.session_state.messages = []
            st.session_state.active_state = "CBT"
            save_history_to_disk(history_file, [])
            st.experimental_rerun()

        st.divider()
        st.subheader("Telemetry Engine")
        st.session_state.auto_routing = st.toggle(
            "Auto-Routing",
            value=st.session_state.auto_routing,
            key="sidebar_autorouting",
        )

        protocols = ["CBT", "DBT", "ACT", "SOMATIC", "CRISIS"]
        new_protocol = st.selectbox(
            "Active Protocol",
            options=protocols,
            index=protocols.index(st.session_state.active_state)
            if st.session_state.active_state in protocols
            else 0,
            disabled=st.session_state.auto_routing,
            key="sidebar_protocol_select",
        )

        if not st.session_state.auto_routing:
            st.session_state.active_state = new_protocol

        st.divider()
        st.subheader("App Permissions")
        st.session_state.loc_permission = st.toggle(
            "📍 Location Access",
            value=st.session_state.get("loc_permission", False),
            help="Enables local crisis resource and mental health clinic lookup.",
        )
        st.session_state.notif_permission = st.toggle(
            "🔔 Push Notifications",
            value=st.session_state.get("notif_permission", False),
            help="Enables wellness check-ins and protocol reminders.",
        )
        st.session_state.mic_permission = st.toggle(
            "🎙️ Microphone Access",
            value=st.session_state.get("mic_permission", False),
            help="Enables voice input for logging triggers.",
        )

        st.divider()
        if st.button(
            "🧹 Wipe All History",
            type="primary",
            use_container_width=True,
            key="sidebar_wipe_all",
        ):
            st.session_state.messages = []
            st.session_state.active_state = "CBT"
            save_history_to_disk(history_file, [])
            st.experimental_rerun()
