import Dexie, { type Table } from 'dexie';
import type { 
  HealthReport, 
  VitalLogEntry, 
  SymptomEntry, 
  MedicationEntry, 
  UserHealthProfile, 
  LocalSetting 
} from '../types/health';
import type { BackupHistoryItem } from '../types/backup';
import type { UserAccount } from '../types/auth';

export class HealthDatabase extends Dexie {
  accounts!: Table<UserAccount, string>;
  reports!: Table<HealthReport, string>;
  vitalsLog!: Table<VitalLogEntry, string>;
  symptoms!: Table<SymptomEntry, string>;
  medications!: Table<MedicationEntry, string>;
  healthProfile!: Table<UserHealthProfile, string>;
  settings!: Table<LocalSetting, string>;
  backupHistory!: Table<BackupHistoryItem, string>;

  constructor() {
    super('VitalDiaries');

    // Schema definition for Dexie IndexedDB
    this.version(1).stores({
      accounts: 'id, &email, createdAt',
      reports: 'id, userId, date, type, createdAt',
      vitalsLog: 'id, userId, date, timestamp, createdAt',
      symptoms: 'id, userId, date, timestamp, createdAt',
      medications: 'id, userId, createdAt',
      healthProfile: 'id, userId',
      settings: 'key',
      backupHistory: 'id, createdAt'
    });
  }
}

export const db = new HealthDatabase();

/**
 * Utility to clear all local health tables permanently
 */
export async function clearAllLocalHealthData(): Promise<void> {
  await db.transaction('rw', [db.reports, db.vitalsLog, db.symptoms, db.medications, db.healthProfile, db.backupHistory], async () => {
    await db.reports.clear();
    await db.vitalsLog.clear();
    await db.symptoms.clear();
    await db.medications.clear();
    await db.healthProfile.clear();
    await db.backupHistory.clear();
  });
}
