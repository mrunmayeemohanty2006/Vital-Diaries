/**
 * Vital Diaries — Cloud Vault Envelope Synchronization (Phase 2A)
 * 
 * Synchronizes ONLY the encrypted vault envelope metadata with Supabase public.user_vault_keys.
 * Zero-Knowledge Invariants:
 * 1. NEVER uploads plaintext DEK, password, or derived KEK to Supabase.
 * 2. NEVER exposes DEK in logs or URL parameters.
 * 3. Keeps the active CryptoKey strictly in memory (RAM).
 * 4. Offline resilient: local vault remains functional if Supabase is unavailable.
 */

import { supabase } from './supabase';
import { db } from './db';
import {
  unlockVaultEnvelope,
  type VaultCryptoMetadata,
} from './envelope-crypto';
import {
  getStoredVaultMetadata,
  VAULT_METADATA_KEY,
} from './key-management';
import type { CloudVaultEnvelope, UserVaultKeysRow } from '../types/auth';

/**
 * Maps local VaultCryptoMetadata to a CloudVaultEnvelope structure.
 */
export function vaultMetadataToCloudEnvelope(
  userId: string,
  metadata: VaultCryptoMetadata
): CloudVaultEnvelope {
  return {
    userId,
    cryptoVersion: metadata.cryptoVersion,
    kdfAlgorithm: metadata.kdf,
    kdfIterations: metadata.kdfParams.iterations,
    kdfSalt: metadata.salt,
    wrappedDek: metadata.wrappedDEK,
    wrapIv: metadata.wrapIV,
    recoveryKdfSalt: metadata.recovery?.recoverySalt || null,
    recoveryWrappedDek: metadata.recovery?.recoveryWrappedDEK || null,
    recoveryWrapIv: metadata.recovery?.recoveryWrapIV || null,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  };
}

/**
 * Maps a CloudVaultEnvelope or UserVaultKeysRow back to VaultCryptoMetadata.
 */
export function cloudEnvelopeToVaultMetadata(
  envelope: CloudVaultEnvelope | UserVaultKeysRow
): VaultCryptoMetadata {
  const isRow = 'user_id' in envelope;
  const cryptoVersion = isRow ? envelope.crypto_version : envelope.cryptoVersion;
  const kdfAlgorithm = isRow ? envelope.kdf_algorithm : envelope.kdfAlgorithm;
  const kdfIterations = isRow ? envelope.kdf_iterations : envelope.kdfIterations;
  const kdfSalt = isRow ? envelope.kdf_salt : envelope.kdfSalt;
  const wrappedDek = isRow ? envelope.wrapped_dek : envelope.wrappedDek;
  const wrapIv = isRow ? envelope.wrap_iv : envelope.wrapIv;
  const recoveryKdfSalt = isRow ? envelope.recovery_kdf_salt : envelope.recoveryKdfSalt;
  const recoveryWrappedDek = isRow ? envelope.recovery_wrapped_dek : envelope.recoveryWrappedDek;
  const recoveryWrapIv = isRow ? envelope.recovery_wrap_iv : envelope.recoveryWrapIv;
  const createdAt = (isRow ? envelope.created_at : envelope.createdAt) || new Date().toISOString();
  const updatedAt = (isRow ? envelope.updated_at : envelope.updatedAt) || new Date().toISOString();

  return {
    cryptoVersion: cryptoVersion || 2,
    kdf: (kdfAlgorithm as 'PBKDF2-HMAC-SHA256') || 'PBKDF2-HMAC-SHA256',
    kdfParams: {
      iterations: kdfIterations || 100000,
      hash: 'SHA-256',
      saltLengthBytes: 16,
    },
    salt: kdfSalt,
    wrappedDEK: wrappedDek,
    wrapIV: wrapIv,
    cipherAlgorithm: 'AES-256-GCM',
    recovery: recoveryWrappedDek && recoveryWrapIv && recoveryKdfSalt ? {
      recoverySalt: recoveryKdfSalt,
      recoveryWrappedDEK: recoveryWrappedDek,
      recoveryWrapIV: recoveryWrapIv,
      kdfParams: {
        iterations: kdfIterations || 100000,
        hash: 'SHA-256',
        saltLengthBytes: 16,
      },
    } : undefined,
    createdAt,
    updatedAt,
  };
}

/**
 * Persists VaultCryptoMetadata into local IndexedDB and localStorage cache.
 */
export async function saveStoredVaultMetadata(metadata: VaultCryptoMetadata): Promise<void> {
  try {
    await db.settings.put({ key: VAULT_METADATA_KEY, value: metadata });
    await db.settings.put({ key: 'vault_salt', value: metadata.salt });
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VAULT_METADATA_KEY, JSON.stringify(metadata));
      localStorage.setItem('vault_salt', metadata.salt);
    }
  } catch {}
}

