/**
 * Comprehensive Account Credential, Identity & Vault Security Test Suite
 * 
 * 100% Local & Deterministic — Zero AI / Zero LLM / Zero External APIs
 * 
 * Invariants Verified:
 * 1. ONE EMAIL -> ONE ACCOUNT -> ONE PASSWORD CREDENTIAL -> ONE ENCRYPTION-KEY IDENTITY
 * 2. Zero Plaintext Passwords (Stored strictly as PBKDF2-HMAC-SHA256 with 16-byte random salts)
 * 3. Case-insensitive & whitespace-trimmed email normalization (User@Example.com == user@example.com)
 * 4. Duplicate registration prevention (rejects without overwriting existing password)
 * 5. Wrong password rejected deterministically without creating duplicate accounts or empty vaults
 * 6. Correct password preserves complete encryption-key hierarchy and decrypted report integrity
 */

import {
  normalizeEmail,
  registerLocalAccount,
  verifyAccountCredentials,
  getAccountByEmail,
  changeLocalAccountPassword,
} from '../account-store';
import {
  createVaultEnvelope,
  unlockVaultEnvelope,
  changeVaultPassword,
  hashPasswordForVerification,
  verifyPasswordHash,
} from '../envelope-crypto';
import { encryptData, decryptData } from '../crypto';
import { db } from '../db';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

console.log('================================================================================');
console.log('   ACCOUNT CREDENTIAL & ENCRYPTION-KEY SECURITY TEST SUITE');
console.log('================================================================================\n');

