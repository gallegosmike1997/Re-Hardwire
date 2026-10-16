/**
 * Data-retention helpers for on-device transcripts.
 * Local chat history auto-expires after 30 days so a lost device
 * does not expose months of conversations. Backend history is untouched.
 */

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function isExpiredTimestamp(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false;
  const time = Date.parse(createdAt);
  if (Number.isNaN(time)) return false;
  return now - time > RETENTION_MS;
}

export function retentionNotice(): string {
  return `Saved chats on this device expire after ${RETENTION_DAYS} days. Export anything you want to keep.`;
}
