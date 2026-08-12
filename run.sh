#!/bin/bash
source venv312/bin/activate
export AI_TOOL_MODE=OFFLINE
python -m streamlit run app.py
