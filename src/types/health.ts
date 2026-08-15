/**
 * Health data model interfaces for Vital Diaries.
 * Raw data is always encrypted with AES-GCM before stored in IndexedDB.
 */

export interface EncryptedPayload {
  cipherText: string; // Base64 or Hex
  iv: string;         // Base64 or Hex 12 bytes
}

export interface HealthReport {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  type: 'cbc' | 'imaging' | 'cardiology' | 'general' | 'vaccine' | 'genomics' | 'other';
  title: string;         // Non-sensitive display title (e.g., "Blood Work Result")
  doctorName?: string;
  encryptedData: string; // Serialized JSON encrypted via Web Crypto AES-GCM
  iv: string;            // Unique 12-byte IV for AES-GCM
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

export interface DecryptedReportDetails {
  reportType: string;
  facility?: string;
  notes?: string;
  results: Record<string, string | number | boolean>;
  recommendations?: string[];
  tags?: string[];
  attachmentsCount?: number;
}

export interface VitalLogEntry {
  id: string;
  userId: string;
  timestamp: string;      // ISO string
  date: string;           // YYYY-MM-DD
  encryptedData: string;  // Serialized JSON encrypted via Web Crypto AES-GCM
  iv: string;
  createdAt: string;
}

export interface DecryptedVitalData {
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  bloodGlucose?: number; // mg/dL
  weightKg?: number;
  temperatureC?: number;
  oxygenSaturation?: number; // %
  customMetricName?: string; // e.g. "Cholesterol", "Body Temp", "Sleep Hours"
  customMetricValue?: string | number;
  customMetricUnit?: string;
  notes?: string;
}

export interface SymptomEntry {
  id: string;
  userId: string;
  timestamp: string;
  date: string;
  encryptedData: string;
  iv: string;
  createdAt: string;
}

export interface DecryptedSymptomData {
  symptom: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1-5 scale
  durationHours?: number;
  notes?: string;
}

export interface MedicationEntry {
  id: string;
  userId: string;
  encryptedData: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecryptedMedicationData {
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string[];
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
}

export interface UserHealthProfile {
  id: string;
  userId: string;
  encryptedData: string;
  iv: string;
  updatedAt: string;
}

export interface DecryptedHealthProfile {
  fullName: string;
  dateOfBirth: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface LocalSetting {
  key: string;
  value: any;
}
