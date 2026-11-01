"""Re-Hardwire FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from app.core.database import get_session
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, Dict, Optional

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.history import router as history_router
from app.api.capabilities import router as capabilities_router
from app.api.llm import router as llm_router
from app.api.profile import router as profile_router
from app.api.route import router as route_router
from app.api.session import router as session_router
from app.api.auth import router as auth_router
from app.api.mfa import router as mfa_router
from app.api.tts import router as tts_router
from app.core.config import settings
from app.rate_limit import RateLimitMiddleware
from app.services import analytics, auth as auth_service
from app.core.models import User
from app.services.oidc import OIDCAuthProvider


async def _init_oidc_provider() -> None:
    """Initialize the OIDC provider. Called from the lifespan event."""
    global _oidc_provider
    if _oidc_provider is not None:
        return
    try:
        provider = OIDCAuthProvider(
            name=settings.oidc_provider_name,
            issuer=settings.oidc_provider_issuer,
            client_id=settings.oidc_client_id,
            client_secret=settings.oidc_client_secret,
            authorization_endpoint=settings.oidc_auth_endpoint,
            token_endpoint=settings.oidc_token_endpoint,
            userinfo_endpoint=settings.oidc_userinfo_endpoint,
            jwks_uri=settings.oidc_jwks_uri,
            revoke_endpoint=settings.oidc_revocation_endpoint,
        )
        _oidc_provider = provider
        analytics.record_event("auth.oidc_provider", {"provider": settings.oidc_provider_name})
    except Exception as e:
        analytics.record_event("auth.oidc_provider", {"error": str(e)})


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.ensure_dirs()
    analytics.record_event("app.start", {"engine": settings.engine})
    await _init_oidc_provider()
    yield

# OIDC provider singleton
_oidc_provider: Optional[OIDCAuthProvider] = None


def get_oidc_provider() -> OIDCAuthProvider:
    global _oidc_provider
    if _oidc_provider is None:
        raise HTTPException(
            status_code=503,
            detail="OIDC provider not configured. Set OIDC_PROVIDER environment variables.",
        )
    return _oidc_provider


def init_oidc_provider(provider: OIDCAuthProvider) -> None:
    """Initialize the OIDC provider singleton. Call during app startup."""
    global _oidc_provider
    _oidc_provider = provider


def init_oidc_provider(provider: OIDCAuthProvider) -> None:
    global _oidc_provider
    _oidc_provider = provider


if settings.app_env in {"prod", "production"}:
    raise RuntimeError(
        "Production startup is disabled: the backend still uses shared JSON storage "
        "and has no enforced authentication or per-user authorization. Keep it local "
        "until those safeguards are implemented and reviewed."
    )
if "*" in settings.cors_origins:
    raise RuntimeError("CORS_ORIGINS must list explicit trusted origins; wildcard access is disabled.")


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_body_bytes: int = 1_048_576) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope.get("type") != "http" or not (scope.get("path") == "/api" or scope.get("path").startswith("/api/")):
            await self.app(scope, receive, send)
            return
        content_length = next(
            (value for name, value in scope.get("headers", []) if name.lower() == b"content-length"),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > self.max_body_bytes:
                    body = b'{"detail":"Request body exceeds the 1 MiB limit."}'
                    await send({"type": "http.response.start", "status": 413, "headers": [
                        (b"content-type", b"application/json"),
                        (b"content-length", str(len(body)).encode("ascii")),
                        (b"cache-control", b"no-store"),
                    ]})
                    await send({"type": "http.response.body", "body": body})
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
            body = b'{"detail":"Request body exceeds the 1 MiB limit."}'
            await send({"type": "http.response.start", "status": 413, "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode("ascii")),
                (b"cache-control", b"no-store"),
            ]})
            await send({"type": "http.response.body", "body": body})


class _RequestBodyTooLarge(Exception):
    pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.ensure_dirs()
    analytics.record_event("app.start", {"engine": settings.engine})
    try:
        provider = OIDCAuthProvider(
            name=settings.oidc_provider_name,
            issuer=settings.oidc_provider_issuer,
            client_id=settings.oidc_client_id,
            client_secret=settings.oidc_client_secret,
            authorization_endpoint=settings.oidc_auth_endpoint,
            token_endpoint=settings.oidc_token_endpoint,
            userinfo_endpoint=settings.oidc_userinfo_endpoint,
            jwks_uri=settings.oidc_jwks_uri,
            revoke_endpoint=settings.oidc_revocation_endpoint,
        )
        auth_service.init_oidc_provider(provider)
        analytics.record_event("auth.oidc_provider", {"provider": settings.oidc_provider_name})
    except Exception as e:
        analytics.record_event("auth.oidc_provider", {"error": str(e)})
    yield


app = FastAPI(
    title=settings.app_name,
    description=settings.description,
    version=settings.version,
    lifespan=lifespan,
)

app.add_middleware(RequestBodyLimitMiddleware)
app.add_middleware(RateLimitMiddleware)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    if request.url.path.startswith(("/api/", "/audio/")):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.mount("/audio", StaticFiles(directory=str(settings.audio_dir)), name="audio")


@app.get("/health")
def health() -> dict:
    return {"status": "online", "engine": settings.engine}


@app.get("/api")
def api_index() -> dict:
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


# Routers
app.include_router(route_router, prefix="/api/route")
app.include_router(llm_router, prefix="/api/llm")
app.include_router(tts_router, prefix="/api/tts")
app.include_router(history_router, prefix="/api/history")
app.include_router(profile_router, prefix="/api/profile")

# --- Auth Endpoints (tasks 1.3, 1.6) ---
class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=256)
    provider: str = Field(default="oidc")
    token: Optional[str] = Field(default=None, description="OIDC authorization code or ID token")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.rsplit("@", 1)[1]:
            raise ValueError("Invalid email address")
        return v


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: Optional[str] = Field(default=None, max_length=254)
    password: Optional[str] = Field(default=None, min_length=8, max_length=256)
    login_method: str = Field(default="email_password")
    token: Optional[str] = Field(default=None)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.strip().lower()


class AuthResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    expiresIn: int
    subject: str
    provider: str


class LogoutResponse(BaseModel):
    success: bool
    detail: str = ""


# Auth endpoints are provided by app/api/auth.py router (included below).


@app.get("/api/auth/providers")
def get_auth_providers():
    return {
        "providers": [
            {
                "name": settings.oidc_provider_name,
                "issuer": settings.oidc_provider_issuer,
                "requires_config": not settings.oidc_client_id,
            }
        ]
    }


# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(mfa_router, prefix="/api/auth")
app.include_router(session_router, prefix="/api/session")
app.include_router(capabilities_router, prefix="/api/v1", tags=["v1 capabilities"])
