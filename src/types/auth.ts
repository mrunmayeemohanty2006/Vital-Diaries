/**
 * Vital Diaries — Authentication, Device Trust & Vault State Types
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface UserAccount {
  id: string;
  email: string;           // Normalized lowercase email (Unique key)
  name: string;
  passwordHash: string;    // Base64 PBKDF2-HMAC-SHA256 verification hash (NEVER plaintext)
  passwordSalt: string;    // Base64 16-byte random salt
  kdfIterations: number;   // 100,000
  createdAt: string;
  updatedAt: string;
}

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  platform?: string;
  browser?: string;
  trusted: boolean;
  revoked?: boolean;
  created_at?: string;
  last_seen_at?: string;
}

export interface AuthState {
  accountAuthenticated: boolean;
  deviceTrusted: boolean;
  vaultUnlocked: boolean;
  isAdministrator: boolean;
  user: UserProfile | null;
  currentDevice: DeviceInfo | null;
  authToken: string | null;
}

export type AuthScreenMode =
  | 'login'
  | 'register'
  | 'email_verification_pending'
  | 'recovery_key_display'
  | 'new_device'
  | 'recovery_key_input'
  | 'device_approval';

export interface VaultState {
  isInitialized: boolean;   // True if local user vault password / recovery key exists
  isUnlocked: boolean;      // True if encryption key is derived and held in memory
  userId: string;           // Local pseudonymous identifier (e.g., usr_7f9021)
  recoveryKeySnippet?: string; // Masked representation of recovery key (e.g., VITA-****-BAKE)
  lastUnlockedAt?: string;
}

export interface GoogleDriveAccount {
  isConnected: boolean;
  email?: string;
  name?: string;
  picture?: string;
  accessToken?: string;
  expiresAt?: number;
}

/**
 * Portable Cloud Vault Envelope metadata synchronized with Supabase public.user_vault_keys.
 * Contains strictly non-secret public KDF parameters and AES-GCM wrapped ciphertexts.
 * NEVER contains plaintext password, KEK, DEK, or medical data.
 */
export interface CloudVaultEnvelope {
  userId: string;
  cryptoVersion: number;
  kdfAlgorithm: string;
  kdfIterations: number;
  kdfSalt: string;
  wrappedDek: string;
  wrapIv: string;
  recoveryKdfSalt?: string | null;
  recoveryWrappedDek?: string | null;
  recoveryWrapIv?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Database row representation of public.user_vault_keys in Supabase.
 */
export interface UserVaultKeysRow {
  user_id: string;
  crypto_version: number;
  kdf_algorithm: string;
  kdf_iterations: number;
  kdf_salt: string;
  wrapped_dek: string;
  wrap_iv: string;
  recovery_kdf_salt?: string | null;
  recovery_wrapped_dek?: string | null;
  recovery_wrap_iv?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Database row representation of public.encrypted_reports in Supabase.
 * Strictly contains synchronization metadata and opaque AES-256-GCM ciphertext.
 * NEVER contains plaintext patient data, lab results, diagnoses, notes, or doctor names.
 */
export interface EncryptedCloudReportRow {
  id: string;
  user_id: string;
  encrypted_data: string;
  iv: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Database row representation of public.user_security_devices in Supabase.
 */
export interface SecurityDeviceRow {
  user_id: string;
  device_id: string;
  device_name: string;
  browser: string;
  platform: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export type LoginApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

/**
 * Database row representation of public.user_login_requests in Supabase.
 */
export interface UserLoginRequestRow {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  browser: string;
  platform: string;
  status: LoginApprovalStatus;
  created_at: string;
  expires_at: string;
  approved_at: string | null;
  denied_at: string | null;
}

