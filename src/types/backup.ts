/**
 * Backup and restore types for Vital Diaries encrypted packages.
 */

export interface BackupKdfParams {
  algorithm: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
  salt: string; // Base64 encoded salt
}

export interface BackupEncryptionHeader {
  algorithm: 'AES-256-GCM';
  kdf: BackupKdfParams;
  iv: string;   // Base64 encoded IV
}

export interface HealthBackupPackage {
  formatVersion: number;
  appVersion: string;
  createdAt: string;       // ISO timestamp
  userId: string;
  metadata: {
    reportCount: number;
    vitalsCount: number;
    symptomsCount: number;
    medsCount: number;
    hasProfile: boolean;
  };
  encryption: BackupEncryptionHeader;
  encryptedData: string;  // Base64 ciphertext containing serialized JSON of all IndexedDB records
}

export interface BackupHistoryItem {
  id: string;
  createdAt: string;
  destination: 'local_file' | 'google_drive';
  reportCount: number;
  fileSizeBytes: number;
  fileName: string;
}

export interface StorageStatus {
  isPersistent: boolean;
  canPersist: boolean;
  quotaBytes?: number;
  usageBytes?: number;
}