/**
 * Uploads ONLY the wrapped vault envelope metadata to Supabase public.user_vault_keys.
 * Uses upsert with user_id = canonical Supabase auth.users.id.
 */
export async function uploadVaultEnvelopeToSupabase(
  userId: string,
  metadata: VaultCryptoMetadata
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required to upload vault envelope.' };
  }

  const row: UserVaultKeysRow = {
    user_id: userId,
    crypto_version: metadata.cryptoVersion,
    kdf_algorithm: metadata.kdf,
    kdf_iterations: metadata.kdfParams.iterations,
    kdf_salt: metadata.salt,
    wrapped_dek: metadata.wrappedDEK,
    wrap_iv: metadata.wrapIV,
    recovery_kdf_salt: metadata.recovery?.recoverySalt || null,
    recovery_wrapped_dek: metadata.recovery?.recoveryWrappedDEK || null,
    recovery_wrap_iv: metadata.recovery?.recoveryWrapIV || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from('user_vault_keys')
      .upsert(row, { onConflict: 'user_id' });

    if (error) {
      console.warn('Cloud vault envelope upload notice:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Cloud vault envelope upload notice:', err.message);
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Retrieves the user's vault envelope from Supabase public.user_vault_keys.
 */
export async function downloadVaultEnvelopeFromSupabase(
  userId: string
): Promise<VaultCryptoMetadata | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_vault_keys')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return cloudEnvelopeToVaultMetadata(data as UserVaultKeysRow);
  } catch (err) {
    console.warn('Cloud vault envelope download notice:', err);
    return null;
  }
}

/**
 * Evaluates and handles all 4 multi-device vault synchronization cases:
 *
 * CASE A: Cloud vault exists + Local vault missing (Device B login)
 *         -> Downloads cloud envelope, derives KEK with password, unwraps DEK, stores local metadata.
 * CASE B: Local vault exists + Cloud vault missing (Device A sync)
 *         -> Uploads local envelope to Supabase.
 * CASE C: Both local and cloud exist
 *         -> Compares metadata; prevents overwriting on conflict.
 * CASE D: Neither exists
 *         -> Does not create a vault silently; returns safe error.
 */
export async function synchronizeVaultEnvelopeOnLogin(
  userId: string,
  password: string
): Promise<{
  success: boolean;
  dek?: CryptoKey;
  metadata?: VaultCryptoMetadata;
  action: 'unwrapped_local' | 'restored_from_cloud' | 'synced_to_cloud' | 'already_in_sync' | 'mismatch_warning' | 'no_vault';
  error?: string;
}> {
  const localMetadata = await getStoredVaultMetadata();
  const cloudMetadata = await downloadVaultEnvelopeFromSupabase(userId);

  // CASE A: Cloud exists + Local missing (Device B)
  if (!localMetadata && cloudMetadata) {
    try {
      const dek = await unlockVaultEnvelope(password, cloudMetadata);
      await saveStoredVaultMetadata(cloudMetadata);
      return {
        success: true,
        dek,
        metadata: cloudMetadata,
        action: 'restored_from_cloud',
      };
    } catch {
      return {
        success: false,
        action: 'restored_from_cloud',
        error: 'Incorrect password. Please verify your credentials or use your master recovery key.',
      };
    }
  }

  // CASE B: Local exists + Cloud missing (Device A first sync)
  if (localMetadata && !cloudMetadata) {
    try {
      const dek = await unlockVaultEnvelope(password, localMetadata);
      // Asynchronously upload local envelope to cloud
      uploadVaultEnvelopeToSupabase(userId, localMetadata).catch(() => {});
      return {
        success: true,
        dek,
        metadata: localMetadata,
        action: 'synced_to_cloud',
      };
    } catch {
      return {
        success: false,
        action: 'synced_to_cloud',
        error: 'Incorrect password. Please verify your credentials or use your master recovery key.',
      };
    }
  }

  // CASE C: Both exist (Device A or Device B already set up)
  if (localMetadata && cloudMetadata) {
    // Check if envelopes match
    const isSameVault =
      localMetadata.wrappedDEK === cloudMetadata.wrappedDEK &&
      localMetadata.salt === cloudMetadata.salt;

    if (!isSameVault) {
      console.warn('Local and cloud vault envelopes differ. Preserving local vault to prevent data loss.');
    }

    try {
      const dek = await unlockVaultEnvelope(password, localMetadata);
      return {
        success: true,
        dek,
        metadata: localMetadata,
        action: isSameVault ? 'already_in_sync' : 'mismatch_warning',
      };
    } catch {
      return {
        success: false,
        action: 'already_in_sync',
        error: 'Incorrect password. Please verify your credentials or use your master recovery key.',
      };
    }
  }

  // CASE D: Neither exists
  return {
    success: false,
    action: 'no_vault',
    error: 'No encrypted health vault found for this account. Please register to create your secure health vault.',
  };
}
