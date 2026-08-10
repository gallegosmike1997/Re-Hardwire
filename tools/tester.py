import os
import time
import traceback
import streamlit as st

from tools.manager import ToolManager
from tools.diagnostic import run_diagnostics
from tools.autocorrect import attempt_autocorrect
from tools.inspector import run_full_inspection

from core.routing import semantic_route, auto_route
from core.storage import (
    load_saved_history,
    save_history_to_disk,
    load_saved_profile,
    save_profile_to_disk,
)
from core.llm import run_llm


# ---------------------------------------------------------
# INITIALIZE TOOL MANAGER
# ---------------------------------------------------------

manager = ToolManager()
manager.register("diagnostic", run_diagnostics)
manager.register("autocorrect", attempt_autocorrect)
manager.register("inspection", run_full_inspection)


# ---------------------------------------------------------
# ROUTING TESTS
# ---------------------------------------------------------

def test_routing():
    samples = [
        "I want to die",
        "My chest feels tight",
        "I'm overthinking everything",
        "I want to focus on my values",
        "I'm having trouble regulating my emotions",
    ]

    results = {}

    for text in samples:
        try:
            semantic = semantic_route(text)
            auto = auto_route(text)
            results[text] = {
                "semantic": semantic,
                "auto": auto,
            }
        except Exception as exc:
            results[text] = {
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }

    return results


# ---------------------------------------------------------
# STORAGE TESTS
# ---------------------------------------------------------

def test_storage(history_file="chat_history.json", profile_file="user_profile.json"):
    try:
        history = load_saved_history(history_file)
        profile = load_saved_profile(profile_file)

        # Write test
        test_msg = {"role": "tester", "content": "storage test", "ts": time.time()}
        history.append(test_msg)
        save_history_to_disk(history_file, history)

        # Read back
        history2 = load_saved_history(history_file)

        return {
            "history_length_before": len(history),
            "history_length_after": len(history2),
            "profile_keys": list(profile.keys()),
            "history_test_passed": history2[-1]["content"] == "storage test",
        }

    except Exception as exc:
        return {
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


# ---------------------------------------------------------
# LLM TESTS
# ---------------------------------------------------------

def test_llm():
    prompt = "Respond with exactly: LLM TEST OK"
    try:
        response = run_llm(prompt)
        return {
            "response": response,
            "passed": "LLM TEST OK" in response,
        }
    except Exception as exc:
        return {
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }


# ---------------------------------------------------------
# TOOL MANAGER TESTS
# ---------------------------------------------------------

def test_tool_manager():
    results = {}

    # Run diagnostic on a fake error
    fake_exc = Exception("Tester: simulated exception")
    diag = manager.run("diagnostic", fake_exc, ".")
    results["diagnostic"] = diag

    # Run auto-correct on the diagnostic
    auto = manager.run("autocorrect", diag.get("result"))
    results["autocorrect"] = auto

    # Run inspection
    insp = manager.run("inspection", ".")
    results["inspection"] = insp

    return results


# ---------------------------------------------------------
# FULL SYSTEM TEST
# ---------------------------------------------------------

def run_full_test():
    return {
        "routing": test_routing(),
        "storage": test_storage(),
        "llm": test_llm(),
        "tools": test_tool_manager(),
        "inspection": run_full_inspection("."),
    }


# ---------------------------------------------------------
# STREAMLIT UI
# ---------------------------------------------------------

def render_tester():
    st.title("🧪 System Tester")

    if st.button("Run Full System Test"):
        report = run_full_test()
        st.json(report)

    st.divider()

    st.header("🔧 Routing Test")
    st.json(test_routing())

    st.divider()

    st.header("📦 Storage Test")
    st.json(test_storage())

    st.divider()

    st.header("🤖 LLM Test")
    st.json(test_llm())

    st.divider()

    st.header("🛠️ Tool Manager Test")
    st.json(test_tool_manager())


# ---------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------

def launch_tester():
    render_tester()
