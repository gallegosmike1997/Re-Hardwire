"""Tests for the routing engine."""
from __future__ import annotations

import pytest

from app.core.routing.engine import (
    auto_route,
    build_tags,
    compute_confidence,
    extract_signals,
    load_drive,
    plan_next_action,
    read_emotional_state,
    route_text,
    select_level,
)
from app.core.routing.models import (
    PROTOCOL_CATALOG,
    EmotionalState,
    NextAction,
    get_protocol,
)


class TestSignalExtraction:
    def test_empty_text_yields_zero_signals(self):
        signals = extract_signals("")
        assert signals.as_dict() == {
            "stress": 0.0,
            "clarity": 0.0,
            "energy": 0.0,
            "momentum": 0.0,
            "support": 0.0,
            "avoidance": 0.0,
        }

    def test_stress_terms_raise_stress(self):
        signals = extract_signals("I am overwhelmed and anxious, everything is too much")
        assert 0.0 < signals.stress <= 1.0

    def test_negated_positive_terms_do_not_count(self):
        plain = extract_signals("I am focused")
        negated = extract_signals("I am not focused")
        assert plain.clarity > 0.0
        assert negated.clarity < plain.clarity

    def test_scores_are_clamped_to_unit_range(self):
        signals = extract_signals(" ".join(["overwhelmed"] * 10))
        assert signals.stress == 1.0

    def test_depletion_drags_energy_down(self):
        signals = extract_signals("I am motivated but completely exhausted")
        assert signals.energy == 0.0

    def test_multi_word_terms_are_matched(self):
        assert extract_signals("I am snowed under with work").stress > 0.0


class TestLoadDrive:
    def test_overload_reads_high_load_low_drive(self):
        signals = extract_signals("overwhelmed panicking exhausted drowning no time chaos")
        load, drive = load_drive(signals)
        assert load > drive

    def test_momentum_reads_high_drive(self):
        signals = extract_signals("started shipped on track clear plan motivated rested")
        load, drive = load_drive(signals)
        assert drive > load

    def test_both_values_stay_in_range(self):
        signals = extract_signals("overwhelmed, clear plan, motivated, procrastinating")
        load, drive = load_drive(signals)
        assert 0.0 <= load <= 1.0
        assert 0.0 <= drive <= 1.0


class TestLevelSelection:
    @pytest.mark.parametrize("level", [1, 2, 3, 4, 5])
    def test_every_level_has_a_protocol(self, level):
        assert get_protocol(None, level).level == level

    def test_extreme_overload_selects_low_level(self):
        signals = extract_signals(
            "overwhelmed panicking drowning exhausted burnt out no time chaos buried"
        )
        assert select_level(signals) <= 2

    def test_high_drive_selects_high_level(self):
        signals = extract_signals(
            "started shipped progress on track finished completed achieved momentum "
            "clear plan focused motivated rested"
        )
        assert select_level(signals) >= 4

    def test_catalogue_is_ordered_by_level(self):
        levels = [protocol.level for protocol in PROTOCOL_CATALOG]
        assert levels == sorted(levels)


class TestEmotionalState:
    def test_overwhelmed_requires_stress_with_low_energy(self):
        signals = extract_signals("overwhelmed exhausted panicking no energy drained")
        assert read_emotional_state(signals) == EmotionalState.OVERWHELMED

    def test_neutral_text_reads_stable(self):
        signals = extract_signals("Things are fine, ordinary week at work")
        assert read_emotional_state(signals) == EmotionalState.STABLE


class TestNextAction:
    def test_level_one_grounds_first(self):
        assert plan_next_action(extract_signals("panic"), 1) == NextAction.GROUND_AND_RESET

    def test_level_two_reduces_load(self):
        assert plan_next_action(extract_signals("a bit much"), 2) == NextAction.REDUCE_LOAD

    def test_avoidance_triggers_reframe(self):
        signals = extract_signals("I keep procrastinating and putting off the call")
        assert plan_next_action(signals, 3) == NextAction.REFLECT_AND_REFRAME

    def test_momentum_logs_a_win(self):
        signals = extract_signals("I started and shipped it, progress on track")
        assert plan_next_action(signals, 3) == NextAction.LOG_MICRO_WIN


class TestConfidenceAndTags:
    def test_confidence_is_always_in_range(self):
        for text in ["", "fine", "overwhelmed panicking exhausted"]:
            signals = extract_signals(text)
            confidence = compute_confidence(signals, select_level(signals))
            assert 0.0 <= confidence <= 1.0

    def test_more_signal_gives_more_confidence(self):
        quiet = extract_signals("hello")
        loud = extract_signals("overwhelmed panicking exhausted drowning chaos no time")
        assert compute_confidence(loud, 1) > compute_confidence(quiet, 3)

    def test_tags_include_protocol_tags(self):
        signals = extract_signals("overwhelmed")
        protocol = get_protocol(None, 3)
        tags = build_tags(protocol, signals)
        assert set(protocol.tags).issubset(set(tags))
        assert len(tags) <= 6


class TestRouteText:
    def test_returns_camel_case_contract_fields(self):
        payload = route_text("I am overwhelmed today").model_dump(by_alias=True)
        assert set(payload).issuperset(
            {"protocol", "confidence", "tags", "nextAction", "emotionalState"}
        )

    def test_explicit_protocol_overrides_selection(self):
        result = route_text("I am fine", protocol="Pressure Performance")
        assert result.protocol == "Pressure Performance"

    def test_unknown_protocol_falls_back_to_engine(self):
        result = route_text(
            "overwhelmed panicking drowning exhausted burnt out no time chaos",
            protocol="Nope",
        )
        assert result.protocol in {protocol.name for protocol in PROTOCOL_CATALOG}
        assert result.protocol != "Pressure Performance"

    def test_auto_route_returns_plain_dict(self):
        payload = auto_route("I keep putting things off")
        assert isinstance(payload, dict)
        assert "nextAction" in payload
        assert 0.0 <= payload["confidence"] <= 1.0