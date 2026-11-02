import type { RouteResponse } from './api';
import { containsCrisisLanguage } from './safety';
import { detectEmotionalState, generateResponse, type EmotionalState } from './voiceCoaching';

export interface LocalProtocol {
  name: string;
  level: number;
  focus: string;
}

export interface LocalRouteContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  stressLevel: 'low' | 'medium' | 'high';
  energyLevel: 'low' | 'medium' | 'high';
  activityType: 'working' | 'exercising' | 'resting' | 'unknown';
}

export interface LocalRoute {
  protocol: LocalProtocol;
  confidence: number;
  reasoning: string;
  emotionalState: EmotionalState;
  nextAction: string;
  personalResponse: string;
  context: LocalRouteContext;
  routeResponse: RouteResponse;
}

const PROTOCOLS: Record<number, LocalProtocol> = {
  1: { name: 'Stabilise & Breathe', level: 1, focus: 'safety' },
  2: { name: 'Ground & Regulate', level: 2, focus: 'regulation' },
  3: { name: 'Resilience Builder Level 3', level: 3, focus: 'stability' },
  4: { name: 'Momentum & Load', level: 4, focus: 'growth' },
  5: { name: 'Pressure Performance', level: 5, focus: 'performance' },
};

function getTimeOfDay(hour: number): LocalRouteContext['timeOfDay'] {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function activityFor(text: string): LocalRouteContext['activityType'] {
  const lower = text.toLowerCase();
  if (/\b(work|job|boss|deadline|meeting|shift)\b/.test(lower)) return 'working';
  if (/\b(run|running|workout|training|gym|exercise|exercising)\b/.test(lower)) return 'exercising';
  if (/\b(rest|sleep|bed|break|recover)\b/.test(lower)) return 'resting';
  return 'unknown';
}

function protocolFor(state: EmotionalState, activity: LocalRouteContext['activityType']): LocalProtocol {
  if (state === 'activated' || state === 'overwhelmed') return PROTOCOLS[1];
  if (state === 'depleted' || state === 'numb') return PROTOCOLS[2];
  if (activity === 'exercising') return PROTOCOLS[4];
  return PROTOCOLS[3];
}

function actionFor(
  text: string,
  state: EmotionalState,
  activity: LocalRouteContext['activityType'],
): RouteResponse['nextAction'] {
  if (state === 'activated' || state === 'overwhelmed') return 'ground_and_reset';
  if (state === 'depleted' || state === 'numb') return 'reduce_load';
  if (/\b(finished|completed|managed|proud|went well|small win)\b/i.test(text)) return 'log_micro_win';
  if (activity === 'working') return 'reflect_and_reframe';
  return 'continue_protocol';
}

export function computeLocalRoute(text: string): LocalRoute {
  const body = text.trim();
  const crisis = containsCrisisLanguage(body);
  const emotionalState = crisis ? 'overwhelmed' : detectEmotionalState(body);
  const activityType = activityFor(body);
  const protocol = crisis ? PROTOCOLS[1] : protocolFor(emotionalState, activityType);
  const nextAction = crisis ? 'escalate_support' : actionFor(body, emotionalState, activityType);
  const context: LocalRouteContext = {
    timeOfDay: getTimeOfDay(new Date().getHours()),
    stressLevel: emotionalState === 'activated' || emotionalState === 'overwhelmed'
      ? 'high' : emotionalState === 'mixed' ? 'medium' : 'low',
    energyLevel: emotionalState === 'depleted' || emotionalState === 'numb'
      ? 'low' : emotionalState === 'activated' ? 'high' : 'medium',
    activityType,
  };

  const coaching = crisis
    ? 'Your message sounds urgent. Please contact local emergency services or a crisis line now. In the U.S., call or text 988. If you can, tell someone nearby what is happening.'
    : generateResponse(body);
  const personalResponse = typeof coaching === 'string'
    ? coaching
    : `${coaching.reflection} ${coaching.nextStep}`;
  const routeResponse: RouteResponse = {
    protocol: protocol.name,
    confidence: crisis ? 0.95 : body.length > 12 ? 0.74 : 0.58,
    tags: [protocol.focus, emotionalState, activityType].filter((tag) => tag !== 'unknown'),
    nextAction,
    emotionalState,
  };

  return {
    protocol,
    confidence: routeResponse.confidence,
    reasoning: crisis
      ? 'Crisis language detected; safety support takes priority over coaching.'
      : `Matched ${emotionalState} state and ${activityType} context using on-device text signals.`,
    emotionalState,
    nextAction,
    personalResponse,
    context,
    routeResponse,
  };
}

export function getContextualProtocol(text: string) {
  const route = computeLocalRoute(text);
  return {
    protocol: route.protocol.name,
    confidence: route.confidence,
    emotionalState: route.emotionalState,
    contextualHints: route.context,
  };
}