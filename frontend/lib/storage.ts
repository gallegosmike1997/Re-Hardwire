/**
 * Re-Hardwire Storage Utilities
 */
const IS_BROWSER = typeof window !== 'undefined';
const ACTIVE_PROFILE_KEY = 're-hardwire-active-profile-id';
const DEFAULT_PROFILE_ID = 'default';

export interface StoredData<T> {
  data: T;
  timestamp: number;
}

function parseStored<T>(item: string | null): T | null {
  if (!item) return null;
  try {
    const parsed: unknown = JSON.parse(item);
    if (parsed && typeof parsed === 'object' && 'data' in parsed && 'timestamp' in parsed) {
      return (parsed as StoredData<T>).data;
    }
    return parsed as T;
  } catch (e) {
    console.error('[storage] Failed to read key:', e);
    return null;
  }
}

function scopedKey(key: string): string {
  if (!IS_BROWSER) return key;
  const profileId = getActiveProfileId();
  return profileId === DEFAULT_PROFILE_ID ? key : `${key}::${profileId}`;
}

export function getActiveProfileId(): string {
  if (!IS_BROWSER) return DEFAULT_PROFILE_ID;
  try {
    return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? DEFAULT_PROFILE_ID;
  } catch {
    return DEFAULT_PROFILE_ID;
  }
}

export function setActiveProfileId(profileId: string): void {
  if (!IS_BROWSER) return;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } catch {
    // Keep the default profile usable when browser storage is unavailable.
  }
}

export function getStorage<T>(key: string): T | null {
  if (!IS_BROWSER) return null;
  try {
    return parseStored<T>(localStorage.getItem(scopedKey(key)));
  } catch (e) {
    console.error('[storage] Failed to read key:', e);
    return null;
  }
}

export function getGlobalStorage<T>(key: string): T | null {
  if (!IS_BROWSER) return null;
  try {
    return parseStored<T>(localStorage.getItem(key));
  } catch (e) {
    console.error('[storage] Failed to read key:', e);
    return null;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (!IS_BROWSER) return;
  try {
    const wrapper: StoredData<T> = { data: value, timestamp: Date.now() };
    localStorage.setItem(scopedKey(key), JSON.stringify(wrapper));
  } catch (e) {
    console.error('[storage] Failed to write key:', e);
  }
}

export function setGlobalStorage<T>(key: string, value: T): void {
  if (!IS_BROWSER) return;
  try {
    const wrapper: StoredData<T> = { data: value, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(wrapper));
  } catch (e) {
    console.error('[storage] Failed to write key:', e);
  }
}

export function removeStorage(key: string): void {
  if (!IS_BROWSER) return;
  try { localStorage.removeItem(scopedKey(key)); } catch (e) { console.error('[storage] Failed to remove:', e); }
}

export function removeGlobalStorage(key: string): void {
  if (!IS_BROWSER) return;
  try { localStorage.removeItem(key); } catch (e) { console.error('[storage] Failed to remove:', e); }
}

export function clearStorage(): void {
  if (!IS_BROWSER) return;
  try { localStorage.clear(); } catch (e) { console.error('[storage] Failed to clear:', e); }
}
