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
/** Adaptive protocol scoring (Week 58)
 * Tracks protocol adherence and signal trends, auto-suggesting next practices.
 */

const ADHERENCE_RETENTION_DAYS = 90;
const ADHERENCE_MS = ADHERENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface ProtocolAdherence {
  protocolName: string;
  timesSelected: number;
  timesCompleted: number;
  lastSelectedAt: string;
  averageSessionLength: number; // minutes
  completionRate: number; // 0-1
  strengthScore: number; // 0-1, based on consistency and completion
}

const PROTOCOLS = [
  'Stabilise & Breathe',
  'Ground & Regulate',
  'Pressure Performance',
  'Resilience Builder Level 3',
  'Momentum & Load',
];

const PRACTICE_SUGGESTIONS: Record<string, string[]> = {
  'Stabilise & Breathe': ['Box breathing 4-6-4-6', '4-7-8 breathing', 'Box square breathing'],
  'Ground & Regulate': ['5-4-3-2-1 grounding', 'Progressive muscle relaxation', 'Body scan meditation'],
  'Pressure Performance': ['Task prioritization matrix', 'Pomodoro technique', 'Energy tracking'],
  'Resilience Builder Level 3': ['Steady reps challenge', 'Baseline building', 'Recovery window protection'],
  'Momentum & Load': ['Stretch goals', 'Progress tracking', 'Recovery monitoring'],
};

/** Track a protocol selection for adherence scoring. */
function trackProtocolSelection(protocolName: string, durationMinutes: number, completed: boolean): void {
  const key = `protocol-adherence-${protocolName}`;
  const stored = getStorage<ProtocolAdherence>(key);
  const now = new Date().toISOString();
  if (!stored) {
    const wrapped: ProtocolAdherence = {
      protocolName,
      timesSelected: 1,
      timesCompleted: completed ? 1 : 0,
      lastSelectedAt: now,
      averageSessionLength: durationMinutes,
      completionRate: completed ? 1 : 0,
      strengthScore: completed ? 1 : 0,
    };
    setStorage(key, wrapped);
  } else {
    const updated: ProtocolAdherence = {
      ...stored,
      timesSelected: stored.timesSelected + 1,
      timesCompleted: completed ? stored.timesCompleted + 1 : stored.timesCompleted,
      lastSelectedAt: now,
      averageSessionLength: ((stored.averageSessionLength * stored.timesCompleted) + durationMinutes) / (stored.timesCompleted + 1),
      completionRate: (stored.completionRate * stored.timesCompleted + (completed ? 1 : 0)) / (stored.timesCompleted + 1),
      strengthScore: ((stored.strengthScore * stored.timesSelected) + (completed ? 1 : 0)) / (stored.timesSelected + 1),
    };
    setStorage(key, updated);
  }
}

/** Get adherence score for a protocol. */
function getProtocolAdherence(protocolName: string): ProtocolAdherence {
  const key = `protocol-adherence-${protocolName}`;
  const stored = getStorage<ProtocolAdherence>(key);
  if (!stored) {
    return {
      protocolName,
      timesSelected: 0,
      timesCompleted: 0,
      lastSelectedAt: '',
      averageSessionLength: 0,
      completionRate: 0,
      strengthScore: 0,
    };
  }
  const age = Date.now() - new Date(stored.lastSelectedAt).getTime();
  if (age > ADHERENCE_MS) {
    // Clear stale data beyond retention period
    setStorage(key, null as any);
    return { protocolName, timesSelected: 0, timesCompleted: 0, lastSelectedAt: '', averageSessionLength: 0, completionRate: 0, strengthScore: 0 };
  }
  return stored;
}

/** Auto-suggest next practices based on adherence and emotional state. */
function suggestNextPractices(emotionalState: 'stable' | 'activated' | 'overwhelmed' | 'depleted' | 'numb' | 'mixed', recentProtocols: string[]): string[] {
  const adherenceMap: Record<string, number> = {};
  PROTOCOLS.forEach((p) => {
    const a = getProtocolAdherence(p);
    adherenceMap[p] = a.strengthScore;
  });

  // Sort protocols by strength score descending
  const sorted = [...PROTOCOLS].sort((a, b) => (adherenceMap[b] || 0) - (adherenceMap[a] || 0));

  const suggestions: string[] = [];
  // Add 2-3 suggestions based on emotional state
  if (emotionalState === 'activated' || emotionalState === 'overwhelmed') {
    // Suggest calming protocols first
    ['Stabilise & Breathe', 'Ground & Regulate'].forEach((p) => {
      if (!recentProtocols.includes(p) && suggestions.length < 3) suggestions.push(p);
    });
  } else if (emotionalState === 'depleted' || emotionalState === 'numb') {
    // Suggest grounding and regulating protocols
    ['Ground & Regulate', 'Resilience Builder Level 3'].forEach((p) => {
      if (!recentProtocols.includes(p) && suggestions.length < 3) suggestions.push(p);
    });
  } else if (emotionalState === 'mixed') {
    // Balanced suggestions
    PROTOCOLS.forEach((p) => {
      if (!recentProtocols.includes(p) && suggestions.length < 3) suggestions.push(p);
    });
  } else {
    // stable: suggest variety
    PROTOCOLS.forEach((p) => {
      if (!recentProtocols.includes(p) && suggestions.length < 3) suggestions.push(p);
    });
  }

  // Fill remaining slots with high-strength protocols
  while (suggestions.length < 3) {
    const next = sorted.find((p) => !suggestions.includes(p));
    if (!next) break;
    suggestions.push(next);
  }

  return suggestions;
}

/** Exported functions */
export { trackProtocolSelection, getProtocolAdherence, suggestNextPractices, PROTOCOLS, PRACTICE_SUGGESTIONS };
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
