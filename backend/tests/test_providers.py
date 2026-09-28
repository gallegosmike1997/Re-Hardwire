"""Provider contracts tested without cloud requests or installed Ollama models."""
import httpx
import pytest

from app.core.config import settings
from app.core.llm import client as llm


@pytest.fixture(autouse=True)
def provider_settings(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "openai")
    monkeypatch.setattr(settings, "llm_model", "test-model")
    monkeypatch.setattr(settings, "llm_api_key", "test-secret")
    monkeypatch.setattr(settings, "llm_base_url", "")


@pytest.mark.parametrize("provider", ["openai", "ollama"])
def test_provider_through_chat_api(client, monkeypatch, provider):
    monkeypatch.setattr(settings, "llm_provider", provider)
    calls = []

    def post(url, **kwargs):
        calls.append((url, kwargs))
        message = {"content": "Try one manageable step."}
        data = {"choices": [{"message": message}]} if provider == "openai" else {"message": message}
        return httpx.Response(200, json=data, request=httpx.Request("POST", url))

    monkeypatch.setattr(llm.httpx, "post", post)
    response = client.post("/api/llm", json={
        "messages": [{"role": "user", "content": "A busy week", "created_at": "today"}],
        "protocol": "Ground & Regulate",
    })
    assert response.status_code == 200
    assert response.json()["content"] == "Try one manageable step."
    assert len(calls) == 1
    url, options = calls[0]
    assert url == ("https://api.openai.com/v1/chat/completions" if provider == "openai"
                   else "http://localhost:11434/api/chat")
    payload = options["json"]
    assert payload["model"] == "test-model"
    assert payload["stream"] is False
    assert payload["messages"][0]["role"] == "system"
    assert "Ground & Regulate" in payload["messages"][0]["content"]
    assert payload["messages"][1] == {"role": "user", "content": "A busy week"}
    assert options["timeout"] == settings.llm_timeout
    assert options["headers"] == ({"Authorization": "Bearer test-secret"} if provider == "openai" else {})


@pytest.mark.parametrize("failure", ["timeout", "http", "malformed", "empty"])
def test_provider_failure_is_sanitized(client, monkeypatch, failure):
    def post(url, **kwargs):
        if failure == "timeout":
            raise httpx.ReadTimeout("test-secret private transcript")
        return httpx.Response(
            401 if failure == "http" else 200,
            json={"choices": [{"message": {"content": ""}}]} if failure == "empty" else {},
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(llm.httpx, "post", post)
    response = client.post("/api/llm", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 503
    assert "test-secret" not in response.text
    assert "private transcript" not in response.text
    assert "provider" in response.json()["detail"]


@pytest.mark.parametrize("provider", ["openai", "ollama", "local"])
def test_crisis_never_calls_provider(monkeypatch, provider):
    monkeypatch.setattr(settings, "llm_provider", provider)
    monkeypatch.setattr(llm.httpx, "post", lambda *a, **k: pytest.fail("Unexpected network request"))
    assert llm.generate_response([{"role": "user", "content": "I want to hurt myself"}]) == llm.CRISIS_REPLY


def test_missing_key_fails_without_network(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_api_key", "")
    monkeypatch.setattr(llm.httpx, "post", lambda *a, **k: pytest.fail("Unexpected network request"))
    response = client.post("/api/llm", json={"messages": [{"role": "user", "content": "Hello"}]})
    assert response.status_code == 503
    assert "API_KEY" in response.json()["detail"]
