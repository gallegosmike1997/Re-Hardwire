/**
 * Audio-Visual Entrainment Module (Week 28)
 *
 * Generates Isochronic tone pulse frequencies and visual light timing
 * to guide brainwaves into relaxed Alpha/Theta states.
 */

export interface EntrainmentConfig {
  targetFrequencyHz: number; // e.g. 10Hz for Alpha, 6Hz for Theta
  carrierFrequencyHz: number; // e.g. 220Hz
  pulseDurationMs: number;
}

export function getEntrainmentConfig(targetState: 'alpha' | 'theta'): EntrainmentConfig {
  if (targetState === 'theta') {
    return { targetFrequencyHz: 6, carrierFrequencyHz: 180, pulseDurationMs: 166 };
  }
  return { targetFrequencyHz: 10, carrierFrequencyHz: 220, pulseDurationMs: 100 };
}
