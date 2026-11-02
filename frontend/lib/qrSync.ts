/** Encrypted text payload helpers for offline transfer between devices. */
import { createEncryptedBackup, restoreEncryptedBackup, type BackupRestoreResult } from './encryptedBackup';

export async function createSyncPayload(passphrase: string): Promise<string> {
  const encryptedBackup = await createEncryptedBackup(passphrase);
  const payload = JSON.stringify({ version: 2, encryptedBackup });
  return btoa(encodeURIComponent(payload));
}

export async function restoreSyncPayload(
  payloadBase64: string,
  passphrase: string,
): Promise<BackupRestoreResult> {
  const jsonString = decodeURIComponent(atob(payloadBase64));
  const envelope = JSON.parse(jsonString) as { version?: number; encryptedBackup?: string; d?: string };
  const backup = envelope.version === 2 ? envelope.encryptedBackup : envelope.d;
  if (typeof backup !== 'string' || !backup) throw new Error('Invalid sync payload.');
  return restoreEncryptedBackup(backup, passphrase);
}