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
    def test_post_llm_returns_the_llm_response_shape(self, client, auth_headers):
        response = client.post(
            "/api/llm",
            json={"messages": [{"role": "user", "content": "I am exhausted"}]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert set(body).issuperset({"content", "protocol", "confidence", "tags"})
        assert body["content"].strip()

    def test_reply_is_grounded_in_the_routing_decision(self, client, auth_headers):
        body = client.post(
            "/api/llm",
            json={"messages": [{"role": "user", "content": "I am overwhelmed and panicking"}]},
            headers=auth_headers,
        ).json()
        assert body["protocol"] in body["content"] or body["nextAction"]

    def test_empty_message_list_is_rejected(self, client, auth_headers):
        assert client.post(
            "/api/llm", json={"messages": []}, headers=auth_headers
        ).status_code == 422

    def test_protocol_override_reaches_the_reply(self, client, auth_headers):
        body = client.post(
            "/api/llm",
            json={
                "messages": [{"role": "user", "content": "hello"}],
                "protocol": "Momentum & Load",
            },
            headers=auth_headers,
        ).json()
        assert body["protocol"] == "Momentum & Load"
        assert "Momentum & Load" in body["content"]

    def test_missing_token_is_rejected(self, client):
        assert client.post(
            "/api/llm", json={"messages": [{"role": "user", "content": "hello"}]}
        ).status_code == 401

    def test_garbage_token_is_rejected(self, client):
        response = client.post(
            "/api/llm",
            json={"messages": [{"role": "user", "content": "hello"}]},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert response.status_code == 401
        assert "not-a-real-token" not in response.text

    def test_reply_uses_the_stored_operator_name(self, client, auth_headers):
        client.put("/api/profile", json={"name": "Marcus"}, headers=auth_headers)
        body = client.post(
            "/api/llm",
            json={
                "messages": [
                    {"role": "user", "content": "hello"},
                    {"role": "assistant", "content": "hi"},
                    {"role": "user", "content": "rough night"},
                ],
            },
            headers=auth_headers,
        ).json()
        assert "Marcus" in body["content"]


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
    def test_starts_empty(self, client, auth_headers):
        assert client.get("/api/history", headers=auth_headers).json() == []

    def test_create_assigns_an_id_and_timestamps(self, client, auth_headers):
        body = client.post("/api/history", json=SESSION, headers=auth_headers).json()
        assert body["id"]
        assert body["sessionId"] == "thread_alpha"
        assert body["protocolUsed"] == "Resilience Builder Level 3"
        assert all(message["created_at"] for message in body["messages"])

    def test_created_session_is_readable_by_id(self, client, auth_headers):
        created = client.post("/api/history", json=SESSION, headers=auth_headers).json()
        fetched = client.get(f"/api/history/{created['id']}", headers=auth_headers).json()
        assert fetched == created

    def test_summary_shape_matches_the_used_fields(self, client, auth_headers):
        created = client.post("/api/history", json=SESSION, headers=auth_headers).json()
        assert set(created).issuperset({"id", "sessionId", "messages", "createdAt"})

    def test_listing_filters_by_session_id(self, client, auth_headers):
        client.post("/api/history", json=SESSION, headers=auth_headers)
        client.post("/api/history", json={**SESSION, "sessionId": "thread_beta"}, headers=auth_headers)
        assert len(client.get("/api/history", headers=auth_headers).json()) == 2
        filtered = client.get(
            "/api/history", params={"sessionId": "thread_alpha"}, headers=auth_headers
        ).json()
        assert len(filtered) == 1
        assert filtered[0]["sessionId"] == "thread_alpha"

    def test_delete_removes_the_session(self, client, auth_headers):
        created = client.post("/api/history", json=SESSION, headers=auth_headers).json()
        assert client.delete(
            f"/api/history/{created['id']}", headers=auth_headers
        ).status_code == 200
        assert client.get("/api/history", headers=auth_headers).json() == []

    def test_unknown_session_returns_404(self, client, auth_headers):
        assert client.get("/api/history/nope", headers=auth_headers).status_code == 404
        assert client.delete("/api/history/nope", headers=auth_headers).status_code == 404

    def test_unauthenticated_access_is_rejected(self, client):
        assert client.get("/api/history").status_code == 401
        assert client.post("/api/history", json=SESSION).status_code == 401
        assert client.get("/api/history/nope").status_code == 401
        assert client.delete("/api/history/nope").status_code == 401

    def test_sessions_are_isolated_per_device(
        self, client, auth_headers, second_auth_headers
    ):
        """One device can never read, overwrite or delete another device's data."""
        mine = client.post("/api/history", json=SESSION, headers=auth_headers).json()
        theirs = client.post(
            "/api/history", json={**SESSION, "sessionId": "thread_other"},
            headers=second_auth_headers,
        ).json()

        assert [e["id"] for e in client.get("/api/history", headers=auth_headers).json()] == [mine["id"]]
        assert [e["id"] for e in client.get("/api/history", headers=second_auth_headers).json()] == [theirs["id"]]

        # Cross-device access 404s rather than 403s, so ids cannot be probed.
        assert client.get(f"/api/history/{theirs['id']}", headers=auth_headers).status_code == 404
        assert client.delete(f"/api/history/{theirs['id']}", headers=auth_headers).status_code == 404
        assert client.get(f"/api/history/{theirs['id']}", headers=second_auth_headers).status_code == 200

    def test_each_device_starts_from_an_empty_store(
        self, client, auth_headers, second_auth_headers
    ):
        client.post("/api/history", json=SESSION, headers=auth_headers)
        assert client.get("/api/history", headers=second_auth_headers).json() == []


class TestProfileEndpoint:
    def test_get_seeds_a_default_profile(self, client, auth_headers):
        body = client.get("/api/profile", headers=auth_headers).json()
        assert set(body).issuperset(
            {"id", "name", "email", "preferences", "permissions", "createdAt"}
        )
        assert isinstance(body["permissions"], list)

    def test_put_updates_only_the_given_fields(self, client, auth_headers):
        before = client.get("/api/profile", headers=auth_headers).json()
        after = client.put("/api/profile", json={"name": "Kalimike"}, headers=auth_headers).json()
        assert after["name"] == "Kalimike"
        assert after["email"] == before["email"]

    def test_put_merges_preferences(self, client, auth_headers):
        before = client.get("/api/profile", headers=auth_headers).json()
        after = client.put(
            "/api/profile", json={"preferences": {"theme": "midnight"}}, headers=auth_headers
        ).json()
        assert after["preferences"]["theme"] == "midnight"
        assert after["preferences"]["ttsEnabled"] == before["preferences"]["ttsEnabled"]

    def test_put_replaces_permissions_without_duplicates(self, client, auth_headers):
        after = client.put(
            "/api/profile", json={"permissions": ["chat", "chat", "tts"]}, headers=auth_headers
        ).json()
        assert after["permissions"] == ["chat", "tts"]

    def test_unauthenticated_access_is_rejected(self, client):
        assert client.get("/api/profile").status_code == 401
        assert client.put("/api/profile", json={"name": "Nobody"}).status_code == 401
        assert client.post("/api/profile/reset").status_code == 401

    def test_profile_is_scoped_to_the_device(self, client, auth_headers, second_auth_headers):
        client.put("/api/profile", json={"name": "Marcus"}, headers=auth_headers)
        assert client.get("/api/profile", headers=second_auth_headers).json()["name"] != "Marcus"

    def test_profile_id_matches_the_session_subject(self, client, auth_headers):
        body = client.get("/api/profile", headers=auth_headers).json()
        subject = client.get("/api/session/whoami", headers=auth_headers).json()["subject"]
        assert body["id"] == subject

    def test_reset_restores_the_default_profile(self, client, auth_headers):
        client.put("/api/profile", json={"name": "Changed"}, headers=auth_headers)
        assert client.post("/api/profile/reset", headers=auth_headers).json()["name"] == "Operator"


class TestSessionEndpoint:
    def test_issues_a_usable_token_for_a_new_subject(self, client):
        from app.services.auth import verify_token

        body = client.post("/api/session").json()
        assert body["token"] and body["expiresIn"] > 0
        claims = verify_token(body["token"])
        assert claims is not None
        assert claims["sub"] == body["subject"]
        assert body["subject"].startswith("usr_")

    def test_each_call_mints_an_independent_subject(self, client):
        first = client.post("/api/session").json()
        second = client.post("/api/session").json()
        assert first["subject"] != second["subject"]
        assert first["token"] != second["token"]

    def test_refresh_reissues_for_the_same_subject(self, client):
        created = client.post("/api/session").json()
        refreshed = client.post("/api/session/refresh", json={"token": created["token"]}).json()
        assert refreshed["subject"] == created["subject"]
        assert client.get(
            "/api/session/whoami",
            headers={"Authorization": "Bearer " + refreshed["token"]},
        ).json()["subject"] == created["subject"]

    def test_refresh_revokes_the_presented_token(self, client):
        created = client.post("/api/session").json()
        refreshed = client.post("/api/session/refresh", json={"token": created["token"]})
        assert refreshed.status_code == 200
        # The superseded token no longer authorizes; the replacement does.
        assert client.get(
            "/api/session/whoami",
            headers={"Authorization": "Bearer " + created["token"]},
        ).status_code == 401
        assert client.get(
            "/api/session/whoami",
            headers={"Authorization": "Bearer " + refreshed.json()["token"]},
        ).status_code == 200

    def test_refresh_rejects_garbage(self, client):
        assert client.post("/api/session/refresh", json={"token": "nope"}).status_code == 401

    def test_refresh_accepts_a_recently_expired_token(self, client, monkeypatch):
        from app.core import config as config_module
        from app.services import auth

        created = client.post("/api/session").json()
        claims = auth.verify_token(created["token"], allow_expired=True)
        stale = auth.create_token(claims["sub"], ttl=-60)
        monkeypatch.setattr(config_module.settings, "auth_refresh_grace", 3600, raising=False)
        refreshed = client.post("/api/session/refresh", json={"token": stale})
        assert refreshed.status_code == 200
        assert refreshed.json()["subject"] == created["subject"]

    def test_refresh_rejects_a_token_beyond_the_grace_window(self, client, monkeypatch):
        from app.core import config as config_module
        from app.services import auth

        created = client.post("/api/session").json()
        claims = auth.verify_token(created["token"], allow_expired=True)
        stale = auth.create_token(claims["sub"], ttl=-7200)
        monkeypatch.setattr(config_module.settings, "auth_refresh_grace", 60, raising=False)
        assert client.post("/api/session/refresh", json={"token": stale}).status_code == 401

    def test_whoami_requires_a_token(self, client):
        assert client.get("/api/session/whoami").status_code == 401
