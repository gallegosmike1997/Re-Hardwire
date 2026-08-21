import os
import time
import streamlit as st

# Routing state snapshot
from core.routing import get_user_state

# Storage
from core.storage import (
    load_saved_history,
    save_history_to_disk,
    load_saved_profile,
    save_profile_to_disk,
)

# LLM + prompts
from core.llm import stream_llm_response
from core.prompts import build_system_prompt, load_system_prompt_master

# UI
from ui.theme import apply_theme
from ui.header import render_header
from ui.sidebar import render_sidebar
from ui.chat import render_chat_history, render_chat_input, render_self_guided_controls
from ui.protocol_tuning import render_protocol_tuning
from ui.routing_lab import render_routing_lab

# Developer Tools
from tools.console import launch_console
from tools.inspector import launch_inspector
from tools.tester import launch_tester
from tools.diagnostic import run_diagnostics, render_diagnostics
from tools.autocorrect import attempt_autocorrect


HISTORY_FILE = "chat_history.json"
USER_PROFILE_FILE = "user_profile.json"
PROMPTS_FILE = "prompts.txt"


def init_session_state():
    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "Dark"

    if "loc_permission" not in st.session_state:
        st.session_state.loc_permission = False
    if "notif_permission" not in st.session_state:
        st.session_state.notif_permission = False
    if "mic_permission" not in st.session_state:
        st.session_state.mic_permission = False

    if "messages" not in st.session_state:
        st.session_state.messages = load_saved_history(HISTORY_FILE)

    if "user_profile" not in st.session_state:
        st.session_state.user_profile = load_saved_profile(USER_PROFILE_FILE)

    if "active_state" not in st.session_state:
        st.session_state.active_state = "CBT"
    if "auto_routing" not in st.session_state:
        st.session_state.auto_routing = True

    if "developer_mode" not in st.session_state:
        st.session_state.developer_mode = False
    if "dev_route" not in st.session_state:
        st.session_state.dev_route = None


def main():
    project_root = os.path.dirname(__file__)
    logo_path = os.path.join(project_root, "static", "logo.svg")

    st.set_page_config(
        page_title="Re-Hardwire",
        page_icon=logo_path,
        layout="centered"
    )

    init_session_state()

    apply_theme(logo_path, st.session_state.theme_mode)

    # Sidebar navigation
    page = render_sidebar(
        history_file=HISTORY_FILE,
        user_profile_file=USER_PROFILE_FILE,
        save_profile_to_disk=save_profile_to_disk,
    )

    # Dynamic header
    render_header(logo_path, title=f"Re‑Hardwire — {page}")

    # Developer Tools
    st.sidebar.divider()
    st.sidebar.subheader("Developer Tools")
    st.sidebar.checkbox("Enable Developer Mode", key="dev_mode_checkbox", value=st.session_state.developer_mode, on_change=lambda: st.session_state.update({"developer_mode": st.session_state.dev_mode_checkbox}))

    if st.session_state.developer_mode:
        st.sidebar.radio(
            "Developer Route",
            ["Console", "Inspector", "Tester", "None"],
            key="dev_route"
        )

        if st.session_state.dev_route == "Console":
            launch_console()
            return
        if st.session_state.dev_route == "Inspector":
            launch_inspector()
            return
        if st.session_state.dev_route == "Tester":
            launch_tester()
            return

    # Page Routing
    if page == "Chat":
        render_self_guided_controls()
        st.divider()
        render_chat_history()
        st.text_input("Your message:", key="chat_input")
        assistant_reply = render_chat_input()

        if assistant_reply:
            detected_state = st.session_state.active_state

            system_prompt_master = load_system_prompt_master(PROMPTS_FILE)
            system_prompt = build_system_prompt(
                base_prompt=system_prompt_master,
                profile=st.session_state.user_profile,
                detected_state=detected_state,
                loc_permission=st.session_state.loc_permission,
            )

            formatted_messages = [{"role": "system", "content": system_prompt}] + [
                {"role": m["role"], "content": m["content"]} for m in st.session_state.messages
            ]

            with st.chat_message("assistant", avatar=":material/smart_toy:"):
                with st.status(f"{detected_state} Protocol Active", expanded=False) as status:
                    time.sleep(0.25)
                    status.update(
                        label=f"{detected_state} Protocol Active",
                        state="complete",
                        expanded=False
                    )

                response_stream = stream_llm_response(formatted_messages)
                response_text = "".join(response_stream)
                st.write(response_text)


            st.session_state.messages.append({
                "role": "assistant",
                "content": response_text,
                "ts": time.time()
            })

            save_history_to_disk(HISTORY_FILE, st.session_state.messages)

    elif page == "Routing Lab":
        render_routing_lab()

    elif page == "Protocol Tuning":
        render_protocol_tuning()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        diag = run_diagnostics(exc, base_path=".")
        render_diagnostics(diag)
        fix_result = attempt_autocorrect(diag)
        st.subheader("Auto-Correction Attempt")
        st.write(fix_result)
