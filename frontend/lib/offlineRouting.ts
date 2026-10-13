/**
 * Offline-First Local Routing and Personalized Response Engine
 *
 * Runs entirely on-device (TypeScript) when the backend is unreachable or offline,
 * providing rule-based signal extraction, emotional reads, protocol selection,
 * and personalized coaching responses.
 */

export interface LocalRouteResult {
  emotionalState: 'stable' | 'activated' | 'overwhelmed' | 'depleted' | 'numb' | 'mixed';
  signals: {
    stress: number;
    clarity: number;
    energy: number;
    momentum: number;
    support: number;
    avoidance: number;
  };
  protocol: {
    name: string;
    level: number;
    focus: string;
    description: string;
  };
  nextAction: string;
  personalResponse: string;
}

const LEXICON: Record<string, string[]> = {
  stress: [
    'overwhelmed', 'anxious', 'anxiety', 'panic', 'panicking', 'stressed', 'stress',
    'pressure', 'burnt out', 'burnout', 'spiral', 'spiralling', 'dread', 'scared',
    'afraid', 'fear', 'racing', 'tense', 'on edge', 'snapping', 'too much', 'drowning',
  ],
  clarity: [
    'clear', 'focused', 'focus', 'know what', 'plan', 'understand', 'decided',
    'decision', 'priority', 'step by step', 'mapped out', 'figured out', 'makes sense',
  ],
  energy: [
    'energised', 'energized', 'motivated', 'awake', 'fresh', 'rested', 'ready', 'charged',
  ],
  momentum: [
    'started', 'progress', 'on track', 'finished', 'done', 'momentum', 'keep going',
    'streak', 'completed', 'achieved', 'win', 'moving forward',
  ],
  support: [
    'friend', 'family', 'partner', 'team', 'therapist', 'coach', 'support', 'helped',
    'someone', 'reached out', 'not alone',
  ],
  avoidance: [
    'later', 'tomorrow', 'procrastinating', 'avoiding', 'avoid', 'putting off',
    'cant face', "can't face", 'ignoring', 'delaying', 'distracted', 'doomscrolling',
  ],
};

const DEPLETION_TERMS = ['tired', 'exhausted', 'empty', 'drained', 'flat', 'no energy', 'wiped', 'spent', 'sleepless'];
const NUMB_TERMS = ['numb', 'blank', 'hollow', 'disconnected', 'dont care', "don't care", 'nothing matters'];

