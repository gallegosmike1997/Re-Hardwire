/**
 * Federated Learning & Differential Privacy Utilities (Week 18)
 *
 * Provides on-device model weight adaptation, gradient clipping, and noise addition
 * to adapt routing parameters locally without sending user prompt text to central servers.
 */

export interface ModelWeightDelta {
  layer: string;
  weightDelta: number[];
  epsilonPrivacyBudget: number;
}

export function computeDifferentialPrivacyNoise(epsilon: number = 0.5): number {
  // Laplace distribution noise for epsilon-differential privacy
  const u = Math.random() - 0.5;
  const b = 1.0 / epsilon;
  return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function applyLocalGradientAdjustment(
  currentWeights: number[],
  signalGradients: number[],
  learningRate: number = 0.01,
  clipNorm: number = 1.0,
): number[] {
  // Clip norm for local privacy bounds
  const norm = Math.sqrt(signalGradients.reduce((sum, g) => sum + g * g, 0));
  const scale = norm > clipNorm ? clipNorm / norm : 1.0;

  return currentWeights.map((w, i) => {
    const clippedGrad = signalGradients[i] * scale;
    const noise = computeDifferentialPrivacyNoise(0.5);
    return w + learningRate * (clippedGrad + noise);
  });
}
