/**
 * Test Suite: Account Recovery Robustness & Flexible Master Key Verification
 * 
 * 100% Local & Deterministic — Zero AI / Zero LLM / Zero External APIs
 */

import {
  createVaultEnvelope,
  unlockVaultWithRecovery,
  normalizeRecoverySecret,
  exportRawKey,
} from '../envelope-crypto';
import {
  registerLocalAccount,
  verifyAccountCredentials,
  resetLocalVault,
  getAccountByEmail,
} from '../account-store';
import { initializeVault, recoverAndResetPassword, getStoredVaultMetadata } from '../key-management';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] || null;
    },
  };
}

async function runRecoveryRobustnessTests() {
  console.log('\n================================================================================');
  console.log('       ACCOUNT RECOVERY & MASTER KEY ROBUSTNESS TEST SUITE');
  console.log('================================================================================\n');

  // Test 1: Normalization of recovery secrets
  console.log('--- TEST 1: Recovery Secret Normalization ---');
  const canonical = 'VITA-2345-6789-ABCD-EFGH';
  assert(normalizeRecoverySecret('vita-2345-6789-abcd-efgh') === canonical, 'Lowercase with dashes must normalize to canonical');
  assert(normalizeRecoverySecret('2345-6789-ABCD-EFGH') === canonical, 'Missing VITA- prefix must normalize to canonical');
  assert(normalizeRecoverySecret('2345 6789 abcd efgh') === canonical, 'Spaces must normalize to canonical');
  assert(normalizeRecoverySecret('23456789ABCDEFGH') === canonical, 'Raw 16 chars must normalize to canonical');
  console.log('✓ TEST 1 PASSED: All recovery secret variants normalized to canonical format.');

  // Test 2: Master key candidate derivation and unwrap
  console.log('\n--- TEST 2: Multi-Format Master Recovery Key Unlock ---');
  await resetLocalVault();
  const password = 'initialPassword123';
  const rawSecret = 'VITA-2345-6789-ABCD-EFGH';
  const { metadata, dek: originalDEK } = await createVaultEnvelope(password, rawSecret);
  const originalRawBytes = await exportRawKey(originalDEK);

  // 1. Exact match
  const unlockedExact = await unlockVaultWithRecovery(rawSecret, metadata);
  const rawExact = await exportRawKey(unlockedExact);
  assert(Buffer.from(rawExact).equals(Buffer.from(originalRawBytes)), 'Exact recovery secret must unlock identical DEK');

  // 2. Lowercase with spaces
  const unlockedLower = await unlockVaultWithRecovery('vita 2345 6789 abcd efgh', metadata);
  const rawLower = await exportRawKey(unlockedLower);
  assert(Buffer.from(rawLower).equals(Buffer.from(originalRawBytes)), 'Lowercase with spaces must unlock identical DEK');

  // 3. Without prefix
  const unlockedNoPrefix = await unlockVaultWithRecovery('2345-6789-abcd-efgh', metadata);
  const rawNoPrefix = await exportRawKey(unlockedNoPrefix);
  assert(Buffer.from(rawNoPrefix).equals(Buffer.from(originalRawBytes)), 'Missing VITA- prefix must unlock identical DEK');
  console.log('✓ TEST 2 PASSED: Master recovery key unwrap succeeded across all formatting variations.');

  // Test 3: Recovery and Password Reset
  console.log('\n--- TEST 3: Recovery-Assisted Password Reset ---');
  await resetLocalVault();
  const email = 'patient@example.com';
  const oldPassword = 'oldPassword123';
  const newPassword = 'newPassword456';

  const { recoverySecret, dek: origVaultDEK } = await initializeVault(oldPassword);
  const origVaultRawBytes = await exportRawKey(origVaultDEK);
  await registerLocalAccount('Patient', email, oldPassword);

  const { dek: recoveredDEK } = await recoverAndResetPassword(recoverySecret, newPassword, email);
  const recoveredRawBytes = await exportRawKey(recoveredDEK);
  assert(Buffer.from(recoveredRawBytes).equals(Buffer.from(origVaultRawBytes)), 'Recovered DEK must match original DEK exactly');

  const verifyOld = await verifyAccountCredentials(email, oldPassword);
  assert(!verifyOld.success, 'Old password must fail verification after reset');

  const verifyNew = await verifyAccountCredentials(email, newPassword);
  assert(verifyNew.success, 'New password must succeed verification after reset');
  console.log('✓ TEST 3 PASSED: Recovery-assisted password reset re-wrapped vault and updated account credentials.');

  // Test 4: Local Vault Reset
  console.log('\n--- TEST 4: Clean Vault Reset ---');
  await resetLocalVault();
  const resetEmail = 'reset@example.com';
  await registerLocalAccount('User', resetEmail, 'firstPassword123');
  await initializeVault('firstPassword123');

  await resetLocalVault();

  const account = await getAccountByEmail(resetEmail);
  assert(account === null, 'Account must be cleared after vault reset');

  const meta = await getStoredVaultMetadata();
  assert(meta === null, 'Vault metadata must be cleared after vault reset');

  const freshAccount = await registerLocalAccount('User', resetEmail, 'brandNewPassword456');
  assert(freshAccount.email === resetEmail, 'Fresh registration must succeed');
  const verifyFresh = await verifyAccountCredentials(resetEmail, 'brandNewPassword456');
  assert(verifyFresh.success, 'Fresh credentials must verify successfully');
  console.log('✓ TEST 4 PASSED: Clean vault reset enables friction-free re-registration.');

  console.log('\n================================================================================');
  console.log('   ALL RECOVERY & CREDENTIAL ROBUSTNESS TESTS PASSED (100%)');
  console.log('================================================================================\n');
}

runRecoveryRobustnessTests().catch((err) => {
  console.error('\n❌ RECOVERY ROBUSTNESS TEST FAILURE:', err);
  process.exit(1);
});
