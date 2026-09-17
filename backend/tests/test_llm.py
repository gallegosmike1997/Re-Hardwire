"""Tests for the LLM pipeline."""
from __future__ import annotations

from app.core.llm.client import (
    CRISIS_REPLY,
    DEFAULT_CONTENT,
    generate_response,
    is_crisis,
    stream_chunks,
    stream_llm_response,
)
from app.core.llm.prompts import (
    BASE_SYSTEM_PROMPT,
    build_messages,
    build_system_prompt,
    last_user_message,
)


class TestPrompts:
    def test_base_prompt_mentions_escalation_rule(self):
        assert "emergency support" in BASE_SYSTEM_PROMPT

    def test_protocol_guidance_is_appended(self):
        prompt = build_system_prompt(protocol="Pressure Performance")
        assert "Pressure Performance" in prompt
        assert prompt.startswith(BASE_SYSTEM_PROMPT)

    def test_unknown_protocol_adds_no_guidance(self):
        assert build_system_prompt(protocol="Made Up Protocol") == BASE_SYSTEM_PROMPT

    def test_state_and_action_guidance_are_included(self):
        prompt = build_system_prompt(
            protocol="Ground & Regulate",
            emotional_state="overwhelmed",
            next_action="reduce_load",
        )
        assert "overwhelmed" in prompt.lower()
        assert "reduce load" in prompt.lower()

    def test_build_messages_prepends_system_role(self):
        messages = build_messages([{"role": "user", "content": "hi"}])
        assert messages[0]["role"] == "system"
        assert messages[1] == {"role": "user", "content": "hi"}

    def test_last_user_message_skips_assistant_turns(self):
        messages = [
            {"role": "user", "content": "first"},
            {"role": "assistant", "content": "reply"},
            {"role": "user", "content": "second"},
        ]
        assert last_user_message(messages) == "second"

    def test_last_user_message_returns_empty_without_user_turn(self):
        assert last_user_message([{"role": "assistant", "content": "hi"}]) == ""


class TestCrisisHandling:
    def test_detects_explicit_language(self):
        assert is_crisis("some days I think about suicide")
        assert is_crisis("I want to hurt myself")

    def test_ignores_ordinary_language(self):
        assert not is_crisis("I am exhausted and fed up")

    def test_crisis_short_circuits_the_reply(self):
        reply = stream_llm_response([{"role": "user", "content": "I want to end my life"}])
        assert reply == CRISIS_REPLY
        assert "988" in reply


class TestResponseGeneration:
    def test_backwards_compatible_single_argument_call(self):
        text = stream_llm_response([{"role": "user", "content": "I am overwhelmed"}])
        assert isinstance(text, str)
        assert text.strip()

    def test_empty_conversation_returns_default(self):
        assert stream_llm_response([]) == DEFAULT_CONTENT

    def test_whitespace_only_turn_returns_default(self):
        assert stream_llm_response([{"role": "user", "content": "   "}]) == DEFAULT_CONTENT

    def test_next_action_changes_the_body(self):
        grounding = stream_llm_response(
            [{"role": "user", "content": "I feel awful"}],
            next_action="ground_and_reset",
        )
        assert "breathe" in grounding.lower()

    def test_emotional_state_changes_the_reflection(self):
        reply = stream_llm_response(
            [{"role": "user", "content": "rough week"}],
            emotional_state="depleted",
        )
        assert "empty" in reply.lower()

    def test_protocol_is_named_in_the_reply(self):
        reply = stream_llm_response(
            [{"role": "user", "content": "hello"}],
            protocol="Resilience Builder Level 3",
        )
        assert "Resilience Builder Level 3" in reply

    def test_generate_response_matches_stream_llm_response(self):
        messages = [{"role": "user", "content": "hello"}]
        assert generate_response(messages) == stream_llm_response(messages)


class TestStreamChunks:
    def test_chunks_reassemble_to_the_original(self):
        text = "one two three four"
        assert "".join(stream_chunks(text)) == text

    def test_empty_text_yields_one_empty_chunk(self):
        assert list(stream_chunks("")) == [""]