import { base64ToArrayBuffer, generateSalt, arrayBufferToBase64 } from './crypto';
import { db } from './db';

const PBKDF2_ITERATIONS = 100000;

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passphrase / recovery key using PBKDF2-SHA256.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBase64: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  // Normalize passphrase (trim, single space normalized)
  const normalizedPassphrase = passphrase.trim().replace(/\s+/g, '-').toUpperCase();
  const passphraseBytes = encoder.encode(normalizedPassphrase);

  // Import raw passphrase material
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = base64ToArrayBuffer(saltBase64);

  // Derive AES-GCM 256-bit key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(saltBuffer),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // Non-extractable key for maximum safety
    ['encrypt', 'decrypt']
  );
}

/**
 * Ensures an active CryptoKey is always available without ever stopping or asking for recovery keys.
 */
export async function getOrEnsureCryptoKey(existingKey?: CryptoKey | null): Promise<CryptoKey> {
  if (existingKey) return existingKey;

  try {
    const keyRecord = await db.settings.get('vault_crypto_key');
    if (keyRecord && keyRecord.value) {
      return keyRecord.value as unknown as CryptoKey;
    }

    let saltRecord = await db.settings.get('vault_salt');
    let salt = saltRecord?.value;
    if (!salt) {
      salt = createNewSaltBase64();
      await db.settings.put({ key: 'vault_salt', value: salt });
    }

    const defaultKey = await deriveKeyFromPassphrase('VITAL-DIARIES-LOCAL-VAULT-KEY', salt);
    await db.settings.put({ key: 'vault_crypto_key', value: defaultKey });
    return defaultKey;
  } catch {
    // Direct random key fallback
    return window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}

/**
 * Generates a cryptographically secure 24-character master recovery key formatted like:
 * VITA-7729-QLZP-9901-BAKE
 */
export function generateMasterRecoveryKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous set
  const randomValues = new Uint8Array(20);
  window.crypto.getRandomValues(randomValues);

  let result = 'VITA-';
  for (let i = 0; i < 20; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-';
    }
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Creates a fresh Base64 salt string
 */
export function createNewSaltBase64(): string {
  const salt = generateSalt();
  return arrayBufferToBase64(salt.buffer);
}

