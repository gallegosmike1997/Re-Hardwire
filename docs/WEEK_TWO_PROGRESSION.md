# Re-Hardwire — Week 2 Application Progression & Roadmap

Building upon the successful Phase 1 rollout (offline-first guided library, local storage, 5-level protocol ladder, relationship boundaries, care plan network tracker, and Capacitor Android packaging), **Week 2** focuses on advanced protocol intelligence, data security hardening, clinical content review preparation, and beta distribution workflows.

---

## 1. Advanced Protocol Intelligence & Adaptive Pacing
- **Dynamic State Calibration**: Refine signal extraction rules in `lib/offlineRouting.ts` to adaptively adjust protocol recommendations based on user engagement frequency and historical success logs (`successStore`).
- **Personalized Pacing**: Introduce gentle recovery prompts when high-intensity protocols (Level 4/5) are triggered consecutively without adequate rest intervals.

---

## 2. Care Plan & Network Security Hardening
- **Encrypted Local Backups**: Implement client-side encryption (`lib/encryptedBackup.ts`) for support plans and relationship boundary settings so exported backups remain secure.
- **Support Network Quick-Dial**: Integrate secure URI intents for quick-dial/messaging of verified care plan network contacts (with explicit user consent and local privacy safeguards).

---

## 3. Clinical Review & Compliance Readiness
- **Clinical Content Review Packet**: Finalize documentation in `docs/CLINICAL_REVIEW_PACKET.md` and `docs/CLINICAL_CONTENT.md` mapping guided practices to source-linked self-help literature.
- **Accessibility & UI Polish**: Conduct WCAG 2.1 AA audits across mobile and tablet form factors, optimizing screen reader announcements and touch targets.

---

## 4. Beta Distribution & Play Store Rollout
- **Google Play Internal Testing**: Configure release signing keys (`app/build.gradle`), generate signed `.aab` bundles, and distribute builds via Google Play Internal Testing tracks.
- **Performance Profiling**: Use Android Studio Profiler to monitor memory usage and ensure zero jank across Compose/Capacitor WebView transitions.
- **Telemetry & Error Reporting**: Optional integration with Firebase Crashlytics for opt-in stability telemetry in beta builds.

---

## 5. Week 2 Action Checklist
- [x] Phase 1 Core Features & Capacitor Android Shell
- [x] Relationship Boundaries & Care Plan Network Tracker
- [x] Social Sign-On (Google, GitHub, Facebook) & Profile Sync
- [ ] Encrypted Export & Backup of Support Plans
- [ ] Google Play Internal Testing Track Upload & Verification
