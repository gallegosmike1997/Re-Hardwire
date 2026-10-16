"""Analytics privacy tests: transcripts must never reach the event store."""
from __future__ import annotations


class TestAnalyticsScrubbing:
    def test_transcript_keys_are_redacted(self, client):
        from app.services import analytics

        event = analytics.record_event(
            "test",
            {
                "messages": [{"role": "user", "content": "secret"}],
                "content": "secret",
                "userText": "secret",
                "protocol": "Momentum & Load",
            },
        )
        assert event["payload"]["protocol"] == "Momentum & Load"
        assert "messages" not in event["payload"]
        assert "content" not in event["payload"]
        assert "userText" not in event["payload"]
        assert "messages" in event["payload"]["redacted_keys"]

    def test_unknown_keys_fail_closed(self, client):
        from app.services import analytics

        event = analytics.record_event("test", {"some_future_free_text": "hello"})
        assert "some_future_free_text" not in event["payload"]
        assert "some_future_free_text" in event["payload"]["redacted_keys"]

    def test_history_save_counts_do_not_store_transcripts(self, client):
        response = client.post(
            "/api/history",
            json={"sessionId": "s1", "messages": [{"role": "user", "content": "my secret"}]},
        )
        assert response.status_code == 200
        from app.services import analytics

        events = analytics.list_events(limit=10)
        save = next(e for e in events if e["name"] == "history.save")
        assert save["payload"].get("messages_count") == 1
        assert "messages" not in save["payload"]

    def test_stats_refuse_outside_development(self, client, monkeypatch):
        from app.core import config as config_module

        monkeypatch.setattr(config_module.settings, "app_env", "staging", raising=False)
        response = client.get("/api/route/stats")
        assert response.status_code == 403
