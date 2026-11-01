/**
 * QR Code Data Payload and Compression Utilities for Air-Gapped Sync
 *
 * Compresses and encodes local app data bundle into compact chunks suitable
 * for QR code generation and optical scanning between offline devices.
 */
import { createEncryptedBackup, restoreEncryptedBackup } from './encryptedBackup';

export function createSyncPayload(): string {
  try {
    const backupBase64 = createEncryptedBackup();
    const payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      d: backupBase64,
    });
    return btoa(encodeURIComponent(payload));
  } catch {
    return '';
  }
}

export function restoreSyncPayload(payloadBase64: string): boolean {
  try {
    const jsonString = decodeURIComponent(atob(payloadBase64));
    const envelope = JSON.parse(jsonString) as { v: number; d: string };
    if (!envelope || !envelope.d) return false;
    void restoreEncryptedBackup(envelope.d);
    return true;
  } catch {
    return false;
  }
}
