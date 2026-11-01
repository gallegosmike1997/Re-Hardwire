/**
 * Galvanic Skin Response (GSR) Electrodermal Module (Week 27)
 *
 * Measures real-time skin conductance (microsiemens) to detect sudden
 * sympathetic nervous system arousal spikes.
 */

export interface GsrReading {
  conductanceMicrosiemens: number;
  arousalSpikeDetected: boolean;
  baselineUs: number;
}

export function evaluateGsrArousal(currentUs: number, baselineUs: number = 4.0): GsrReading {
  const spike = currentUs > baselineUs * 1.35;
  return {
    conductanceMicrosiemens: currentUs,
    arousalSpikeDetected: spike,
    baselineUs,
  };
}
