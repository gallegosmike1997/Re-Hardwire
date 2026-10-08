# API surface

The FastAPI prototype exposes an unversioned discovery document at `GET /api` and a versioned, non-personal capability contract at `GET /api/v1/capabilities`.

`/api/v1/capabilities` returns the practice-pack version, offline availability, the network requirement for coach chat, and privacy boundaries. It does not contain user or conversation data. The versioned path is intended for additive API evolution; clients should ignore fields they do not use.

Existing route, chat, TTS, profile, and history endpoints remain under `/api/<name>`. The backend currently stores profile/history in shared JSON files without authentication or per-user isolation. It is a trusted-development prototype and must not be exposed to real users.
