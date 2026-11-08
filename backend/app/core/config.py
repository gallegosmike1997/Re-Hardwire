from pydantic import BaseSettings, Field, SecretStr
from typing import List, Optional


class Settings(BaseSettings):
    app_name: str = "Re‑Hardwire"
    version: str = "1.0.0"
    description: str = "Self‑help mobile app (offline‑first)"
    app_env: str = "development"  # development | prod | production
    auth_secret: Optional[SecretStr] = None
    subject_id: Optional[str] = None
    cors_origins: List[str] = Field(default_factory=lambda: [])
    # Add any other existing env vars here (api_base_url, audio_dir, etc.)

    class Config:
        env_file = ".env"
        env_prefix = "RE_HARDWIRE_"

    def ensure_dirs(self):
        """Create per‑subject storage dir; enforce production guard."""
        import pathlib, os

        if self.app_env in {"prod", "production"}:
            if not self.subject_id:
                raise RuntimeError(
                    "Production mode requires RE_HARDWIRE_SUBJECT_ID to be set"
                )
            users = pathlib.Path("users_dir")
            (users / self.subject_id).mkdir(parents=True, exist_ok=True)
            # Optionally clear or redirect the shared data dir so new writes
            # go to the per‑subject location only.
            data = pathlib.Path("backend/data")
            if data.exists():
                # No‑op – keep existing data; new writes should use users_dir.
                pass

        # Fallback for development – ensure a data directory exists.
        pathlib.Path("backend/data").mkdir(parents=True, exist_ok=True)