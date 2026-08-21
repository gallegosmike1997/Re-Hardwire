import os
import time
import streamlit as st

# Optional imports; guarded so your app doesn't crash if SDKs aren't installed
try:
    import openai
except Exception:
    openai = None

try:
    import ollama
except Exception:
    ollama = None


# ---------------------------------------------------------
# LLM CLIENT SELECTION (CLOUD vs LOCAL)
# ---------------------------------------------------------

@st.cache_resource
def get_llm_client():
    """
    Returns a dict:
        { "mode": "CLOUD" or "LOCAL", "client": <sdk client> }
    """
    mode = os.environ.get("AI_TOOL_MODE", "LOCAL").upper()

    if mode == "CLOUD":
        if openai is None:
            raise RuntimeError("OpenAI SDK not installed.")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set.")
        return {"mode": "CLOUD", "client": openai.OpenAI(api_key=api_key)}

    # Default to LOCAL (Ollama)
    if ollama is None:
        raise RuntimeError(
            "Ollama client not available. "
            "Install Ollama or set AI_TOOL_MODE=CLOUD."
        )
    return {"mode": "LOCAL", "client": ollama}


# ---------------------------------------------------------
# STREAMING CHAT (used by app.py chat UI)
# ---------------------------------------------------------

def stream_llm_response(messages: list):
    """
    Yields text chunks from the configured LLM.
    Used by st.write_stream() in app.py.
    """
    cfg = get_llm_client()
    mode = cfg["mode"]
    client = cfg["client"]

    if mode == "CLOUD":
        # OpenAI streaming
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            if hasattr(chunk, "choices"):
                delta = chunk.choices[0].delta
                content = getattr(delta, "content", None)
                if content:
                    yield content

    else:
        # Ollama streaming
        stream = client.chat(
            model="llama3",
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            content = chunk.get("message", {}).get("content")
            if content:
                yield content


# ---------------------------------------------------------
# NON-STREAMING LLM CALL (required by tools)
# ---------------------------------------------------------

def run_llm(prompt: str, **kwargs) -> str:
    """
    Non-streaming LLM wrapper used by:
        - diagnostic agent
        - tester
        - inspector
        - developer console
    Always returns a STRING.
    """
    # Ensure prompt is always a string
    if isinstance(prompt, list):
        prompt = " ".join(str(x) for x in prompt)
    else:
        prompt = str(prompt)

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
        # Safe fallback stub — ALWAYS returns a string
        preview = prompt.replace("\n", " ")[:200]
        return (
            f"[LLM ERROR STUB] timestamp={int(time.time())} "
            f'preview="{preview}" '
            f"error=\"{exc}\" "
            "This is a fallback stub response. Replace core/llm.py with a real client implementation to enable live LLM behavior."
        )
