/**
 * Re-Hardwire Storage Utilities
 */
const IS_BROWSER = typeof window !== 'undefined';

export interface StoredData<T> {
  data: T;
  timestamp: number;
}

export function getStorage<T>(key: string): T | null {
  if (!IS_BROWSER) return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const parsed: StoredData<T> = JSON.parse(item);
    return parsed.data;
  } catch (e) {
    console.error('[storage] Failed to read key:', e);
    return null;
  }
}

export function setStorage<T>(key: string, value: T): void {
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
  try { localStorage.removeItem(key); } catch (e) { console.error('[storage] Failed to remove:', e); }
}

export function clearStorage(): void {
  if (!IS_BROWSER) return;
  try { localStorage.clear(); } catch (e) { console.error('[storage] Failed to clear:', e); }
}
