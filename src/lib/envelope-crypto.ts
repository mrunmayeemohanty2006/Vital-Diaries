/**
 * Envelope Cryptography Architecture for Vital Diaries (Phases 1A, 1B, 1C).
 *
 * Dual-Envelope Key Hierarchy:
 *
 * Normal Path:
 *   User Password + Cryptographic Salt ──▶ KDF (PBKDF2-SHA256, 100k) ──▶ KEK ──┐
 *                                                                             │
 * Recovery Path:                                                              ├─▶ Wraps / Unwraps ──▶ Random 256-bit DEK ──▶ AES-256-GCM ──▶ Medical Data
 *   Recovery Secret + Recovery Salt ────▶ KDF (PBKDF2-SHA256, 100k) ──▶ R-KEK ─┘
 *
 * Invariants:
 * 1. Password and Recovery Secret NEVER directly encrypt medical records.
 * 2. Plaintext Password, KEK, Recovery KEK, DEK, and Recovery Secret are NEVER persisted.
 * 3. DEK is an independent 256-bit random AES-GCM key.
 * 4. Password change re-wraps the same DEK under a new KEK without re-encrypting medical records.
 * 5. Recovery secret provides an independent emergency unwrap path for the same DEK.
 */

// Universal Web Crypto accessor (works in browser window and Node/test environments)
export function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in this environment');
}

// Convert ArrayBuffer / Uint8Array to Base64 string
export function bytesToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 string to Uint8Array
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  }
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// KDF Configuration Parameters
export const KDF_CONFIG = {
  algorithm: 'PBKDF2-HMAC-SHA256' as const,
  hash: 'SHA-256' as const,
  iterations: 100000,
  saltSizeBytes: 16,     // 128 bits
  keySizeBytes: 32,      // 256 bits
  ivSizeBytes: 12,       // 96 bits for AES-GCM
  cipherAlgorithm: 'AES-256-GCM' as const,
  cryptoVersion: 2,
};

export interface KDFParams {
  iterations: number;
  hash: string;
  saltLengthBytes: number;
}

/**
 * Recovery crypto metadata persisted inside VaultCryptoMetadata.
 * Holds ONLY salt, wrapped DEK, and IV. NEVER the plaintext recovery secret.
 */
export interface RecoveryCryptoMetadata {
  recoverySalt: string;         // Base64 encoded 16-byte random salt
  recoveryWrappedDEK: string;   // Base64 encoded wrapped DEK ciphertext + auth tag
  recoveryWrapIV: string;       // Base64 encoded 12-byte IV
  kdfParams: KDFParams;
}

/**
 * Vault Cryptographic Metadata persisted in local settings.
 * Contains only non-secret public parameters and wrapped ciphertext.
 * NEVER contains plaintext password, KEK, DEK, or recovery secret.
 */
