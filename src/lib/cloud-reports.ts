/**
 * Vital Diaries — Encrypted Medical Report Cloud Synchronization (Phase 2B Step 1)
 *
 * Safe Data Access Layer between Local Dexie and Supabase `public.encrypted_reports`.
 *
 * Zero-Knowledge Security Invariants:
 * 1. Supabase NEVER receives plaintext medical data, diagnoses, test results, doctor names, or notes.
 * 2. `encrypted_data` and `iv` are treated strictly as opaque ciphertext strings.
 * 3. Never calls `decryptData()` or `encryptData()` — ciphertext and IV are preserved exactly as stored.
 * 4. Never generates a competing DEK or replacement report IDs.
 * 5. Uses Supabase Auth canonical UUID (`auth.users.id`) for RLS boundaries.
 * 6. Local-first: cloud failures return controlled errors and NEVER delete or modify local records.
 */

import { db } from './db';
import { supabase } from './supabase';
import type { HealthReport } from '../types/health';
import type { EncryptedCloudReportRow } from '../types/auth';

/**
 * Resolves the authenticated Supabase user UUID.
 * Supabase Auth session is the single source of truth for identity.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id || null;
    }
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Maps a local HealthReport to an EncryptedCloudReportRow for Supabase storage.
 * Strictly excludes all plaintext medical metadata (title, doctorName, type, date).
 */
export function healthReportToCloudRow(
  userId: string,
  report: HealthReport
): EncryptedCloudReportRow {
  return {
    id: report.id,
    user_id: userId,
    encrypted_data: report.encryptedData,
    iv: report.iv,
    version: typeof report.version === 'number' ? report.version : 1,
    created_at: report.createdAt || new Date().toISOString(),
    updated_at: report.updatedAt || new Date().toISOString(),
    deleted_at: report.deletedAt || null,
  };
}

/**
 * Maps an EncryptedCloudReportRow back to a partial HealthReport containing
 * all synchronized cryptographic fields.
 */
export function cloudRowToHealthReport(
  row: EncryptedCloudReportRow,
  fallbackUserId?: string
): HealthReport {
  const fallbackDate = row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
  return {
    id: row.id,
    userId: row.user_id || fallbackUserId || '',
    date: fallbackDate,
    type: 'general',
    title: 'Encrypted Health Report',
    encryptedData: row.encrypted_data,
    iv: row.iv,
    version: row.version || 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at || null,
  };
}

/**
 * Uploads an encrypted report to Supabase `public.encrypted_reports`.
 * Uses idempotent UPSERT on composite key `(user_id, id)`.
 *
 * @param report Local HealthReport to synchronize
 * @param explicitUserId Optional override for unit testing with authenticated mocks
 * @param client Optional Supabase client instance (defaults to singleton)
 * @returns Result object with status
 */
export async function uploadReportToSupabase(
  report: HealthReport,
  explicitUserId?: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string; row?: EncryptedCloudReportRow }> {
  if (!report || !report.id || !report.encryptedData || !report.iv) {
    return { success: false, error: 'Invalid report: missing id, encryptedData, or iv.' };
  }

  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return { success: false, error: 'Authentication required to upload encrypted report.' };
  }

  const cloudRow = healthReportToCloudRow(userId, report);

  try {
    const { error } = await client
      .from('encrypted_reports')
      .upsert(cloudRow, { onConflict: 'user_id,id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, row: cloudRow };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during report upload.' };
  }
}

/**
 * Downloads all encrypted report rows for the authenticated user from Supabase.
 * Returned rows contain opaque ciphertext; decryption occurs locally in RAM.
 *
 * @param explicitUserId Optional override for unit testing
 * @param client Optional Supabase client instance (defaults to singleton)
 * @returns List of EncryptedCloudReportRow items
 */
export async function downloadReportsFromSupabase(
  explicitUserId?: string,
  client: any = supabase
): Promise<{ success: boolean; reports?: EncryptedCloudReportRow[]; error?: string }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return { success: false, error: 'Authentication required to download encrypted reports.' };
  }

  try {
    const { data, error } = await client
      .from('encrypted_reports')
      .select('id, user_id, encrypted_data, iv, version, created_at, updated_at, deleted_at')
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, reports: (data as EncryptedCloudReportRow[]) || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during report download.' };
  }
}

/**
 * Marks an encrypted report as deleted on Supabase by setting the tombstone `deleted_at`.
 * Does NOT physically delete the row, allowing multi-device synchronization to detect deletions.
 *
 * @param reportId The ID of the report to mark as deleted
 * @param explicitUserId Optional override for unit testing
 * @param client Optional Supabase client instance (defaults to singleton)
 */
export async function markReportDeletedOnSupabase(
  reportId: string,
  explicitUserId?: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string }> {
  if (!reportId) {
    return { success: false, error: 'Report ID is required to mark report deleted.' };
  }

  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return { success: false, error: 'Authentication required to delete report.' };
  }

  const now = new Date().toISOString();

  try {
    const { error } = await client
      .from('encrypted_reports')
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq('user_id', userId)
      .eq('id', reportId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error during report deletion.' };
  }
}

export interface SyncReportSummary {
  uploadedToCloud: number;
  downloadedFromCloud: number;
  deletedLocally: number;
  updatedLocally: number;
  alreadyInSync: number;
  errors: string[];
}

