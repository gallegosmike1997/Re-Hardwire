"""Shared pytest fixtures for the Re-Hardwire backend test suite."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

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
    config_module.settings.ensure_dirs()

    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client