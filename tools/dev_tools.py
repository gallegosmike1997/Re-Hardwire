# tools/dev_tools.py
import contextlib
import traceback
import streamlit as st

# Existing tool entrypoints (must exist in your project)
from tools.console import launch_console
from tools.inspector import launch_inspector, inspect_routing, inspect_storage, inspect_llm, scan_project_structure
from tools.tester import launch_tester, test_routing, test_storage, test_llm, test_file_integrity
from tools.diagnostic import run_diagnostics, render_diagnostics
from tools.autocorrect import attempt_autocorrect
from tools.manager import ToolManager


# ---------------------------------------------------------
# SESSION STATE SAFETY UTILITIES
# ---------------------------------------------------------

@contextlib.contextmanager
def preserve_session_keys(*keys):
    """
    Snapshot specified session_state keys and restore them on exit.
    Use this to run tools that may mutate session state (routing, etc.)
    """
    snapshot = {k: st.session_state.get(k) for k in keys}
    try:
        yield
    finally:
        for k, v in snapshot.items():
            if v is None and k in st.session_state:
                # remove keys that were not present originally
                del st.session_state[k]
            else:
                st.session_state[k] = v


def safe_call(func, *args, restore_keys=("active_state",), **kwargs):
    """
    Call func(*args, **kwargs) while preserving session keys listed in restore_keys.
    Returns a tuple (success, result_or_exception_info).
    """
    try:
        with preserve_session_keys(*restore_keys):
            result = func(*args, **kwargs)
        return True, result
    except Exception as exc:
        return False, {"error": str(exc), "traceback": traceback.format_exc()}


# ---------------------------------------------------------
# TOOL MANAGER INITIALIZATION
# ---------------------------------------------------------

_manager = None


def get_tool_manager():
    global _manager
    if _manager is None:
        _manager = ToolManager()
        _manager.register("diagnostic", run_diagnostics)
        _manager.register("autocorrect", attempt_autocorrect)
        _manager.register("inspection", lambda path=".": safe_call(scan_project_structure, path)[1])
    return _manager


# ---------------------------------------------------------
# WRAPPERS FOR ROUTING-SAFE INSPECTION & TESTING
# ---------------------------------------------------------

def run_safe_inspection(path="."):
    """
    Run the full inspection suite in a routing-safe manner.
    Returns a dict with structure, routing, storage, and llm results.
    """
    results = {}
    # Project structure (safe)
    ok, struct = safe_call(scan_project_structure, path, restore_keys=())
    results["structure"] = struct if ok else {"error": struct}

    # Routing (inspector provides routing-safe function)
    ok, routing = safe_call(inspect_routing, restore_keys=("active_state",))
    results["routing"] = routing if ok else {"error": routing}

    # Storage
    ok, storage = safe_call(inspect_storage, restore_keys=())
    results["storage"] = storage if ok else {"error": storage}

    # LLM
    ok, llm = safe_call(inspect_llm, restore_keys=())
    results["llm"] = llm if ok else {"error": llm}

    return results


def run_safe_tests():
    """
    Run tester functions in a routing-safe manner and return aggregated results.
    """
    results = {}
    ok, file_integrity = safe_call(test_file_integrity, ".", restore_keys=())
    results["file_integrity"] = file_integrity if ok else {"error": file_integrity}

    ok, routing = safe_call(test_routing, restore_keys=("active_state",))
    results["routing"] = routing if ok else {"error": routing}

    ok, storage = safe_call(test_storage, restore_keys=())
    results["storage"] = storage if ok else {"error": storage}

    ok, llm = safe_call(test_llm, restore_keys=())
    results["llm"] = llm if ok else {"error": llm}

    return results


# ---------------------------------------------------------
# STREAMLIT UI
# ---------------------------------------------------------

