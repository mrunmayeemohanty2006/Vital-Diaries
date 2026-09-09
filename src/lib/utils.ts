import { db } from './db';
import { encryptData } from './crypto';
import type { HealthReport, VitalLogEntry, SymptomEntry, MedicationEntry } from '../types/health';

/**
 * Formats ISO date or string into clean readable format (e.g. "Aug 12, 2026")
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Relative time formatter (e.g., "2 hours ago", "14 days ago")
 */
export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    return formatDate(dateString);
  } catch {
    return 'Unknown';
  }
}

/**
 * Formats byte size into human readable string (KB, MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'MB'}`;
}

/**
 * Seeds initial encrypted sample medical records into IndexedDB if vault is empty
 */
export async function seedInitialSampleData(key: CryptoKey, userId: string): Promise<void> {
  const existingReportsCount = await db.reports.count();
  if (existingReportsCount > 0) return;

  const now = new Date();
  const dateToday = now.toISOString().split('T')[0];
  const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const date14DaysAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString().split('T')[0];

  // 1. Sample Report: Complete Blood Count (CBC)
  const cbcPayload = JSON.stringify({
    reportType: 'Complete Blood Count (CBC)',
    facility: 'Metropolitan Health Medical Center',
    notes: 'Routine health panel. All values within normal physiological reference ranges.',
    results: {
      Hemoglobin: '14.2 g/dL (Normal: 13.5-17.5)',
      WBC: '6,800 /mcL (Normal: 4,500-11,000)',
      RBC: '4.85 M/mcL (Normal: 4.3-5.9)',
      Platelets: '245,000 /mcL (Normal: 150,000-450,000)',
      Hematocrit: '42.1% (Normal: 41-50%)',
    },
    recommendations: ['Maintain current hydration', 'Repeat routine panel in 12 months'],
    tags: ['Blood Work', 'Routine', 'CBC'],
  });

  const encryptedCbc = await encryptData(cbcPayload, key);
  const r1: HealthReport = {
    id: `rep_${Date.now()}_1`,
    userId,
    date: dateToday,
    type: 'cbc',
    title: 'Complete Blood Count (CBC)',
    doctorName: 'Dr. Julian Vance',
    encryptedData: encryptedCbc.cipherText,
    iv: encryptedCbc.iv,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 2. Sample Report: Lumbar Spine MRI
  const mriPayload = JSON.stringify({
    reportType: 'Lumbar Spine MRI (Non-Contrast)',
    facility: 'Advanced Diagnostic Imaging Center',
    notes: 'L4-L5 minor disc bulge noted without significant spinal stenosis or nerve root compression.',
    results: {
      L1_L3: 'Normal vertebral body height and alignment',
      L4_L5: 'Mild broad-based posterior disc bulge without canal stenosis',
      L5_S1: 'Unremarkable facet joints',
    },
    recommendations: ['Physical therapy core strengthening', 'Ergonomic lumbar support'],
    tags: ['Imaging', 'Radiology', 'Spine'],
  });

  const encryptedMri = await encryptData(mriPayload, key);
  const r2: HealthReport = {
    id: `rep_${Date.now()}_2`,
    userId,
    date: date7DaysAgo,
    type: 'imaging',
    title: 'Lumbar Spine MRI',
    doctorName: 'Dr. Sarah Lin',
    encryptedData: encryptedMri.cipherText,
    iv: encryptedMri.iv,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 3. Sample Report: 12-Lead Electrocardiogram (ECG)
  const ecgPayload = JSON.stringify({
    reportType: '12-Lead Electrocardiogram (ECG)',
    facility: 'CardioCare Specialist Clinic',
    notes: 'Normal sinus rhythm at 68 bpm. Normal PR and QT intervals. No ischemic ST-T changes.',
    results: {
      HeartRate: '68 bpm',
      PR_Interval: '154 ms',
      QRS_Duration: '88 ms',
      QTc: '412 ms',
      Axis: '+45 degrees',
    },
    recommendations: ['Continue routine physical activity'],
    tags: ['Cardiology', 'ECG', 'Heart'],
  });

  const encryptedEcg = await encryptData(ecgPayload, key);
  const r3: HealthReport = {
    id: `rep_${Date.now()}_3`,
    userId,
    date: date14DaysAgo,
    type: 'cardiology',
    title: '12-Lead ECG Evaluation',
    doctorName: 'Dr. Marcus Thorne',
    encryptedData: encryptedEcg.cipherText,
    iv: encryptedEcg.iv,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.reports.bulkAdd([r1, r2, r3]);

  // Seed sample Vitals
  const vital1Data = JSON.stringify({
    systolicBP: 118,
    diastolicBP: 78,
    heartRate: 68,
    bloodGlucose: 92,
    weightKg: 71.5,
    temperatureC: 36.6,
    oxygenSaturation: 99,
    notes: 'Morning resting vitals',
  });
  const encV1 = await encryptData(vital1Data, key);
  const v1: VitalLogEntry = {
    id: `vit_${Date.now()}_1`,
    userId,
    timestamp: new Date().toISOString(),
    date: dateToday,
    encryptedData: encV1.cipherText,
    iv: encV1.iv,
    createdAt: new Date().toISOString(),
  };
  await db.vitalsLog.put(v1);

  // Seed sample Medication
  const med1Data = JSON.stringify({
    name: 'Vitamin D3 & K2 Supplement',
    dosage: '2000 IU',
    frequency: 'Once daily',
    timeOfDay: ['Morning'],
    startDate: date14DaysAgo,
    isActive: true,
    notes: 'Take with morning meal containing healthy fats',
  });
  const encM1 = await encryptData(med1Data, key);
  const m1: MedicationEntry = {
    id: `med_${Date.now()}_1`,
    userId,
    encryptedData: encM1.cipherText,
    iv: encM1.iv,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.medications.put(m1);

  // Seed sample Symptom log
  const sym1Data = JSON.stringify({
    symptom: 'Mild tension headache after screen time',
    severity: 2,
    durationHours: 1,
    notes: 'Resolved after 20-20-20 break and hydration',
  });
  const encS1 = await encryptData(sym1Data, key);
  const s1: SymptomEntry = {
    id: `sym_${Date.now()}_1`,
    userId,
    timestamp: new Date().toISOString(),
    date: dateToday,
    encryptedData: encS1.cipherText,
    iv: encS1.iv,
    createdAt: new Date().toISOString(),
  };
  await db.symptoms.put(s1);
}