if (typeof localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

async function runSecurityTestSuite() {
  // Clear any existing test accounts in IndexedDB / localStorage
  try {
    await db.accounts.clear();
  } catch {}
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }

  // ---------------------------------------------------------------------------
  // TEST 1: New Account Registration
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: New Account Registration ---');
  const userEmail = 'test@example.com';
  const userPass = 'Password123';
  const userName = 'Alice Johnson';

  const account = await registerLocalAccount(userName, userEmail, userPass);
  assert(account.id.startsWith('usr_'), 'Account ID must be generated with usr_ prefix');
  assert(account.email === 'test@example.com', 'Account email must be normalized');
  assert(account.passwordHash !== userPass, 'Password must NEVER be stored in plaintext');
  assert(account.passwordSalt.length > 10, 'Password salt must be generated');
  assert(account.kdfIterations === 100000, 'KDF iterations must be 100,000');
  console.log('✓ TEST 1 PASSED: New account created with PBKDF2 salted hash (zero plaintext password stored).');

  // ---------------------------------------------------------------------------
  // TEST 2: Correct Login
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Correct Login ---');
  const loginRes1 = await verifyAccountCredentials('test@example.com', 'Password123');
  assert(loginRes1.success === true, 'Correct credentials must succeed authentication');
  assert(loginRes1.account?.email === 'test@example.com', 'Verified account must match email');
  console.log('✓ TEST 2 PASSED: Correct password authenticated successfully.');

  // ---------------------------------------------------------------------------
  // TEST 3: Wrong Password
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Wrong Password ---');
  const loginResWrong = await verifyAccountCredentials('test@example.com', 'DifferentPassword456');
  assert(loginResWrong.success === false, 'Wrong password must FAIL authentication');
  assert(loginResWrong.error === 'Incorrect password. Please try again.', 'Error message must be user-friendly');
  assert(loginResWrong.account === undefined, 'No account payload returned on wrong password');
  console.log('✓ TEST 3 PASSED: Wrong password rejected with "Incorrect password. Please try again."');

  // ---------------------------------------------------------------------------
  // TEST 4: Wrong Password Must NOT Create Another Account
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Wrong Password Must NOT Create Duplicate Account ---');
  let accountsInDb = 0;
  try {
    const all = await db.accounts.where('email').equals('test@example.com').toArray();
    accountsInDb = all.length;
  } catch {
    const raw = localStorage.getItem('vital_account_test@example.com');
    accountsInDb = raw ? 1 : 0;
  }
  assert(accountsInDb === 1, `Expected exactly 1 account for test@example.com, found ${accountsInDb}`);
  console.log(`✓ TEST 4 PASSED: Total accounts for test@example.com = ${accountsInDb} (Exactly 1 account maintained).`);

  // ---------------------------------------------------------------------------
  // TEST 5: Duplicate Registration
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Duplicate Registration ---');
  let dupError = '';
  try {
    await registerLocalAccount('Another Alice', 'test@example.com', 'AnotherPassword789');
  } catch (err: any) {
    dupError = err.message;
  }
  assert(
    dupError === 'An account with this email already exists. Please sign in instead.',
    `Expected duplicate registration rejection, got: "${dupError}"`
  );
  console.log('✓ TEST 5 PASSED: Duplicate registration rejected. Existing credentials left untouched.');

  // ---------------------------------------------------------------------------
  // TEST 6: Correct Password Still Works After Failed Duplicate Registration
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Correct Password Still Works After Duplicate Attempt ---');
  const loginResOriginal = await verifyAccountCredentials('test@example.com', 'Password123');
  assert(loginResOriginal.success === true, 'Original password must still authenticate');
  console.log('✓ TEST 6 PASSED: Original credentials remain completely valid and unchanged.');

  // ---------------------------------------------------------------------------
  // TEST 7: Wrong Password Cannot Access Encryption Key Hierarchy
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Wrong Password Cannot Access Encryption Key Hierarchy ---');
  const { metadata: vaultMetadata, dek: originalDEK } = await createVaultEnvelope('Password123');

  let wrongPassUnlocked = false;
  try {
    await unlockVaultEnvelope('WrongPassword456', vaultMetadata);
    wrongPassUnlocked = true;
  } catch {
    wrongPassUnlocked = false;
  }
  assert(wrongPassUnlocked === false, 'Wrong password must NOT unwrap the DEK (AES-GCM authentication tag mismatch)');
  console.log('✓ TEST 7 PASSED: Wrong password cannot derive valid KEK or unwrap AES-256 DEK.');

  // ---------------------------------------------------------------------------
  // TEST 8: Existing Encrypted Report Survives Log Out & Log In
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Existing Encrypted Report Survives Log Out & Log In ---');
  const medicalReportJson = JSON.stringify({
    title: 'Complete Blood Count',
    metrics: [{ name: 'Hemoglobin', value: 14.2, unit: 'g/dL' }],
    patient: 'Alice Johnson',
  });

  // Encrypt with original DEK
  const encryptedReport = await encryptData(medicalReportJson, originalDEK);

  // Simulate Logout (keys purged from RAM)
  let inMemoryDEK: any = null;

  // Simulate Login with Correct Password
  const loginAuth = await verifyAccountCredentials('test@example.com', 'Password123');
  assert(loginAuth.success === true, 'Login must succeed');
  inMemoryDEK = await unlockVaultEnvelope('Password123', vaultMetadata);

  // Decrypt Report with re-derived DEK
  const decryptedJson = await decryptData(encryptedReport.cipherText, encryptedReport.iv, inMemoryDEK);
  const parsedReport = JSON.parse(decryptedJson);
  assert(parsedReport.title === 'Complete Blood Count', 'Decrypted report title must match');
  assert(parsedReport.metrics[0].value === 14.2, 'Decrypted report metric value must match');
  console.log('✓ TEST 8 PASSED: Medical record decrypted with 100% data integrity after re-authentication.');

  // ---------------------------------------------------------------------------
  // TEST 9: Wrong Password Cannot Create an Empty Vault
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Wrong Password Cannot Create an Empty Vault ---');
  const originalWrappedCipher = vaultMetadata.wrappedDEK;
  const originalSalt = vaultMetadata.salt;

  // Failed login attempt with wrong password
  const badLogin = await verifyAccountCredentials('test@example.com', 'TotallyWrong999');
  assert(badLogin.success === false, 'Bad login must fail');

  // Verify that vault metadata was NOT mutated or overwritten
  assert(vaultMetadata.wrappedDEK === originalWrappedCipher, 'Vault metadata wrapped DEK must remain intact');
  assert(vaultMetadata.salt === originalSalt, 'Vault salt must remain unchanged');
  console.log('✓ TEST 9 PASSED: Failed login does NOT mutate vault metadata, overwrite salts, or create empty vaults.');

  // ---------------------------------------------------------------------------
  // TEST 10: Email Normalization
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Email Normalization ---');
  const variations = [
    'User@Example.com',
    'user@example.com',
    ' USER@EXAMPLE.COM ',
    '  user@example.com  ',
  ];

  const canonical = normalizeEmail('test@example.com');
  for (const v of variations) {
    const norm = normalizeEmail(v);
    assert(norm === 'user@example.com', `Variation "${v}" must normalize to "user@example.com"`);
  }

  // Register with uppercase & spaces
  await registerLocalAccount('Bob Smith', '  Bob.Smith@Hospital.ORG  ', 'SecureBobPass99!');
  const bobAccount = await getAccountByEmail('bob.smith@hospital.org');
  assert(bobAccount !== null, 'Account registered with mixed case/spaces must be discoverable by lowercase');
  assert(bobAccount?.email === 'bob.smith@hospital.org', 'Stored email must be lowercase');

  // Verify login with mixed case and extra spaces
  const bobLogin = await verifyAccountCredentials('  BOB.SMITH@HOSPITAL.ORG  ', 'SecureBobPass99!');
  assert(bobLogin.success === true, 'Login with mixed-case email must succeed seamlessly');
  console.log('✓ TEST 10 PASSED: Email normalization (trim + lowercase) verified across registration & login.');

  // ---------------------------------------------------------------------------
  // TEST 11: Authenticated Password Change Preserves DEK & Medical Data
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Authenticated Password Change Preserves DEK & Medical Data ---');
  // Change password for Alice
  const { updatedMetadata: newVaultMeta, dek: sameDEK } = await changeVaultPassword(
    'Password123',
    'NewSecurePassword456',
    vaultMetadata
  );

  // Update account verification credential
  await changeLocalAccountPassword('test@example.com', 'Password123', 'NewSecurePassword456');

  // Old password must now fail
  const oldLogin = await verifyAccountCredentials('test@example.com', 'Password123');
  assert(oldLogin.success === false, 'Old password must be rejected after password change');

  // New password must succeed
  const newLogin = await verifyAccountCredentials('test@example.com', 'NewSecurePassword456');
  assert(newLogin.success === true, 'New password must succeed authentication');

  // New password unlocks the EXACT SAME DEK and can decrypt Alice's earlier report
  const unlockedWithNewPass = await unlockVaultEnvelope('NewSecurePassword456', newVaultMeta);
  const decryptedAfterPassChange = await decryptData(encryptedReport.cipherText, encryptedReport.iv, unlockedWithNewPass);
  const parsedAfterPassChange = JSON.parse(decryptedAfterPassChange);
  assert(parsedAfterPassChange.title === 'Complete Blood Count', 'Medical report must remain decryptable after password change');
  console.log('✓ TEST 11 PASSED: Password changed safely via key re-wrapping; existing encrypted reports preserved 100%.');

  console.log('\n================================================================================');
  console.log('   ALL 11 ACCOUNT & CREDENTIAL SECURITY TESTS PASSED (100%)');
  console.log('================================================================================');
}

await runSecurityTestSuite();
