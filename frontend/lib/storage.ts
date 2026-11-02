/**
 * Re-Hardwire Storage Utilities
 */
const IS_BROWSER = typeof window !== 'undefined';
const ACTIVE_PROFILE_KEY = 're-hardwire-active-profile-id';
const DEVICE_PROFILES_KEY = 're-hardwire-device-profiles';
const SESSION_TOKEN_KEY = 're-hardwire-session-token';
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

function belongsToActiveProfile(key: string, profileId: string): boolean {
  if (!key.startsWith('re-hardwire-')) return false;
  if (key === ACTIVE_PROFILE_KEY || key === DEVICE_PROFILES_KEY) return false;
  if (key === SESSION_TOKEN_KEY || key.startsWith(`${SESSION_TOKEN_KEY}:`)) return false;
  return profileId === DEFAULT_PROFILE_ID
    ? !key.includes('::')
    : key.endsWith(`::${profileId}`);
}

export function getActiveProfileStorageEntries(): Array<[string, string]> {
  if (!IS_BROWSER) return [];
  try {
    const profileId = getActiveProfileId();
    const entries: Array<[string, string]> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !belongsToActiveProfile(key, profileId)) continue;
      const value = localStorage.getItem(key);
      if (value === null) continue;
      const suffix = `::${profileId}`;
      entries.push([profileId === DEFAULT_PROFILE_ID ? key : key.slice(0, -suffix.length), value]);
    }
    return entries;
  } catch (e) {
    console.error('[storage] Failed to enumerate active profile data:', e);
    return [];
  }
}

export function clearActiveProfileStorage(): void {
  if (!IS_BROWSER) return;
  const profileId = getActiveProfileId();
  const keysToRemove: string[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && belongsToActiveProfile(key, profileId)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    const tokenKey = profileId === DEFAULT_PROFILE_ID
      ? SESSION_TOKEN_KEY
      : `${SESSION_TOKEN_KEY}:${profileId}`;
    localStorage.removeItem(tokenKey);
  } catch (e) {
    console.error('[storage] Failed to clear active profile data:', e);
  }
}

export function clearStorage(): void {
  if (!IS_BROWSER) return;
  try { localStorage.clear(); } catch (e) { console.error('[storage] Failed to clear:', e); }
}
