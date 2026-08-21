import os
import streamlit as st
import traceback
import json
import importlib

from tools.manager import ToolManager
from tools.diagnostic import run_diagnostics
from tools.autocorrect import attempt_autocorrect


# ---------------------------------------------------------
# INITIALIZE TOOL MANAGER
# ---------------------------------------------------------

manager = ToolManager()
manager.register("diagnostic", run_diagnostics)
manager.register("autocorrect", attempt_autocorrect)


# ---------------------------------------------------------
# FILE HELPERS
# ---------------------------------------------------------

def list_project_files(base="."):
    """
    Recursively list project files.
    """
    file_list = []
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith(".py") or f.endswith(".json") or f.endswith(".txt"):
                file_list.append(os.path.join(root, f))
    return sorted(file_list)


def read_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


# ---------------------------------------------------------
# MODULE RELOADER
# ---------------------------------------------------------

def reload_module(module_name: str):
    try:
        module = importlib.import_module(module_name)
        importlib.reload(module)
        return {"success": True, "module": module_name}
    except Exception as exc:
        return {
            "success": False,
            "module": module_name,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


# ---------------------------------------------------------
# STREAMLIT DEVELOPER CONSOLE
# ---------------------------------------------------------

def render_console():
    st.title("🛠️ Developer Console")

    st.write("Advanced tools for debugging, inspecting, and repairing the Re‑Hardwire project.")

    st.divider()

    # -----------------------------------------------------
    # TOOL RUNNER
    # -----------------------------------------------------
    st.header("🔧 Run Tools")

    tool_name = st.selectbox("Select a tool", manager.list_tools())

    if st.button("Run Tool"):
        result = manager.run(tool_name)
        st.subheader("Result")
        st.json(result)

    st.divider()

    # -----------------------------------------------------
    # DIAGNOSE + FIX PIPELINE
    # -----------------------------------------------------
    st.header("🩺 Diagnose & Auto‑Fix")

    fake_error = st.text_area(
        "Simulate an exception (optional)",
        "ValueError: simulated test exception"
    )

    if st.button("Run Diagnose + Fix"):
        try:
            exc = Exception(fake_error)
            result = manager.diagnose_and_fix(exc)
            st.subheader("Diagnostic")
            st.json(result["diagnostic"])
            st.subheader("Auto‑Correction")
            st.json(result["fix"])
        except Exception as exc:
            st.error(str(exc))

    st.divider()

    # -----------------------------------------------------
    # PROJECT FILE VIEWER
    # -----------------------------------------------------
    st.header("📁 Project File Viewer")

    files = list_project_files(".")
    selected_file = st.selectbox("Select a file", files)

    if selected_file:
        content = read_file(selected_file)
        st.code(content or "Unable to read file.", language="python")

    st.divider()

    # -----------------------------------------------------
    # MODULE RELOADER
    # -----------------------------------------------------
    st.header("🔄 Reload Python Module")

    module_name = st.text_input("Module name (e.g., core.routing)")

    if st.button("Reload Module"):
        result = reload_module(module_name)
        st.json(result)

    st.divider()

    # -----------------------------------------------------
    # ENVIRONMENT INSPECTOR
    # -----------------------------------------------------
    st.header("🌐 Environment Inspector")

    env_info = {
        "cwd": os.getcwd(),
        "python": os.sys.executable,
        "version": os.sys.version,
        "files": files,
    }

    st.json(env_info)

    st.divider()

    # -----------------------------------------------------
    # TOOL HISTORY
    # -----------------------------------------------------
    st.header("📜 Tool Execution History")

    st.json(manager.get_history())


# ---------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------

def launch_console():
    """
    Launch the developer console inside Streamlit.
    """
    render_console()
