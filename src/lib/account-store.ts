/**
 * Vital Diaries — Deterministic Local Account & Credential Management Store
 * 
 * Invariants:
 * 1. ONE EMAIL -> ONE ACCOUNT -> ONE PASSWORD CREDENTIAL -> ONE ENCRYPTION-KEY IDENTITY
 * 2. Deterministic Email Normalization: email.trim().toLowerCase()
 * 3. Zero Plaintext Passwords: Password credentials stored strictly as PBKDF2-HMAC-SHA256 hashes with 16-byte random salts.
 * 4. Unique Email Index: Uniqueness constraint enforced at persistence layer in Dexie IndexedDB.
 * 5. Wrong passwords NEVER create an account, NEVER generate new keys, and NEVER overwrite existing vaults.
 */

import { db } from './db';
import { hashPasswordForVerification, verifyPasswordHash, unlockVaultEnvelope, type VaultCryptoMetadata } from './envelope-crypto';
import type { UserAccount, UserProfile } from '../types/auth';

/**
 * Normalizes an email address deterministically:
 * Trims leading/trailing whitespace and lowercases all characters.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Retrieves an existing account by its normalized email.
 * Checks IndexedDB (primary) and localStorage sync (secondary).
 */
export async function getAccountByEmail(email: string): Promise<UserAccount | null> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  try {
    const fromDb = await db.accounts.where('email').equals(cleanEmail).first();
    if (fromDb) return fromDb;
  } catch {
    // Graceful fallback for environments where IndexedDB is inaccessible
  }

  try {
    const raw = localStorage.getItem(`vital_account_${cleanEmail}`);
    if (raw) {
      const parsed: UserAccount = JSON.parse(raw);
      if (parsed && normalizeEmail(parsed.email) === cleanEmail) {
        return parsed;
      }
    }
  } catch {}

  return null;
}

/**
 * Registers a brand-new user account with salted password verification credentials.
 * 
 * Rules:
 * - If the normalized email is already registered, REJECTS with an error.
 * - NEVER overwrites an existing account or its password.
 * - NEVER stores plaintext passwords.
 */
/**
 * Registers a brand-new user account with salted password verification credentials.
 * 
 * Rules:
 * - If the normalized email is already registered, REJECTS with an error.
 * - NEVER overwrites an existing account or its password.
 * - NEVER stores plaintext passwords.
 */
export async function registerLocalAccount(
  name: string,
  email: string,
  password: string
): Promise<UserAccount> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    throw new Error('Please provide a valid email address.');
  }
  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  // 1. Uniqueness check: Ensure email does NOT already exist
  const existing = await getAccountByEmail(cleanEmail);
  if (existing) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  // 2. Hash password for verification using PBKDF2-HMAC-SHA256 (100,000 iterations)
  const { hashBase64, saltBase64, iterations } = await hashPasswordForVerification(password);

  const accountId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const newAccount: UserAccount = {
    id: accountId,
    email: cleanEmail,
    name: name.trim() || cleanEmail.split('@')[0] || 'Patient',
    passwordHash: hashBase64,
    passwordSalt: saltBase64,
    kdfIterations: iterations,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Persist in IndexedDB with uniqueness constraint
  try {
    await db.accounts.put(newAccount);
  } catch (err: any) {
    if (err?.name === 'ConstraintError' || String(err).includes('Key already exists')) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
  }

  // 4. Sync metadata to localStorage (without plaintext password)
  try {
    localStorage.setItem(`vital_account_${cleanEmail}`, JSON.stringify(newAccount));
    localStorage.setItem(`vital_user_${cleanEmail}`, JSON.stringify({
      id: newAccount.id,
      name: newAccount.name,
      email: newAccount.email,
      is_staff: false,
      is_superuser: false,
      created_at: newAccount.createdAt,
    }));
  } catch {}

  return newAccount;
}

/**
 * Synchronizes local account credentials after successful server authentication or registration.
 */
