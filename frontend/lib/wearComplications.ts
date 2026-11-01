/**
 * Wear OS Complications & Tile Data Provider (Week 11)
 *
 * Serializes active protocol status and grounding metrics for Wear OS
 * watch face complications and glance widgets.
 */
import { getStorage } from './storage';
import { config } from './config';

export interface WearComplicationData {
  protocol: string;
  streak: number;
  lastCheckIn: string;
}

export function getWearComplicationPayload(): WearComplicationData {
  const protocol = getStorage<string>(config.storage.protocolKey) ?? 'Resilience Builder Level 3';
  const wins = getStorage<Array<unknown>>(config.storage.winsKey) ?? [];
  return {
    protocol,
    streak: wins.length,
    lastCheckIn: new Date().toLocaleTimeString(),
  };
}