/**
 * Reconciles local IndexedDB reports with cloud encrypted reports.
 * Respects local-first principles: cloud network failure never rolls back or destroys local data.
 *
 * Cases handled:
 * Case 1: Local exists, Cloud missing -> Upload to cloud
 * Case 2: Cloud exists, Local missing -> Download to Dexie (if not deleted_at)
 * Case 3: Both exist and same version -> In sync
 * Case 4: Cloud newer version -> Update local Dexie with newer cloud ciphertext
 * Case 5: Local newer version -> Upload local version to cloud
 * Tombstones: Cloud row with deleted_at != null removes matching local copy without resurrecting
 */
export async function syncReportsWithCloud(
  explicitUserId?: string,
  client: any = supabase,
  localDb: any = db
): Promise<{ success: boolean; summary?: SyncReportSummary; error?: string; offline?: boolean }> {
  const userId = explicitUserId || (await getAuthenticatedUserId());
  if (!userId) {
    return { success: false, error: 'Authentication required for report synchronization.' };
  }

  const summary: SyncReportSummary = {
    uploadedToCloud: 0,
    downloadedFromCloud: 0,
    deletedLocally: 0,
    updatedLocally: 0,
    alreadyInSync: 0,
    errors: [],
  };

  // 1. Read all local reports from Dexie
  let localReports: HealthReport[] = [];
  try {
    localReports = await localDb.reports.toArray();
  } catch (err: any) {
    return { success: false, error: `Local database read error: ${err.message}` };
  }

  // 2. Fetch all cloud reports for this user
  const cloudRes = await downloadReportsFromSupabase(userId, client);
  if (!cloudRes.success || !cloudRes.reports) {
    return {
      success: false,
      error: cloudRes.error || 'Unable to connect to Supabase.',
      offline: true,
      summary,
    };
  }

  const cloudRows = cloudRes.reports;
  const cloudMap = new Map<string, EncryptedCloudReportRow>(cloudRows.map((r) => [r.id, r]));
  const localMap = new Map<string, HealthReport>(localReports.map((r) => [r.id, r]));

  // 3. Process Local Reports vs Cloud
  for (const local of localReports) {
    const cloud = cloudMap.get(local.id);

    // CASE 1: Local exists, Cloud missing -> Upload local report
    if (!cloud) {
      if (!local.deletedAt) {
        const upRes = await uploadReportToSupabase(local, userId, client);
        if (upRes.success) {
          summary.uploadedToCloud++;
        } else if (upRes.error) {
          summary.errors.push(`Upload failed for ${local.id}: ${upRes.error}`);
        }
      }
      continue;
    }

    // If Cloud has a deletion tombstone -> Remove local record if present
    if (cloud.deleted_at) {
      try {
        await localDb.reports.delete(local.id);
        summary.deletedLocally++;
      } catch {}
      continue;
    }

    // Both exist and are active -> Compare versions & timestamps
    const localVersion = local.version || 1;
    const cloudVersion = cloud.version || 1;
    const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
    const cloudTime = new Date(cloud.updated_at || cloud.created_at || 0).getTime();

    // CASE 4: Cloud newer version
    if (cloudVersion > localVersion || (cloudVersion === localVersion && cloudTime > localTime)) {
      try {
        const updatedLocal: HealthReport = {
          ...local,
          encryptedData: cloud.encrypted_data,
          iv: cloud.iv,
          version: cloudVersion,
          updatedAt: cloud.updated_at,
          deletedAt: null,
        };
        await localDb.reports.put(updatedLocal);
        summary.updatedLocally++;
      } catch (err: any) {
        summary.errors.push(`Local update failed for ${local.id}: ${err.message}`);
      }
    }
    // CASE 5: Local newer version
    else if (localVersion > cloudVersion || (localVersion === cloudVersion && localTime > cloudTime)) {
      const upRes = await uploadReportToSupabase(local, userId, client);
      if (upRes.success) {
        summary.uploadedToCloud++;
      } else if (upRes.error) {
        summary.errors.push(`Upload newer version failed for ${local.id}: ${upRes.error}`);
      }
    }
    // CASE 3: Same version & timestamps -> In sync
    else {
      summary.alreadyInSync++;
    }
  }

  // 4. Process Cloud-only Reports (Case 2: Cloud exists, Local missing)
  for (const cloud of cloudRows) {
    if (!localMap.has(cloud.id)) {
      // Do not resurrect deleted reports
      if (cloud.deleted_at) continue;

      try {
        const newLocal = cloudRowToHealthReport(cloud, userId);
        await localDb.reports.put(newLocal);
        summary.downloadedFromCloud++;
      } catch (err: any) {
        summary.errors.push(`Download failed for ${cloud.id}: ${err.message}`);
      }
    }
  }

  return { success: true, summary };
}

/**
 * Bulk migration helper: Synchronizes all local Dexie reports to cloud.
 * Uploads all local reports missing on Supabase or newer than cloud.
 */
export async function syncAllLocalReportsToCloud(
  explicitUserId?: string,
  client: any = supabase,
  localDb: any = db
): Promise<{ success: boolean; summary?: SyncReportSummary; error?: string }> {
  return syncReportsWithCloud(explicitUserId, client, localDb);
}

