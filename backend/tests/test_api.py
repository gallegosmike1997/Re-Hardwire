"""End-to-end API tests exercising the frontend contract."""
from __future__ import annotations


class TestHealth:
    def test_health_matches_the_health_response_interface(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert set(body) == {"status", "engine"}
        assert body["status"] == "online"

    def test_api_index_lists_every_endpoint(self, client):
        body = client.get("/api").json()
        assert body["endpoints"]["route"] == "/api/route"
        assert body["endpoints"]["llm"] == "/api/llm"


class TestRouteEndpoint:
    def test_post_route_returns_the_route_response_shape(self, client):
        response = client.post("/api/route", json={"userText": "I am overwhelmed today"})
        assert response.status_code == 200
        body = response.json()
        assert set(body).issuperset(
            {"protocol", "confidence", "tags", "nextAction", "emotionalState"}
        )
        assert 0.0 <= body["confidence"] <= 1.0
        assert isinstance(body["tags"], list)

    def test_protocol_override_is_honoured(self, client):
        body = client.post(
            "/api/route",
            json={"userText": "fine", "protocol": "Pressure Performance"},
        ).json()
        assert body["protocol"] == "Pressure Performance"

    def test_empty_user_text_is_rejected(self, client):
        assert client.post("/api/route", json={"userText": "   "}).status_code == 422

    def test_missing_user_text_is_rejected(self, client):
        assert client.post("/api/route", json={}).status_code == 422

    def test_protocol_catalogue_is_returned_ordered(self, client):
        protocols = client.get("/api/route/protocols").json()
        assert len(protocols) == 5
        assert [item["level"] for item in protocols] == [1, 2, 3, 4, 5]

    def test_stats_reflect_recorded_routing_events(self, client):
        client.post("/api/route", json={"userText": "I keep procrastinating"})
        stats = client.get("/api/route/stats").json()
        assert stats["byName"].get("route", 0) >= 1
        assert "startedAt" in stats


class TestLLMEndpoint:
    def test_post_llm_returns_the_llm_response_shape(self, client):
        response = client.post(
            "/api/llm",
            json={"messages": [{"role": "user", "content": "I am exhausted"}]},
        )
        assert response.status_code == 200
        body = response.json()
        assert set(body).issuperset({"content", "protocol", "confidence", "tags"})
        assert body["content"].strip()

    def test_reply_is_grounded_in_the_routing_decision(self, client):
        body = client.post(
            "/api/llm",
            json={"messages": [{"role": "user", "content": "I am overwhelmed and panicking"}]},
        ).json()
        assert body["protocol"] in body["content"] or body["nextAction"]

    def test_empty_message_list_is_rejected(self, client):
        assert client.post("/api/llm", json={"messages": []}).status_code == 422

    def test_protocol_override_reaches_the_reply(self, client):
        body = client.post(
            "/api/llm",
            json={
                "messages": [{"role": "user", "content": "hello"}],
                "protocol": "Momentum & Load",
            },
        ).json()
        assert body["protocol"] == "Momentum & Load"
        assert "Momentum & Load" in body["content"]


class TestTTSEndpoint:
    def test_post_tts_returns_the_tts_contract(self, client):
        response = client.post("/api/tts", json={"text": "Breathe in for four."})
        assert response.status_code == 200
        body = response.json()
        assert set(body).issuperset({"audioUrl", "duration"})
        assert body["audioUrl"].startswith("/audio/")

    def test_voice_and_speed_are_passed_through(self, client):
        body = client.post(
            "/api/tts", json={"text": "hello", "voice": "warm", "speed": 1.5}
        ).json()
        assert body["voice"] == "warm"
        assert body["speed"] == 1.5

    def test_empty_text_is_rejected(self, client):
        assert client.post("/api/tts", json={"text": "  "}).status_code == 422


SESSION = {
    "sessionId": "thread_alpha",
    "protocolUsed": "Resilience Builder Level 3",
    "messages": [
        {"role": "user", "content": "rough day"},
        {"role": "assistant", "content": "let's ground first"},
    ],
}


class TestHistoryEndpoint:
    def test_starts_empty(self, client):
        assert client.get("/api/history").json() == []

    def test_create_assigns_an_id_and_timestamps(self, client):
        body = client.post("/api/history", json=SESSION).json()
        assert body["id"]
        assert body["sessionId"] == "thread_alpha"
        assert body["protocolUsed"] == "Resilience Builder Level 3"
        assert all(message["created_at"] for message in body["messages"])

    def test_created_session_is_readable_by_id(self, client):
        created = client.post("/api/history", json=SESSION).json()
        fetched = client.get(f"/api/history/{created['id']}").json()
        assert fetched == created

    def test_summary_shape_matches_the_used_fields(self, client):
        created = client.post("/api/history", json=SESSION).json()
        assert set(created).issuperset({"id", "sessionId", "messages", "createdAt"})

    def test_listing_filters_by_session_id(self, client):
        client.post("/api/history", json=SESSION)
        client.post("/api/history", json={**SESSION, "sessionId": "thread_beta"})
        assert len(client.get("/api/history").json()) == 2
        filtered = client.get("/api/history", params={"sessionId": "thread_alpha"}).json()
        assert len(filtered) == 1
        assert filtered[0]["sessionId"] == "thread_alpha"

    def test_delete_removes_the_session(self, client):
        created = client.post("/api/history", json=SESSION).json()
        assert client.delete(f"/api/history/{created['id']}").status_code == 200
        assert client.get("/api/history").json() == []

    def test_unknown_session_returns_404(self, client):
        assert client.get("/api/history/nope").status_code == 404
        assert client.delete("/api/history/nope").status_code == 404


class TestProfileEndpoint:
    def test_get_seeds_a_default_profile(self, client):
        body = client.get("/api/profile").json()
        assert set(body).issuperset(
            {"id", "name", "email", "preferences", "permissions", "createdAt"}
        )
        assert isinstance(body["permissions"], list)

    def test_put_updates_only_the_given_fields(self, client):
        before = client.get("/api/profile").json()
        after = client.put("/api/profile", json={"name": "Kalimike"}).json()
        assert after["name"] == "Kalimike"
        assert after["email"] == before["email"]

    def test_put_merges_preferences(self, client):
        before = client.get("/api/profile").json()
        after = client.put(
            "/api/profile", json={"preferences": {"theme": "midnight"}}
        ).json()
        assert after["preferences"]["theme"] == "midnight"
        assert after["preferences"]["ttsEnabled"] == before["preferences"]["ttsEnabled"]

    def test_put_replaces_permissions_without_duplicates(self, client):
        after = client.put(
            "/api/profile", json={"permissions": ["chat", "chat", "tts"]}
        ).json()
        assert after["permissions"] == ["chat", "tts"]

    def test_session_endpoint_issues_a_usable_token(self, client):
        from app.services.auth import verify_token

        body = client.post("/api/profile/session").json()
        assert body["subject"] == client.get("/api/profile").json()["id"]
        assert verify_token(body["token"]) is not None

    def test_reset_restores_the_default_profile(self, client):
        client.put("/api/profile", json={"name": "Changed"})
        assert client.post("/api/profile/reset").json()["name"] == "Operator"