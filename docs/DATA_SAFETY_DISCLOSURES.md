# Google Play Console — Data Safety & Privacy Disclosures

When publishing Re-Hardwire to the Google Play Store, complete the **Data Safety** form with the following disclosures:

## 1. Data Collection & Security
- **Does your app collect or share any user data types?** Yes.
- **Is data encrypted in transit?** Yes (all online communication with the optional coaching backend uses HTTPS/TLS).
- **Is there a way for users to request data deletion?** Yes (users can clear local storage instantly via Settings or reset their profile).

---

## 2. Data Types Collected
- **Personal Info (Name, Email Address)**:
  - *Collected via*: Social Sign-On (Google, GitHub, Facebook) or optional account settings profile entry.
  - *Purpose*: Account functionality and personalization.
  - *Is it collected or shared?* Collected locally and optionally synced with the per-device backend session; never sold or shared with third parties.
- **App Activity (App interactions & routing statistics)**:
  - *Purpose*: Analytics and local protocol routing refinement.

---

## 3. Local-First Data (Not Collected by Developers)
- **Personal Support Plan**: Stored exclusively in local device storage (`localStorage`). Never transmitted to any developer server or cloud storage.
- **Relationship Boundaries & Care Network Contacts**: Stored exclusively on-device.
- **Chat Transcripts**: Kept locally on the device (optional server sync requires explicit user session history permission).
