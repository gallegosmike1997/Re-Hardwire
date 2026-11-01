/**
 * Bluetooth LE & Wearable HRV Biofeedback Module (Week 17)
 *
 * Connects to Bluetooth Heart Rate Profile monitors, parses R-R intervals,
 * calculates Heart Rate Variability (RMSSD), and determines autonomic nervous system state.
 */

export interface HrvReading {
  heartRateBpm: number;
  rmssdMs: number;
  autonomicState: 'calm' | 'balanced' | 'activated' | 'high_stress';
  timestamp: string;
}

export function calculateRmssd(rrIntervalsMs: number[]): number {
  if (rrIntervalsMs.length < 2) return 40; // Default baseline
  let sumSquaredDiffs = 0;
  for (let i = 0; i < rrIntervalsMs.length - 1; i += 1) {
    const diff = rrIntervalsMs[i + 1] - rrIntervalsMs[i];
    sumSquaredDiffs += diff * diff;
  }
  return Math.sqrt(sumSquaredDiffs / (rrIntervalsMs.length - 1));
}

export function classifyAutonomicState(rmssdMs: number): HrvReading['autonomicState'] {
  if (rmssdMs > 60) return 'calm';
  if (rmssdMs >= 35) return 'balanced';
  if (rmssdMs >= 20) return 'activated';
  return 'high_stress';
}

export function isBluetoothSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'bluetooth' in navigator;
}
