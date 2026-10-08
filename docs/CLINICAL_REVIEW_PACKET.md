# External content review packet

**Status: not yet reviewed.** This packet is a preparation checklist for an independent reviewer. It does not provide clinical approval, validate the routing model, or make Re-Hardwire a treatment service.

## Review requested

Review the self-help practice adaptations and user-facing safety language for accuracy, scope, readability, accessibility, and potential harm. Review the coach prompt and scripted response patterns separately from the sourced practice library. The app currently makes no diagnosis and does not provide emergency monitoring.

Ask a licensed behavioral-health clinician with experience relevant to the reviewed content to assess clinical accuracy and safety. Ask a separate lived-experience reviewer to assess tone, usability, accessibility, and whether the practices feel understandable and optional. Record the two reviews separately; lived-experience feedback is not clinical sign-off.

## Materials to provide

- The exact app build and commit identifier under review.
- [Clinical content policy and source register](CLINICAL_CONTENT.md).
- The practice library and the current support-plan worksheet.
- The coach system prompt, local scripted responses, routing labels, and crisis wording.
- [Security and privacy notes](SECURITY_AND_PRIVACY.md), including the fact that public multi-user service safeguards are not complete.
- A short synthetic test transcript set. Do not provide real user conversations or ask reviewers to enter personal health information.

Record a version or checksum for each reviewed artifact. If any reviewed wording changes, mark the review as stale until the reviewer decides whether another review is needed.

## Review checklist

- Are the source passages represented accurately and attributed clearly?
- Are instructions optional, brief, plain-language, and easy to stop?
- Could any practice be unsuitable or destabilizing for a likely user? Are exclusions or alternatives clear?
- Does the crisis wording identify its geographic limits and avoid implying assessment, monitoring, or contact with emergency services?
- Could routing labels or coach replies be mistaken for diagnosis, therapy, or a personalized clinical plan?
- Are accessibility, language, culture, and disability considerations addressed?
- Are online processing, device storage, deletion, and sharing descriptions accurate and understandable?
- What content must change before any clinical-validity claim or clinician-facing feature is considered?

## Findings record

| Field | Record |
| --- | --- |
| Reviewer name |  |
| Credentials and relevant experience |  |
| Jurisdiction and license verification method |  |
| Conflict-of-interest statement |  |
| Reviewer type | Clinical / lived experience |
| App version and commit |  |
| Content/version identifiers reviewed |  |
| Review date |  |
| Findings and severity |  |
| Required changes |  |
| Re-review required | Yes / No |
| Reviewer disposition | Pending / Changes requested / Reviewed with conditions / Complete |

## Release gate

Keep clinical-review claims and conversation-sharing features disabled until the relevant independent review, user consent flow, privacy/security review, retention/deletion policy, and reviewer agreement are complete. A content review does not authorize sharing private user conversations with that reviewer.
