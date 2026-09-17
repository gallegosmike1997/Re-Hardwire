"""Tests for the TTS engine."""
from __future__ import annotations

import pytest

from app.core.config import settings
from app.core.tts import engine as tts


@pytest.fixture()
def audio_dir(tmp_path, monkeypatch):
    """Point the engine at an isolated audio directory."""
    target = tmp_path / "audio"
    monkeypatch.setattr(settings, "audio_dir", target, raising=False)
    target.mkdir(parents=True, exist_ok=True)
    return target


class TestDurationEstimate:
    def test_longer_text_takes_longer(self):
        short = tts.estimate_duration("one two three")
        long = tts.estimate_duration(" ".join(["word"] * 90))
        assert long > short

    def test_has_a_minimum_duration(self):
        assert tts.estimate_duration("hi") >= tts.MIN_DURATION

    def test_higher_speed_shortens_duration(self):
        text = " ".join(["word"] * 60)
        assert tts.estimate_duration(text, 2.0) < tts.estimate_duration(text, 1.0)

    def test_zero_speed_falls_back_to_normal(self):
        assert tts.estimate_duration("some words here", 0) == tts.estimate_duration(
            "some words here", 1.0
        )


class TestSynthesize:
    def test_returns_the_api_contract_fields(self, audio_dir):
        result = tts.synthesize("Breathe in for four, out for six.")
        assert set(result).issuperset({"audioUrl", "duration"})
        assert result["audioUrl"].startswith("/audio/")
        assert result["duration"] > 0

    def test_writes_a_real_wav_file(self, audio_dir):
        result = tts.synthesize("A short line.")
        written = audio_dir / result["audioUrl"].rsplit("/", 1)[-1]
        assert written.exists()
        assert written.read_bytes()[:4] == b"RIFF"

    def test_same_input_is_cached_to_one_file(self, audio_dir):
        first = tts.synthesize("identical text")
        second = tts.synthesize("identical text")
        assert first["audioUrl"] == second["audioUrl"]
        assert len(list(audio_dir.glob("*.wav"))) == 1

    def test_voice_override_is_reflected(self, audio_dir):
        result = tts.synthesize("hello", voice="warm-narrator")
        assert result["voice"] == "warm-narrator"

    def test_defaults_come_from_settings(self, audio_dir):
        result = tts.synthesize("hello")
        assert result["voice"] == settings.tts_voice
        assert result["speed"] == settings.tts_speed


class TestPaceLabel:
    @pytest.mark.parametrize(
        ("duration", "words", "expected"),
        [
            (1.0, 60, "brisk"),    # 3600 wpm
            (10.0, 15, "slow"),    # 90 wpm
            (10.0, 25, "steady"),  # 150 wpm
        ],
    )
    def test_pace_buckets(self, duration, words, expected):
        assert tts.pace_label(duration, words) == expected

    def test_exactly_at_the_slow_boundary_reads_steady(self):
        # 120 wpm is the boundary, and the boundary belongs to "steady".
        assert tts.pace_label(10.0, 20) == "steady"

    def test_zero_words_is_silent(self):
        assert tts.pace_label(1.0, 0) == "silent"


class TestLegacyAutoRoute:
    def test_auto_route_still_returns_the_original_shape(self):
        result = tts.auto_route("I am overwhelmed today")
        assert set(result).issuperset({"protocol", "confidence", "tags"})

    def test_auto_route_delegates_to_the_routing_engine(self):
        from app.core.routing.engine import auto_route as engine_auto_route

        text = "clear plan, started, motivated"
        assert tts.auto_route(text) == engine_auto_route(text)