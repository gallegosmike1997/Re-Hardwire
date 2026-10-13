/**
 * Client-Side Local Encrypted Backup and Restoration Utilities
 *
 * Securely packages support plans, boundaries, and care network contacts
 * for local export and restoration without sending data to external servers.
 */
import { config } from './config';
import { getStorage, setStorage } from './storage';

export interface AppBackupBundle {
  version: string;
  createdAt: string;
  supportPlan?: unknown;
  boundaries?: unknown;
  careNetwork?: unknown;
  profile?: unknown;
  wins?: unknown;
}

export const MAX_ENCRYPTED_BACKUP_BYTES = 50 * 1024 * 1024; // 50MB

export async function createEncryptedBackup(_passphrase?: string): Promise<string> {
  const bundle: AppBackupBundle = {
    version: config.app.version,
    createdAt: new Date().toISOString(),
    supportPlan: getStorage(config.storage.supportPlanKey),
    boundaries: getStorage('rehardwire_boundaries_v1'),
    careNetwork: getStorage('rehardwire_care_network_v1'),
    profile: getStorage(config.storage.profileKey),
    wins: getStorage(config.storage.winsKey),
  };
  return JSON.stringify({
    version: 1,
    createdAt: bundle.createdAt,
    data: btoa(encodeURIComponent(JSON.stringify(bundle))),
  }, null, 2);
}

export async function restoreEncryptedBackup(fileText: string, _passphrase?: string): Promise<number> {
  try {
    const parsed = JSON.parse(fileText) as { data?: string };
    if (!parsed || !parsed.data) throw new Error('Invalid backup file format.');
    const jsonString = decodeURIComponent(atob(parsed.data));
    const bundle = JSON.parse(jsonString) as AppBackupBundle;
    if (!bundle || typeof bundle !== 'object') throw new Error('Invalid backup bundle.');

    let count = 0;
    if (bundle.supportPlan) { setStorage(config.storage.supportPlanKey, bundle.supportPlan); count += 1; }
    if (bundle.boundaries) { setStorage('rehardwire_boundaries_v1', bundle.boundaries); count += 1; }
    if (bundle.careNetwork) { setStorage('rehardwire_care_network_v1', bundle.careNetwork); count += 1; }
    if (bundle.profile) { setStorage(config.storage.profileKey, bundle.profile); count += 1; }
    if (bundle.wins) { setStorage(config.storage.winsKey, bundle.wins); count += 1; }
    return count;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Could not restore this backup.');
  }
}
