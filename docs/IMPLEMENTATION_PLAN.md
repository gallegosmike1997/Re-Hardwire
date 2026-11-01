# Implementation Plan: Production-Ready Sign-In, Per-User Storage, Abuse Controls & Signed Android Build

**Goal:** Build the signed, Play Store-ready Android release of Re-Hardwire with real identity, per-user encrypted storage, deletion/retention rules, abuse controls, and a passed security review.

**Status:** Planning — ready to implement

**Prerequisite:** All work lands via `beta → main` pull requests (see `pre-push` hook). No direct pushes to `main`.

---

## 1. Authentication & Sign-In (Identity)

### Current state
- Anonymous device-scoped sessions via self-signed HMAC tokens (`app/services/auth.py`)
- No user registration, login, or logout
- Tokens have no real identity provider, no key rotation, in-memory-only revocation
- `APP_ENV=production` startup is blocked until identity is implemented

### Target state
- OIDC/OAuth2 identity provider integration (e.g., Auth0, Firebase Auth, Keycloak, or Cognito)
- User registration, email/password login, social login (optional), logout
- JWT access tokens + refresh tokens with proper expiration and rotation
- Token revocation persisted (not in-memory)
- Optional MFA
- Per-user identity claim (`sub`) enforced on all private routes

### Tasks
| # | Task | Details |
|---|------|---------|
| 1.1 | Add auth provider abstraction | Interface for `verify_id_token()`, `register_user()`, `login_user()`, `revoke_tokens()` |
| 1.2 | Implement OIDC/OAuth2 backend | Verify ID tokens from configured issuer; map `sub` to internal subject |
| 1.3 | Add register/login/logout endpoints | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` |
| 1.4 | Add JWT refresh + revocation | Persisted refresh tokens; revocation list backed by DB (not in-memory set) |
| 1.5 | Add MFA enrollment/verification (optional) | TOTP-based MFA; optional per-user |
| 1.6 | Update `require_session` dependency | Accept OIDC-verified claims; reject anonymous HMAC tokens in production |
| 1.7 | Frontend sign-in UI | Login/register forms, token storage in secure storage (not localStorage), auth state |
## 2. Per-User Encrypted Storage

### Current state
- JSON files in `backend/data/` (`history.json`, `profile.json`, `analytics.json`)
- Per-user directories under `backend/data/users/<subject>/` but still unencrypted JSON
- No field-level encryption, no database, no row-level security

### Target state
- PostgreSQL (or SQLite for local dev) with `pgcrypto` for field-level encryption
- Per-user tables/rows with RLS (row-level security) policies
- Encryption at rest for profile fields, history messages, analytics
- Migration path from legacy JSON files to database
- Zero-knowledge option: client-side encryption keys so backend cannot read content

### Tasks
| # | Task | Details |
|---|------|---------|
| 2.1 | Add database abstraction layer | SQLAlchemy or asyncpg; connection pooling; migration tooling (Alembic) |
| 2.2 | Define user, profile, history, audit tables | UUID primary keys; `subject_id` FK; encrypted text fields |
| 2.3 | Implement field-level encryption | `pgcrypto` `pgsymmetric_encrypt` / application-layer AES-256-GCM |
| 2.4 | Enable Row-Level Security | Policies so `subject_id = current_subject` only |
| 2.5 | Migrate legacy JSON data | One-time import script; verify integrity; delete legacy files after |
| 2.6 | Add zero-knowledge client-side encryption option | Client generates wrapping key; server stores only ciphertext |
| 2.7 | Add backup/restore for per-user data | Encrypted backup API; point-in-time recovery support |

## 3. Deletion & Retention Rules

### Current state
- `DELETE /api/history/{entry_id}` deletes a session
- `POST /api/profile/reset` restores default profile
- Settings page can export/clear local data
- No automated retention, no cascade through backups, no GDPR-style deletion

### Target state
- User-initiated "delete my account" that cascades through all data stores
- Automated retention schedules (e.g., delete transcripts after 90 days unless flagged)
- Deletion guarantees across primary DB, backups, logs, replicas
- Export-before-delete workflow
- Retention policy configuration per data type

### Tasks
| # | Task | Details |
|---|------|---------|
| 3.1 | Add `DELETE /api/auth/account` | Cascade-delete user's profile, history, analytics, sessions, tokens |
| 3.2 | Add retention scheduler | Background job (APScheduler or cron) enforcing retention per data type |
| 3.3 | Add retention config | `RETENTION_HISTORY_DAYS`, `RETENTION_ANALYTICS_DAYS`, `RETENTION_LOGS_DAYS` |
| 3.4 | Add export-before-delete | `GET /api/auth/export` returns all user data in portable JSON |
| 3.5 | Add deletion audit log | Immutable append-only log of who deleted what and when |
| 3.6 | Add backup deletion cascade | Ensure deleted data is removed from backups within retention window |

## 4. Abuse Controls

### Current state
- Per-process rate limit: 60 req/min per client IP for LLM/route/TTS
- Not distributed — fails across multiple instances
- Request body cap: 1 MiB
- No failed-attempt lockout, no per-user limits, no IP reputation

### Target state
- Distributed rate limiting (Redis-backed) shared across instances
- Per-user + per-IP rate limits
- Failed authentication lockout (exponential backoff)
- Request size caps preserved and extended
- Abuse detection and automated temporary bans

### Tasks
| # | Task | Details |
|---|------|---------|
| 4.1 | Replace rate-limit middleware with distributed backend | Redis-backed sliding window; fallback to per-process if Redis unavailable |
| 4.2 | Add per-user rate limits | Separate buckets for authenticated vs anonymous users |
| 4.3 | Add auth failure lockout | Track failed login attempts; lock after N failures with exponential backoff |
| 4.4 | Add abuse detection | Detect rapid-fire requests, credential stuffing, pattern abuse; auto-ban IPs |
| 4.5 | Add abuse admin endpoint | `GET /api/admin/abuse` (admin-only) to review and lift bans |
| 4.6 | Add CAPTCHA challenge on repeated failures | Optional hCaptcha/reCAPTCHA integration for signup/login |

## 5. Security Review & Production Readiness

### Current state
- `APP_ENV=production` raises RuntimeError at startup
- CORS wildcard rejected; explicit origins required
- Security headers set (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- No TLS enforcement, no audit logging, no incident response plan
- Backend stores data in unencrypted JSON

### Target state
- Production startup path enabled after all safeguards reviewed
- TLS 1.2+ enforced; HSTS; certificate pinning on mobile
- Full audit logging with request IDs; PII redacted
- Backup verification and restoration drills
- Published incident response plan
- Penetration testing checklist completed

### Tasks
| # | Task | Details |
|---|------|---------|
| 5.1 | Add structured audit logging | Request IDs, actor subject, action, outcome; PII redacted before storage |
| 5.2 | Add production config validation | Fail fast if required secrets, TLS, DB, rate-limit backend missing |
| 5.3 | Enable production startup path | Remove RuntimeError gate once items 1-4 and 5.1-5.2 are implemented |
| 5.4 | Add TLS termination config | Nginx/Traefik or cloud load balancer; HSTS header |
| 5.5 | Add health/readiness endpoints | `/healthz`, `/readyz` for orchestration |
| 5.6 | Create security review checklist | Sign-off required before `APP_ENV=production` |
| 5.7 | Publish privacy policy & terms | Required for Play Store; data safety section |

## 6. Signed Play Store Android Build

### Current state
- Debug builds allow cleartext HTTP to localhost/10.0.2.2
- Release build has `minifyEnabled false`, no signing config
- `versionCode 1`, `versionName "1.0"`
- No `google-services.json`, no signing keystore
- `targetSdkVersion 37`, `compileSdkVersion 37`, `minSdkVersion 24`
- `android:allowBackup="true"` on release (risky)
- `android:exported="true"` on MainActivity

### Target state
- Signed release APK/AAB with upload keystore
- Release build: minification, ProGuard/R8, shrinking
- Cleartext traffic blocked on release; no debug overlay
- `allowBackup="false"` on release
- Proper version codes for Play Store upgrade path
- Privacy policy URL in manifest/metadata
- Data Safety section completed for Play Console
- App Signing by Google Play enabled

### Tasks
| # | Task | Details |
|---|------|---------|
| 6.1 | Generate upload keystore | `keytool -genkeypair`; store keystore securely (not in repo) |
| 6.2 | Configure signingConfigs | `release` signing in `app/build.gradle`; keystore path/aliases from env |
| 6.3 | Enable release optimizations | `minifyEnabled true`, `shrinkResources true`, ProGuard rules |
| 6.4 | Production network security config | Release `network_security_config.xml` with no cleartext; pin production API domain |
| 6.5 | Set `allowBackup="false"` on release manifest | Prevent backup-based data extraction |
| 6.6 | Bump versionCode/versionName | Follow Play Store versioning scheme |
| 6.7 | Add privacy policy metadata | `meta-data` for privacy policy URL; link in Play Console |
| 6.8 | Configure App Signing by Google Play | Opt-in at Play Console; upload signing key |
| 6.9 | Build and test signed release APK/AAB | `./gradlew bundleRelease`; install and test on device |
| 6.10 | Complete Play Console Data Safety section | Declare data collection, encryption, account types |

## Implementation Order (Recommended)

1. **Week 1: Identity foundation** — Tasks 1.1–1.4, 2.1–2.4 (auth + DB storage)
2. **Week 2: Data controls** — Tasks 2.5–2.7, 3.1–3.6 (migration + deletion/retention)
3. **Week 3: Abuse controls** — Tasks 4.1–4.6 (distributed rate limiting + lockout)
4. **Week 4: Security review** — Tasks 5.1–5.7 (audit logging, prod config, privacy policy)
5. **Week 5: Android release** — Tasks 6.1–6.10 (signing, release build, Play Store)

Each week ends with a `beta → main` PR and CI validation.

## Definition of Done (per work item)

- [ ] Code implemented and unit-tested (`pytest` backend)
- [ ] Security review self-checklist completed
- [ ] PR opened from `beta` to `main` with CI passing
- [ ] PR reviewed and merged via GitHub branch protection
- [ ] Release branch tagged and deployed to staging for validation

## 7. Device Sensors, Biometrics, Connected Wearables & Conversation Context

### Scope
Add optional, consent-gated access to device sensors and connected wearables (smart rings, watches) so the app can use biometric and contextual signals (heart rate, body temperature, movement, camera-derived emotion cues) as **user-specific, local-first context** when the user communicates with the coach. No raw sensor or image data is ever sent to the backend unless the user explicitly opts in; processing happens on-device where possible.

### Why this matters
A user saying "I'm fine" while their heart rate is elevated and their voice is strained is communicating something different than the same words spoken calmly. Sensors provide optional corroborating context so the AI can respond more helpfully — never as a clinical assessment, always as a gentle, optional signal the user controls.

### Current state
- No sensor access; app is screen-only
- No camera permissions
- No Health Connect or Wear OS integration
- No biometric data collection of any kind

### Target state
- Optional Android sensor access (accelerometer, gyroscope, heart rate sensor if available, temperature sensor if available)
- Health Connect API integration for wearable data (heart rate, body temperature, sleep, stress) from smart rings/watches
- Optional selfie camera during coach conversation for on-device emotion/affect visualization (faces processed locally, raw frames never stored or transmitted)
- Biometric/health data encrypted at rest, stored per-user, opt-in only
- Clear consent before each sensor category is enabled; revocable at any time
- No clinical claims: sensor data is context, not diagnosis

### Tasks
| # | Task | Details |
|---|------|---------|
| 7.1 | Add sensor permissions to Android manifest | `BODY_SENSORS`, `ACTIVITY_RECOGNITION`, `CAMERA` — declared as optional, requested at runtime only when user opts in |
| 7.2 | Build Android sensor service | Wrapper around `SensorManager` for accelerometer, gyroscope, ambient temperature, heart rate (hardware-dependent); exposes readings to Flutter/Dart via MethodChannel |
| 7.3 | Integrate Health Connect API | Read heart rate, body temperature, sleep, and stress data from connected wearables (smart rings, watches); require user permission via Health Connect |
| 7.4 | Add CameraX selfie integration | Optional front-camera preview during coach chat; frames processed on-device only for emotion/affect cues; no raw frames saved to disk or sent to server |

### Privacy & safety boundaries
- **Opt-in only**: Every sensor category is disabled by default; enabling requires explicit user consent with plain-language explanation
- **No clinical claims**: Sensor data is context for conversation, never a diagnosis, symptom score, or triage signal; crisis resources remain unconditional and prominent
- **Local-first processing**: Camera emotion analysis runs on-device; raw frames never leave the device
- **Minimal context injection**: Only aggregated labels (e.g., "elevated_heart_rate") are sent to the LLM, never raw sensor values or images
- **User ownership**: Biometric data is per-user, encrypted, and deleted on account deletion; exportable by the user on request
- **No advertising/profiling**: Sensor data is never used for ads, never shared with third parties, never used to build profiles beyond the individual user's own app experience

### Technical notes
- Android `Health Connect` requires Android 14 (API 34) or the Health Connect backport on older versions; plan for graceful degradation
- CameraX is the recommended camera API; use `ProcessCameraProvider` with front-facing camera, `ImageAnalysis` use case for on-device ML
- MediaPipe Face Landmarker or TensorFlow Lite emotion model (~5-10MB) bundled in the APK; increases app size — consider dynamic feature module
- `BODY_SENSORS` permission is a "dangerous" runtime permission; must justify clearly in rationale dialog
- Wear OS companion app is out of scope for v1; Health Connect phone-side integration is the v1 target

### Definition of done
- [ ] Sensor permissions declared and requested at runtime with rationale
- [ ] Health Connect integration reads wearable data with user permission
- [ ] CameraX selfie preview available during coach chat (opt-in)
- [ ] On-device emotion analysis produces affect labels without storing frames
- [ ] Biometric context injected into coach chat as aggregated labels only
- [ ] Consent/revocation UI in Settings with per-sensor toggles
- [ ] Biometric data encrypted at rest, purged on TTL and account deletion
- [ ] Separate security review completed before shipping any biometric feature
- [ ] No raw images or raw sensor streams transmitted to backend

