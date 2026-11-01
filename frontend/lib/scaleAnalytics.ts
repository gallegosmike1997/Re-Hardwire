/** Scale & Analytics (Weeks 241-250)
 * 1M+ users, insurance integration, employer wellness programs, and 5-year outcomes.
 */

/** AnalyticsEvent types for large-scale tracking. */
export type ScaleEvent =
  | 'user_registered'
  | 'session_completed'
  | 'protocol_adherence'
  | 'memory_exported'
  | 'share_initiated'
  | 'share_revoked'
  | 'model_switched'
  | 'accessibility_enabled'
  | 'biometric_auth'
  | 'feedback_submitted'
  | 'clinical_review';

/** Large-scale analytics data point. */
export interface ScaleDataPoint {
  id: string;
  event: ScaleEvent;
  timestamp: string;
  userId: string; // hashed/anonymized
  metadata: Record<string, unknown>;
  region: 'na' | 'eu' | 'ap' | 'latam' | 'mea' | 'africa';
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'wearable';
}

/** Global analytics store for scale mode. */
export const SCALE_ANALYTICS_KEY = 're-hardwire-scale-analytics-v1';

/** Add a scale analytics event. */
export function addScaleEvent(event: ScaleEvent, metadata: Record<string, unknown>, userId: string, region: 'na' | 'eu' | 'ap' | 'latam' | 'mea' | 'africa', deviceType: 'desktop' | 'mobile' | 'tablet' | 'wearable'): string {
  const id = `scale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const entry: ScaleDataPoint = { id, event, timestamp: now, userId, region, deviceType, metadata };
  const stored = getStorage<ScaleDataPoint[]>(SCALE_ANALYTICS_KEY);
  if (!stored) {
    setStorage(SCALE_ANALYTICS_KEY, [entry]);
  } else {
    setStorage(SCALE_ANALYTICS_KEY, [...stored, entry]);
  }
  return id;
}

/** Get all scale analytics. */
export function getScaleAnalytics(): ScaleDataPoint[] {
  const stored = getStorage<ScaleDataPoint[]>(SCALE_ANALYTICS_KEY);
  if (!stored) return [];
  // Retain for 180 days for scale analysis
  const retentionMs = 180 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const fresh = stored.filter((entry) => now - new Date(entry.timestamp).getTime() < retentionMs);
  if (fresh.length !== stored.length) {
    setStorage(SCALE_ANALYTICS_KEY, fresh);
  }
  return fresh;
}

/** Export scale analytics as aggregated report. */
export function generateScaleReport(): { userCount: number; eventCounts: Record<ScaleEvent, number>; regions: Record<string, number>; deviceTypes: Record<string, number> } {
  const data = getScaleAnalytics();
  const userCount = new Set(data.map((d) => d.userId)).size;
  const eventCounts: Record<ScaleEvent, number> = {
    user_registered: 0,
    session_completed: 0,
    protocol_adherence: 0,
    memory_exported: 0,
    share_initiated: 0,
    share_revoked: 0,
    model_switched: 0,
    accessibility_enabled: 0,
    biometric_auth: 0,
    feedback_submitted: 0,
    clinical_review: 0,
  };
  const regions: Record<string, number> = { na: 0, eu: 0, ap: 0, latam: 0, mea: 0, africa: 0 };
  const deviceTypes: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0, wearable: 0 };

  for (const d of data) {
    eventCounts[d.event] = (eventCounts[d.event] || 0) + 1;
    regions[d.region] = (regions[d.region] || 0) + 1;
    deviceTypes[d.deviceType] = (deviceTypes[d.deviceType] || 0) + 1;
  }

  return { userCount, eventCounts, regions, deviceTypes };
}

/** Exported functions */
export { addScaleEvent, getScaleAnalytics, generateScaleReport };