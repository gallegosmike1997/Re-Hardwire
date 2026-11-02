/** Client-side encrypted backup and restoration for the active local profile. */
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

export interface BackupRestoreResult {
  count: number;
  legacyUnencrypted: boolean;
}

export const MAX_ENCRYPTED_BACKUP_BYTES = 50 * 1024 * 1024;

const BACKUP_VERSION = 2;
const KDF_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) throw new Error('Secure backup encryption is unavailable in this browser.');
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: asArrayBuffer(salt), iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function createEncryptedBackup(passphrase: string): Promise<string> {
  if (passphrase.length < 12) throw new Error('Use a passphrase with at least 12 characters.');

  const bundle: AppBackupBundle = {
    version: config.app.version,
    createdAt: new Date().toISOString(),
    supportPlan: getStorage(config.storage.supportPlanKey),
    boundaries: getStorage('rehardwire_boundaries_v1'),
    careNetwork: getStorage('rehardwire_care_network_v1'),
    profile: getStorage(config.storage.profileKey),
    wins: getStorage(config.storage.winsKey),
  };
  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  if (plaintext.byteLength > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error('This backup exceeds the 50 MB size limit.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveEncryptionKey(passphrase, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(iv) }, key, asArrayBuffer(plaintext),
  ));
  return JSON.stringify({
    version: BACKUP_VERSION,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: KDF_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  }, null, 2);
}

function applyBundle(bundle: AppBackupBundle): number {
  let count = 0;
  if (bundle.supportPlan !== undefined) { setStorage(config.storage.supportPlanKey, bundle.supportPlan); count += 1; }
  if (bundle.boundaries !== undefined) { setStorage('rehardwire_boundaries_v1', bundle.boundaries); count += 1; }
  if (bundle.careNetwork !== undefined) { setStorage('rehardwire_care_network_v1', bundle.careNetwork); count += 1; }
  if (bundle.profile !== undefined) { setStorage(config.storage.profileKey, bundle.profile); count += 1; }
  if (bundle.wins !== undefined) { setStorage(config.storage.winsKey, bundle.wins); count += 1; }
  return count;
}

export async function restoreEncryptedBackup(
  fileText: string,
  passphrase: string,
): Promise<BackupRestoreResult> {
  if (new TextEncoder().encode(fileText).byteLength > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error('This backup exceeds the 50 MB size limit.');
  }
  try {
    const parsed = JSON.parse(fileText) as Record<string, unknown>;
    if (parsed.version === 1 && typeof parsed.data === 'string') {
      const legacy = JSON.parse(decodeURIComponent(atob(parsed.data))) as AppBackupBundle;
      return { count: applyBundle(legacy), legacyUnencrypted: true };
    }
    if (parsed.version !== BACKUP_VERSION || parsed.algorithm !== 'AES-GCM'
      || parsed.kdf !== 'PBKDF2-SHA-256' || typeof parsed.salt !== 'string'
      || typeof parsed.iv !== 'string' || typeof parsed.ciphertext !== 'string'
      || typeof parsed.iterations !== 'number' || parsed.iterations < 100_000
      || parsed.iterations > 1_000_000) {
      throw new Error('Invalid or unsupported encrypted backup format.');
    }
    if (passphrase.length < 12) throw new Error('Enter the backup passphrase.');

    const key = await deriveEncryptionKey(passphrase, fromBase64(parsed.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(fromBase64(parsed.iv)) },
      key,
      asArrayBuffer(fromBase64(parsed.ciphertext)),
    );
    const bundle = JSON.parse(new TextDecoder().decode(plaintext)) as AppBackupBundle;
    if (!bundle || typeof bundle !== 'object') throw new Error('Invalid backup bundle.');
    return { count: applyBundle(bundle), legacyUnencrypted: false };
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Invalid') || error.message.startsWith('Enter '))) {
      throw error;
    }
    throw new Error('Could not decrypt this backup. Check the passphrase and file.');
  }
}