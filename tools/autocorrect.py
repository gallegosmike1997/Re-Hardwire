import os
import json
import traceback
from core.llm import run_llm


# ---------------------------------------------------------
# INTERNAL HELPERS
# ---------------------------------------------------------

def _safe_write(path: str, content: str):
    """Write a file safely using atomic replacement."""
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp, path)


def _extract_patch(llm_output: str):
    """
    Extract a code patch from the LLM output.
    Looks for fenced code blocks or patch markers.
    """

    if "```" not in llm_output:
        return None

    parts = llm_output.split("```")
    if len(parts) < 2:
        return None

    # The code block is usually the second segment
    code = parts[1]

    # Remove language tags like "python"
    lines = code.split("\n")
    if lines and lines[0].strip().startswith("python"):
        lines = lines[1:]

    return "\n".join(lines).strip()


def _apply_patch(file_path: str, patch: str):
    """
    Apply a full-file replacement patch.
    This version replaces the entire file with the patch.
    """

    if not patch:
        return False, "No patch content extracted."

    try:
        _safe_write(file_path, patch)
        return True, f"Patched {file_path}"
    except Exception as e:
        return False, str(e)


# ---------------------------------------------------------
# AUTO-CORRECTION ENGINE
# ---------------------------------------------------------

def attempt_autocorrect(diag: dict) -> dict:
    """
    Main auto-correction agent.
    Receives diagnostic data and attempts to fix the issue.
    """

    exception = diag.get("exception", {})
    imports = diag.get("imports", {})
    structure = diag.get("structure", {})
    env = diag.get("environment", {})

    prompt = f"""
You are an auto-correction agent for a Streamlit-based Python project.

Here is the diagnostic data:

Exception:
{json.dumps(exception, indent=2)}

Import Status:
{json.dumps(imports, indent=2)}

Project Structure:
{json.dumps(structure, indent=2)}

Environment:
{json.dumps(env, indent=2)}

Your tasks:

1. Identify the exact file that needs correction.
2. Provide a corrected version of the file as a single fenced code block.
3. The code block MUST contain the full corrected file content.
4. Do NOT include explanations inside the code block.
5. Outside the code block, explain the fix briefly.
6. Ensure the patch is syntactically valid Python.

Return ONLY one code block containing the corrected file.
"""

    llm_output = run_llm(prompt)

    # Extract patch
    patch = _extract_patch(llm_output)

    if not patch:
        return {
            "success": False,
            "reason": "LLM did not provide a valid code block.",
            "llm_output": llm_output,
        }

    # Identify target file from LLM output
    target_file = None
    for f in structure.keys():
        if f in llm_output:
            target_file = f
            break

    if not target_file:
        return {
            "success": False,
            "reason": "LLM did not specify a target file.",
            "llm_output": llm_output,
        }

    # Apply patch
    full_path = os.path.join(".", target_file)
    ok, msg = _apply_patch(full_path, patch)

    return {
        "success": ok,
        "message": msg,
        "target_file": target_file,
        "patch": patch,
        "llm_output": llm_output,
    }
