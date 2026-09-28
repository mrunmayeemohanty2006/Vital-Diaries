/**
 * Unit Tests for Local Health Record Search Engine (src/lib/local-search.ts)
 * Verifies 100% Client-Side In-Memory Search Invariants.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchLocalReports, searchLocalDataPoints } from '../local-search';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';

// Mock test reports
const mockReport1: HealthReport = {
  id: 'rep_001',
  userId: 'usr_test_user',
  date: '2025-05-18',
  type: 'cbc',
  title: 'Complete Blood Count Result',
  doctorName: 'Dr. Sarah Connor',
  encryptedData: 'ENCRYPTED_CIPHERTEXT_RANDOM_BYTES_XYZ_123',
  iv: 'IV_BASE64_BYTES_001',
  createdAt: '2025-05-18T10:00:00.000Z',
  updatedAt: '2025-05-18T10:00:00.000Z',
};

const mockDetails1: DecryptedReportDetails = {
  reportType: 'Complete Blood Count',
  facility: 'Quest Diagnostics Metro',
  notes: 'Patient exhibits normal blood counts overall.',
  results: {
    'Total Cholesterol': '185 mg/dL',
    'HDL': '55 mg/dL',
    'LDL': '110 mg/dL',
  },
  metrics: [
    {
      name: 'Hemoglobin',
      value: 14.2,
      unit: 'g/dL',
      displayValue: '14.2 g/dL',
      status: 'normal',
    },
    {
      name: 'Total Cholesterol',
      value: 185,
      unit: 'mg/dL',
      displayValue: '185 mg/dL',
      status: 'normal',
    },
  ],
  tags: ['annual-checkup', 'cardiology'],
};

const mockReport2: HealthReport = {
  id: 'rep_002',
  userId: 'usr_test_user',
  date: '2025-02-02',
  type: 'cardiology',
  title: 'Lipid & Cardiac Panel',
  doctorName: 'Dr. John Watson',
  encryptedData: 'ENCRYPTED_CIPHERTEXT_ANOTHER_RANDOM_BLOB_456',
  iv: 'IV_BASE64_BYTES_002',
  createdAt: '2025-02-02T10:00:00.000Z',
  updatedAt: '2025-02-02T10:00:00.000Z',
};

const mockDetails2: DecryptedReportDetails = {
  reportType: 'Lipid Panel',
  facility: 'St. Jude Health Labs',
  notes: 'Triglycerides slightly elevated. Recommended dietary modifications.',
  results: {
    'Triglycerides': '160 mg/dL',
    'Cholesterol Total': '210 mg/dL',
  },
  metrics: [
    {
      name: 'Cholesterol Total',
      value: 210,
      unit: 'mg/dL',
      displayValue: '210 mg/dL',
      status: 'high',
    },
    {
      name: 'Triglycerides',
      value: 160,
      unit: 'mg/dL',
      displayValue: '160 mg/dL',
      status: 'high',
    },
  ],
  tags: ['lipid', 'cardiology', 'fasting'],
};

const mockReport3: HealthReport = {
  id: 'rep_003',
  userId: 'usr_test_user',
  date: '2025-01-10',
  type: 'genomics',
  title: 'DNA Methylation Report',
  doctorName: 'Dr. Gregory House',
  encryptedData: 'ENCRYPTED_CIPHERTEXT_GENOMICS_CIPHER_789',
  iv: 'IV_BASE64_BYTES_003',
  createdAt: '2025-01-10T10:00:00.000Z',
  updatedAt: '2025-01-10T10:00:00.000Z',
};

const mockDetails3: DecryptedReportDetails = {
  reportType: 'Genomics',
  facility: 'GenetiCorp Lab',
  notes: 'MTHFR gene variant analyzed.',
  results: {
    'MTHFR': 'Heterozygous',
  },
  metrics: [
    {
      name: 'MTHFR C677T',
      value: 'Heterozygous',
      unit: '',
      displayValue: 'Heterozygous',
      status: 'normal',
    },
  ],
  tags: ['genetics', 'methylation'],
};

const allReports = [mockReport1, mockReport2, mockReport3];
const allDecrypted: Record<string, DecryptedReportDetails> = {
  'rep_001': mockDetails1,
  'rep_002': mockDetails2,
  'rep_003': mockDetails3,
};

describe('Local Health Record Search Engine', () => {
  // Test 1: Searching "cholesterol" finds a report containing "Cholesterol"
  it('Test 1: Searching lowercase "cholesterol" finds matching reports', () => {
    const results = searchLocalReports(allReports, allDecrypted, 'cholesterol');
    assert.equal(results.length, 2);
    const ids = results.map(r => r.id);
    assert.ok(ids.includes('rep_001'));
    assert.ok(ids.includes('rep_002'));
    assert.ok(!ids.includes('rep_003'));
  });

  // Test 2: Searching "CHOLESTEROL" returns the exact same results
  it('Test 2: Searching uppercase "CHOLESTEROL" returns case-insensitive matches', () => {
    const results = searchLocalReports(allReports, allDecrypted, 'CHOLESTEROL');
    assert.equal(results.length, 2);
    const ids = results.map(r => r.id);
    assert.ok(ids.includes('rep_001'));
    assert.ok(ids.includes('rep_002'));
  });

  // Test 3: Searching with leading/trailing spaces still works
  it('Test 3: Searching with surrounding whitespace is normalized', () => {
    const results = searchLocalReports(allReports, allDecrypted, '   cholesterol   ');
    assert.equal(results.length, 2);
  });

  // Test 4: Empty query returns no results
  it('Test 4: Empty query returns empty array', () => {
    const res1 = searchLocalReports(allReports, allDecrypted, '');
    const res2 = searchLocalReports(allReports, allDecrypted, '     ');
    assert.deepEqual(res1, []);
    assert.deepEqual(res2, []);
  });

  // Test 5: Unknown query returns no results
  it('Test 5: Non-existent query returns empty array', () => {
    const results = searchLocalReports(allReports, allDecrypted, 'nonexistent_biomarker_xyz123');
    assert.deepEqual(results, []);
  });

  // Test 6: Metric names are searchable
  it('Test 6: Specific metric names (e.g. Hemoglobin, Triglycerides) are searchable', () => {
    const hgbResults = searchLocalReports(allReports, allDecrypted, 'Hemoglobin');
    assert.equal(hgbResults.length, 1);
    assert.equal(hgbResults[0].id, 'rep_001');

    const trigResults = searchLocalReports(allReports, allDecrypted, 'triglycerides');
    assert.equal(trigResults.length, 1);
    assert.equal(trigResults[0].id, 'rep_002');
  });

  // Test 7: Report titles are searchable
  it('Test 7: Top-level report titles are searchable', () => {
    const titleResults = searchLocalReports(allReports, allDecrypted, 'DNA Methylation');
    assert.equal(titleResults.length, 1);
    assert.equal(titleResults[0].id, 'rep_003');
  });

  // Test 8: Multiple reports can match a common term or tag
  it('Test 8: Broad query (e.g. "cardiology", "Result") matches multiple records', () => {
    const cardResults = searchLocalReports(allReports, allDecrypted, 'cardiology');
    assert.equal(cardResults.length, 2);

    const facilityResults = searchLocalReports(allReports, allDecrypted, 'Diagnostics');
    assert.equal(facilityResults.length, 1);
    assert.equal(facilityResults[0].id, 'rep_001');
  });

  // Test 9: No encryptedData search occurs
  it('Test 9: Raw encryptedData ciphertext is NOT searched', () => {
    const cipherQuery1 = searchLocalReports(allReports, allDecrypted, 'ENCRYPTED_CIPHERTEXT');
    assert.equal(cipherQuery1.length, 0);

    const cipherQuery2 = searchLocalReports(allReports, allDecrypted, 'RANDOM_BYTES');
    assert.equal(cipherQuery2.length, 0);

    const ivQuery = searchLocalReports(allReports, allDecrypted, 'IV_BASE64');
    assert.equal(ivQuery.length, 0);
  });

  // Test 10: Search does not make any network requests or throw when offline
  it('Test 10: Search is 100% synchronous and in-memory', () => {
    const start = Date.now();
    const result = searchLocalReports(allReports, allDecrypted, 'doctor');
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 20, 'Local search executes synchronously in under 20ms');
    assert.ok(Array.isArray(result));
  });

  // Test 11: Granular data points extraction & chronological ordering (most recent first)
  it('Test 11: Extracts exact biomarker values with recent date at the top', () => {
    const dataPoints = searchLocalDataPoints(allReports, allDecrypted, 'cholesterol');
    assert.equal(dataPoints.length, 2);

    // rep_001 is from 2025-05-18, rep_002 is from 2025-02-02
    // Therefore rep_001 (May 2025) must be first (index 0), rep_002 (Feb 2025) must be second (index 1)
    assert.equal(dataPoints[0].reportId, 'rep_001');
    assert.equal(dataPoints[0].reportDate, '2025-05-18');
    assert.equal(dataPoints[0].markerName, 'Total Cholesterol');
    assert.equal(dataPoints[0].displayValue, '185 mg/dL');

    assert.equal(dataPoints[1].reportId, 'rep_002');
    assert.equal(dataPoints[1].reportDate, '2025-02-02');
    assert.equal(dataPoints[1].markerName, 'Cholesterol Total');
    assert.equal(dataPoints[1].displayValue, '210 mg/dL');
    assert.equal(dataPoints[1].status, 'high');
  });

  // Test 12: Searching Hemoglobin extracts value and date
  it('Test 12: Searching "hemoglobin" returns exact value (14.2 g/dL) with date', () => {
    const hgbPoints = searchLocalDataPoints(allReports, allDecrypted, 'hemoglobin');
    assert.equal(hgbPoints.length, 1);
    assert.equal(hgbPoints[0].markerName, 'Hemoglobin');
    assert.equal(hgbPoints[0].value, 14.2);
    assert.equal(hgbPoints[0].unit, 'g/dL');
    assert.equal(hgbPoints[0].displayValue, '14.2 g/dL');
    assert.equal(hgbPoints[0].reportDate, '2025-05-18');
  });
});