export interface VaultCryptoMetadata {
  cryptoVersion: number;
  kdf: 'PBKDF2-HMAC-SHA256';
  kdfParams: KDFParams;
  salt: string;              // Base64 encoded 16-byte random salt
  wrappedDEK: string;        // Base64 encoded wrapped DEK ciphertext + auth tag
  wrapIV: string;            // Base64 encoded 12-byte IV used for wrapping
  cipherAlgorithm: 'AES-256-GCM';
  recovery?: RecoveryCryptoMetadata;
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

export interface WrappedDEKPayload {
  wrappedDEK: string;
  wrapIV: string;
}

/**
 * Generates a cryptographically random 16-byte (128-bit) salt using Web Crypto.
 */
export function generateSalt(length: number = KDF_CONFIG.saltSizeBytes): Uint8Array {
  const crypto = getCrypto();
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a cryptographically random 12-byte (96-bit) IV for AES-GCM wrapping.
 */
export function generateWrapIV(length: number = KDF_CONFIG.ivSizeBytes): Uint8Array {
  const crypto = getCrypto();
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a cryptographically secure 24-character master recovery secret formatted as:
 * VITA-XXXX-XXXX-XXXX-XXXX
 * Uses Base32 unambiguous uppercase alphanumeric characters.
 */
export function generateRecoverySecret(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous set (no 0/O, 1/I)
  const randomValues = new Uint8Array(16);
  const crypto = getCrypto();
  crypto.getRandomValues(randomValues);

  let result = 'VITA-';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      result += '-';
    }
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * Generates an independent 256-bit Data Encryption Key (DEK).
 * Requirements:
 * - 256-bit AES-GCM
 * - Cryptographically random Web Crypto generator
 * - NOT derived from the password or salt
 * - Extractable so it can be wrapped/unwrapped by the Web Crypto engine
 */
export async function generateDEK(): Promise<CryptoKey> {
  const crypto = getCrypto();
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // Extractable so Web Crypto wrapKey / unwrapKey can export/import raw key bytes
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives a 256-bit Key Encryption Key (KEK) from the user password and salt using PBKDF2-HMAC-SHA256.
 *
 * @param password User vault password
 * @param salt Cryptographic salt (Uint8Array or Base64 string)
 * @param iterations Optional iterations count (defaults to 100,000)
 */
export async function deriveKEK(
  password: string,
  salt: Uint8Array | string,
  iterations: number = KDF_CONFIG.iterations
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password.normalize('NFKC'));

  const saltBytes = typeof salt === 'string' ? base64ToBytes(salt) : salt;

  // Import raw password as key material for PBKDF2 derivation
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit KEK for wrapping/unwrapping
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iterations,
      hash: KDF_CONFIG.hash,
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // KEK is non-extractable from Web Crypto memory
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );
}

/**
 * Derives a 256-bit Recovery Key Encryption Key (Recovery KEK) from the recovery secret and salt.
 */
export async function deriveRecoveryKEK(
  recoverySecret: string,
  recoverySalt: Uint8Array | string,
  iterations: number = KDF_CONFIG.iterations
): Promise<CryptoKey> {
  const normalizedSecret = recoverySecret.trim().toUpperCase().replace(/\s+/g, '-');
  return deriveKEK(normalizedSecret, recoverySalt, iterations);
}

/**
 * Wraps the 256-bit DEK using the KEK with AES-256-GCM authenticated encryption.
 * A fresh 96-bit random IV is generated for every wrap operation.
 */
export async function wrapDEK(dek: CryptoKey, kek: CryptoKey): Promise<WrappedDEKPayload> {
  const crypto = getCrypto();
  const wrapIV = generateWrapIV();

  const wrappedBuffer = await crypto.subtle.wrapKey(
    'raw',
    dek,
    kek,
    {
      name: 'AES-GCM',
      iv: wrapIV,
    }
  );

  return {
    wrappedDEK: bytesToBase64(wrappedBuffer),
    wrapIV: bytesToBase64(wrapIV),
  };
}

/**
 * Wraps a DEK with a recovery secret and produces the RecoveryCryptoMetadata structure.
 */
export async function wrapDEKWithRecovery(
  dek: CryptoKey,
  recoverySecret: string
): Promise<RecoveryCryptoMetadata> {
  const recoverySalt = generateSalt();
  const recoveryKEK = await deriveRecoveryKEK(recoverySecret, recoverySalt);
  const wrapped = await wrapDEK(dek, recoveryKEK);

  return {
    recoverySalt: bytesToBase64(recoverySalt),
    recoveryWrappedDEK: wrapped.wrappedDEK,
    recoveryWrapIV: wrapped.wrapIV,
    kdfParams: {
      iterations: KDF_CONFIG.iterations,
      hash: KDF_CONFIG.hash,
      saltLengthBytes: KDF_CONFIG.saltSizeBytes,
    },
  };
}

/**
 * Unwraps a wrapped DEK using the KEK with AES-256-GCM.
 * Authenticates ciphertext and tag; throws if password/KEK is incorrect or ciphertext is tampered.
 */
export async function unwrapDEK(
  wrappedDEKBase64: string,
  wrapIVBase64: string,
  kek: CryptoKey
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const wrappedBytes = base64ToBytes(wrappedDEKBase64);
  const wrapIVBytes = base64ToBytes(wrapIVBase64);

  try {
    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedBytes,
      kek,
      {
        name: 'AES-GCM',
        iv: wrapIVBytes,
      },
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // DEK remains extractable for re-wrapping during password change
      ['encrypt', 'decrypt']
    );
  } catch (err) {
    throw new Error('Unwrap DEK failed: Authentication tag mismatch or invalid Key Encryption Key');
  }
}

/**
 * Exports raw bytes of a key (helper for identity verification in tests / re-wrapping).
 */
export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  const crypto = getCrypto();
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Creates a brand new vault envelope:
 * 1. Generates fresh random salt.
 * 2. Derives KEK from password + salt via PBKDF2.
 * 3. Generates independent random 256-bit DEK.
 * 4. Wraps DEK with password KEK.
 * 5. Optionally wraps DEK with recovery secret (dual-envelope).
 * 6. Returns public metadata struct and active DEK.
 */
export async function createVaultEnvelope(
  password: string,
  recoverySecret?: string
): Promise<{ metadata: VaultCryptoMetadata; dek: CryptoKey; recoverySecret: string }> {
  const salt = generateSalt();
  const kek = await deriveKEK(password, salt);
  const dek = await generateDEK();
  const wrapped = await wrapDEK(dek, kek);

  const sec = recoverySecret || generateRecoverySecret();
  const recoveryMetadata = await wrapDEKWithRecovery(dek, sec);

  const now = new Date().toISOString();
  const metadata: VaultCryptoMetadata = {
    cryptoVersion: KDF_CONFIG.cryptoVersion,
    kdf: KDF_CONFIG.algorithm,
    kdfParams: {
      iterations: KDF_CONFIG.iterations,
      hash: KDF_CONFIG.hash,
      saltLengthBytes: KDF_CONFIG.saltSizeBytes,
    },
    salt: bytesToBase64(salt),
    wrappedDEK: wrapped.wrappedDEK,
    wrapIV: wrapped.wrapIV,
    cipherAlgorithm: KDF_CONFIG.cipherAlgorithm,
    recovery: recoveryMetadata,
    createdAt: now,
    updatedAt: now,
  };

  return { metadata, dek, recoverySecret: sec };
}

/**
 * Unlocks an existing vault envelope using the user password:
 * 1. Derives KEK from password + persisted salt.
 * 2. Unwraps persisted wrappedDEK using KEK and persisted wrapIV.
 * 3. Returns the active DEK for encrypting/decrypting medical records.
 */
export async function unlockVaultEnvelope(
  password: string,
  metadata: VaultCryptoMetadata
): Promise<CryptoKey> {
  const kek = await deriveKEK(password, metadata.salt, metadata.kdfParams.iterations);
  return unwrapDEK(metadata.wrappedDEK, metadata.wrapIV, kek);
}

/**
 * Unlocks an existing vault envelope using the recovery secret:
 * 1. Derives Recovery KEK from recovery secret + persisted recoverySalt.
 * 2. Unwraps persisted recoveryWrappedDEK using Recovery KEK and recoveryWrapIV.
 * 3. Returns the active DEK.
 */
export async function unlockVaultWithRecovery(
  recoverySecret: string,
  metadata: VaultCryptoMetadata
): Promise<CryptoKey> {
  if (!metadata.recovery) {
    throw new Error('No recovery metadata configured on this vault.');
  }

  const recoveryKEK = await deriveRecoveryKEK(
    recoverySecret,
    metadata.recovery.recoverySalt,
    metadata.recovery.kdfParams.iterations
  );

  return unwrapDEK(
    metadata.recovery.recoveryWrappedDEK,
    metadata.recovery.recoveryWrapIV,
    recoveryKEK
  );
}

/**
 * Changes vault password safely without re-encrypting medical records:
 * 1. Unwraps existing DEK using the old password.
 * 2. Generates fresh random salt.
 * 3. Derives new KEK from new password + new salt.
 * 4. Re-wraps existing DEK under new KEK with fresh wrap IV.
 * 5. Retains existing recovery envelope (which wraps the exact same DEK).
 * 6. Returns updated VaultCryptoMetadata with unchanged DEK.
 */
export async function changeVaultPassword(
  oldPassword: string,
  newPassword: string,
  metadata: VaultCryptoMetadata
): Promise<{ updatedMetadata: VaultCryptoMetadata; dek: CryptoKey }> {
  // 1. Authenticate old password and obtain existing DEK
  const dek = await unlockVaultEnvelope(oldPassword, metadata);

  // 2. Generate fresh salt and derive new KEK
  const newSalt = generateSalt();
  const newKEK = await deriveKEK(newPassword, newSalt);

  // 3. Wrap existing DEK with new KEK
  const newWrapped = await wrapDEK(dek, newKEK);

  const updatedMetadata: VaultCryptoMetadata = {
    ...metadata,
    salt: bytesToBase64(newSalt),
    wrappedDEK: newWrapped.wrappedDEK,
    wrapIV: newWrapped.wrapIV,
    updatedAt: new Date().toISOString(),
  };

  return { updatedMetadata, dek };
}
