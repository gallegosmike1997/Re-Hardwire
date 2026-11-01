/**
 * Offline On-Device Neural Speech Controls (Week 22)
 *
 * Configures cadence, pitch, and anxiety-reduction frequency modulations
 * for local text-to-speech audio synthesis.
 */

export interface NeuralSpeechConfig {
  cadenceRate: number; // 0.75 - 1.25
  calmPitchShift: number; // 0.8 - 1.2
  binauralBackgroundHz: number;
}

export const DEFAULT_NEURAL_SPEECH_CONFIG: NeuralSpeechConfig = {
  cadenceRate: 0.9,
  calmPitchShift: 0.95,
  binauralBackgroundHz: 432,
};

export function applyNeuralSpeechModulation(
  utterance: SpeechSynthesisUtterance,
  config: NeuralSpeechConfig = DEFAULT_NEURAL_SPEECH_CONFIG,
): void {
  utterance.rate = config.cadenceRate;
  utterance.pitch = config.calmPitchShift;
}
