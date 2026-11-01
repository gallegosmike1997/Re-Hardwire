/**
 * Biometric Lock & Privacy Vault Utilities (Week 10)
 *
 * Manages local PIN/biometric lock state and stealth privacy mode
 * for protecting sensitive support plans and relationship boundaries.
 */
import { getStorage, setStorage } from './storage';

const VAULT_PIN_KEY = 'rehardwire_vault_pin_v1';
const PRIVACY_MODE_KEY = 'rehardwire_stealth_mode_v1';

export function setVaultPin(pin: string): void {
  setStorage(VAULT_PIN_KEY, pin);
}

export function verifyVaultPin(pin: string): boolean {
  const saved = getStorage<string>(VAULT_PIN_KEY);
  if (!saved) return true; // No pin set
  return saved === pin;
}

export function hasVaultPin(): boolean {
  return Boolean(getStorage<string>(VAULT_PIN_KEY));
}

export function setStealthMode(enabled: boolean): void {
  setStorage(PRIVACY_MODE_KEY, enabled);
}

export function getStealthMode(): boolean {
  return Boolean(getStorage<boolean>(PRIVACY_MODE_KEY));
}
