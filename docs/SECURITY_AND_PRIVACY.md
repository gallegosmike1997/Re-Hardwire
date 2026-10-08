# Security and privacy notes

## On-device data

The browser app stores profile details, preferences, chat transcripts, wins, and the personal support plan in browser/device local storage. This is convenient for offline use, but the app does not encrypt those entries. Anyone with access to the same unlocked device and browser profile may be able to read them. The Settings page can export or clear local Re-Hardwire data.

Export creates a readable JSON file. Store it somewhere private and delete it when no longer needed. Clearing local data does not erase records that were already sent to a backend.

## Backend boundary

The current FastAPI backend uses shared JSON files for profile/history and does not yet enforce production authentication or per-user data isolation. Run it only on a trusted development machine. CORS restrictions are not a substitute for authentication. Do not expose this backend publicly or use it for real users until the server data model, authorization, transport, retention, deletion, backup, and incident-response behavior have been reviewed.

## Secrets

- Keep provider keys in backend environment variables or a deployment secret manager.
- Never put secrets in frontend code, `NEXT_PUBLIC_*` variables, mobile bundles, screenshots, logs, or source-control history.
- If a key was shared or committed, revoke it in the provider dashboard, review usage, and create a replacement. Removing the text from a chat or file does not revoke a key.
- Use separate least-privilege keys per service where supported.

## Data minimization

Basic guided practices do not require an account or backend. Ask only for information needed for an explicit feature. Camera, Bluetooth, and biometric collection are not enabled in this version. Any future collection needs a clear purpose, separate consent, retention/deletion behavior, and security review before implementation.
