# API surface

The FastAPI prototype exposes an unversioned discovery document at `GET /api` and a versioned, non-personal capability contract at `GET /api/v1/capabilities`.

`/api/v1/capabilities` returns the practice-pack version, offline availability, the network requirement for coach chat, and privacy boundaries. It does not contain user or conversation data. The versioned path is intended for additive API evolution; clients should ignore fields they do not use.

Existing route, chat, TTS, profile, and history endpoints remain under `/api/<name>`. Chat requests accept only user and assistant messages, reject caller-supplied system messages, and cap context at 40 messages and 4,000 characters per message. The backend currently stores profile/history in shared JSON files without authentication or per-user isolation. It is a trusted-development prototype, refuses `APP_ENV=production`, and must not be exposed to real users.

The chat interface reads replies with the browser's Speech Synthesis voices, using the selected device voice, dialect, and pace. Voice availability and quality depend on the browser/operating system; some voices can use its online service. The legacy `/api/tts` route still returns silent placeholder audio and is not used for chat playback.
