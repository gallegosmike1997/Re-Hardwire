/**
 * EEG Brainwave Analysis Module (Week 26)
 *
 * Parses Alpha (8-12Hz) and Theta (4-8Hz) power spectral density ratios from
 * Muse and OpenBCI Bluetooth LE sensors to measure deep relaxation depth.
 */

export interface EegReading {
  alphaPower: number;
  thetaPower: number;
  alphaThetaRatio: number;
  relaxationDepthPercent: number;
  timestamp: string;
}

export function parseEegPacket(rawAlpha: number, rawTheta: number): EegReading {
  const ratio = rawTheta > 0 ? rawAlpha / rawTheta : 1.0;
  const depth = Math.min(100, Math.max(0, Math.round(ratio * 40)));
  return {
    alphaPower: rawAlpha,
    thetaPower: rawTheta,
    alphaThetaRatio: ratio,
    relaxationDepthPercent: depth,
    timestamp: new Date().toLocaleTimeString(),
  };
}
