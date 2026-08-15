/**
 * Local Vault Authentication and Security state types.
 */

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
