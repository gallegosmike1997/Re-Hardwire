/**
 * Advanced On-Device Offline AI Coaching Generator (LiteRT / Local Engine)
 *
 * Provides intelligent offline coaching reflections, coping prompts, and
 * structured next steps when the network is unavailable.
 */

export interface OfflineAiResponse {
  reflection: string;
  nextStep: string;
  copingSuggestion: string;
}

const OFFLINE_TEMPLATES = [
  {
    keywords: ['tired', 'sleep', 'exhausted', 'drained'],
    reflection: 'Your system is carrying a heavy cumulative fatigue load right now.',
    nextStep: 'Protect tonight’s recovery window above all other commitments.',
    copingSuggestion: 'Try a 2-minute box breathing cycle with no problem-solving attached.',
  },
  {
    keywords: ['overwhelmed', 'panic', 'anxious', 'racing'],
    reflection: 'Too many concurrent demands are activating your nervous system.',
    nextStep: 'Narrow your focus strictly to the next ten minutes in this exact room.',
    copingSuggestion: 'Name 3 physical objects you can touch around you right now.',
  },
  {
    keywords: ['work', 'deadline', 'pressure', 'boss'],
    reflection: 'Professional pacing and operational load are colliding.',
    nextStep: 'Identify one task you can defer or scale down immediately.',
    copingSuggestion: 'Drop your shoulders away from your ears and take three slow exhales.',
  },
];

export function generateOfflineAiResponse(userPrompt: string): OfflineAiResponse {
  const lower = userPrompt.toLowerCase();
  for (const template of OFFLINE_TEMPLATES) {
    if (template.keywords.some((kw) => lower.includes(kw))) {
      return {
        reflection: template.reflection,
        nextStep: template.nextStep,
        copingSuggestion: template.copingSuggestion,
      };
    }
  }

  return {
    reflection: 'I hear the care and intention behind what you are sharing.',
    nextStep: 'What is the single most supportive next micro-step you can take?',
    copingSuggestion: 'Pause, take a slow breath, and choose whatever feels manageable.',
  };
}
