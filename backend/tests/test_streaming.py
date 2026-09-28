import json

import httpx
import pytest

from app.core.config import settings


@pytest.mark.parametrize("provider,lines", [
    ("ollama", ['{"message":{"content":"Hello"},"done":false}',
                '{"message":{"content":" world"},"done":true}']),
    ("openai", ['data: {"choices":[{"delta":{"content":"Hello"}}]}',
                'data: {"choices":[{"delta":{"content":" world"}}]}', 'data: [DONE]']),
])
def test_stream_contract(client, monkeypatch, provider, lines):
    monkeypatch.setattr(settings, "llm_provider", provider)
    monkeypatch.setattr(settings, "llm_model", "test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    original = httpx.AsyncClient

    def respond(request):
        assert json.loads(request.content)["stream"] is True
        return httpx.Response(200, text="\n".join(lines) + "\n")

    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(
        transport=httpx.MockTransport(respond), **kw))
    response = client.post("/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]})
    events = [json.loads(line) for line in response.text.splitlines()]
    assert [e["type"] for e in events] == ["route", "delta", "delta", "done"]
    assert "".join(e["content"] for e in events if e["type"] == "delta") == "Hello world"


def test_stream_failure_sanitized(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    monkeypatch.setattr(settings, "llm_model", "test")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(
        transport=httpx.MockTransport(lambda r: httpx.Response(500, text="SECRET")), **kw))
    response = client.post("/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]})
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]["type"] == "error"
    assert "SECRET" not in response.text
    assert all(e["type"] != "done" for e in events)


def test_stream_validation(client):
    assert client.post("/api/llm/stream", json={"messages": []}).status_code == 422


def test_crisis_does_not_call_provider(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "invalid")
    response = client.post("/api/llm/stream", json={"messages": [{"role": "user", "content": "I want to kill myself"}]})
    assert '988' in response.text
    assert json.loads(response.text.splitlines()[-1])["type"] == "done"
