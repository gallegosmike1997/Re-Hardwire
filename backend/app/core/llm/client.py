"""LLM client with scripted local, OpenAI and Ollama providers.

The default local mode requires no API keys. External providers are explicitly
configured on the backend; responses use the existing non-streaming API contract.
"""
from __future__ import annotations

from typing import Iterable, Iterator, List, Mapping, Optional

from app.core.config import settings

import httpx

from .prompts import build_messages, last_user_message, sanitise_operator_name

CRISIS_TERMS = (
    "kill myself", "end my life", "suicide", "suicidal", "self harm",
    "self-harm", "hurt myself", "no reason to live", "better off dead",
)

CRISIS_REPLY = (
    "I want to stop and be straight with you: what you have just described is "
    "bigger than a coaching session.\n\n"
    "Please contact emergency services or a crisis line right now - in the US "
    "call or text 988, in the UK call 111 and ask for the mental health team, "
    "or go to your nearest emergency department.\n\n"
    "If you can, tell one person near you tonight, out loud, what you told me "
    "here. I will stay with you in this conversation, but a human needs to know."
)

REFLECTIONS = {
    "stable": "You sound settled - like the ground is under you again.",
    "activated": "Your system sounds switched on and running hot.",
    "overwhelmed": "That sounds like far too much arriving at once.",
    "depleted": "You sound like the tank is genuinely empty, not just low.",
    "numb": "That sounds flat - more switched off than wound up.",
    "mixed": "There is real drive in this, and real weight sitting on top of it.",
}

FOLLOW_UPS = {
    "ground_and_reset": "Would you try six slow rounds: breathe in for four, then out for six?",
    "reduce_load": "What is one commitment you could move or drop this week?",
    "continue_protocol": "What is the smallest version of your next practice?",
    "log_micro_win": "What went a little better today, even if it was small?",
    "reflect_and_reframe": "What feels hardest about making that call?",
    "escalate_support": "Who is one person you could let in on how things are going?",
}

DEFAULT_CONTENT = (
    "I am here. Tell me what the last few days have actually looked like - not "
    "the summary, the detail."
)


def is_crisis(text: str) -> bool:
    """Return True when the text contains explicit self-harm language."""
    lowered = text.lower()
    return any(term in lowered for term in CRISIS_TERMS)


def _local_response(
    user_text: str,
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
    profile: Optional[Mapping[str, object]] = None,
) -> str:
    """Compose a dynamic, highly varied and personalized coach reply."""
    if is_crisis(user_text):
        return CRISIS_REPLY
    if not user_text.strip():
        return DEFAULT_CONTENT

    text_lower = user_text.lower()
    name = sanitise_operator_name((profile or {}).get("name"))
    salutation = f"{name}, " if name else ""

    if "sleep" in text_lower or "tired" in text_lower or "exhausted" in text_lower:
        core_reflection = "Rest deficit is compounding your load right now."
        action_advice = "Protect tonight's recovery window above all else."
    elif "work" in text_lower or "job" in text_lower or "boss" in text_lower or "deadline" in text_lower or "schedule" in text_lower:
        core_reflection = "Professional pressure and pacing are colliding right now."
        action_advice = "Identify one task to defer or scale down immediately to restore breathing room."
    elif "anxious" in text_lower or "worry" in text_lower or "panic" in text_lower or "spiral" in text_lower:
        core_reflection = "Anticipatory load is amplifying your anxiety."
        action_advice = "Bring your awareness back to this exact room and take three slow exhales."
    elif emotional_state == "overwhelmed":
        core_reflection = "Too many signals are hitting your system simultaneously."
        action_advice = "Let's narrow your focus to the next ten minutes only."
    elif emotional_state == "activated":
        core_reflection = "There is high operational tension running through your system."
        action_advice = "Pause before reacting and drop your shoulders away from your ears."
    else:
        core_reflection = "I hear the weight and intention behind what you are sharing."
        action_advice = "What is the single most supportive next step you can take?"

    cleaned_input = user_text.strip()
    if len(cleaned_input) > 120:
        cleaned_input = cleaned_input[:117] + "..."

    proto_clause = f" Using {protocol}," if protocol else ""
    return f"{salutation}{core_reflection} Regarding \"{cleaned_input}\":{proto_clause} {action_advice}"


class ProviderError(RuntimeError):
    """Public, sanitized provider failure; never includes credentials or transcripts."""


def _remote_response(messages: List[dict]) -> str:
    """Use the configured provider only; never silently send data elsewhere."""
    provider = settings.llm_provider
    headers = {}
    if provider == "openai":
        if not settings.llm_api_key:
            raise ProviderError("OpenAI requires LLM_API_KEY or OPENAI_API_KEY on the backend.")
        url = (settings.llm_base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
        headers["Authorization"] = f"Bearer {settings.llm_api_key}"
        payload = {
            "model": settings.llm_model, "messages": messages, "stream": False,
            "temperature": settings.llm_temperature, "max_tokens": settings.llm_max_tokens,
        }
    elif provider == "ollama":
        url = (settings.llm_base_url or "http://localhost:11434").rstrip("/") + "/api/chat"
        payload = {
            "model": settings.llm_model, "messages": messages, "stream": False,
            "options": {"temperature": settings.llm_temperature, "num_predict": settings.llm_max_tokens},
        }
    else:
        raise ProviderError("Unsupported LLM_PROVIDER. Use local, openai, or ollama.")
    if settings.llm_model == "re-hardwire-local" or not settings.llm_model.strip():
        raise ProviderError("Set LLM_MODEL to a model available from the configured provider.")
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=settings.llm_timeout)
        response.raise_for_status()
        data = response.json()
        content = (data["choices"][0]["message"]["content"] if provider == "openai"
                   else data["message"]["content"])
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty response")
        return content
    except httpx.TimeoutException:
        raise ProviderError("The LLM provider timed out. Please try again.") from None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        raise ProviderError("The LLM provider failed. Check backend provider configuration and availability.") from None


def stream_llm_response(
    messages: Iterable[Mapping[str, object]],
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
    profile: Optional[Mapping[str, object]] = None,
) -> str:
    """Return the assistant reply for a conversation.

    Signature is backwards compatible: ``stream_llm_response(messages)`` still
    works exactly as it did before. ``profile`` personalises the system prompt
    from the caller's stored profile.
    """
    message_list = [dict(message) for message in messages]
    user_text = last_user_message(message_list)

    if is_crisis(user_text):
        return CRISIS_REPLY
    if not user_text.strip():
        return DEFAULT_CONTENT
    if settings.llm_provider != "local":
        return _remote_response(
            build_messages(message_list, protocol, emotional_state, next_action, profile)
        )

    return _local_response(user_text, protocol, emotional_state, next_action, profile)


def generate_response(
    messages: Iterable[Mapping[str, object]],
    protocol: Optional[str] = None,
    emotional_state: Optional[str] = None,
    next_action: Optional[str] = None,
    profile: Optional[Mapping[str, object]] = None,
) -> str:
    """Alias for :func:`stream_llm_response` with a non-streaming name."""
    return stream_llm_response(messages, protocol, emotional_state, next_action, profile)


def stream_chunks(text: str) -> Iterator[str]:
    """Split a reply into word chunks so the UI can render token by token."""
    words = text.split(" ")
    for index, word in enumerate(words):
        yield word if index == 0 else f" {word}"
