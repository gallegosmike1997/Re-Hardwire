"""Incremental provider streaming; never fall back to another provider."""
import json

import httpx

from app.core.config import settings
from .client import ProviderError, is_crisis, CRISIS_REPLY, _local_response
from .prompts import build_messages, last_user_message


async def stream_reply(messages, protocol=None, emotional_state=None, next_action=None):
    text = last_user_message(messages)
    if is_crisis(text):
        yield CRISIS_REPLY
        return
    if settings.llm_provider == "local":
        yield _local_response(text, protocol, emotional_state, next_action)
        return
    provider = settings.llm_provider
    headers = {}
    payload = {"model": settings.llm_model, "stream": True,
               "messages": build_messages(messages, protocol, emotional_state, next_action)}
    if provider == "ollama":
        url = (settings.llm_base_url or "http://localhost:11434").rstrip("/") + "/api/chat"
        payload["options"] = {"temperature": settings.llm_temperature,
                              "num_predict": settings.llm_max_tokens, "num_ctx": 4096}
    elif provider == "openai":
        if not settings.llm_api_key:
            raise ProviderError("OpenAI requires a backend API key.")
        url = (settings.llm_base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        payload.update(temperature=settings.llm_temperature, max_tokens=settings.llm_max_tokens)
    else:
        raise ProviderError("Unsupported LLM provider.")
    if not settings.llm_model or settings.llm_model == "re-hardwire-local":
        raise ProviderError("Configure LLM_MODEL for the selected provider.")
    received = False
    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if provider == "openai":
                        if not line.startswith("data: "):
                            continue
                        line = line[6:]
                        if line == "[DONE]":
                            if not received:
                                raise ValueError("Empty stream")
                            return
                    data = json.loads(line)
                    if "error" in data:
                        raise ValueError("Provider error")
                    if provider == "ollama":
                        content = data.get("message", {}).get("content", "")
                    else:
                        choices = data.get("choices", [])
                        content = choices[0].get("delta", {}).get("content", "") if choices else ""
                    if content:
                        if not isinstance(content, str):
                            raise ValueError("Invalid content")
                        received = True
                        yield content
                    if provider == "ollama" and data.get("done"):
                        if not received:
                            raise ValueError("Empty stream")
                        return
                raise ValueError("Incomplete stream")
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        raise ProviderError("Model stream failed or timed out. Check backend provider configuration.") from None
