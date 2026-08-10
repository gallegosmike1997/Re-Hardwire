import os
import streamlit as st

# optional imports; guard to avoid import errors when not installed
try:
    import openai
except Exception:
    openai = None

try:
    import ollama
except Exception:
    ollama = None


@st.cache_resource
def get_llm_client():
    mode = os.environ.get("AI_TOOL_MODE", "LOCAL").upper()
    if mode == "CLOUD":
        if openai is None:
            raise RuntimeError("OpenAI SDK not installed or not available in this environment.")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set")
        return {"mode": "CLOUD", "client": openai.OpenAI(api_key=api_key)}
    # default to local Ollama if available
    if ollama is None:
        raise RuntimeError("Ollama client not available; set AI_TOOL_MODE=CLOUD and provide OPENAI_API_KEY")
    return {"mode": "LOCAL", "client": ollama}


def stream_llm_response(messages: list):
    """
    Stream tokens from the configured LLM. Yields text chunks.
    """
    cfg = get_llm_client()
    mode = cfg["mode"]
    client = cfg["client"]

    if mode == "CLOUD":
        # OpenAI streaming
        stream = client.chat.completions.create(model="gpt-4o-mini", messages=messages, stream=True)
        for chunk in stream:
            # defensive access
            content = getattr(chunk.choices[0].delta, "content", None) if hasattr(chunk, "choices") else None
            if content:
                yield content
    else:
        # Ollama streaming
        stream = client.chat(model="llama3", messages=messages, stream=True)
        for chunk in stream:
            content = chunk.get("message", {}).get("content")
            if content:
                yield content
