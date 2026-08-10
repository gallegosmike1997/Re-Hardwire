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
    Test semantic routing and auto routing WITHOUT modifying session state.
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
    original_state = st.session_state.get("active_state", "CBT")

    for text in samples:
        try:
            # Run semantic routing safely
            semantic = semantic_route(text)

            # Run auto routing safely by temporarily disabling state mutation
            temp_state = original_state
            st.session_state.active_state = temp_state  # ensure stable baseline

            auto = auto_route(text)

            # Restore original state after each test
            st.session_state.active_state = original_state

            results[text] = {
                "semantic": semantic,
                "auto": auto,
            }

        except Exception as exc:
            results[text] = {
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }

    # Final restore (extra safety)
    st.session_state.active_state = original_state

    return results


# ---------------------------------------------------------
# STORAGE INSPECTOR
# ---------------------------------------------------------

def inspect_storage(history_file="chat_history.json", profile_file="user_profile.json"):
    """
    Inspect saved history and profile files.
    """
    history = load_saved_history(history_file)
    profile = load_saved_profile(profile_file)

    return {
        "history_count": len(history),
        "history_preview": history[:5],
        "profile": profile,
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
# STREAMLIT UI
# ---------------------------------------------------------

def launch_inspector():
    st.title("🔍 Project Inspector")

    st.write("Deep inspection tools for project structure, routing, storage, and LLM connectivity.")

    st.divider()
    st.header("📁 Project Structure")

    structure = scan_project_structure(".")
    st.json(structure)

    st.divider()
    st.header("🧭 Routing Engine Test (Safe Mode)")

    routing_results = inspect_routing()
    st.json(routing_results)

    st.divider()
    st.header("💾 Storage Inspector")

    storage_results = inspect_storage()
    st.json(storage_results)

    st.divider()
    st.header("🤖 LLM Connectivity Test")

    llm_results = inspect_llm()
    st.json(llm_results)
