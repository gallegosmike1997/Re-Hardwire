#!/bin/bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
export AI_TOOL_MODE=OFFLINE
exec ./venv310/bin/python -m streamlit run app.py
