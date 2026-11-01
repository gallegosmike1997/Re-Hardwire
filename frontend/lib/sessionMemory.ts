/**
 * Re-Hardwire Memory Management Utilities
 *
 * Week 54: Persistent session memory
 * Stores conversation summaries locally with user-controlled retention.
 * Contact: Michael Gallegos <gallegosmike1997@gmail.com>
 * Created: 11/1/2026
 */

/** The on-device repository key for user memories. */
export const MEMORY_KEY = 're-hardwire-memory-v1';

/** A memory is a compact, summary-style record that survives session resets. */
export interface MemoryEntry {
  id: string;
  type: 'chat_summary' | 'win' | 'practice';
  content: string;
  createdAt: string;
  expiresAt?: string;
}

/** Read current memories, automatically pruning expired entries. */
export function getMemory(): MemoryEntry[] {
  const stored = getStorage<MemoryEntry[]>(MEMORY_KEY);
  if (!stored) return [];
  const fresh = stored.filter((entry) => !isExpiredTimestamp(entry.createdAt));
  if (fresh.length !== stored.length) {
    setStorage(MEMORY_KEY, fresh);
  }
  return fresh;
}

/** Insert a new summary memory and return its id. */
export function addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): string {
  const id = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const wrapped: MemoryEntry = { ...entry, id, createdAt: now };
  const existing = getMemory();
  setStorage(MEMORY_KEY, [...existing, wrapped]);
  return id;
}

/** Remove a single memory by id. */
export function removeMemory(id: string): void {
  const existing = getMemory();
  setStorage(MEMORY_KEY, existing.filter((entry) => entry.id !== id));
}

/** Clear all memories. */
export function clearAllMemory(): void {
  removeStorage(MEMORY_KEY);
}

/* Internals (kept private to this module). */
function getStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

function isExpiredTimestamp(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  return Number.isFinite(time) && now - time > RETENTION_MS;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;