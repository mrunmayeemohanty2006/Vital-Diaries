import { db } from './db';
import { encryptData } from './crypto';
import type { HealthBackupPackage, BackupHistoryItem } from '../types/backup';

/**
 * Creates a complete encrypted backup package containing all IndexedDB records.
 * The output JSON is fully encrypted with AES-256-GCM before download/saving.
 */
export async function createEncryptedBackup(
  key: CryptoKey,
  saltBase64: string,
  userId: string
): Promise<{ backupPackage: HealthBackupPackage; fileName: string; sizeBytes: number }> {
  // 1. Fetch all local records from IndexedDB
  const reports = await db.reports.toArray();
  const vitalsLog = await db.vitalsLog.toArray();
  const symptoms = await db.symptoms.toArray();
  const medications = await db.medications.toArray();
  const healthProfileList = await db.healthProfile.toArray();

  const fullDataToBackup = {
    reports,
    vitalsLog,
    symptoms,
    medications,
    healthProfile: healthProfileList[0] || null,
  };

  // 2. Serialize JSON and encrypt
  const rawDataJson = JSON.stringify(fullDataToBackup);
  const { cipherText, iv } = await encryptData(rawDataJson, key);

  // 3. Construct versioned backup package metadata
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const fileName = `VitalDiaries-Backup-${dateString}.healthbackup`;

  const backupPackage: HealthBackupPackage = {
    formatVersion: 1,
    appVersion: '1.0.0',
    createdAt: now.toISOString(),
    userId,
    metadata: {
      reportCount: reports.length,
      vitalsCount: vitalsLog.length,
      symptomsCount: symptoms.length,
      medsCount: medications.length,
      hasProfile: healthProfileList.length > 0,
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      kdf: {
        algorithm: 'PBKDF2',
        hash: 'SHA-256',
        iterations: 100000,
        salt: saltBase64,
      },
      iv,
    },
    encryptedData: cipherText,
  };

  const packageJsonString = JSON.stringify(backupPackage, null, 2);
  const sizeBytes = new Blob([packageJsonString]).size;

  // 4. Record history item in IndexedDB
  const historyItem: BackupHistoryItem = {
    id: `bkp_${Date.now()}`,
    createdAt: now.toISOString(),
    destination: 'local_file',
    reportCount: reports.length,
    fileSizeBytes: sizeBytes,
    fileName,
  };

  await db.backupHistory.put(historyItem);

  return { backupPackage, fileName, sizeBytes };
}

/**
 * Triggers a browser file download for the `.healthbackup` file
 */
export function downloadBackupFile(backupPackage: HealthBackupPackage, fileName: string): void {
  const jsonString = JSON.stringify(backupPackage, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