def launch_dev_tools():
    st.set_page_config(page_title="Developer Tools", layout="wide")
    st.title("🛠 Developer Tools Dashboard")

    manager = get_tool_manager()

    tabs = st.tabs(["Console", "Inspector", "Tester", "Diagnostics", "Auto-Correct", "Tool Manager"])

    # Console Tab
    with tabs[0]:
        st.header("Console")
        st.write("Launch the interactive developer console.")
        if st.button("Open Console"):
            # Console is an interactive UI; call directly
            try:
                launch_console()
            except Exception as exc:
                st.error("Console failed to launch")
                st.exception(exc)

    # Inspector Tab
    with tabs[1]:
        st.header("Inspector (Routing Safe)")
        st.write("Run a safe inspection of project structure, routing, storage, and LLM connectivity.")
        if st.button("Run Safe Inspection"):
            with st.spinner("Running inspection..."):
                results = run_safe_inspection(".")
                st.json(results)
        st.divider()
        st.subheader("Quick Actions")
        if st.button("Show Project Structure"):
            ok, struct = safe_call(scan_project_structure, ".", restore_keys=())
            if ok:
                st.json(struct)
            else:
                st.error("Failed to scan project structure")
                st.json(struct)

    # Tester Tab
    with tabs[2]:
        st.header("Tester (Routing Safe)")
        st.write("Run structured tests across file integrity, routing, storage, and LLM.")
        if st.button("Run Safe Tests"):
            with st.spinner("Running tests..."):
                report = run_safe_tests()
                st.json(report)
        st.divider()
        st.subheader("Run Individual Tests")
        if st.button("File Integrity"):
            ok, res = safe_call(test_file_integrity, ".", restore_keys=())
            if ok:
                st.json(res)
            else:
                st.error("File integrity test failed")
                st.json(res)
        if st.button("Routing Tests (safe)"):
            ok, res = safe_call(test_routing, restore_keys=("active_state",))
            if ok:
                st.json(res)
            else:
                st.error("Routing tests failed")
                st.json(res)

    # Diagnostics Tab
    with tabs[3]:
        st.header("Diagnostics")
        st.write("Run diagnostics on an exception or view last diagnostic output.")
        exc_text = st.text_area("Paste exception text (optional)", height=120)
        if st.button("Run Diagnostics"):
            try:
                if exc_text.strip():
                    # Create a synthetic exception object for diagnostics
                    fake_exc = Exception(exc_text.strip())
                    diag = run_diagnostics(fake_exc, base_path=".")
                else:
                    diag = run_diagnostics(Exception("Manual diagnostic run"), base_path=".")
                st.json(diag)
                render_diagnostics(diag)
            except Exception as exc:
                st.error("Diagnostics failed")
                st.exception(exc)

    # Auto-Correct Tab
    with tabs[4]:
        st.header("Auto-Correct")
        st.write("Attempt automated fixes based on diagnostics.")
        if st.button("Attempt Auto-Correct (using last diagnostic)"):
            try:
                # Run a fresh diagnostic and attempt autocorrect
                diag = run_diagnostics(Exception("Auto-correct run"), base_path=".")
                fix_result = attempt_autocorrect(diag)
                st.subheader("Auto-Correction Result")
                st.json(fix_result)
            except Exception as exc:
                st.error("Auto-correct failed")
                st.exception(exc)

    # Tool Manager Tab
    with tabs[5]:
        st.header("Tool Manager")
        st.write("Run registered tools via the ToolManager.")
        st.write("Registered tools:")
        st.json(list(manager._registry.keys()))
        st.divider()
        tool_name = st.selectbox("Select tool to run", options=list(manager._registry.keys()))
        args_text = st.text_area("JSON arguments for tool (optional)", height=80)
        if st.button("Run Selected Tool"):
            try:
                import json
                args = {}
                if args_text.strip():
                    args = json.loads(args_text)
                result = manager.run(tool_name, **args) if isinstance(args, dict) else manager.run(tool_name, args)
                st.subheader("Tool Result")
                st.json(result)
            except Exception as exc:
                st.error("Tool execution failed")
                st.exception(exc)
