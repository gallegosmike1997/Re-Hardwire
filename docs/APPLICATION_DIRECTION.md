# Application direction

This document outlines where Re-Hardwire is headed over the life of the application. It is a living scope statement, not a shipping guarantee. Every item below must pass security, privacy, and clinical review before it reaches users. Re-Hardwire remains education and self-guided support; it does not diagnose, provide emergency monitoring, or replace care from a qualified professional.

## Long-term vision

Re-Hardwire starts as a mobile-first, offline-capable self-help app with a guided practice library and an optional coach chat backed by a prototype FastAPI service. The long-term direction is to evolve it into a durable, private, zero-cost mental-health support layer that runs primarily on the user's device, syncs only when the user chooses, and never gates core guided practices behind an account, subscription, or paywall.

The app should remain usable without a network connection, without a provider API key, and without creating an account. Cloud features are additive enhancements, not prerequisites.
## Security and privacy roadmap

### Local device
- Encrypt at-rest browser/device storage (IndexedDB / OPFS / Capacitor preferences) with a user-derived key; no plaintext journal entries, transcripts, or support-plan answers on disk.
- Crypto-shredding on "clear data": destroy the wrapping key so rendered ciphertext is unrecoverable, rather than only deleting files.
- Biometric or device-lock gating for opening the app and viewing history (opt-in, never required for core practices).
- Clear, revisable consent before any data leaves the device; separate consent for each sync destination.
- No camera, Bluetooth, microphone, or biometric collection unless a specific feature requests it with its own consent flow.

### Backend boundary (future managed service)
- Replace self-signed HMAC prototype sessions with a managed identity provider (OIDC/OAuth2), short-lived access tokens, refresh rotation, and mandatory MFA options.
- Per-user encrypted database (field-level encryption where feasible); the server must never hold plaintext of conversations or profile answers it does not need to process.
- Transport-layer security only (TLS 1.2+, HSTS, certificate transparency); certificate pinning on Capacitor native builds.
- Role-based access control and tenant isolation; one user cannot read another user's records under any failure mode.
- Audit logging, retention schedules, automated backups, point-in-time recovery, and a published deletion/incident-response policy.
- Refuse to start in production mode until identity, durable encrypted storage, backups, deletion guarantees, monitoring, and an incident plan are reviewed and approved.

### Content and interaction safety
- Crisis resources (e.g., U.S. 988) remain prominent and unremovable; never route crisis language to an LLM without a human-escalation fallback.
- No clinical assessment, symptom scoring, diagnosis, or treatment labeling in client or server code.
- Caller-supplied system messages rejected; request/response size caps preserved; unknown fields rejected on structured endpoints.
- Rate limiting upgraded from per-process counters to shared, distributed limits before any multi-instance deployment.

## Storage roadmap

