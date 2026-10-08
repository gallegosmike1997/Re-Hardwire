"""Re-Hardwire FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.history import router as history_router
from app.api.capabilities import router as capabilities_router
from app.api.llm import router as llm_router
from app.api.profile import router as profile_router
from app.api.route import router as route_router
from app.api.tts import router as tts_router
from app.core.config import settings
from app.services import analytics


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Prepare the data directories and log the boot event."""
    settings.ensure_dirs()
    analytics.record_event("app.start", {"engine": settings.engine})
    yield


app = FastAPI(
    title=settings.app_name,
    description=settings.description,
    version=settings.version,
    lifespan=lifespan,
)

# CORS (Next.js dev server + Capacitor WebView).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rendered TTS files are served straight off disk.
app.mount("/audio", StaticFiles(directory=str(settings.audio_dir)), name="audio")


@app.get("/health")
def health() -> dict:
    """Liveness probe consumed by ``api.checkHealth()`` in the frontend."""
    return {"status": "online", "engine": settings.engine}


@app.get("/api")
def api_index() -> dict:
    """Discoverability index for the API surface."""
    return {
        "engine": settings.engine,
        "version": settings.version,
        "endpoints": {
            "health": "/health",
            "route": "/api/route",
            "protocols": "/api/route/protocols",
            "stats": "/api/route/stats",
            "llm": "/api/llm",
            "tts": "/api/tts",
            "history": "/api/history",
            "profile": "/api/profile",
            "capabilities": "/api/v1/capabilities",
        },
    }


# Routers. Paths are declared as "" so the mounted path is exactly
# /api/<name>, matching the endpoint strings in frontend/lib/config.ts.
app.include_router(route_router, prefix="/api/route")
app.include_router(llm_router, prefix="/api/llm")
app.include_router(tts_router, prefix="/api/tts")
app.include_router(history_router, prefix="/api/history")
app.include_router(profile_router, prefix="/api/profile")
app.include_router(capabilities_router, prefix="/api/v1", tags=["v1 capabilities"])
