"""Per-process rate limiting for the local prototype backend.

60 LLM/route/TTS calls per minute per client IP. This is a local safeguard,
not a distributed limit: a future multi-instance deployment must replace it
with shared rate limiting after selecting the host and data services.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class RateLimitMiddleware:
    LIMIT = 60
    WINDOW_SECONDS = 60.0
    LIMITED_PREFIXES = ("/api/llm", "/api/route", "/api/tts")

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "")
        if scope.get("type") != "http" or not path.startswith(self.LIMITED_PREFIXES):
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        key = client[0] if client else "unknown"
        now = time.monotonic()
        window = self._hits[key]
        while window and now - window[0] > self.WINDOW_SECONDS:
            window.popleft()
        if len(window) >= self.LIMIT:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Slow down and try again in a minute."},
                headers={"Retry-After": "60", "Cache-Control": "no-store"},
            )
            await response(scope, receive, send)
            return
        window.append(now)
        await self.app(scope, receive, send)
