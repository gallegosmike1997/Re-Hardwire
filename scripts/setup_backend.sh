#!/bin/bash
# Re‑Hardwire FastAPI Backend Scaffold Script

# Root backend folder
mkdir -p ~/Re-Hardwire/backend
cd ~/Re-Hardwire/backend

# App structure
mkdir -p app/{api,core/{routing,llm,tts,storage},services}
touch app/main.py

# API routes
touch app/api/{route.py,llm.py,tts.py,history.py,profile.py}

# Core logic
touch app/core/config.py
touch app/core/routing/{engine.py,models.py}
touch app/core/llm/{client.py,prompts.py}
touch app/core/tts/engine.py
touch app/core/storage/{history.py,profile.py}

# Services
touch app/services/{analytics.py,auth.py}

# Tests
mkdir -p tests
touch tests/{test_routing.py,test_llm.py,test_tts.py,test_api.py}

# Requirements file
cat <<EOL > requirements.txt
fastapi
uvicorn
pydantic
python-dotenv
EOL

echo "✅ Re‑Hardwire FastAPI backend scaffold created successfully."
