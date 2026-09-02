#!/bin/bash
# Run the Re-Hardwire FastAPI backend
cd ""/bin"
cd ..

# Activate virtual environment if it exists
if [ -d "venv312" ]; then
    source venv312/bin/activate
fi

cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
