# Re-Hardwire Migration Guide

## Quick Start

### Backend


### Frontend


### Mobile


## Architecture
-  - FastAPI REST API
-  - Next.js + React UI
-  - Your existing Python modules
-  - Replaces Streamlit session state
-  - Mock streamlit module

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Streaming chat |
| GET | /api/history | Get chat history |
| DELETE | /api/history | Clear history |
| GET | /api/profile | Get user profile |
| PUT | /api/profile | Update profile |
| POST | /api/route | Test routing |
| PUT | /api/weights | Update weights |
