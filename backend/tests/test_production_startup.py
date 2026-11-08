"""Tests for the production‑startup guard in main.py.

The backend must refuse to start when ``APP_ENV`` is ``production`` (or ``prod``)
unless both ``AUTH_SECRET`` and ``RE_HARDWIRE_SUBJECT_ID`` are configured.
These tests verify that behaviour.
"""
import os
import subprocess
import sys

import pytest


def _run_main(env_vars: dict) -> subprocess.CompletedProcess:
    """Run uvicorn with the given environment; capture exit code & stderr."""
    env = os.environ.copy()
    env.update(env_vars)
    # Execute the FastAPI app just to trigger the guard at import time.
    # We use `uvicorn app.main:app` which will start the server; the guard will
    # raise RuntimeError and the process will exit non‑zero.
    proc = subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    return proc


@pytest.mark.production
def test_production_without_auth_secret_fails():
    """Production mode must abort if AUTH_SECRET is missing."""
    env = {
        "APP_ENV": "production",
        "RE_HARDWIRE_SUBJECT_ID": "user‑12345",
    }
    proc = _run_main(env)
    assert proc.returncode != 0, (
        f"Expected non‑zero exit when AUTH_SECRET missing, got {proc.returncode}"
    )
    assert "AUTH_SECRET" in proc.stderr, (
        f"Expected stderr mention of AUTH_SECRET, got: {proc.stderr}"
    )


@pytest.mark.production
def test_production_without_subject_id_fails():
    """Production mode must abort if RE_HARDWIRE_SUBJECT_ID is missing."""
    env = {
        "APP_ENV": "production",
        "AUTH_SECRET": "super‑secret‑32‑chars‑here",
    }
    proc = _run_main(env)
    assert proc.returncode != 0, (
        f"Expected non‑zero exit when SUBJECT_ID missing, got {proc.returncode}"
    )
    assert "RE_HARDWIRE_SUBJECT_ID" in proc.stderr, (
        f"Expected stderr mention of RE_HARDWIRE_SUBJECT_ID, got: {proc.stderr}"
    )


@pytest.mark.production
def test_production_with_both_set_succeeds():
    """When both required vars are present, the app should start successfully."""
    env = {
        "APP_ENV": "production",
        "AUTH_SECRET": "super‑secret‑32‑chars‑here",
        "RE_HARDWIRE_SUBJECT_ID": "user‑12345",
    }
    proc = _run_main(env)
    # Successful start gives exit code 0 (uvicorn runs until interrupted).
    assert proc.returncode == 0, (
        f"Unexpected exit code {proc.returncode} when both vars set: {proc.stderr}"
    )