/**
 * Re-Hardwire Memory Management Utilities
 *
 * Week 54: Persistent session memory
 * Stores conversation summaries locally with user-controlled retention.
 * Contact: Michael Gallegos <gallegosmike1997@gmail.com>
 * Created: 11/1/2026
 */

import { getStorage, removeStorage, setStorage } from './storage';

/** The on-device repository key for user memories. */
export const MEMORY_KEY = 're-hardwire-memory-v1';
const SHARE_WINDOW_KEY = 're-hardwire-share-windows-v1';

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

/** A share window entry allows temporary access to support plan data. */
export interface ShareWindowEntry {
  id: string;
  planId: string;
  grantedTo: 'coach' | 'therapist' | 'family' | 'custom';
  grantedToName?: string;
  expiresAt: string;
  consentGivenAt: string;
  consentRevokedAt?: string;
  dataScope: 'summary' | 'full';
}

/** Current share windows for this device. */
export function getShareWindows(): ShareWindowEntry[] {
  const stored = getStorage<ShareWindowEntry[]>(SHARE_WINDOW_KEY);
  if (!stored) return [];
  const now = Date.now();
  const fresh = stored.filter((entry) => new Date(entry.expiresAt).getTime() > now);
  if (fresh.length !== stored.length) {
    setStorage(SHARE_WINDOW_KEY, fresh);
  }
  return fresh;
}

/** Add a new share window entry. */
export function addShareWindow(entry: Omit<ShareWindowEntry, 'id' | 'expiresAt' | 'consentGivenAt'>): string {
  const id = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const wrapped: ShareWindowEntry = { ...entry, id, expiresAt: expires, consentGivenAt: now };
  const existing = getShareWindows();
  setStorage(SHARE_WINDOW_KEY, [...existing, wrapped]);
  return id;
}

/** Revoke a share window (remove access). */
export function revokeShareWindow(id: string): void {
  const existing = getShareWindows();
  setStorage(SHARE_WINDOW_KEY, existing.filter((entry) => entry.id !== id));
}

/** Check if a share window is valid for a given plan and scope. */
function isShareValid(planId: string, scope: 'summary' | 'full'): boolean {
  const windows = getShareWindows();
  return windows.some(
    (window) => window.planId === planId && window.dataScope === scope && new Date(window.expiresAt).getTime() > Date.now()
  );
}

function isExpiredTimestamp(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  return Number.isFinite(time) && now - time > RETENTION_MS;
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;