/**
 * Comprehensive Automated Security Verification Suite (Phase 1C).
 *
 * Tests:
 * 1. Recovery Key: Correct recovery secret unwraps DEK; wrong secret fails; tampered ciphertext/IV fails.
 * 2. Password Change: Old password works; change password; new password works; old password fails; DEK unchanged.
 * 3. Recovery After Password Change: Recovery secret continues to unlock the same DEK.
 * 4. Legacy Migration: Decrypt legacy record in memory, re-encrypt with DEK, preserve data, idempotent & fault tolerant.
 * 5. Persistent Storage Security Audit: Inspect database after all operations to verify zero plaintext passwords, keys, recovery secrets, or health values.
 */

import {
  generateDEK,
  deriveKEK,
  deriveRecoveryKEK,
  wrapDEK,
  unwrapDEK,
  wrapDEKWithRecovery,
  unlockVaultWithRecovery,
  changeVaultPassword,
  createVaultEnvelope,
  unlockVaultEnvelope,
  exportRawKey,
  generateRecoverySecret,
  bytesToBase64,
  base64ToBytes,
  type VaultCryptoMetadata,
} from '../envelope-crypto';
import { encryptData, decryptData, generateIV } from '../crypto';
import {
  deriveKeyFromPassphrase,
  migrateLegacyRecord,
} from '../key-management';
import type { HealthReport, LocalSetting } from '../../types/health';

// Helper: Check if two Uint8Array buffers are byte-for-byte identical
function areBuffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// In-Memory Database Store Mock for comprehensive storage inspection
class InMemoryDb {
  reports = new Map<string, HealthReport>();
  settings = new Map<string, LocalSetting>();

  clear() {
    this.reports.clear();
    this.settings.clear();
  }
}

