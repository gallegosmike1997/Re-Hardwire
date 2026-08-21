import traceback
import importlib
import os
import sys
import json
import streamlit as st

from core.llm import run_llm  # your existing LLM wrapper


# ---------------------------------------------------------
# BASIC UTILITIES
# ---------------------------------------------------------

def _safe_import(module_name: str):
    """
    Try importing a module and return (ok, error_message).
    """
    try:
        importlib.import_module(module_name)
        return True, None
    except Exception as e:
        return False, str(e)


def _file_exists(path: str):
    return os.path.exists(path)


def _read_file(path: str):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


# ---------------------------------------------------------
# CORE DIAGNOSTIC ENGINE
# ---------------------------------------------------------

def analyze_exception(exc: Exception) -> dict:
    """
    Convert an exception into a structured diagnostic object.
    """
    tb = traceback.format_exc()

    return {
        "type": exc.__class__.__name__,
        "message": str(exc),
        "traceback": tb,
    }


def check_project_structure(base_path: str) -> dict:
    """
    Verify that required project files exist.
    """

    required_files = [
        "app.py",
        "core/routing.py",
        "core/storage.py",
        "core/llm.py",
        "ui/chat.py",
        "ui/sidebar.py",
        "static/logo.svg",
    ]

    results = {}

    for f in required_files:
        full = os.path.join(base_path, f)
        results[f] = _file_exists(full)

    return results


def check_python_environment() -> dict:
    """
    Inspect Python environment for common issues.
    """

    checks = {
        "python": sys.executable,
        "version": sys.version,
        "streamlit_in_venv": "venv" in sys.executable,
        "installed_packages": sorted(list(sys.modules.keys())),
    }

    return checks


def check_imports() -> dict:
    """
    Check critical imports for your app.
    """

    modules = [
        "streamlit",
        "sentence_transformers",
        "torch",
        "numpy",
        "scipy",
        "core.routing",
        "core.storage",
        "core.llm",
        "ui.chat",
    ]

    results = {}

    for m in modules:
        ok, err = _safe_import(m)
        results[m] = {"ok": ok, "error": err}

    return results


# ---------------------------------------------------------
# LLM-POWERED DIAGNOSTICS
# ---------------------------------------------------------

def llm_diagnose(exception_data: dict, import_data: dict, structure_data: dict) -> str:
    """
    Ask your LLM to interpret the diagnostic data and propose fixes.
    """

    prompt = f"""
You are a diagnostic agent analyzing a Streamlit-based Python project.

Exception:
{json.dumps(exception_data, indent=2)}

Import Status:
{json.dumps(import_data, indent=2)}

Project Structure:
{json.dumps(structure_data, indent=2)}

Provide:
1. The most likely root cause.
2. The exact file and line that needs correction.
3. A minimal patch (code snippet) to fix the issue.
4. Any missing dependencies.
5. Any environment issues (wrong interpreter, missing venv, etc).
6. A confidence score (0–1).
"""

    return run_llm(prompt)


# ---------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------

def run_diagnostics(exc: Exception, base_path: str = ".") -> dict:
    """
    Main entry point for the diagnostic agent.
    """

    exception_data = analyze_exception(exc)
    structure_data = check_project_structure(base_path)
    import_data = check_imports()
    env_data = check_python_environment()

    llm_report = llm_diagnose(exception_data, import_data, structure_data)

    return {
        "exception": exception_data,
        "structure": structure_data,
        "imports": import_data,
        "environment": env_data,
        "llm_report": llm_report,
    }


# ---------------------------------------------------------
# STREAMLIT UI HELPERS
# ---------------------------------------------------------

def render_diagnostics(diag: dict):
    """
    Pretty Streamlit rendering for debugging.
    """

    st.error("⚠️ Diagnostic Agent Report")

    st.subheader("Exception")
    st.code(diag["exception"]["traceback"])

    st.subheader("Project Structure")
    st.json(diag["structure"])

    st.subheader("Import Status")
    st.json(diag["imports"])

    st.subheader("Environment")
    st.json(diag["environment"])

    st.subheader("LLM Analysis")
    st.write(diag["llm_report"])
