"""Shared pytest fixtures for the Re-Hardwire backend test suite."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Prevent sentence-transformers from downloading model weights during tests.
# The sandbox has no network, and the SBERT model is not needed for unit tests.
# A deterministic stand-in is injected into ``sys.modules`` so that
# ``from sentence_transformers import SentenceTransformer`` resolves to a mock
# whose ``encode()`` returns a fixed vector instead of reaching out to HuggingFace.
# ---------------------------------------------------------------------------
class _FakeSentenceTransformer:
    """Deterministic stand-in for ``sentence_transformers.SentenceTransformer``."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", **kwargs):  # noqa: ARG002
        self.model_name = model_name

    def encode(self, text, **kwargs):  # noqa: ARG002
        # 384-dimensional vector matching all-MiniLM-L6-v2 output size
        return np.full(384, 0.5, dtype=np.float32)


class _FakeSentenceTransformersModule:
    SentenceTransformer = _FakeSentenceTransformer


sys.modules["sentence_transformers"] = _FakeSentenceTransformersModule()


# Make `app` importable when pytest is run from the backend/ folder.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A FastAPI TestClient backed by an isolated data directory."""
    from app.core import config as config_module

    monkeypatch.setattr(config_module.settings, "data_dir", tmp_path, raising=False)
    monkeypatch.setattr(config_module.settings, "history_file", tmp_path / "history.json", raising=False)
    monkeypatch.setattr(config_module.settings, "profile_file", tmp_path / "profile.json", raising=False)
    monkeypatch.setattr(config_module.settings, "analytics_file", tmp_path / "analytics.json", raising=False)
    monkeypatch.setattr(config_module.settings, "audio_dir", tmp_path / "audio", raising=False)
    monkeypatch.setattr(config_module.settings, "users_dir", tmp_path / "users", raising=False)
    config_module.settings.ensure_dirs()

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers(client):
    """Authorization headers for a fresh anonymous device session.

    The first session created against a given client claims any legacy shared
    data, so tests that assert on empty stores should create their session
    through this fixture rather than calling the endpoint directly.
    """
    response = client.post("/api/session")
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}


@pytest.fixture()
def second_auth_headers(client):
    """Authorization headers for a second, independent anonymous device."""
    response = client.post("/api/session")
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}