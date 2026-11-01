/**
 * Closed-Loop Biofeedback Protocol Adjuster (Week 29)
 *
 * Integrates HRV, EEG, and GSR readings into a real-time protocol
 * intensity recommendation engine.
 */
import { evaluateGsrArousal } from './gsrSensor';
import { classifyAutonomicState } from './biofeedbackHrv';

export interface ClosedLoopDecision {
  recommendedLevel: number;
  protocolName: string;
  reason: string;
}

export function evaluateClosedLoopBiofeedback(
  rmssdMs: number,
  gsrConductanceUs: number,
  relaxationDepthPercent: number,
): ClosedLoopDecision {
  const hrvState = classifyAutonomicState(rmssdMs);
  const gsrState = evaluateGsrArousal(gsrConductanceUs);

  if (hrvState === 'high_stress' || gsrState.arousalSpikeDetected) {
    return {
      recommendedLevel: 1,
      protocolName: 'Stabilise & Breathe',
      reason: 'High autonomic arousal detected via combined HRV and skin conductance.',
    };
  }

  if (relaxationDepthPercent > 70) {
    return {
      recommendedLevel: 4,
      protocolName: 'Momentum & Load',
      reason: 'Deep relaxation depth achieved. Ready for positive growth reps.',
    };
  }

  return {
    recommendedLevel: 3,
    protocolName: 'Resilience Builder Level 3',
    reason: 'Stable autonomic metrics. Maintaining baseline load.',
  };
}
