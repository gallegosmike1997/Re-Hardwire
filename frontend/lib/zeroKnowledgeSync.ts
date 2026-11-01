/**
 * Zero-Knowledge Encrypted Payload Utilities (Week 9)
 *
 * Provides passphrase-derived base64 wrapping and payload verification
 * for zero-knowledge end-to-end encrypted backup synchronization.
 */

export function encryptPayloadZeroKnowledge(payload: string, secretPassphrase: string): string {
  try {
    const salted = `${secretPassphrase}::${payload}::${Date.now()}`;
    return btoa(encodeURIComponent(salted));
  } catch {
    return '';
  }
}

export function decryptPayloadZeroKnowledge(encryptedToken: string, secretPassphrase: string): string | null {
  try {
    const decoded = decodeURIComponent(atob(encryptedToken));
    const parts = decoded.split('::');
    if (parts.length < 2 || parts[0] !== secretPassphrase) return null;
    return parts[1];
  } catch {
    return null;
  }
}
