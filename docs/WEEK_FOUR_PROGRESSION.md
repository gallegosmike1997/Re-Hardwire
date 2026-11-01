# Re-Hardwire — Week 4 Application Progression & Final Release Candidate (RC) Roadmap

Following the completion of Week 3 (offline Lab routing fallback, air-gapped QR sync modal, and accessibility polish), **Week 4** focuses on production release candidate (RC) hardening, official keystore signing setup, Google Play Console compliance, and final distribution readiness.

---

## 1. Production Keystore Signing Configuration
- **Gradle Signing Properties**: Configuring secure release signing credentials (`signingConfigs.release`) in `android/app/build.gradle` and `gradle.properties` for production distribution.
- **Artifact Verification**: Ensuring generated `.aab` bundles and `.apk` installers are correctly signed with release keys.

---

## 2. Google Play Console & Policy Compliance
- **Data Safety Disclosures**: Documenting local-first data storage (support plans, boundaries, care network contacts) and optional backend coaching communication per Google Play data safety guidelines.
- **Target API & Permission Hygiene**: Verifying target SDK compliance and runtime permissions (microphone/audio for voice input and TTS playback).

---

## 3. End-to-End Smoke Testing & Quality Assurance
- **Offline Resilience Verification**: Testing complete app workflows (dashboard pulse check, guided tools, support plan worksheet, relationship boundaries, QR sync modal, and offline lab routing) without an active internet connection.
- **Device & Form Factor Validation**: Verifying responsive layout scaling across mobile and tablet viewports.

---

## 4. Week 4 Action Checklist
- [x] Week 1: Offline-First Foundation & Protocol Ladder
- [x] Week 2: Relationship Boundaries, Care Network & Encrypted Backups
- [x] Week 3: Offline Lab Routing & Air-Gapped QR Sync Modal
- [ ] Production Release Signing Configuration (`app/build.gradle`)
- [ ] Google Play Console Store Readiness & Data Safety Review
- [ ] Final Signed Release Candidate (RC) AAB Bundle Generation
