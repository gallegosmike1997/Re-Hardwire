import type { LegalSection } from './legal';

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'medical',
    heading: 'A. Medical disclaimer - not medical advice',
    body: [
      'All content, including practices, support-plan worksheet, routing labels (stable, activated, overwhelmed), scores, and chat replies, is general information only and is NOT medical, psychiatric, or counseling advice, diagnosis, or treatment.',
      'Use does NOT create a doctor-patient or therapist-client relationship. We are not your provider.',
      'Practices are brief human adaptations of U.S. VA self-help materials. The VA has not endorsed Re-Hardwire. No independent licensed clinician has reviewed these adaptations (pack v1.0.0, independent_review_pending).',
      'Never disregard professional advice or delay seeking it because of the app. Not for PTSD, depression, anxiety, bipolar, eating, substance use, psychosis, or acute conditions. The support plan is a self worksheet, not a clinical safety plan.',
    ],
  },
  {
    id: 'emergency',
    heading: 'B. Emergency - no monitoring, no rescue',
    body: [
      'Re-Hardwire cannot assess risk, monitor you, alert anyone, or contact emergency services, even if you type crisis language. Detection is keyword-based only and can fail.',
      'U.S.: call or text 988 now, or text HOME to 741741. Call 911 or go to emergency if you may act. UK: call 111 / Samaritans 116 123. Elsewhere: local emergency number now.',
      'Calling/texting needs phone or network service. Tell one person near you, out loud, right now.',
    ],
  },
  {
    id: 'beta',
    heading: 'C. Beta software - experimental',
    body: [
      'Pre-release beta: errors and breaking changes possible. Backend is a local prototype with shared JSON files, no login, no per-user isolation, and refuses production mode.',
      'Chat defaults to human scripts. Optional AI replies need your own backend config. Offline tools work on-device; chat/sync need a configured backend plus internet (not provisioned publicly). Mobile builds are unsigned debug/simulator only.',
    ],
  },
  {
    id: 'warranty',
    heading: 'D. No warranties',
    body: [
      'To the maximum extent permitted by law, provided "as is" and "as available" without warranties of any kind, including merchantability, fitness, accuracy, reliability, availability, security, or non-infringement. Use solely at your own risk.',
    ],
  },
  {
    id: 'liability',
    heading: 'E. Limitation of liability',
    body: [
      'To the maximum extent permitted by law, no liability for indirect, incidental, special, consequential, or punitive damages, injury, distress, lost profits or data. Total liability capped at amounts paid for access or $100 USD, whichever is greater.',
      'You assume all risks. If a practice feels destabilizing, stop and seek in-person support.',
    ],
  },
  {
    id: 'eligibility',
    heading: 'F. Eligibility',
    body: [
      'Adults 18+ only (or age of majority). Not for children under 13. Ages 13-17 only with supervising parent/guardian who read this. Do not use while driving or operating machinery.',
    ],
  },
  {
    id: 'privacy',
    heading: 'G. Privacy and data limits',
    body: [
      'Local storage is not encrypted. Anyone with your unlocked device/profile can read it. Exports are readable JSON. Clearing app data does not delete records already sent to a backend.',
      'No production privacy guarantees yet, no HIPAA compliance claimed. Online chat sends each message to the configured service. No clinician sharing; clinical review is disabled.',
    ],
  },
  {
    id: 'ai',
    heading: 'H. AI disclosure',
    body: [
      'Code, logo, and practices are human-authored. AI appears only as optional runtime coach replies if you configure a provider. Outputs can be wrong. Do not rely on AI in crisis.',
    ],
  },
  {
    id: 'ip',
    heading: 'I. Sources and IP',
    body: [
      'Practices adapt U.S. VA public materials (generally public domain as federal works). Attribution is not endorsement. Re-Hardwire name, logo, code, and design belong to the creator. Do not imply government affiliation.',
    ],
  },
];
