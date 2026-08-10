import os
import ast
import traceback
import streamlit as st

from core.routing import semantic_route, auto_route
from core.storage import load_saved_history, load_saved_profile
from core.llm import run_llm


# ---------------------------------------------------------
# FILE SCANNER
# ---------------------------------------------------------

def scan_project_structure(base="."):
    """
    Recursively scan project files and extract structural information.
    """
    results = {}

    for root, dirs, files in os.walk(base):
        for f in files:
            if not f.endswith(".py"):
                continue

            full_path = os.path.join(root, f)
            try:
                with open(full_path, "r", encoding="utf-8") as file:
                    src = file.read()

                tree = ast.parse(src)

                functions = [
                    node.name for node in ast.walk(tree)
                    if isinstance(node, ast.FunctionDef)
                ]

                imports = [
                    node.module for node in ast.walk(tree)
                    if isinstance(node, ast.ImportFrom)
                ]

                results[full_path] = {
                    "exists": True,
                    "empty": len(src.strip()) == 0,
                    "functions": functions,
                    "imports": imports,
                }

            except Exception as exc:
                results[full_path] = {
                    "exists": True,
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                }

    return results


# ---------------------------------------------------------
# ROUTING INSPECTOR (ROUTING-SAFE VERSION)
# ---------------------------------------------------------

def inspect_routing():
    """
    Test semantic routing and auto routing WITHOUT permanently modifying session state.
    This prevents developer inspections from interfering with the live app.
    """
    samples = [
        "I feel hopeless and want to die",
        "My chest feels tight and I can't breathe",
        "I'm overthinking everything",
        "I want to focus on my values",
        "I'm having trouble regulating my emotions",
    ]

    results = {}

    # Snapshot current session state
    original_state = st.session_state.get("active_state", None)

    for text in samples:
        try:
            # Run semantic routing (pure)
            semantic = semantic_route(text)

            # Run auto routing in a sandbox: ensure baseline, call, then restore
            if original_state is not None:
                st.session_state.active_state = original_state
            else:
                # ensure key exists during call to avoid unexpected behavior
                st.session_state.active_state = "CBT"

            auto = auto_route(text)

            # Restore original state after each test
            if original_state is None:
                # remove the key if it didn't exist originally
                if "active_state" in st.session_state:
                    del st.session_state["active_state"]
            else:
                st.session_state.active_state = original_state

            results[text] = {
                "semantic": semantic,
                "auto": auto,
            }

        except Exception as exc:
            # Attempt to restore state on exception
            if original_state is None:
                if "active_state" in st.session_state:
                    del st.session_state["active_state"]
            else:
                st.session_state.active_state = original_state

            results[text] = {
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }

    # Final restore (extra safety)
    if original_state is None:
        if "active_state" in st.session_state:
            del st.session_state["active_state"]
    else:
        st.session_state.active_state = original_state

    return results


# ---------------------------------------------------------
# STORAGE INSPECTOR
# ---------------------------------------------------------

def inspect_storage(history_file="chat_history.json", profile_file="user_profile.json"):
    """
    Inspect saved history and profile files.
    """
    try:
        history = load_saved_history(history_file)
    except Exception as exc:
        history = {"error": str(exc), "traceback": traceback.format_exc()}

    try:
        profile = load_saved_profile(profile_file)
    except Exception as exc:
        profile = {"error": str(exc), "traceback": traceback.format_exc()}

    # Normalize return structure
    return {
        "history": history,
        "profile": profile,
        "history_count": len(history) if isinstance(history, list) else None,
        "history_preview": history[:5] if isinstance(history, list) else None,
    }


# ---------------------------------------------------------
# LLM INSPECTOR
# ---------------------------------------------------------

def inspect_llm():
    """
    Test basic LLM connectivity and response validity.
    """
    prompt = "Diagnostic test: Respond with a short confirmation message."
    try:
        response = run_llm(prompt)
        return {"success": True, "response": response}
    except Exception as exc:
        return {
            "success": False,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


# ---------------------------------------------------------
# FULL INSPECTION WRAPPER
# ---------------------------------------------------------

def run_full_inspection(path="."):
    """
    Convenience wrapper that runs the full inspection suite and returns a dict.
    Each sub-inspection is isolated so one failure doesn't break the whole report.
    """
    report = {}

    try:
        report["structure"] = scan_project_structure(path)
    except Exception as exc:
        report["structure"] = {"error": str(exc), "traceback": traceback.format_exc()}

    try:
        report["routing"] = inspect_routing()
    except Exception as exc:
        report["routing"] = {"error": str(exc), "traceback": traceback.format_exc()}

    try:
        report["storage"] = inspect_storage()
    except Exception as exc:
        report["storage"] = {"error": str(exc), "traceback": traceback.format_exc()}

    try:
        report["llm"] = inspect_llm()
    except Exception as exc:
        report["llm"] = {"error": str(exc), "traceback": traceback.format_exc()}

    return report


# ---------------------------------------------------------
# STREAMLIT UI
# ---------------------------------------------------------

def launch_inspector():
    st.title("🔍 Project Inspector")

    st.write("Deep inspection tools for project structure, routing, storage, and LLM connectivity.")

    st.divider()
    st.header("📁 Project Structure")

    try:
        structure = scan_project_structure(".")
        st.json(structure)
    except Exception as exc:
        st.error("Failed to scan project structure")
        st.exception(exc)

    st.divider()
    st.header("🧭 Routing Engine Test (Safe Mode)")

    try:
        routing_results = inspect_routing()
        st.json(routing_results)
    except Exception as exc:
        st.error("Routing inspection failed")
        st.exception(exc)

    st.divider()
    st.header("💾 Storage Inspector")

    try:
        storage_results = inspect_storage()
        st.json(storage_results)
    except Exception as exc:
        st.error("Storage inspection failed")
        st.exception(exc)

    st.divider()
    st.header("🤖 LLM Connectivity Test")

    try:
        llm_results = inspect_llm()
        st.json(llm_results)
    except Exception as exc:
        st.error("LLM inspection failed")
        st.exception(exc)
