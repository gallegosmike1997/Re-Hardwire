import json

import httpx
import pytest

from app.core.config import settings


STREAM_BODY = (
    "data: " + json.dumps({"choices": [{"delta": {"content": "ok"}}]})
    + "\n"
    + "data: [DONE]\n"
)


@pytest.mark.parametrize("provider,lines", [
    ("ollama", ['{"message":{"content":"Hello"},"done":false}',
                '{"message":{"content":" world"},"done":true}']),
    ("openai", ['data: {"choices":[{"delta":{"content":"Hello"}}]}',
                'data: {"choices":[{"delta":{"content":" world"}}]}', 'data: [DONE]']),
])
def test_stream_contract(client, auth_headers, monkeypatch, provider, lines):
    monkeypatch.setattr(settings, "llm_provider", provider)
    monkeypatch.setattr(settings, "llm_model", "test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    original = httpx.AsyncClient

    def respond(request):
        assert json.loads(request.content)["stream"] is True
        return httpx.Response(200, text="\n".join(lines) + "\n")

    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(
        transport=httpx.MockTransport(respond), **kw))
    response = client.post(
        "/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]},
        headers=auth_headers,
    )
    events = [json.loads(line) for line in response.text.splitlines()]
    assert [e["type"] for e in events] == ["route", "delta", "delta", "done"]
    assert "".join(e["content"] for e in events if e["type"] == "delta") == "Hello world"


def test_stream_failure_sanitized(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    monkeypatch.setattr(settings, "llm_model", "test")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(
        transport=httpx.MockTransport(lambda r: httpx.Response(500, text="SECRET")), **kw))
    response = client.post(
        "/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]},
        headers=auth_headers,
    )
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]["type"] == "error"
    assert "SECRET" not in response.text
    assert all(e["type"] != "done" for e in events)


def test_stream_validation(client, auth_headers):
    assert client.post(
        "/api/llm/stream", json={"messages": []}, headers=auth_headers
    ).status_code == 422


def test_stream_requires_a_session(client):
    assert client.post(
        "/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]}
    ).status_code == 401


def test_crisis_does_not_call_provider(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "invalid")
    response = client.post(
        "/api/llm/stream",
        json={"messages": [{"role": "user", "content": "I want to kill myself"}]},
        headers=auth_headers,
    )
    assert '988' in response.text
    assert json.loads(response.text.splitlines()[-1])["type"] == "done"

def test_stream_personalises_with_the_operator_name(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "llm_model", "test")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    client.put("/api/profile", json={"name": "Marcus"}, headers=auth_headers)
    captured = {}

    def respond(request):
        captured["system"] = json.loads(request.content)["messages"][0]["content"]
        return httpx.Response(200, text=STREAM_BODY)

    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: original(
        transport=httpx.MockTransport(respond), **kw))


    response = client.post(
        "/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    events = [json.loads(line) for line in response.text.splitlines()]
    assert events[-1]["type"] == "done"
    assert "Marcus" in captured["system"]
    assert "display label" in captured["system"]


def test_stream_rejects_a_forged_token(client):
    response = client.post(
        "/api/llm/stream", json={"messages": [{"role": "user", "content": "Hi"}]},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401
