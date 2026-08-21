import traceback
import json
import time

from tools.diagnostic import run_diagnostics
from tools.autocorrect import attempt_autocorrect


class ToolManager:
    """
    Central registry + execution engine for all developer tools.
    """

    def __init__(self):
        self.tools = {}
        self.history = []

    # ---------------------------------------------------------
    # REGISTRATION
    # ---------------------------------------------------------

    def register(self, name: str, func):
        """
        Register a tool by name.
        """
        self.tools[name] = func

    def list_tools(self):
        """
        Return a list of available tools.
        """
        return list(self.tools.keys())

    # ---------------------------------------------------------
    # EXECUTION
    # ---------------------------------------------------------

    def run(self, name: str, *args, **kwargs):
        """
        Safely execute a tool and log the result.
        """

        if name not in self.tools:
            return {
                "success": False,
                "error": f"Tool '{name}' not found.",
                "tool": name,
            }

        tool_func = self.tools[name]

        try:
            result = tool_func(*args, **kwargs)

            log_entry = {
                "tool": name,
                "timestamp": time.time(),
                "success": True,
                "result": result,
            }
            self.history.append(log_entry)

            return {
                "success": True,
                "tool": name,
                "result": result,
            }

        except Exception as exc:
            tb = traceback.format_exc()

            log_entry = {
                "tool": name,
                "timestamp": time.time(),
                "success": False,
                "exception": str(exc),
                "traceback": tb,
            }
            self.history.append(log_entry)

            return {
                "success": False,
                "tool": name,
                "exception": str(exc),
                "traceback": tb,
            }

    # ---------------------------------------------------------
    # CHAINING
    # ---------------------------------------------------------

    def chain(self, *tool_names):
        """
        Run multiple tools in sequence.
        """
        results = []

        for name in tool_names:
            results.append(self.run(name))

        return results

    # ---------------------------------------------------------
    # DIAGNOSTIC + AUTO-CORRECTION PIPELINE
    # ---------------------------------------------------------

    def diagnose_and_fix(self, exc: Exception, base_path="."):
        """
        Full pipeline: diagnose → auto-correct.
        """

        diag = run_diagnostics(exc, base_path=base_path)
        fix = attempt_autocorrect(diag)

        return {
            "diagnostic": diag,
            "fix": fix,
        }

    # ---------------------------------------------------------
    # HISTORY
    # ---------------------------------------------------------

    def get_history(self):
        return self.history

    def export_history(self):
        return json.dumps(self.history, indent=2)
