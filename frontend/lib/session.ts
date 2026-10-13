/**
 * Device session management for the backend API.
 *
 * The backend scopes every private route (chat, history, profile) to the device
 * that owns the verified session token. This module lazily creates an anonymous
 * session, caches the token on-device, refreshes it when the backend rejects it
 * as expired (401), and retries the original request once.
 *
 * Offline-first contract: when no API base URL is configured (production and
 * Capacitor builds) every function is a safe no-op that returns `null`, so the
 * app never blocks on a network call it is not meant to make.
 */
import { config } from './config';
import { getStorage, removeStorage, setStorage } from './storage';

export interface SessionResponse {
  token: string;
  subject: string;
  expiresIn?: number;
}

const TOKEN_KEY = 're-hardwire-session-token';
/** In-flight session creation, so concurrent callers share one request. */
let inflight: Promise<string | null> | null = null;

function readStoredToken(): string | null {
  return getStorage<string>(TOKEN_KEY);
}

function storeToken(token: string | null): void {
  if (token) setStorage(TOKEN_KEY, token);
  else removeStorage(TOKEN_KEY);
}

/** The currently cached token, or null when a session must be created. */
export function currentToken(): string | null {
  return readStoredToken();
}

async function postJson(url: string, body: unknown): Promise<SessionResponse | null> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) return null;
  const parsed = (await response.json().catch(() => null)) as SessionResponse | null;
  return typeof parsed?.token === 'string' && parsed.token ? parsed : null;
}

/**
 * Return a valid session token, creating a fresh anonymous session if needed.
 *
 * Returns `null` when the API is not configured (offline-first builds) or the
 * backend cannot be reached; callers should treat that as "no backend" and fall
 * back to on-device behaviour.
 */
export async function ensureSession(): Promise<string | null> {
  if (!config.api.baseUrl) return null;

  const cached = readStoredToken();
  if (cached) return cached;

  if (!inflight) {
    inflight = (async () => {
      try {
        const created = await postJson(`${config.api.baseUrl}/api/session`, {});
        if (!created) return null;
        storeToken(created.token);
        return created.token;
      } catch {
        return null;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/**
 * Re-establish a session after the backend rejected the old token.
 *
 * The refresh endpoint is tried first so the device keeps the same identity -
 * and therefore its own profile and history. Only a refresh that the backend
 * refuses falls back to a brand new anonymous subject. Concurrent callers
 * share one in-flight refresh so a second refresh cannot revoke the token the
 * first refresh just stored.
 */
let refreshInflight: Promise<string | null> | null = null;

export async function refreshSession(): Promise<string | null> {
  if (!config.api.baseUrl) return null;

  if (!refreshInflight) {
    refreshInflight = (async () => {
      const previous = readStoredToken();
      if (previous) {
        // The refresh endpoint revokes the presented token when it issues the
        // replacement, so only store the new token when the refresh started
        // from the token that is still current; otherwise a parallel refresh
        // already moved this device on to its own replacement.
        try {
          const renewed = await postJson(`${config.api.baseUrl}/api/session/refresh`, { token: previous });
          if (renewed && readStoredToken() === previous) {
            storeToken(renewed.token);
            return renewed.token;
          }
          if (renewed) return renewed.token;
        } catch {
          /* fall through to a fresh session */
        }
      }

      // Refresh refused (or the stored token already moved on): only mint a
      // fresh anonymous subject when this call still owns the stored token.
      if (readStoredToken() === previous) {
        storeToken(null);
        return ensureSession();
      }
      return readStoredToken();
    })().finally(() => {
      refreshInflight = null;
    });
  }

  return refreshInflight;
}

/** Authorization headers for a request, or `{}` when no session is available. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await ensureSession();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Forget the cached token (e.g. on sign-out / profile reset). */
export function clearSession(): void {
  storeToken(null);
}
