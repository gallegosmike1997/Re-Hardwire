/**
 * Data-retention helpers for on-device transcripts and memories.
 * Local chat history auto-expires after 30 days so a lost device
 * does not expose months of conversations. Backend history is untouched.
 */

import { getStorage, setStorage, removeStorage } from './storage';

export const MEMORY_KEY = 're-hardwire-memory-v1';

export interface MemoryEntry {
  id: string;
  type: 'chat_summary' | 'win' | 'practice';
  content: string;
  createdAt: string;
  expiresAt?: string;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

export function isExpiredTimestamp(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  if (Number.isNaN(time)) return false;
  return now - time > RETENTION_MS;
}

export function retentionNotice(): string {
  return `Saved memories on this device expire after ${RETENTION_DAYS} days. Export anything you want to keep.`;
}

export function getMemory(): MemoryEntry[] {
  const stored = getStorage<MemoryEntry[]>(MEMORY_KEY);
  if (!stored) return [];
  const fresh = stored.filter((entry) => !isExpiredTimestamp(entry.createdAt));
  if (fresh.length !== stored.length) {
    setStorage(MEMORY_KEY, fresh);
  }
  return fresh;
}

export function addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): string {
  const id = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const wrapped: MemoryEntry = { ...entry, id, createdAt: now };
  const existing = getMemory();
  setStorage(MEMORY_KEY, [...existing, wrapped]);
  return id;
}

export function removeMemory(id: string): void {
  const existing = getMemory();
  setStorage(MEMORY_KEY, existing.filter((entry) => entry.id !== id));
}

export function clearAllMemory(): void {
  removeStorage(MEMORY_KEY);
}

export function exportMemoriesAsJson(): Blob {
  const memories = getMemory();
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    entries: memories,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function restoreMemoriesFromJson(text: string): Promise<number> {
  const payload = JSON.parse(text) as { version?: string; entries?: MemoryEntry[] };
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const fresh = entries.filter((entry) => entry && typeof entry.createdAt === 'string');
  const existing = getMemory();
  setStorage(MEMORY_KEY, [...existing, ...fresh]);
  return fresh.length;
}
