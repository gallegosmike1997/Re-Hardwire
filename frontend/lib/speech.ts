/** Helpers for choosing among speech voices supplied by the current device. */
export const SYSTEM_SPEECH_LANGUAGE = 'system';
export const DEFAULT_SPEECH_RATE = 0.95;

export function getSpeechRate(value: unknown): number {
  return typeof value === 'number' && value >= 0.75 && value <= 1.25
    ? value
    : DEFAULT_SPEECH_RATE;
}

export function getSpeechLanguage(value: unknown, fallback: string): string {
  return typeof value === 'string' && value && value !== SYSTEM_SPEECH_LANGUAGE
    ? value
    : fallback;
}

function languageMatches(voiceLanguage: string, requestedLanguage: string): boolean {
  const voiceTag = voiceLanguage.toLowerCase();
  const requestedTag = requestedLanguage.toLowerCase();
  return voiceTag === requestedTag || voiceTag.split('-')[0] === requestedTag.split('-')[0];
}

function qualityScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (/natural|neural|premium|enhanced/i.test(voice.name)) score += 10;
  if (voice.localService) score += 2;
  if (voice.default) score += 1;
  return score;
}

/** Prefer the selected voice, then a richer local voice in the chosen dialect. */
export function chooseSpeechVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
  voiceURI?: string,
): SpeechSynthesisVoice | undefined {
  const exactLanguage = voices.filter((voice) => voice.lang.toLowerCase() === language.toLowerCase());
  const choices = exactLanguage.length
    ? exactLanguage
    : voices.filter((voice) => languageMatches(voice.lang, language));

  if (voiceURI) {
    const selected = choices.find((voice) => voice.voiceURI === voiceURI);
    if (selected) return selected;
  }

  const localChoices = choices.filter((voice) => voice.localService);
  return [...localChoices].sort((first, second) => qualityScore(second) - qualityScore(first))[0];
}