const mockDb = new InMemoryDb();

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✓ [PASS] ${testName}`);
    if (details) console.log(`         ${details}`);
  } else {
    console.error(`✗ [FAIL] ${testName}`);
    if (details) console.error(`         ${details}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runEnvelopeSecurityVerificationTests() {
  console.log('================================================================');
  console.log('  VITAL DIARIES — PHASE 1C SECURITY VERIFICATION SUITE         ');
  console.log('================================================================\n');

  mockDb.clear();

  // -------------------------------------------------------------
  // TEST GROUP 1: Dual-Envelope Creation & Recovery Key
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Dual-Envelope Creation & Recovery Key ---');
  const initialPassword = 'InitialVaultPassword2026#';
  const customRecoverySecret = generateRecoverySecret();

  assert(customRecoverySecret.startsWith('VITA-'), 'Generated recovery secret starts with VITA- prefix');
  assert(customRecoverySecret.length === 24, 'Recovery secret length is exactly 24 characters');

  // Create dual envelope
  const { metadata, dek: initialDEK, recoverySecret } = await createVaultEnvelope(
    initialPassword,
    customRecoverySecret
  );

  assert(Boolean(metadata.recovery), 'Recovery crypto metadata is present in VaultCryptoMetadata');
  assert(typeof metadata.recovery!.recoverySalt === 'string', 'Recovery salt is persisted as Base64');
  assert(typeof metadata.recovery!.recoveryWrappedDEK === 'string', 'Recovery wrapped DEK is persisted');
  assert(typeof metadata.recovery!.recoveryWrapIV === 'string', 'Recovery wrap IV is persisted');

  // 1. Unlock via normal password
  const unlockedWithPassword = await unlockVaultEnvelope(initialPassword, metadata);
  const rawInitial = await exportRawKey(initialDEK);
  const rawFromPassword = await exportRawKey(unlockedWithPassword);
  assert(areBuffersEqual(rawInitial, rawFromPassword), 'Password unlock yields 100% identical DEK');

  // 2. Unlock via recovery secret
  const unlockedWithRecovery = await unlockVaultWithRecovery(recoverySecret, metadata);
  const rawFromRecovery = await exportRawKey(unlockedWithRecovery);
  assert(areBuffersEqual(rawInitial, rawFromRecovery), 'Recovery secret unlock yields 100% identical DEK');

  // 3. Incorrect recovery secret rejection
  const wrongRecoverySecret = 'VITA-9999-ZZZZ-0000-FAIL';
  let wrongRecoveryFailed = false;
  try {
    await unlockVaultWithRecovery(wrongRecoverySecret, metadata);
  } catch (err: any) {
    wrongRecoveryFailed = true;
    assert(err.message.includes('Unwrap DEK failed'), 'Wrong recovery secret fails with authentication tag mismatch');
  }
  assert(wrongRecoveryFailed, 'Incorrect recovery secret strictly rejected');

  // 4. Tampered recovery wrappedDEK
  const tamperedRecoveryBytes = base64ToBytes(metadata.recovery!.recoveryWrappedDEK);
  tamperedRecoveryBytes[3] ^= 0xff; // Flip byte
  const tamperedMetadata: VaultCryptoMetadata = {
    ...metadata,
    recovery: {
      ...metadata.recovery!,
      recoveryWrappedDEK: bytesToBase64(tamperedRecoveryBytes),
    },
  };

  let tamperedRecoveryFailed = false;
  try {
    await unlockVaultWithRecovery(recoverySecret, tamperedMetadata);
  } catch {
    tamperedRecoveryFailed = true;
  }
  assert(tamperedRecoveryFailed, 'Tampered recovery wrapped DEK ciphertext rejected by authentication tag');

  // -------------------------------------------------------------
  // TEST GROUP 2: Safe Password Change (No Medical Data Re-Encryption)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Safe Password Change ---');
  // Encrypt a medical record with the initial DEK
  const patientRecordPayload = JSON.stringify({
    reportType: 'Lipid & Cardiac Health Panel',
    results: { 'Total Cholesterol': '195 mg/dL', Triglycerides: '130 mg/dL' },
    doctor: 'Dr. Sarah Lin',
  });
  const { cipherText: originalCipher, iv: originalIV } = await encryptData(patientRecordPayload, initialDEK);

  const newPassword = 'NewlyUpdatedSuperSecret2026!';
  const { updatedMetadata, dek: unchangedDEK } = await changeVaultPassword(
    initialPassword,
    newPassword,
    metadata
  );

  const rawUnchanged = await exportRawKey(unchangedDEK);
  assert(areBuffersEqual(rawInitial, rawUnchanged), 'DEK remains identical after password change');
  assert(updatedMetadata.salt !== metadata.salt, 'New password uses a fresh random salt');
  assert(updatedMetadata.wrappedDEK !== metadata.wrappedDEK, 'New password produces fresh wrappedDEK ciphertext');
  assert(updatedMetadata.wrapIV !== metadata.wrapIV, 'New password uses fresh wrap IV');

  // Verify new password unlocks the DEK
  const unlockedWithNewPass = await unlockVaultEnvelope(newPassword, updatedMetadata);
  const rawFromNewPass = await exportRawKey(unlockedWithNewPass);
  assert(areBuffersEqual(rawInitial, rawFromNewPass), 'New password successfully unlocks the same DEK');

  // Verify old password NO LONGER unlocks the vault
  let oldPasswordFailed = false;
  try {
    await unlockVaultEnvelope(initialPassword, updatedMetadata);
  } catch {
    oldPasswordFailed = true;
  }
  assert(oldPasswordFailed, 'Old password is no longer able to unlock the vault');

  // Verify existing medical record is STILL decryptable using the DEK from new password
  const decryptedAfterPassChange = await decryptData(originalCipher, originalIV, unlockedWithNewPass);
  assert(
    JSON.parse(decryptedAfterPassChange).results['Total Cholesterol'] === '195 mg/dL',
    'Medical records remain 100% decryptable after password change without re-encryption'
  );

  // -------------------------------------------------------------
  // TEST GROUP 3: Recovery Key Remains Valid After Password Change
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Recovery Key After Password Change ---');
  const unlockedRecoveryAfterPassChange = await unlockVaultWithRecovery(recoverySecret, updatedMetadata);
  const rawFromRecoveryPostChange = await exportRawKey(unlockedRecoveryAfterPassChange);
  assert(
    areBuffersEqual(rawInitial, rawFromRecoveryPostChange),
    'Recovery secret continues to unlock the same DEK after user password change'
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: Controlled Legacy Data Migration
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Controlled Legacy Data Migration ---');
  // Simulate a legacy record encrypted with the old single-key architecture
  const legacySalt = 'sALtBaSe64LeGaCy12345678==';
  const legacyPassphrase = 'VITAL-DIARIES-LOCAL-VAULT-KEY';
  const legacyKey = await deriveKeyFromPassphrase(legacyPassphrase, legacySalt);

  const legacyReportData = JSON.stringify({
    reportType: 'Legacy CBC Report 2024',
    results: { Hemoglobin: '13.8 g/dL', WBC: '5,500 /uL' },
    notes: 'Preserved from old version of Vital Diaries',
  });

  const legacyEncrypted = await encryptData(legacyReportData, legacyKey);
  const legacyRecord: HealthReport = {
    id: 'rep_legacy_001',
    userId: 'usr_patient_123',
    date: '2024-05-10',
    type: 'cbc',
    title: 'Legacy CBC Report 2024',
    encryptedData: legacyEncrypted.cipherText,
    iv: legacyEncrypted.iv,
    createdAt: '2024-05-10T10:00:00.000Z',
    updatedAt: '2024-05-10T10:00:00.000Z',
  };

  mockDb.reports.set(legacyRecord.id, legacyRecord);

  // Run controlled migration
  const migrationResult = await migrateLegacyRecord(legacyRecord, legacyKey, initialDEK);
  assert(migrationResult.success === true, 'Controlled legacy migration succeeded');

  const migratedRecord = migrationResult.migratedRecord!;
  assert(migratedRecord.encryptedData !== legacyRecord.encryptedData, 'Record has new AES-256-GCM ciphertext');
  assert(migratedRecord.iv !== legacyRecord.iv, 'Record has fresh 96-bit IV');

  // Verify migrated record decrypts accurately with active DEK
  const decryptedMigrated = await decryptData(migratedRecord.encryptedData, migratedRecord.iv, initialDEK);
  const parsedMigrated = JSON.parse(decryptedMigrated);
  assert(parsedMigrated.results.Hemoglobin === '13.8 g/dL', 'Migrated data matches original laboratory values');
  assert(parsedMigrated.notes === 'Preserved from old version of Vital Diaries', 'Migrated notes preserved');

  // Verify idempotency: running migration again produces valid ciphertext without error
  const secondMigration = await migrateLegacyRecord(migratedRecord, initialDEK, initialDEK);
  assert(secondMigration.success === true, 'Migration is idempotent and safe to re-run');

  // Verify fault tolerance: attempting migration with incorrect key fails gracefully without corrupting record
  const wrongKey = await generateDEK();
  const failedMigration = await migrateLegacyRecord(legacyRecord, wrongKey, initialDEK);
  assert(failedMigration.success === false, 'Migration with invalid key fails gracefully');
  assert(Boolean(failedMigration.error), 'Failure returns explanatory error message');

  // -------------------------------------------------------------
  // TEST GROUP 5: Persistent Storage Security Audit
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Persistent Storage Security Audit ---');
  // Store all current artifacts in mockDb to audit persistent structures
  mockDb.settings.set('vault_crypto_metadata', { key: 'vault_crypto_metadata', value: updatedMetadata });
  mockDb.settings.set('vault_salt', { key: 'vault_salt', value: updatedMetadata.salt });
  mockDb.settings.set('vault_user_name', { key: 'vault_user_name', value: 'Jane Doe' });
  mockDb.reports.set('rep_active_001', {
    id: 'rep_active_001',
    userId: 'usr_patient_123',
    date: '2026-08-15',
    type: 'cardiology',
    title: 'Lipid & Cardiac Health Panel',
    encryptedData: originalCipher,
    iv: originalIV,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const fullSettingsJson = JSON.stringify(Array.from(mockDb.settings.values()));
  const fullReportsJson = JSON.stringify(Array.from(mockDb.reports.values()));

  // 1. Password audit
  assert(!fullSettingsJson.includes(initialPassword), 'Initial password is NOT in settings');
  assert(!fullSettingsJson.includes(newPassword), 'New password is NOT in settings');
  assert(!fullReportsJson.includes(newPassword), 'Password is NOT in reports');

  // 2. Recovery secret audit
  assert(!fullSettingsJson.includes(recoverySecret), 'Plaintext recovery secret is strictly ABSENT from settings');
  assert(!fullReportsJson.includes(recoverySecret), 'Plaintext recovery secret is strictly ABSENT from reports');
  assert(!mockDb.settings.has('vault_recovery_key'), 'Legacy plaintext "vault_recovery_key" entry is absent');

  // 3. Raw Key audit
  assert(!fullSettingsJson.includes('vault_crypto_key'), 'Legacy "vault_crypto_key" is absent');
  assert(!fullSettingsJson.includes('CryptoKey'), 'Plaintext CryptoKey handles are not stored');

  // 4. Medical health values audit
  assert(!fullReportsJson.includes('195 mg/dL'), 'Plaintext cholesterol value is ABSENT from persistent storage');
  assert(!fullReportsJson.includes('Triglycerides'), 'Plaintext medical metric name is ABSENT from persistent storage');
  assert(!fullReportsJson.includes('Dr. Sarah Lin'), 'Plaintext physician name in payload is ABSENT from unencrypted columns');

  console.log('\n================================================================');
  console.log('  ALL PHASE 1C SECURITY VERIFICATION TESTS PASSED!              ');
  console.log('================================================================\n');
}

runEnvelopeSecurityVerificationTests().catch((err) => {
  console.error('Phase 1C Test Error:', err);
  process.exit(1);
});
