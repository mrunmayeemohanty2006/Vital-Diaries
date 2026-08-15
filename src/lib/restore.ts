import { db } from './db';
import { decryptData } from './crypto';
import { deriveKeyFromPassphrase } from './key-management';
import type { HealthBackupPackage } from '../types/backup';
import type { HealthReport, VitalLogEntry, SymptomEntry, MedicationEntry, UserHealthProfile } from '../types/health';

export interface DecryptedBackupContent {
  reports: HealthReport[];
  vitalsLog: VitalLogEntry[];
  symptoms: SymptomEntry[];
  medications: MedicationEntry[];
  healthProfile?: UserHealthProfile | null;
}

export interface ParseBackupResult {
  isValid: boolean;
  backupPackage?: HealthBackupPackage;
  error?: string;
}

/**
 * Validates the outer JSON structure of a .healthbackup file
 */
export function parseAndValidateBackupFile(jsonText: string): ParseBackupResult {
  try {
    const data = JSON.parse(jsonText);

    if (!data.formatVersion || typeof data.formatVersion !== 'number') {
      return { isValid: false, error: 'Invalid or missing backup formatVersion' };
    }

    if (!data.encryption || data.encryption.algorithm !== 'AES-256-GCM') {
      return { isValid: false, error: 'Unsupported encryption algorithm. Expected AES-256-GCM.' };
    }

    if (!data.encryption.kdf || !data.encryption.kdf.salt) {
      return { isValid: false, error: 'Missing encryption key derivation parameters (salt).' };
    }

    if (!data.encryptedData || !data.encryption.iv) {
      return { isValid: false, error: 'Backup is missing encrypted data payload or initialization vector.' };
    }

    return {
      isValid: true,
      backupPackage: data as HealthBackupPackage,
    };
  } catch (err) {
    return { isValid: false, error: 'File is not a valid JSON document.' };
  }
}

/**
 * Derives key using backup salt and decrypts the backup package payload
 */
export async function decryptBackupPackage(
  backupPackage: HealthBackupPackage,
  passphraseOrRecoveryKey: string
): Promise<{ decryptedContent: DecryptedBackupContent; derivedKey: CryptoKey }> {
  const saltBase64 = backupPackage.encryption.kdf.salt;
  const iv = backupPackage.encryption.iv;

  // Derive key from candidate passphrase and backup's salt
  const derivedKey = await deriveKeyFromPassphrase(passphraseOrRecoveryKey, saltBase64);

  // Decrypt payload
  const decryptedJsonString = await decryptData(
    backupPackage.encryptedData,
    iv,
    derivedKey
  );

  const decryptedContent = JSON.parse(decryptedJsonString) as DecryptedBackupContent;

  return {
    decryptedContent,
    derivedKey,
  };
}

/**
 * Imports decrypted health data into IndexedDB with option to Merge or Replace
 */
export async function applyRestoredHealthData(
  content: DecryptedBackupContent,
  mode: 'replace' | 'merge'
): Promise<{ reportsAdded: number; totalRecordsRestored: number }> {
  let reportsAdded = 0;
  let totalRecordsRestored = 0;

  await db.transaction(
    'rw',
    [db.reports, db.vitalsLog, db.symptoms, db.medications, db.healthProfile],
    async () => {
      if (mode === 'replace') {
        await db.reports.clear();
        await db.vitalsLog.clear();
        await db.symptoms.clear();
        await db.medications.clear();
        await db.healthProfile.clear();
      }

      if (content.reports && content.reports.length > 0) {
        if (mode === 'replace') {
          await db.reports.bulkAdd(content.reports);
          reportsAdded = content.reports.length;
        } else {
          for (const item of content.reports) {
            const exists = await db.reports.get(item.id);
            if (!exists) {
              await db.reports.put(item);
              reportsAdded++;
            }
          }
        }
      }

      if (content.vitalsLog && content.vitalsLog.length > 0) {
        if (mode === 'replace') {
          await db.vitalsLog.bulkAdd(content.vitalsLog);
        } else {
          for (const item of content.vitalsLog) {
            await db.vitalsLog.put(item);
          }
        }
      }

      if (content.symptoms && content.symptoms.length > 0) {
        if (mode === 'replace') {
          await db.symptoms.bulkAdd(content.symptoms);
        } else {
          for (const item of content.symptoms) {
            await db.symptoms.put(item);
          }
        }
      }

      if (content.medications && content.medications.length > 0) {
        if (mode === 'replace') {
          await db.medications.bulkAdd(content.medications);
        } else {
          for (const item of content.medications) {
            await db.medications.put(item);
          }
        }
      }

      if (content.healthProfile) {
        await db.healthProfile.put(content.healthProfile);
      }
    }
  );

  totalRecordsRestored =
    (content.reports?.length || 0) +
    (content.vitalsLog?.length || 0) +
    (content.symptoms?.length || 0) +
    (content.medications?.length || 0);

  return { reportsAdded, totalRecordsRestored };
}
