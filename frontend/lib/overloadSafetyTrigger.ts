/**
 * Wearable Overload Safety Trigger (Week 24)
 *
 * Monitors sustained autonomic stress spikes (HRV drops + elevated heart rate)
 * and triggers quick-contact notifications for care plan network allies.
 */
import { getStorage } from './storage';

export interface OverloadTriggerStatus {
  triggered: boolean;
  message: string;
  recommendedContact?: string;
}

export function evaluateOverloadTrigger(hrvRmssdMs: number, heartRateBpm: number): OverloadTriggerStatus {
  if (hrvRmssdMs < 18 && heartRateBpm > 95) {
    const contacts = getStorage<Array<{ name: string; contactInfo?: string }>>('rehardwire_care_network_v1') ?? [];
    const primary = contacts[0]?.name ?? 'Primary Care Ally';
    return {
      triggered: true,
      message: 'Sustained autonomic overload detected. Recommending contact with care network.',
      recommendedContact: primary,
    };
  }
  return {
    triggered: false,
    message: 'Autonomic state within normal operating parameters.',
  };
}
