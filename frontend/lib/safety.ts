/**
 * Client-side crisis language detection.
 * Mirrors backend/app/core/llm/client.py CRISIS_TERMS so the UI can
 * surface help BEFORE a message is sent. Keyword-based only - can miss
 * wording, never blocks sending, never diagnoses.
 */

export const CRISIS_TERMS = [
  'kill myself',
  'end my life',
  'suicide',
  'suicidal',
  'self harm',
  'self-harm',
  'hurt myself',
  'no reason to live',
  'better off dead',
] as const;

export function containsCrisisLanguage(text: string): boolean {
  const lowered = text.toLowerCase();
  return CRISIS_TERMS.some((term) => lowered.includes(term));
}
