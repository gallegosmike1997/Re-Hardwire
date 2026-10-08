const BACKUP_FORMAT = 're-hardwire-encrypted-backup';
const BACKUP_DATA_FORMAT = 're-hardwire-local-data';
const BACKUP_VERSION = 1;
const KDF_ITERATIONS = 310_000;
const MIN_KDF_ITERATIONS = 100_000;
const MAX_KDF_ITERATIONS = 600_000;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const MAX_BACKUP_PLAINTEXT_BYTES = 37 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const MAX_ENCRYPTED_BACKUP_BYTES = MAX_BACKUP_BYTES;

function getCrypto(): Crypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) throw new Error('This browser does not support encrypted backups.');
  return webCrypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number, webCrypto: Crypto): Promise<CryptoKey> {
  const material = await webCrypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return webCrypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function collectEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith('re-hardwire-')) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}

export async function createEncryptedBackup(passphrase: string): Promise<string> {
  const webCrypto = getCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS, webCrypto);
  const plaintext = encoder.encode(JSON.stringify({
    format: BACKUP_DATA_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries: collectEntries(),
  }));
  if (plaintext.byteLength > MAX_BACKUP_PLAINTEXT_BYTES) {
    throw new Error('Local data is too large for one encrypted backup. Export or clear older data first.');
  }
  const ciphertext = await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const backup = JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: KDF_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  }, null, 2);
  if (encoder.encode(backup).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('The encrypted backup exceeds the 50 MB size limit.');
  }
  return backup;
}

export async function restoreEncryptedBackup(backupText: string, passphrase: string): Promise<number> {
  const webCrypto = getCrypto();
  if (backupText.length > MAX_BACKUP_BYTES || encoder.encode(backupText).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('This backup exceeds the 50 MB size limit.');
  }

  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(backupText) as Record<string, unknown>;
  } catch {
    throw new Error('This file is not a valid Re-Hardwire backup.');
  }
  const iterations = Number(envelope.iterations);
  if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION
    || envelope.kdf !== 'PBKDF2-SHA-256' || envelope.cipher !== 'AES-256-GCM'
    || !Number.isInteger(iterations) || iterations < MIN_KDF_ITERATIONS || iterations > MAX_KDF_ITERATIONS
    || typeof envelope.salt !== 'string' || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string') {
    throw new Error('This backup format is unsupported or incomplete.');
  }

  let payloadText: string;
  try {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ciphertext);
    if (salt.length !== 16 || iv.length !== 12) throw new Error('Invalid backup parameters.');
    const key = await deriveKey(passphrase, salt, iterations, webCrypto);
    const plaintext = await webCrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    payloadText = decoder.decode(plaintext);
  } catch {
    throw new Error('Could not unlock this backup. Check the passphrase and try again.');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadText) as Record<string, unknown>;
  } catch {
    throw new Error('The decrypted backup data is damaged.');
  }
  if (payload.format !== BACKUP_DATA_FORMAT || payload.version !== BACKUP_VERSION
    || !payload.entries || typeof payload.entries !== 'object' || Array.isArray(payload.entries)) {
    throw new Error('The decrypted backup has an unsupported data format.');
  }

  const entries = Object.entries(payload.entries as Record<string, unknown>);
  if (entries.some(([key, value]) => !key.startsWith('re-hardwire-') || typeof value !== 'string')) {
    throw new Error('The backup contains an invalid local data entry.');
  }

  const restoredKeys = new Set(entries.map(([key]) => key));
  const previousEntries = collectEntries();
  try {
    for (const key of Object.keys(previousEntries)) {
      if (!restoredKeys.has(key)) localStorage.removeItem(key);
    }
    for (const [key, value] of entries) localStorage.setItem(key, value as string);
  } catch {
    for (const key of Object.keys(collectEntries())) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(previousEntries)) localStorage.setItem(key, value);
    throw new Error('The browser could not store this backup. Your existing local data was restored.');
  }
  return entries.length;
}
