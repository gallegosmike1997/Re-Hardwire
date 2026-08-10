import os
import ast

PROJECT_ROOT = "/home/gallemike/Re-Hardwire"

REQUIRED_FUNCTIONS = {
    "core/routing.py": ["route_message", "get_user_state"],
    "ui/chat.py": ["render_chat_history", "render_chat_input"],
    "ui/sidebar.py": ["render_sidebar"],
}

def find_functions(path):
    try:
        with open(path, "r") as f:
            tree = ast.parse(f.read())
        return [node.name for node in tree.body if isinstance(node, ast.FunctionDef)]
    except Exception as e:
        return f"ERROR: {e}"

def run_diagnostics():
    print("=== Re-Hardwire Diagnostic Report ===\n")

    for rel_path, required_funcs in REQUIRED_FUNCTIONS.items():
        full_path = os.path.join(PROJECT_ROOT, rel_path)
        print(f"Checking {rel_path}...")

        if not os.path.exists(full_path):
            print(f"  ❌ File missing!")
            continue

        funcs = find_functions(full_path)

        if isinstance(funcs, str):
            print(f"  ❌ Could not parse file: {funcs}")
            continue

        for func in required_funcs:
            if func not in funcs:
                print(f"  ❌ Missing function: {func}")
            else:
                print(f"  ✅ Found: {func}")

        print()

    print("=== Scan Complete ===")

if __name__ == "__main__":
    run_diagnostics()
