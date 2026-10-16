"""Rate-limit tests for the local prototype backend."""
from __future__ import annotations


class TestRateLimit:
    def test_llm_refuses_after_60_calls_per_minute(self, client):
        payload = {"messages": [{"role": "user", "content": "hello"}]}
        for _ in range(60):
            response = client.post("/api/llm", json=payload)
            assert response.status_code == 200
        limited = client.post("/api/llm", json=payload)
        assert limited.status_code == 429
        assert limited.headers.get("Retry-After") == "60"

    def test_unrelated_routes_are_not_limited(self, client):
        for _ in range(65):
            assert client.get("/health").status_code == 200
