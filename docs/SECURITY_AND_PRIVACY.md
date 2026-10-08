# Security and privacy notes

## On-device data

The browser app stores profile details, preferences, chat transcripts, wins, and the personal support plan in browser/device local storage. This is convenient for offline use, but the app does not encrypt those entries. Anyone with access to the same unlocked device and browser profile may be able to read them. Only the explicit **Save conversation** action adds a session to saved history; starting a new session discards an unsaved active transcript. Temporary chat keeps the active transcript and draft in memory only; it still sends messages to the configured coach service when online, and it does not delete previously saved conversations or exports. The Settings page can export or clear local Re-Hardwire data and offline app caches.

Clinical conversation review is off: no clinician review service is configured, and conversations are not sent to clinicians. Online coach chat has a separate data flow: a message must be sent to the configured backend/provider to produce its reply. The local transcript is saved on-device; explicitly saving a conversation to backend history is a separate action. This prototype backend has no per-user isolation, so do not use remote history storage for sensitive conversations.

Export creates a readable JSON file. Store it somewhere private and delete it when no longer needed. Clearing local data does not erase records that were already sent to a backend.

## Backend boundary

The current FastAPI backend uses shared JSON files for profile/history and does not enforce production authentication or per-user data isolation. It refuses to start with `APP_ENV=production` or `APP_ENV=prod`; use the default development mode only on a trusted machine. CORS is restricted to configured origins and does not substitute for authentication. Do not expose this backend publicly or use it for real users until the server data model, authorization, transport, retention, deletion, backup, and incident-response behavior have been implemented and reviewed.

On POSIX systems, backend data directories are restricted to the service account and JSON data files are created with owner-only permissions. API responses are marked `no-store`, and the API sets baseline browser security headers. API request bodies are capped at 1 MiB. Browser API requests also opt out of caching, cookies, redirects, and referrer disclosure. The hosted Next.js web service sets baseline security headers; static native builds need their host or WebView to provide applicable headers. Windows deployments must separately verify NTFS ACLs. These measures reduce local exposure; they do not encrypt server data or provide tenant isolation.

Chat, routing, speech, and profile inputs are length/count bounded, caller-supplied system-role messages are rejected, and unknown request fields are rejected on the main data endpoints. The service worker skips responses marked `private`, `no-store`, or `no-cache`, and responses varying by cookie or authorization. Generated audio filenames use random identifiers instead of hashes of spoken text, responses are marked `no-store`, and the local audio cache is capped at 100 files. Public deployment still needs identity verification on every private route, per-user database policies, abuse/rate limits, TLS configuration, backups, deletion guarantees, monitoring, and an incident plan. Configure distributed rate limits after selecting the host and data services; a per-process counter would not protect a multi-instance deployment.

## Secrets

- Keep provider keys in backend environment variables or a deployment secret manager.
- The example `AUTH_SECRET` is empty. Local development generates a temporary random value; production auth needs a stable, randomly generated secret stored outside the repository.
- Never put secrets in frontend code, `NEXT_PUBLIC_*` variables, mobile bundles, screenshots, logs, or source-control history.
- If a key was shared or committed, revoke it in the provider dashboard, review usage, and create a replacement. Removing the text from a chat or file does not revoke a key.
- Use separate least-privilege keys per service where supported.

## Data minimization

Basic guided practices do not require an account or backend. Ask only for information needed for an explicit feature. Camera, Bluetooth, and biometric collection are not enabled in this version. Any future collection needs a clear purpose, separate consent, retention/deletion behavior, and security review before implementation.
