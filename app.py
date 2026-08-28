import os
import time
import logging
import streamlit as st

# ============================================================
# SILENCE TRANSFORMERS WARNINGS
# ============================================================

logging.getLogger("transformers").setLevel(logging.ERROR)
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

for noisy in [
    "transformers.models.deepseek_vl_hybrid",
    "transformers.models.kimi_k25",
    "transformers.models.paddleocr_vl",
]:
    logging.getLogger(noisy).setLevel(logging.ERROR)


# ============================================================
# IMPORTS — CORE
# ============================================================

from core.routing import get_user_state
from core.storage import (
    load_saved_history,
    save_history_to_disk,
    load_saved_profile,
    save_profile_to_disk,
)
from core.llm import stream_llm_response
from core.prompts import build_system_prompt, load_system_prompt_master


# ============================================================
# IMPORTS — UI
# ============================================================

from ui.theme import apply_theme
from ui.header import render_header
from ui.sidebar import render_sidebar
from ui.chat import (
    render_chat_history,
    render_chat_input,
)
from ui.protocol_tuning import render_protocol_tuning
from ui.routing_lab import render_routing_lab


# ============================================================
# IMPORTS — DEV TOOLS
# ============================================================

from tools.console import launch_console
from tools.inspector import launch_inspector
from tools.tester import launch_tester
from tools.diagnostic import run_diagnostics, render_diagnostics
from tools.autocorrect import attempt_autocorrect


# ============================================================
# CONSTANTS
# ============================================================

HISTORY_FILE = "chat_history.json"
USER_PROFILE_FILE = "user_profile.json"
PROMPTS_FILE = "prompts.txt"


# ============================================================
# SESSION INIT
# ============================================================

def init_session_state():
    ss = st.session_state

    ss.setdefault("theme_mode", "Dark")
    ss.setdefault("loc_permission", False)
    ss.setdefault("notif_permission", False)
    ss.setdefault("mic_permission", False)

    ss.setdefault("messages", load_saved_history(HISTORY_FILE))
    ss.setdefault("user_profile", load_saved_profile(USER_PROFILE_FILE))

    ss.setdefault("active_state", "CBT")
    ss.setdefault("auto_routing", True)

    ss.setdefault("developer_mode", False)
    ss.setdefault("dev_route", None)


# ============================================================
# MAIN APP
# ============================================================

def main():
    project_root = os.path.dirname(__file__)
    logo_path = os.path.join(project_root, "static", "logo.svg")

    # ⭐ FIXED: Wide layout so header renders correctly
    st.set_page_config(
        page_title="Re‑Hardwire",
        page_icon=logo_path,
        layout="wide"
    )

    init_session_state()
    apply_theme(logo_path, st.session_state.theme_mode)

    # Sidebar navigation
    page = render_sidebar(
        history_file=HISTORY_FILE,
        user_profile_file=USER_PROFILE_FILE,
        save_profile_to_disk=save_profile_to_disk,
    )

    # ⭐ FIXED: Header now renders properly in wide layout
    header_title = f"Re‑Hardwire — {page}"
    render_header(logo_path, title=header_title)

    # ========================================================
    # PAGE ROUTING
    # ========================================================

    if page == "Chat":
        st.markdown("### Conversation Settings")
        st.divider()

        render_chat_history()

        assistant_reply = render_chat_input()

        if assistant_reply:
            user_text, routing_result = assistant_reply
            detected_state = routing_result.get(
                "protocol",
                st.session_state.active_state,
            )

            system_prompt_master = load_system_prompt_master(PROMPTS_FILE)
            system_prompt = build_system_prompt(
                base_prompt=system_prompt_master,
                profile=st.session_state.user_profile,
                detected_state=detected_state,
                loc_permission=st.session_state.loc_permission,
            )

            formatted_messages = [{"role": "system", "content": system_prompt}]

            # Add the user message directly (not stored)
            formatted_messages.append({"role": "user", "content": user_text})

            # Add assistant history only
            formatted_messages.extend([
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages
            ])


            with st.chat_message("assistant", avatar=":material/smart_toy:"):
                with st.status(
                    f"{detected_state} Protocol Active",
                    expanded=False
                ) as status:
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


# ============================================================
# SAFE EXECUTION WRAPPER
# ============================================================

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        diag = run_diagnostics(exc, base_path=".")
        render_diagnostics(diag)
        fix_result = attempt_autocorrect(diag)
        st.subheader("Auto-Correction Attempt")
        st.write(fix_result)
