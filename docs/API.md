# API surface

The FastAPI prototype exposes an unversioned discovery document at `GET /api` and a versioned, non-personal capability contract at `GET /api/v1/capabilities`.

`/api/v1/capabilities` returns the practice-pack version, offline availability, the network requirement for coach chat, and privacy boundaries. It does not contain user or conversation data. The versioned path is intended for additive API evolution; clients should ignore fields they do not use.

Existing route, chat, TTS, profile, and history endpoints remain under `/api/<name>`. Chat requests accept only user and assistant messages, reject caller-supplied system messages, and cap context at 40 messages and 4,000 characters per message.

### Authentication and per-device isolation

Every private route (`/api/llm`, `/api/llm/stream`, `/api/history`, `/api/profile`) requires an `Authorization: Bearer <token>` header. Obtain a token from `POST /api/session`, which mints an anonymous, device-scoped session and returns `{ token, subject }`. The frontend caches the token on-device, attaches it to every request, and refreshes it once on a `401` before retrying. Refreshing rotates the token: `POST /api/session/refresh` issues a replacement for the same subject and revokes the presented token, so a superseded token no longer authorizes.

The token is a self-signed HMAC session (opaque, no key rotation, no real identity provider) that intentionally still refuses `APP_ENV=production`. Profile and history records are namespaced per verified token subject, so one device cannot read or modify another device's data. Replies are personalised from the caller's own profile: the stored display name is sanitised into the system prompt and explicitly treated as a label, never an instruction.

`GET /api/session/whoami` echoes the verified subject for the presented token. When no API base URL is configured (production and Capacitor builds), the frontend is fully offline-first and performs no session call.

The chat interface reads replies with the browser's Speech Synthesis voices, using the selected device voice, dialect, and pace. Voice availability and quality depend on the browser/operating system; some voices can use its online service. The legacy `/api/tts` route still returns silent placeholder audio and is not used for chat playback.
