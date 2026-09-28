"""
Re-Hardwire backend configuration.

Every value is read from the environment (optionally via a ``.env`` file next
to the ``backend/`` folder) and exposed through the single ``settings``
instance so all modules read configuration the same way.
"""
from __future__ import annotations

import os
from pathlib import Path

try:  # python-dotenv is in requirements.txt, but stay import-safe.
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback when dotenv is absent
    def load_dotenv(*_args: object, **_kwargs: object) -> bool:
        return False


BASE_DIR = Path(__file__).resolve().parents[2]  # .../backend

load_dotenv(BASE_DIR / ".env")


def _env_list(name: str, default: str) -> list[str]:
    """Parse a comma separated environment variable into a list."""
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings:
    """Runtime settings for the Re-Hardwire backend."""

    app_name = "Re-Hardwire Backend"
    description = "Routing Engine • LLM Pipeline • TTS • Success Tracker"
    version = "1.0.0"
    engine = "Re-Hardwire Core v1"

    api_prefix = "/api"
    cors_origins = _env_list("CORS_ORIGINS", "*")

    data_dir = Path(os.getenv("RE_HARDWIRE_DATA_DIR", str(BASE_DIR / "data")))
    history_file = data_dir / "history.json"
    profile_file = data_dir / "profile.json"
    analytics_file = data_dir / "analytics.json"
    audio_dir = data_dir / "audio"

    default_protocol = os.getenv("DEFAULT_PROTOCOL", "Resilience Builder Level 3")
    history_limit = int(os.getenv("HISTORY_LIMIT", "100"))

    llm_provider = os.getenv("LLM_PROVIDER", "local")
    llm_model = os.getenv("LLM_MODEL", "re-hardwire-local")
    llm_api_key = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    llm_base_url = os.getenv("LLM_BASE_URL", "")
    llm_timeout = float(os.getenv("LLM_TIMEOUT", "20"))
    llm_temperature = float(os.getenv("LLM_TEMPERATURE", "0.7"))
    llm_max_tokens = int(os.getenv("LLM_MAX_TOKENS", "1024"))

    tts_voice = os.getenv("TTS_VOICE", "re-hardwire-core")
    tts_speed = float(os.getenv("TTS_SPEED", "1.0"))
    tts_words_per_minute = int(os.getenv("TTS_WORDS_PER_MINUTE", "150"))

    auth_secret = os.getenv("AUTH_SECRET", "re-hardwire-dev-secret")
    auth_token_ttl = int(os.getenv("AUTH_TOKEN_TTL", "86400"))

    default_permissions = _env_list(
        "DEFAULT_PERMISSIONS",
        "chat,history,tts,analytics,voice_input",
    )

    def ensure_dirs(self) -> None:
        """Create the data directories if they do not exist yet."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.audio_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()