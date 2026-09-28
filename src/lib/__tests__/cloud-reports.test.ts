/**
 * Unit Tests for Encrypted Medical Report Cloud Synchronization (Phase 2B Step 1)
 *
 * Verifies all 12 Zero-Knowledge & Data-Access Invariants for `src/lib/cloud-reports.ts`:
 * 1. Local HealthReport maps correctly to cloud row.
 * 2. Existing report ID is preserved.
 * 3. Existing encryptedData is preserved exactly.
 * 4. Existing IV is preserved exactly.
 * 5. Version defaults to 1 when missing.
 * 6. Authenticated Supabase user ID is used.
 * 7. No plaintext medical fields are included in the cloud payload.
 * 8. Upload uses the encrypted fields only.
 * 9. Duplicate upload uses the same logical key.
 * 10. Deletion uses deleted_at rather than physical deletion.
 * 11. cloud-reports.ts does not decrypt medical data.
 * 12. Cloud failure is returned as a controlled error without modifying local state.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  healthReportToCloudRow,
  cloudRowToHealthReport,
  uploadReportToSupabase,
  downloadReportsFromSupabase,
  markReportDeletedOnSupabase,
} from '../cloud-reports';
import type { HealthReport } from '../../types/health';
import type { EncryptedCloudReportRow } from '../../types/auth';

const TEST_USER_A = '11111111-2222-3333-4444-555555555555';
const TEST_USER_B = '99999999-8888-7777-6666-555555555555';

// Sample local HealthReport (containing plaintext local fields + encryptedData)
const sampleLocalReport: HealthReport = {
  id: 'rep_1727220000000_abc12',
  userId: TEST_USER_A,
  date: '2025-05-18',
  type: 'cbc',
  title: 'Comprehensive Metabolic Panel',
  doctorName: 'Dr. Gregory House',
  encryptedData: 'Q0lQSEVSVEVYVF9FTkNSWVBURURfTUVESUNBTF9SRUNPUkRfQkVJTkdfVEVTVEVEXzEyMzQ1',
  iv: 'UVcxMl9JVkJBU0U2NA==',
  createdAt: '2025-05-18T10:00:00.000Z',
  updatedAt: '2025-05-18T10:00:00.000Z',
};

// In-memory Supabase Mock Client for isolated deterministic testing
function createMockSupabaseClient() {
  const store = new Map<string, EncryptedCloudReportRow>();

  return {
    store,
    from: (table: string) => ({
      upsert: async (row: EncryptedCloudReportRow) => {
        const key = `${row.user_id}_${row.id}`;
        store.set(key, { ...row });
        return { error: null };
      },
      select: () => ({
        eq: async (_col: string, val: string) => {
          const matching = Array.from(store.values()).filter((r) => r.user_id === val);
          return { data: matching, error: null };
        },
      }),
      update: (fields: Partial<EncryptedCloudReportRow>) => ({
        eq: (_col1: string, val1: string) => ({
          eq: async (_col2: string, val2: string) => {
            const key = `${val1}_${val2}`;
            const existing = store.get(key);
            if (existing) {
              store.set(key, { ...existing, ...fields });
            }
            return { error: null };
          },
        }),
      }),
    }),
  };
}

describe('Phase 2B Step 1: Encrypted Report Data Access Layer', () => {
  // Test 1: Local HealthReport maps correctly to cloud row
  it('Test 1: Maps local HealthReport correctly to EncryptedCloudReportRow', () => {
    const row = healthReportToCloudRow(TEST_USER_A, sampleLocalReport);

    assert.equal(row.id, sampleLocalReport.id);
    assert.equal(row.user_id, TEST_USER_A);
    assert.equal(row.encrypted_data, sampleLocalReport.encryptedData);
    assert.equal(row.iv, sampleLocalReport.iv);
    assert.equal(row.version, 1);
    assert.equal(row.created_at, sampleLocalReport.createdAt);
    assert.equal(row.updated_at, sampleLocalReport.updatedAt);
    assert.equal(row.deleted_at, null);
  });

  // Test 2: Existing report ID is preserved
  it('Test 2: Preserves client-generated report ID exactly', () => {
    const row = healthReportToCloudRow(TEST_USER_A, sampleLocalReport);
    assert.equal(row.id, 'rep_1727220000000_abc12');
  });

  // Test 3: Existing encryptedData is preserved exactly
  it('Test 3: Preserves encryptedData string byte-for-byte without mutation', () => {
    const row = healthReportToCloudRow(TEST_USER_A, sampleLocalReport);
    assert.equal(row.encrypted_data, sampleLocalReport.encryptedData);
    assert.equal(row.encrypted_data.length, sampleLocalReport.encryptedData.length);
  });

  // Test 4: Existing IV is preserved exactly
  it('Test 4: Preserves IV initialization vector exactly', () => {
    const row = healthReportToCloudRow(TEST_USER_A, sampleLocalReport);
    assert.equal(row.iv, 'UVcxMl9JVkJBU0U2NA==');
  });

  // Test 5: Version defaults to 1 when missing
  it('Test 5: Version defaults to 1 when not specified on local report', () => {
    const legacyReport: HealthReport = {
      ...sampleLocalReport,
      version: undefined,
    };
    const row = healthReportToCloudRow(TEST_USER_A, legacyReport);
    assert.equal(row.version, 1);

    const versionedReport: HealthReport = {
      ...sampleLocalReport,
      version: 4,
    };
    const row2 = healthReportToCloudRow(TEST_USER_A, versionedReport);
    assert.equal(row2.version, 4);
  });

  // Test 6: Authenticated Supabase user ID is used
  it('Test 6: Cloud row binds strictly to the provided authenticated user UUID', () => {
    const rowA = healthReportToCloudRow(TEST_USER_A, sampleLocalReport);
    const rowB = healthReportToCloudRow(TEST_USER_B, sampleLocalReport);

    assert.equal(rowA.user_id, TEST_USER_A);
    assert.equal(rowB.user_id, TEST_USER_B);
    assert.notEqual(rowA.user_id, rowB.user_id);
  });

  // Test 7: No plaintext medical fields are included in the cloud payload
  it('Test 7: Strictly excludes all plaintext clinical/display fields from cloud row', () => {
    const row = healthReportToCloudRow(TEST_USER_A, sampleLocalReport) as any;

    // Keys that must NOT exist on the cloud row
    assert.equal(row.title, undefined, 'Plaintext title must not be in cloud row');
    assert.equal(row.doctorName, undefined, 'Plaintext doctorName must not be in cloud row');
    assert.equal(row.type, undefined, 'Plaintext type must not be in cloud row');
    assert.equal(row.date, undefined, 'Plaintext date must not be in cloud row');
    assert.equal(row.results, undefined, 'Plaintext results must not be in cloud row');
    assert.equal(row.metrics, undefined, 'Plaintext metrics must not be in cloud row');
    assert.equal(row.notes, undefined, 'Plaintext notes must not be in cloud row');
    assert.equal(row.facility, undefined, 'Plaintext facility must not be in cloud row');
    assert.equal(row.fileBase64, undefined, 'Raw file data must not be in cloud row');

    // Expected allowed keys ONLY
    const allowedKeys = ['id', 'user_id', 'encrypted_data', 'iv', 'version', 'created_at', 'updated_at', 'deleted_at'];
    const rowKeys = Object.keys(row);
    assert.deepEqual(rowKeys.sort(), allowedKeys.sort(), 'Cloud row must only contain allowed sync fields');
  });

  // Test 8: Upload uses the encrypted fields only
  it('Test 8: Upload function processes valid encrypted reports with opaque ciphertext', async () => {
    const mockClient = createMockSupabaseClient();
    const res = await uploadReportToSupabase(sampleLocalReport, TEST_USER_A, mockClient);
    assert.ok(res.success, 'Upload returned successful status');
    assert.ok(res.row);
    assert.equal(res.row.encrypted_data, sampleLocalReport.encryptedData);
    assert.equal(res.row.user_id, TEST_USER_A);
  });

  // Test 9: Duplicate upload uses the same logical key
  it('Test 9: Duplicate upload generates identical (user_id, id) composite key', async () => {
    const mockClient = createMockSupabaseClient();
    await uploadReportToSupabase(sampleLocalReport, TEST_USER_A, mockClient);
    await uploadReportToSupabase(sampleLocalReport, TEST_USER_A, mockClient);

    assert.equal(mockClient.store.size, 1, 'Duplicate upload updates same row without creating duplicate');
  });

  // Test 10: Deletion uses deleted_at rather than physical deletion
  it('Test 10: Marking report deleted sets deleted_at tombstone timestamp', async () => {
    const mockClient = createMockSupabaseClient();
    await uploadReportToSupabase(sampleLocalReport, TEST_USER_A, mockClient);

    const delRes = await markReportDeletedOnSupabase(sampleLocalReport.id, TEST_USER_A, mockClient);
    assert.ok(delRes.success, 'Soft-delete returned success');

    const stored = mockClient.store.get(`${TEST_USER_A}_${sampleLocalReport.id}`);
    assert.ok(stored, 'Row is preserved as tombstone in database');
    assert.ok(stored?.deleted_at, 'deleted_at tombstone timestamp is set');
  });

  // Test 11: cloud-reports.ts does not decrypt medical data
  it('Test 11: Converts cloud row back to HealthReport structure without needing decryption keys', () => {
    const cloudRow: EncryptedCloudReportRow = {
      id: 'rep_1727220000000_abc12',
      user_id: TEST_USER_A,
      encrypted_data: sampleLocalReport.encryptedData,
      iv: sampleLocalReport.iv,
      version: 2,
      created_at: '2025-05-18T10:00:00.000Z',
      updated_at: '2025-05-18T12:00:00.000Z',
      deleted_at: null,
    };

    const restored = cloudRowToHealthReport(cloudRow);
    assert.equal(restored.id, cloudRow.id);
    assert.equal(restored.encryptedData, cloudRow.encrypted_data);
    assert.equal(restored.iv, cloudRow.iv);
    assert.equal(restored.version, 2);
    assert.equal(restored.deletedAt, null);
  });

  // Test 12: Cloud failure is returned as a controlled error without modifying local state
  it('Test 12: Handles missing authentication gracefully with controlled error', async () => {
    const mockClient = createMockSupabaseClient();
    const invalidReport: HealthReport = {
      id: '',
      userId: '',
      date: '',
      type: 'cbc',
      title: '',
      encryptedData: '',
      iv: '',
      createdAt: '',
      updatedAt: '',
    };

    const uploadRes = await uploadReportToSupabase(invalidReport, TEST_USER_A, mockClient);
    assert.equal(uploadRes.success, false);
    assert.ok(uploadRes.error?.includes('missing id, encryptedData, or iv'));

    const unauthRes = await uploadReportToSupabase(sampleLocalReport, '', mockClient);
    assert.equal(unauthRes.success, false);
    assert.ok(unauthRes.error?.includes('Authentication required'));

    // Verify local report object remains unchanged
    assert.equal(sampleLocalReport.id, 'rep_1727220000000_abc12');
    assert.equal(sampleLocalReport.encryptedData, 'Q0lQSEVSVEVYVF9FTkNSWVBURURfTUVESUNBTF9SRUNPUkRfQkVJTkdfVEVTVEVEXzEyMzQ1');
  });
});