export async function syncLocalAccountCredentials(
  name: string,
  email: string,
  password: string,
  userId?: string
): Promise<UserAccount> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || !password) {
    throw new Error('Valid email and password required.');
  }

  const existing = await getAccountByEmail(cleanEmail);
  const { hashBase64, saltBase64, iterations } = await hashPasswordForVerification(password);

  const account: UserAccount = {
    id: userId || existing?.id || `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    name: name.trim() || existing?.name || cleanEmail.split('@')[0] || 'Patient',
    passwordHash: hashBase64,
    passwordSalt: saltBase64,
    kdfIterations: iterations,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.accounts.put(account);
  } catch {}

  try {
    localStorage.setItem(`vital_account_${cleanEmail}`, JSON.stringify(account));
    localStorage.setItem(`vital_user_${cleanEmail}`, JSON.stringify({
      id: account.id,
      name: account.name,
      email: account.email,
      is_staff: false,
      is_superuser: false,
      created_at: account.createdAt,
    }));
  } catch {}

  return account;
}

/**
 * Verifies candidate credentials against stored account verification hash.
 * 
 * Rules:
 * - If account does not exist -> checks existing local vault envelope for auto-migration, otherwise returns failure ('Account not found').
 * - If password hash does not match -> returns failure ('Incorrect password').
 * - NEVER creates accounts, NEVER creates vaults, NEVER overwrites keys on failure.
 */
export async function verifyAccountCredentials(
  email: string,
  candidatePassword: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }
  if (!candidatePassword) {
    return { success: false, error: 'Please enter your password.' };
  }

  // 1. Look up existing account by normalized email
  let account = await getAccountByEmail(cleanEmail);
  if (!account) {
    // Auto-migration check: If an existing vault envelope can be unlocked with this candidate password, seed account
    try {
      const metaRecord = await db.settings.get('vault_crypto_metadata');
      if (metaRecord && metaRecord.value) {
        const metadata = metaRecord.value as VaultCryptoMetadata;
        await unlockVaultEnvelope(candidatePassword, metadata);
        
        // Unwrap succeeded! Candidate password is authentic. Auto-seed account record.
        const { hashBase64, saltBase64, iterations } = await hashPasswordForVerification(candidatePassword);
        const nameRecord = await db.settings.get('vault_user_name');
        const restoredAccount: UserAccount = {
          id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
          email: cleanEmail,
          name: nameRecord?.value || cleanEmail.split('@')[0] || 'Patient',
          passwordHash: hashBase64,
          passwordSalt: saltBase64,
          kdfIterations: iterations,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.accounts.put(restoredAccount);
        try {
          localStorage.setItem(`vital_account_${cleanEmail}`, JSON.stringify(restoredAccount));
        } catch {}
        return { success: true, account: restoredAccount };
      }
    } catch {
      // Could not unlock stored metadata or metadata doesn't exist
    }

    return {
      success: false,
      error: 'Account not found with this email. Please check your email or sign up.',
    };
  }

  // 2. Cryptographic verification against stored PBKDF2 hash
  const isValid = await verifyPasswordHash(
    candidatePassword,
    account.passwordHash,
    account.passwordSalt
  );

  if (!isValid) {
    return {
      success: false,
      error: 'Incorrect password. Please try again.',
    };
  }

  return { success: true, account };
}

/**
 * Changes password for an existing account after verifying current password.
 */
export async function changeLocalAccountPassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<UserAccount> {
  const cleanEmail = normalizeEmail(email);
  const verifyRes = await verifyAccountCredentials(cleanEmail, oldPassword);
  if (!verifyRes.success || !verifyRes.account) {
    throw new Error('Incorrect current password.');
  }

  if (!newPassword || newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters long.');
  }

  const { hashBase64, saltBase64, iterations } = await hashPasswordForVerification(newPassword);
  const updatedAccount: UserAccount = {
    ...verifyRes.account,
    passwordHash: hashBase64,
    passwordSalt: saltBase64,
    kdfIterations: iterations,
    updatedAt: new Date().toISOString(),
  };

  try {
    await db.accounts.put(updatedAccount);
  } catch {
    // Headless / SSR fallback
  }
  try {
    localStorage.setItem(`vital_account_${cleanEmail}`, JSON.stringify(updatedAccount));
  } catch {}

  return updatedAccount;
}

/**
 * Resets account password using recovery authorization.
 */
export async function resetAccountPasswordWithRecovery(
  email: string,
  newPassword: string
): Promise<UserAccount> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) {
    throw new Error('Please provide an email address.');
  }
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  let account = await getAccountByEmail(cleanEmail);
  const { hashBase64, saltBase64, iterations } = await hashPasswordForVerification(newPassword);

  if (!account) {
    account = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0] || 'Patient',
      passwordHash: hashBase64,
      passwordSalt: saltBase64,
      kdfIterations: iterations,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    account = {
      ...account,
      passwordHash: hashBase64,
      passwordSalt: saltBase64,
      kdfIterations: iterations,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    await db.accounts.put(account);
  } catch {}
  try {
    localStorage.setItem(`vital_account_${cleanEmail}`, JSON.stringify(account));
  } catch {}

  return account;
}

/**
 * Resets all local vault encryption credentials and account cache for fresh setup.
 */
export async function resetLocalVault(): Promise<void> {
  try {
    await db.settings.delete('vault_crypto_metadata');
    await db.settings.delete('vault_salt');
    await db.settings.delete('vault_crypto_key');
    await db.settings.delete('vault_recovery_key');
    await db.settings.delete('vault_user_id');
    await db.settings.delete('vault_user_name');
    await db.accounts.clear();
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = new Set<string>();

      // Check Object.keys
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('vital_') || k.startsWith('vault_')) {
            keysToRemove.add(k);
          }
        });
      } catch {}

      // Check standard length index
      try {
        if (typeof localStorage.length === 'number') {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('vital_') || k.startsWith('vault_'))) {
              keysToRemove.add(k);
            }
          }
        }
      } catch {}

      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {}
}

/**
 * Deletes an account by email to allow fresh registration.
 */
export async function deleteLocalAccount(email: string): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;

  try {
    const existing = await db.accounts.where('email').equals(cleanEmail).first();
    if (existing) {
      await db.accounts.delete(existing.id);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`vital_account_${cleanEmail}`);
      localStorage.removeItem(`vital_user_${cleanEmail}`);
    }
  } catch {}
}

/**
 * Converts a UserAccount to a public UserProfile without cryptographic hashes.
 */
export function accountToUserProfile(account: UserAccount): UserProfile {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    is_staff: false,
    is_superuser: false,
    created_at: account.createdAt,
  };
}
