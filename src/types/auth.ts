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
