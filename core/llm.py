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


# ---------------------------------------------------------
# STREAMING LLM RESPONSE (used by app.py chat)
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# NON-STREAMING LLM CALL (required by tools)
# ---------------------------------------------------------

def run_llm(prompt: str) -> str:
    """
    Non-streaming LLM wrapper used by diagnostic, tester, inspector, and console tools.
    Returns a full text response.
    """
    cfg = get_llm_client()
    mode = cfg["mode"]
    client = cfg["client"]

    try:
        if mode == "CLOUD":
            # OpenAI non-streaming call
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            return response.choices[0].message.content

        else:
            # Ollama non-streaming call
            response = client.chat(
                model="llama3",
                messages=[{"role": "user", "content": prompt}],
                stream=False,
            )
            return response.get("message", {}).get("content", "")

    except Exception as exc:
        return f"LLM ERROR: {exc}"
