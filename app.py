import os
import time
import streamlit as st
from core.routing import get_user_state
from core.storage import (
    load_saved_history,
    save_history_to_disk,
    load_saved_profile,
    save_profile_to_disk,
)
from core.llm import stream_llm_response
from core.prompts import build_system_prompt, load_system_prompt_master
from ui.theme import apply_theme
from ui.sidebar import render_sidebar
from ui.chat import render_chat_history, render_chat_input

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


def main():
    project_root = os.path.dirname(__file__)
    logo_path = os.path.join(project_root, "static", "logo.svg")
    st.set_page_config(page_title="Re-Hardwire", page_icon=logo_path, layout="centered")

    init_session_state()

    # Apply theme + CSS
    apply_theme(logo_path, st.session_state.theme_mode)

    # Sidebar
    render_sidebar(
        history_file=HISTORY_FILE,
        user_profile_file=USER_PROFILE_FILE,
        save_profile_to_disk=save_profile_to_disk,
    )

    st.divider()

    # Render chat history
    render_chat_history(st.session_state.messages)

    # Chat input
    user_input = render_chat_input()

    if user_input:
        # Routing
        if st.session_state.auto_routing:
            detected_state = get_user_state(user_input)
            st.session_state.active_state = detected_state
        else:
            detected_state = st.session_state.active_state

        # Append user message
        st.session_state.messages.append({"role": "user", "content": user_input, "ts": time.time()})

        # Build system prompt
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

        # Assistant message container
        with st.chat_message("assistant", avatar=":material/smart_toy:"):
            with st.status(f"{detected_state} Protocol Active", expanded=False) as status:
                time.sleep(0.25)
                status.update(label=f"{detected_state} Protocol Active", state="complete", expanded=False)

            response_stream = stream_llm_response(formatted_messages)
            response_text = st.write_stream(response_stream)

        st.session_state.messages.append({"role": "assistant", "content": response_text, "ts": time.time()})
        save_history_to_disk(HISTORY_FILE, st.session_state.messages)
        # avoid immediate rerun to reduce flicker; Streamlit will update naturally


if __name__ == "__main__":
    main()
import os
import time
import streamlit as st
from core.routing import get_user_state
from core.storage import (
    load_saved_history,
    save_history_to_disk,
    load_saved_profile,
    save_profile_to_disk,
)
from core.llm import stream_llm_response
from core.prompts import build_system_prompt, load_system_prompt_master
from ui.theme import apply_theme
from ui.sidebar import render_sidebar
from ui.chat import render_chat_history, render_chat_input

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


def main():
    project_root = os.path.dirname(__file__)
    logo_path = os.path.join(project_root, "static", "logo.svg")
    st.set_page_config(page_title="Re-Hardwire", page_icon=logo_path, layout="centered")

    init_session_state()

    # Apply theme + CSS
    apply_theme(logo_path, st.session_state.theme_mode)

    # Sidebar
    render_sidebar(
        history_file=HISTORY_FILE,
        user_profile_file=USER_PROFILE_FILE,
        save_profile_to_disk=save_profile_to_disk,
    )

    st.divider()

    # Render chat history
    render_chat_history(st.session_state.messages)

    # Chat input
    user_input = render_chat_input()

    if user_input:
        # Routing
        if st.session_state.auto_routing:
            detected_state = get_user_state(user_input)
            st.session_state.active_state = detected_state
        else:
            detected_state = st.session_state.active_state

        # Append user message
        st.session_state.messages.append({"role": "user", "content": user_input, "ts": time.time()})

        # Build system prompt
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

        # Assistant message container
        with st.chat_message("assistant", avatar=":material/smart_toy:"):
            with st.status(f"{detected_state} Protocol Active", expanded=False) as status:
                time.sleep(0.25)
                status.update(label=f"{detected_state} Protocol Active", state="complete", expanded=False)

            response_stream = stream_llm_response(formatted_messages)
            response_text = st.write_stream(response_stream)

        st.session_state.messages.append({"role": "assistant", "content": response_text, "ts": time.time()})
        save_history_to_disk(HISTORY_FILE, st.session_state.messages)
        # avoid immediate rerun to reduce flicker; Streamlit will update naturally


if __name__ == "__main__":
    main()