export function computeLocalRoute(userText: string): LocalRouteResult {
  const lower = userText.toLowerCase();
  const words = lower.match(/[a-z0-9']+/g) ?? [];
  const textJoined = words.join(' ');

  const signals = {
    stress: 0,
    clarity: 0,
    energy: 0,
    momentum: 0,
    support: 0,
    avoidance: 0,
  };

  for (const [sig, terms] of Object.entries(LEXICON)) {
    let hits = 0;
    for (const term of terms) {
      if (textJoined.includes(term)) hits += 1;
    }
    signals[sig as keyof typeof signals] = Math.min(1.0, hits / 3.0);
  }

  const isDepleted = DEPLETION_TERMS.some(t => textJoined.includes(t));
  const isNumb = NUMB_TERMS.some(t => textJoined.includes(t));

  let emotionalState: LocalRouteResult['emotionalState'] = 'stable';
  if (signals.stress > 0.4 || textJoined.includes('panic') || textJoined.includes('spiral')) {
    emotionalState = 'overwhelmed';
  } else if (isDepleted) {
    emotionalState = 'depleted';
  } else if (isNumb) {
    emotionalState = 'numb';
  } else if (signals.stress > 0.2 || signals.avoidance > 0.3) {
    emotionalState = 'activated';
  } else if (signals.clarity > 0.3 || signals.momentum > 0.3) {
    emotionalState = 'stable';
  } else {
    emotionalState = 'mixed';
  }

  // Select protocol dynamically across all 5 levels based on user intent and text semantics
  let protocol = {
    name: 'Momentum & Load',
    level: 4,
    focus: 'growth',
    description: 'Push into stretch while protecting recovery windows.',
  };

  if (emotionalState === 'overwhelmed' || textJoined.includes('panic') || textJoined.includes('spiral') || textJoined.includes('anxious') || textJoined.includes('breathe') || textJoined.includes('calm')) {
    protocol = {
      name: 'Stabilise & Breathe',
      level: 1,
      focus: 'safety',
      description: 'Down-regulate first. Short breath cycles, no problem solving yet.',
    };
  } else if (emotionalState === 'depleted' || emotionalState === 'numb' || textJoined.includes('tired') || textJoined.includes('exhausted') || textJoined.includes('sleep') || textJoined.includes('drained') || textJoined.includes('rest')) {
    protocol = {
      name: 'Ground & Regulate',
      level: 2,
      focus: 'regulation',
      description: 'Bring the nervous system back into range before any forward motion.',
    };
  } else if (textJoined.includes('pressure') || textJoined.includes('deadline') || textJoined.includes('work') || textJoined.includes('job') || textJoined.includes('schedule') || textJoined.includes('boss') || textJoined.includes('intense') || textJoined.includes('performance')) {
    protocol = {
      name: 'Pressure Performance',
      level: 5,
      focus: 'performance',
      description: 'High-load execution with active monitoring for overload signals.',
    };
  } else if (textJoined.includes('routine') || textJoined.includes('habit') || textJoined.includes('baseline') || textJoined.includes('steady')) {
    protocol = {
      name: 'Resilience Builder Level 3',
      level: 3,
      focus: 'stability',
      description: 'Steady load, steady reps. Build the baseline that survives bad days.',
    };
  } else {
    protocol = {
      name: 'Momentum & Load',
      level: 4,
      focus: 'growth',
      description: 'Push into stretch while protecting recovery windows.',
    };
  }

  let coreReflection = '';
  let actionAdvice = '';

  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('exhausted')) {
    coreReflection = 'Rest deficit is compounding your load right now.';
    actionAdvice = "Protect tonight's recovery window above all else.";
  } else if (lower.includes('work') || lower.includes('job') || lower.includes('boss') || lower.includes('deadline') || lower.includes('schedule')) {
    coreReflection = 'Professional pressure and pacing are colliding right now.';
    actionAdvice = 'Identify one task to defer or scale down immediately to restore breathing room.';
  } else if (lower.includes('anxious') || lower.includes('worry') || lower.includes('panic') || lower.includes('spiral')) {
    coreReflection = 'Anticipatory load is amplifying your anxiety.';
    actionAdvice = 'Bring your awareness back to this exact room and take three slow exhales.';
  } else if (emotionalState === 'overwhelmed') {
    coreReflection = 'Too many signals are hitting your system simultaneously.';
    actionAdvice = "Let's narrow your focus to the next ten minutes only.";
  } else if (emotionalState === 'activated') {
    coreReflection = 'There is high operational tension running through your system.';
    actionAdvice = 'Pause before reacting and drop your shoulders away from your ears.';
  } else {
    coreReflection = 'I hear the weight and intention behind what you are sharing.';
    actionAdvice = 'What is the single most supportive next step you can take?';
  }

  const cleanedInput = userText.trim();
  const summary = `${coreReflection} When you say "${cleanedInput}", using ${protocol.name}, ${actionAdvice[0].toLowerCase()}${actionAdvice.slice(1)}`;

  const personalResponse = [
    summary,
    `Recommended Protocol: **${protocol.name}** (Level ${protocol.level}) — ${protocol.description}`,
    `Next Action: ${actionAdvice}`,
  ].join('\n\n');

  return {
    emotionalState,
    signals,
    protocol,
    nextAction: 'ground_and_reset',
    personalResponse,
  };
}
