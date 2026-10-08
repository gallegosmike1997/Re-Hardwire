"""Re-Hardwire FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.history import router as history_router
from app.api.capabilities import router as capabilities_router
from app.api.llm import router as llm_router
from app.api.profile import router as profile_router
from app.api.route import router as route_router
from app.api.tts import router as tts_router
from app.core.config import settings
from app.services import analytics


if settings.app_env in {"prod", "production"}:
    raise RuntimeError(
        "Production startup is disabled: the backend still uses shared JSON storage "
        "and has no enforced authentication or per-user authorization. Keep it local "
        "until those safeguards are implemented and reviewed."
    )
if "*" in settings.cors_origins:
    raise RuntimeError("CORS_ORIGINS must list explicit trusted origins; wildcard access is disabled.")


class RequestBodyLimitMiddleware:
    """Reject oversized API bodies before Pydantic or endpoints process them."""

    def __init__(self, app: ASGIApp, max_body_bytes: int = 1_048_576) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "")
        if scope.get("type") != "http" or not (path == "/api" or path.startswith("/api/")):
            await self.app(scope, receive, send)
            return

        content_length = next(
            (value for name, value in scope.get("headers", []) if name.lower() == b"content-length"),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > self.max_body_bytes:
                    await self._reject(send)
                    return
            except ValueError:
                pass

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message.get("type") == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_body_bytes:
                    raise _RequestBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except _RequestBodyTooLarge:
            await self._reject(send)

    @staticmethod
    async def _reject(send: Send) -> None:
        body = b'{"detail":"Request body exceeds the 1 MiB limit."}'
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"cache-control", b"no-store"),
            ],
        })
        await send({"type": "http.response.body", "body": body})


class _RequestBodyTooLarge(Exception):
    pass


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

app.add_middleware(RequestBodyLimitMiddleware)


@app.middleware("http")
async def add_security_headers(request, call_next):
    """Set baseline API headers and prevent private responses being cached."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    if request.url.path.startswith(("/api/", "/audio/")):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response

# CORS (Next.js dev server + Capacitor WebView). Empty configuration allows no
# browser origins; it must never silently become a wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
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
