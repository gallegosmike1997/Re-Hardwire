"""Text-to-speech engine for Re-Hardwire.

Ships with a silent placeholder synthesiser so the API contract
(``{ audioUrl, duration }``) is honoured without shipping a TTS dependency.
Swap :func:`synthesize` for a real voice backend when one is chosen.
"""
from __future__ import annotations

import math
import re
import secrets
import threading
from pathlib import Path
from typing import Optional

from app.core.config import settings

from ..routing import engine as routing_engine

#: Minimum spoken duration, in seconds, so the client always has something to
#: animate even for a one-word utterance.
MIN_DURATION = 0.8

#: Keep the local placeholder cache bounded even if a caller sends many requests.
MAX_AUDIO_FILES = 100
_AUDIO_LOCK = threading.Lock()


def auto_route(user_text: str) -> dict:
    """Legacy entry point kept for backwards compatibility.

    Routes ``user_text`` through the core engine and returns the dict shape
    that the original placeholder produced (``protocol``/``confidence``/
    ``tags``), plus the extended routing fields.
    """
    return routing_engine.auto_route(user_text)


def estimate_duration(text: str, speed: float = 1.0) -> float:
    """Estimate spoken duration in seconds from word count and speed."""
    words = max(1, len(text.split()))
    safe_speed = speed if speed and speed > 0 else 1.0
    minutes = words / settings.tts_words_per_minute
    return round(max(MIN_DURATION, (minutes * 60.0) / safe_speed), 2)


def _audio_filename() -> str:
    """Generate an opaque name that does not reveal or fingerprint spoken text."""
    return f"{secrets.token_hex(16)}.wav"


def _write_placeholder(path: Path, duration: float) -> None:
    """Write a minimal, valid, silent RIFF/WAVE file.

    The header is real so browsers and audio tools accept the file even though
    every sample is zero.
    """
    if path.exists():
        return

    sample_rate = 8000
    channels = 1
    bits_per_sample = 8
    frames = max(1, int(sample_rate * duration))
    data_size = frames * channels * bits_per_sample // 8

    header = b"".join(
        [
            b"RIFF",
            (36 + data_size).to_bytes(4, "little"),
            b"WAVEfmt ",
            (16).to_bytes(4, "little"),
            (1).to_bytes(2, "little"),  # PCM
            channels.to_bytes(2, "little"),
            sample_rate.to_bytes(4, "little"),
            (sample_rate * channels * bits_per_sample // 8).to_bytes(4, "little"),
            (channels * bits_per_sample // 8).to_bytes(2, "little"),
            bits_per_sample.to_bytes(2, "little"),
            b"data",
            data_size.to_bytes(4, "little"),
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(header + bytes([128] * data_size))


def _prune_audio_files(preserve: Path) -> None:
    """Keep only the newest generated placeholder audio files."""
    generated = [
        path for path in settings.audio_dir.iterdir()
        if path.is_file() and re.fullmatch(r"[0-9a-f]{32}\.wav", path.name)
    ]
    generated.sort(key=lambda path: (path == preserve, path.stat().st_mtime_ns), reverse=True)
    for expired in generated[MAX_AUDIO_FILES:]:
        try:
            expired.unlink()
        except FileNotFoundError:
            pass


def synthesize(
    text: str,
    voice: Optional[str] = None,
    speed: Optional[float] = None,
) -> dict:
    """Render ``text`` to an audio file and describe the result.

    Returns:
        ``{"audioUrl": str, "duration": float, "voice": str, "speed": float}``
    """
    selected_voice = voice or settings.tts_voice
    selected_speed = speed if speed and speed > 0 else settings.tts_speed
    duration = estimate_duration(text, selected_speed)

    target = settings.audio_dir / _audio_filename()
    with _AUDIO_LOCK:
        _write_placeholder(target, duration)
        _prune_audio_files(target)

    return {
        "audioUrl": f"/audio/{target.name}",
        "duration": duration,
        "voice": selected_voice,
        "speed": selected_speed,
    }


def pace_label(duration: float, words: int) -> str:
    """Human readable pacing hint used by the UI."""
    if words <= 0:
        return "silent"
    wpm = words / max(duration, 1e-6) * 60.0
    if math.isnan(wpm):
        return "unknown"
    if wpm < 120:
        return "slow"
    if wpm < 170:
        return "steady"
    return "brisk"
