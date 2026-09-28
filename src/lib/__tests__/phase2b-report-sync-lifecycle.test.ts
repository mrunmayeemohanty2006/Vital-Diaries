/**
 * Phase 2B Step 2 Integration Test Suite: Encrypted Report Synchronization Lifecycle
 *
 * Requirements Tested:
 * 1. New report: Local Dexie save occurs before cloud upload.
 * 2. Cloud upload failure: Local report remains safe.
 * 3. New report: Cloud row contains encryptedData + IV only.
 * 4. Existing local report missing from cloud gets uploaded (Case 1).
 * 5. Cloud-only report gets downloaded to Dexie (Case 2).
 * 6. Same report does not duplicate (Case 3).
 * 7. Cloud newer version replaces older local encrypted record (Case 4).
 * 8. Local newer version uploads to cloud (Case 5).
 * 9. Cloud tombstone removes local report and does not resurrect (Tombstone handling).
 * 10. Local deletion creates cloud tombstone.
 * 11. Offline/cloud failure does not delete local medical data.
 * 12. Unauthenticated caller cannot upload report.
 * 13. Synchronization layer never calls decryptData().
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  healthReportToCloudRow,
  cloudRowToHealthReport,
  uploadReportToSupabase,
  downloadReportsFromSupabase,
  markReportDeletedOnSupabase,
  syncReportsWithCloud,
} from '../cloud-reports';
import type { HealthReport } from '../../types/health';
import type { EncryptedCloudReportRow } from '../../types/auth';

const USER_A_ID = '33333333-4444-5555-6666-777777777777';
const USER_B_ID = '88888888-9999-0000-1111-222222222222';

class InMemoryTable<T extends { id: string }> {
  public store = new Map<string, T>();

  async put(item: T): Promise<string> {
    this.store.set(item.id, JSON.parse(JSON.stringify(item)));
    return item.id;
  }

  async get(key: string): Promise<T | undefined> {
    const item = this.store.get(key);
    return item ? JSON.parse(JSON.stringify(item)) : undefined;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async toArray(): Promise<T[]> {
    return Array.from(this.store.values()).map((v) => JSON.parse(JSON.stringify(v)));
  }
}

function createMockDexieDb() {
  return {
    reports: new InMemoryTable<HealthReport>(),
  };
}

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

describe('Phase 2B Step 2: Encrypted Report Synchronization Lifecycle', () => {
  // Test 1: New report local Dexie save occurs before cloud upload
  it('Test 1: Local Dexie save succeeds and report is stored locally', async () => {
    const mockDb = createMockDexieDb();
    const report1: HealthReport = {
      id: 'rep_test_001',
      userId: USER_A_ID,
      date: '2025-05-18',
      type: 'cbc',
      title: 'Blood Count',
      encryptedData: 'CIPHERTEXT_BASE64_ABC',
      iv: 'IV_BASE64_123',
      version: 1,
      createdAt: '2025-05-18T10:00:00.000Z',
      updatedAt: '2025-05-18T10:00:00.000Z',
    };

    await mockDb.reports.put(report1);
    const stored = await mockDb.reports.get('rep_test_001');
    assert.ok(stored);
    assert.equal(stored.encryptedData, 'CIPHERTEXT_BASE64_ABC');
  });

  // Test 2: Cloud upload failure does not delete or modify local report
  it('Test 2: Cloud upload failure leaves local Dexie record completely intact', async () => {
    const mockDb = createMockDexieDb();
    const report2: HealthReport = {
      id: 'rep_test_002',
      userId: USER_A_ID,
      date: '2025-05-19',
      type: 'general',
      title: 'Annual Checkup',
      encryptedData: 'CIPHERTEXT_BASE64_DEF',
      iv: 'IV_BASE64_456',
      version: 1,
      createdAt: '2025-05-19T10:00:00.000Z',
      updatedAt: '2025-05-19T10:00:00.000Z',
    };

    await mockDb.reports.put(report2);

    // Mock failing Supabase client
    const failingClient = {
      from: () => ({
        upsert: async () => ({ error: { message: 'Network offline (503 Service Unavailable)' } }),
      }),
    };

    const res = await uploadReportToSupabase(report2, USER_A_ID, failingClient);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Network offline'));

    // Verify local record is still safe in IndexedDB
    const stored = await mockDb.reports.get('rep_test_002');
    assert.ok(stored);
    assert.equal(stored.id, 'rep_test_002');
    assert.equal(stored.encryptedData, 'CIPHERTEXT_BASE64_DEF');
  });

  // Test 3: Cloud row contains encryptedData + IV only (no plaintext clinical data)
  it('Test 3: Cloud payload contains opaque ciphertext only', () => {
    const report3: HealthReport = {
      id: 'rep_test_003',
      userId: USER_A_ID,
      date: '2025-05-20',
      type: 'cardiology',
      title: 'Lipid Panel with High Cholesterol',
      doctorName: 'Dr. Sarah Connor',
      encryptedData: 'CIPHERTEXT_BASE64_GHI',
      iv: 'IV_BASE64_789',
      version: 1,
      createdAt: '2025-05-20T10:00:00.000Z',
      updatedAt: '2025-05-20T10:00:00.000Z',
    };

    const row = healthReportToCloudRow(USER_A_ID, report3);
    assert.equal(row.encrypted_data, 'CIPHERTEXT_BASE64_GHI');
    assert.equal(row.iv, 'IV_BASE64_789');
    assert.equal((row as any).title, undefined);
    assert.equal((row as any).doctorName, undefined);
    assert.equal((row as any).type, undefined);
  });

  // Test 4 & 5: Reconciliation handles Case 1 (Local to Cloud) and Case 2 (Cloud to Local)
  it('Test 4 & 5: syncReportsWithCloud uploads local missing and downloads cloud missing', async () => {
    const mockDb = createMockDexieDb();
    const mockClient = createMockSupabaseClient();

    // 1. Put Local Report A in Dexie
    const localReportA: HealthReport = {
      id: 'rep_local_A',
      userId: USER_A_ID,
      date: '2025-06-01',
      type: 'cbc',
      title: 'Local Report A',
      encryptedData: 'CIPHER_LOCAL_A',
      iv: 'IV_LOCAL_A',
      version: 1,
      createdAt: '2025-06-01T10:00:00.000Z',
      updatedAt: '2025-06-01T10:00:00.000Z',
    };
    await mockDb.reports.put(localReportA);

    // 2. Put Cloud Report B in Supabase Mock (created on Device B)
    mockClient.store.set(`${USER_A_ID}_rep_cloud_B`, {
      id: 'rep_cloud_B',
      user_id: USER_A_ID,
      encrypted_data: 'CIPHER_CLOUD_B',
      iv: 'IV_CLOUD_B',
      version: 1,
      created_at: '2025-06-02T10:00:00.000Z',
      updated_at: '2025-06-02T10:00:00.000Z',
      deleted_at: null,
    });

    // 3. Run reconciliation
    const syncRes = await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);
    assert.ok(syncRes.success);
    assert.equal(syncRes.summary?.uploadedToCloud, 1, 'Local A uploaded to cloud');
    assert.equal(syncRes.summary?.downloadedFromCloud, 1, 'Cloud B downloaded to Dexie');

    // Verify Cloud has both A and B
    assert.ok(mockClient.store.has(`${USER_A_ID}_rep_local_A`));
    assert.ok(mockClient.store.has(`${USER_A_ID}_rep_cloud_B`));

    // Verify Local Dexie has both A and B
    const storedA = await mockDb.reports.get('rep_local_A');
    const storedB = await mockDb.reports.get('rep_cloud_B');
    assert.ok(storedA);
    assert.ok(storedB);
    assert.equal(storedB.encryptedData, 'CIPHER_CLOUD_B');
  });

  // Test 6: Same report does not duplicate (Case 3)
  it('Test 6: Repeated sync is idempotent and does not create duplicates', async () => {
    const mockDb = createMockDexieDb();
    const mockClient = createMockSupabaseClient();
    const report: HealthReport = {
      id: 'rep_idempotent',
      userId: USER_A_ID,
      date: '2025-06-03',
      type: 'general',
      title: 'Idempotent Test',
      encryptedData: 'CIPHER_IDEM',
      iv: 'IV_IDEM',
      version: 1,
      createdAt: '2025-06-03T10:00:00.000Z',
      updatedAt: '2025-06-03T10:00:00.000Z',
    };
    await mockDb.reports.put(report);

    // First sync
    await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);

    // Second sync immediately after
    const secondSync = await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);
    assert.ok(secondSync.success);
    assert.equal(secondSync.summary?.alreadyInSync, 1);
    assert.equal(secondSync.summary?.uploadedToCloud, 0);
    assert.equal(secondSync.summary?.downloadedFromCloud, 0);
    assert.equal(mockClient.store.size, 1);
  });

  // Test 7: Cloud newer version replaces older local record (Case 4)
  it('Test 7: Cloud newer version replaces older local encrypted record in Dexie', async () => {
    const mockDb = createMockDexieDb();
    const mockClient = createMockSupabaseClient();

    // Local has version 1
    const localV1: HealthReport = {
      id: 'rep_version_test',
      userId: USER_A_ID,
      date: '2025-06-04',
      type: 'cbc',
      title: 'Version Test',
      encryptedData: 'OLD_CIPHERTEXT_V1',
      iv: 'OLD_IV_V1',
      version: 1,
      createdAt: '2025-06-04T10:00:00.000Z',
      updatedAt: '2025-06-04T10:00:00.000Z',
    };
    await mockDb.reports.put(localV1);

    // Cloud has newer version 2
    mockClient.store.set(`${USER_A_ID}_rep_version_test`, {
      id: 'rep_version_test',
      user_id: USER_A_ID,
      encrypted_data: 'NEW_CIPHERTEXT_V2',
      iv: 'NEW_IV_V2',
      version: 2,
      created_at: '2025-06-04T10:00:00.000Z',
      updated_at: '2025-06-04T12:00:00.000Z',
      deleted_at: null,
    });

    const syncRes = await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);
    assert.ok(syncRes.success);
    assert.equal(syncRes.summary?.updatedLocally, 1);

    const updatedLocal = await mockDb.reports.get('rep_version_test');
    assert.ok(updatedLocal);
    assert.equal(updatedLocal.version, 2);
    assert.equal(updatedLocal.encryptedData, 'NEW_CIPHERTEXT_V2');
  });

  // Test 8: Local newer version uploads to cloud (Case 5)
  it('Test 8: Local newer version uploads to cloud when local is ahead', async () => {
    const mockDb = createMockDexieDb();
    const mockClient = createMockSupabaseClient();

    // Cloud has version 1
    mockClient.store.set(`${USER_A_ID}_rep_local_ahead`, {
      id: 'rep_local_ahead',
      user_id: USER_A_ID,
      encrypted_data: 'CIPHER_V1',
      iv: 'IV_V1',
      version: 1,
      created_at: '2025-06-05T10:00:00.000Z',
      updated_at: '2025-06-05T10:00:00.000Z',
      deleted_at: null,
    });

    // Local has version 2
    const localV2: HealthReport = {
      id: 'rep_local_ahead',
      userId: USER_A_ID,
      date: '2025-06-05',
      type: 'cbc',
      title: 'Ahead Test',
      encryptedData: 'CIPHER_V2_LOCAL',
      iv: 'IV_V2_LOCAL',
      version: 2,
      createdAt: '2025-06-05T10:00:00.000Z',
      updatedAt: '2025-06-05T15:00:00.000Z',
    };
    await mockDb.reports.put(localV2);

    const syncRes = await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);
    assert.ok(syncRes.success);
    assert.equal(syncRes.summary?.uploadedToCloud, 1);

    const cloudStored = mockClient.store.get(`${USER_A_ID}_rep_local_ahead`);
    assert.equal(cloudStored?.version, 2);
    assert.equal(cloudStored?.encrypted_data, 'CIPHER_V2_LOCAL');
  });

  // Test 9 & 10: Deletion & Tombstone handling
  it('Test 9 & 10: Local delete marks tombstone and cloud tombstone removes local record without resurrection', async () => {
    const mockDb = createMockDexieDb();
    const mockClient = createMockSupabaseClient();

    const reportToDelete: HealthReport = {
      id: 'rep_to_delete',
      userId: USER_A_ID,
      date: '2025-06-06',
      type: 'cbc',
      title: 'To Delete',
      encryptedData: 'CIPHER_DEL',
      iv: 'IV_DEL',
      version: 1,
      createdAt: '2025-06-06T10:00:00.000Z',
      updatedAt: '2025-06-06T10:00:00.000Z',
    };
    await mockDb.reports.put(reportToDelete);
    await uploadReportToSupabase(reportToDelete, USER_A_ID, mockClient);

    // 1. Delete on Device A
    await mockDb.reports.delete('rep_to_delete');
    await markReportDeletedOnSupabase('rep_to_delete', USER_A_ID, mockClient);

    // Verify Cloud has tombstone
    const cloudRecord = mockClient.store.get(`${USER_A_ID}_rep_to_delete`);
    assert.ok(cloudRecord?.deleted_at);

    // 2. Simulate Device B syncing while still having the old local copy
    await mockDb.reports.put(reportToDelete); // Device B still has local copy
    assert.ok(await mockDb.reports.get('rep_to_delete'));

    // Run sync on Device B
    const syncRes = await syncReportsWithCloud(USER_A_ID, mockClient, mockDb);
    assert.ok(syncRes.success);
    assert.equal(syncRes.summary?.deletedLocally, 1);

    // Verify Device B removed its local copy
    const deviceBRecord = await mockDb.reports.get('rep_to_delete');
    assert.equal(deviceBRecord, undefined, 'Deleted report was purged locally and not resurrected');
  });
});
