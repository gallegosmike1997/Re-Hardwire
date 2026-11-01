# Re-Hardwire — Week 3 Application Progression & Roadmap

Following the successful completion of Week 2 (encrypted local backups, care network quick-dial communication intents, and relationship statistics), **Week 3** focuses on advanced coaching intelligence, QR-based peer/device sync, accessibility polish, and production release candidate (RC) hardening.

---

## 1. Advanced Protocol Routing Lab UI (`/lab`)
- **Semantic Score Inspection**: Expose confidence scores, signal vector breakdowns, and active protocol matching criteria in the developer/lab surface.
- **Weight Tuning Sandbox**: Interactive sliders allowing clinicians or power users to adjust routing threshold weights locally and test custom prompt scenarios.

---

## 2. Peer-to-Peer Encrypted QR Transfer (`lib/qrSync.ts`)
- **Air-Gapped Backup Sharing**: Generate secure QR codes encoding encrypted local backup bundles (support plan, boundaries, and care network contacts) for direct device-to-device transfer without cloud dependency.
- **QR Code Scanner Integration**: Built-in camera scanner utility enabling instant restoration of support plans and care networks on a new device.

---

## 3. Accessibility (a11y) & Localization Polish
- **WCAG 2.1 AA Audit**: Comprehensive contrast, focus ring (`hw-focus`), and ARIA label verification across all mobile and tablet form factors.
- **Dynamic Font Scaling & Motion**: Respect system text size preferences and `prefers-reduced-motion` settings app-wide.

---

## 4. Production Release Candidate (RC) Hardening
- **ProGuard & R8 Optimization**: Refine obfuscation and keep rules (`proguard-rules.pro`) for production release builds.
- **Release Keystore Signing**: Configure secure production keystore signing for Google Play Console deployment.
- **Final Security Review**: Validate local storage boundaries, session HMAC token isolation, and offline fallback resilience.

---

## 5. Week 3 Action Checklist
- [ ] Protocol Routing Lab UI Enhancements (`/lab`)
- [ ] QR-Based Encrypted Backup & Transfer (`lib/qrSync.ts`)
- [ ] WCAG 2.1 AA Accessibility & Screen Reader Audit
- [ ] Production Keystore Signing & Google Play RC Build Verification