### Device-local
- Migrate from unencrypted JSON files to an encrypted local store: SQLCipher for SQLite (native) or IndexedDB with a Web Cryptography API wrapping key (web).
- Local-first architecture: writes land on device immediately; sync is a background, user-visible queue that the user can pause, review, or discard.
- Conflict-free or last-writer-wins reconciliation per record type, with user-visible conflict resolution for merged support plans or history entries.
- Incremental encrypted backups to a user-chosen destination (user's own cloud account, local file export, or optional managed service).
- Full data portability: export to open JSON/PDF; import path validated and sandboxed.

### Backend-managed (optional, future)
- Durable per-user store (PostgreSQL with pgcrypto, or equivalent) with row-level security policies tied to verified identity.
- Zero-knowledge option: client-side encryption such that backend operators cannot read conversation content.
- Deletion on request that cascades through backups, logs, and replicas within a defined retention window.

## AI integration and module additions

### Coach chat and on-device intelligence
- Local-first LLM inference (ONNX Runtime, WebLLM, or Ollama) so coach chat works fully offline with no provider key; cloud LLM as an opt-in, user-configured fallback.
- RAG (retrieval-augmented generation) over the user's own support plan, saved practices, and preferences—never over other users' data.
- Crisis keyword detection that short-circuits to static 988/emergency resources instead of generating an LLM response; no automated clinical triage.
- Personalized practice recommendations driven by on-device usage patterns, not server-side profiling or advertising.

### Guided practice modules
- Pluggable practice-pack architecture so new guided packs (sleep, anxiety, grief, substance-use support, crisis safety planning, mood tracking, breathing, grounding) can be added without rebuilding the core.
- Each pack links to public source material, carries its own provenance and review status, and remains optional.
- User-controlled module marketplace or local sideloading of community-reviewed packs, with signature verification before installation.

## User profile and account integrations

- Anonymous device-scoped sessions today; optional upgrade to a named user account without losing local data (anonymous-to-authenticated migration).
- Optional email, magic-link, or SSO sign-in; no social login that harvests profile data beyond what the user explicitly consents to.
- Optional linked caregiver/clinician read-only view, strictly consent-gated, time-bounded, and auditable; clinical review sharing remains disabled until a real service and consent flow exist.
- Cross-device sync of profile preferences, wins, and support plan (never chat transcripts unless the user explicitly opts in).
- Roaming UI preferences (theme, text size, voice, pace) follow the account; local-only data stays local.

## UI/UX feature and visual/interaction improvements

- Design system with dark mode, high-contrast mode, reduced motion, and dynamic type; WCAG AA conformance target with screen-reader testing.
- Capacitor-native polish: gestures, haptics, bottom navigation, native share sheets, and offline-first indicators.
- Guided onboarding that explains offline behavior, data boundaries, and crisis resources before any data collection.
- Mood and check-in journaling with optional visualizations; streaks and badges are opt-in and never used to pressure engagement.
- "Prepare for offline" improvements: granular cache selection, download progress, missing-item reporting, and automatic re-validation when online.
- Crisis panel one-tap access from every screen; cannot be disabled or hidden by settings.
- Localizable UI strings with RTL support; plain-language reading level target.

## New upcoming API features

- Versioned API surface (`/api/v1` frozen contract, additive `/api/v2` evolution); clients ignore unknown fields.
- WebSocket or Server-Sent Events for streaming coach chat and sync status, with HTTP fallback.
- Batch export and import endpoints; structured audit-trail endpoints for account holders.
- Optional consent-gated webhooks for linked caregiver/clinician notification (not message content).
- OpenAPI / schema documentation and a public capabilities endpoint that reports offline availability, network requirements, and privacy boundaries.
- Health, readiness, and version endpoints for deployment operations.
- Structured logging with request IDs; PII redacted before logs leave the device/backend.

## Developer tools and routing adjustments

- Local dev backend proxy with hot reload and request inspection; parity between dev, staging, and production environments.
- E2E test coverage (Playwright or equivalent) for critical user flows: session mint, chat, history save, offline cache, export/clear data.
- Feature flags behind a remote config so risky modules can be toggled without a store review or redeploy.
- Database migration tooling for the managed backend; zero-downtime migration path.
- Rate-limit and quota observability dashboards; distributed rate-limit configuration per deployment.
- Automated CI/CD: frontend lint/type-check/build, backend pytest, Android debug APK and iOS simulator artifacts, Cloudflare Pages preview deployments on non-production branches.
- Routing adjustments: maintain the `beta → main` pull-request flow; no direct pushes to `main`. Branch protection requires PRs and all CI checks before merge.

## Mission statement

I built Re-Hardwire because I ran out of reasons to accept that the tools people need to steady themselves should cost money, require a network connection, or surrender their privacy to a server they do not control. My inspiration comes from seeing how fragile the margin between coping and crisis can be, and how often the people who need a quiet place to breathe, ground, and plan are exactly the ones who cannot afford a subscription, cannot trust an app that phones home, or cannot rely on a signal when they need it most. Re-Hardwire is my answer: an offline-first, mobile-first self-help layer that treats the user's device as the trusted boundary and treats the user's data as theirs alone.

My mission is to ship a guided practice library and optional coach chat that works the first time you open it on a plane, in a dead zone, or on a device with no SIM, and to keep the core of it free forever. I feel an overwhelming obligation to get this app into as many hands as possible—students, workers, caregivers, anyone navigating hard days without a safety net—because no one should have to pay for the ability to regulate their own breathing or write down a safety plan. I will maintain it for free, not as a loss-leader or a data harvest, but because access to basic self-support infrastructure is not a premium feature. Every security boundary, every offline capability, every privacy-preserving design decision exists so that the person using this app never has to wonder who else is watching, paying, or profiting while they try to get through the day. If that means rejecting monetization, rejecting telemetry, and rejecting cloud dependence, then I will reject them, and I will keep this project running as long as I am able.

