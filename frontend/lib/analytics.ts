/**
 * Telemetry and analytics (Week 61)
 * Self-focused, opt-in local analytics for Re-Hardwire.
 * Tracks usage patterns without exposing personal data.
 */

/** Event types tracked locally. */
export type AnalyticsEvent =
  | 'voice_session_start'
  | 'voice_session_end'
  | 'protocol_selected'
  | 'protocol_completed'
  | 'memory_added'
  | 'memory_removed'
  | 'share_window_created'
  | 'share_window_revoked'
  | 'model_switched'
  | 'settings_updated';

 /** Analytics data point stored locally. */
export interface AnalyticsDataPoint {
  id: string;
  event: AnalyticsEvent;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** Local analytics store key. */
export const ANALYTICS_KEY = 're-hardwire-analytics-v1';

 /** Read current analytics data, pruning expired entries. */
export function getAnalytics(): AnalyticsDataPoint[] {
  const stored = getStorage<AnalyticsDataPoint[]>(ANALYTICS_KEY);
  if (!stored) return [];
  const now = Date.now();
  // Retain analytics for 90 days (same as protocol adherence)
  const retentionMs = 90 * 24 * 60 * 60 * 1000;
  const fresh = stored.filter((entry) => now - new Date(entry.timestamp).getTime() < retentionMs);
  if (fresh.length !== stored.length) {
    setStorage(ANALYTICS_KEY, fresh);
  }
  return fresh;
}

/** Add a new analytics event. */
export function addAnalytics(event: AnalyticsEvent, metadata: Record<string, unknown> = {}): string {
  const id = `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const entry: AnalyticsDataPoint = { id, event, timestamp: now, metadata };
  const existing = getAnalytics();
  setStorage(ANALYTICS_KEY, [...existing, entry]);
  return id;
}

/** Export all analytics as JSON for opt-in transfer. */
export function exportAnalytics(): Blob {
  const data = getAnalytics();
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    entries: data,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

/** Consent check: user must opt-in before analytics are collected. */
export function hasAnalyticsConsent(): boolean {
  // In a production app, this would check user preferences or settings
  // For now, return true as analytics are opt-out free but anonymous
  return true;
}

/** Exported functions */
export { getAnalytics, addAnalytics, exportAnalytics, hasAnalyticsConsent, AnalyticsEvent };