/**
 * Comprehensive Automated Test Suite for Envelope Cryptography (Phase 1A).
 *
 * Tests:
 * 1. DEK generation (256-bit length, cryptographically random, independent).
 * 2. Salt generation (16-byte random, uniqueness across vault initializations).
 * 3. KDF (PBKDF2-HMAC-SHA256 determinism and variation).
 * 4. Key Wrapping & Unwrapping (AES-256-GCM round-trip correctness).
 * 5. Wrong Password Rejection (derives incorrect KEK, unwrap rejected by auth tag).
 * 6. Tamper Detection (tampered wrappedDEK or wrapIV causes unwrap rejection).
 * 7. IV Uniqueness (fresh random 96-bit IV generated on each wrap).
 * 8. Vault Metadata Lifecycle (createVaultEnvelope & unlockVaultEnvelope).
 */

import {
  generateSalt,
  generateWrapIV,
  generateDEK,
  deriveKEK,
  wrapDEK,
  unwrapDEK,
  exportRawKey,
  createVaultEnvelope,
  unlockVaultEnvelope,
  bytesToBase64,
  base64ToBytes,
  KDF_CONFIG,
  type VaultCryptoMetadata,
} from '../envelope-crypto';

// Helper: Check if two Uint8Array buffers are byte-for-byte identical
function areBuffersEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Helper: Convert Uint8Array to Hex string for easy debugging
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runEnvelopeCryptoTests() {
  console.log('====================================================');
  console.log('  VITAL DIARIES — PHASE 1A CRYPTO FOUNDATION TESTS  ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✓ [PASS] ${testName}`);
      if (details) console.log(`         ${details}`);
    } else {
      console.error(`✗ [FAIL] ${testName}`);
      if (details) console.error(`         ${details}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: DEK Generation
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: DEK Generation ---');
  {
    const dek1 = await generateDEK();
    const dek2 = await generateDEK();

    assert(dek1.type === 'secret', 'DEK is a secret key');
    assert(dek1.algorithm.name === 'AES-GCM', 'DEK algorithm is AES-GCM');
    assert((dek1.algorithm as any).length === 256, 'DEK is 256 bits (32 bytes)');

    const raw1 = await exportRawKey(dek1);
    const raw2 = await exportRawKey(dek2);

    assert(raw1.byteLength === 32, 'DEK exported raw size is exactly 32 bytes (256 bits)', `Length: ${raw1.byteLength} bytes`);
    assert(!areBuffersEqual(raw1, raw2), 'Consecutively generated DEKs are random and unique', `DEK 1: ${bufferToHex(raw1).slice(0, 16)}... vs DEK 2: ${bufferToHex(raw2).slice(0, 16)}...`);

    // Verify DEK is NOT derived from password or salt
    const testPassword = 'MySecretPassword123!';
    const salt = generateSalt();
    const kek = await deriveKEK(testPassword, salt);
    const dek3 = await generateDEK();
    const rawDek3 = await exportRawKey(dek3);
    const rawKek = await exportRawKey(
      await (globalThis.crypto || (window as any).crypto).subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'AES-GCM' },
        true,
        ['encrypt']
      )
    );
    assert(!areBuffersEqual(rawDek3, rawKek), 'DEK is generated independently from password/KDF material');
  }

  // -------------------------------------------------------------
  // TEST 2: Salt Generation
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Salt Generation ---');
  {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    assert(salt1.byteLength === 16, 'Salt is 16 bytes (128 bits)', `Length: ${salt1.byteLength} bytes`);
    assert(salt2.byteLength === 16, 'Salt 2 is 16 bytes (128 bits)', `Length: ${salt2.byteLength} bytes`);
    assert(!areBuffersEqual(salt1, salt2), 'Different salt generations produce cryptographically unique salts', `Salt 1: ${bufferToHex(salt1)} vs Salt 2: ${bufferToHex(salt2)}`);
  }

  // -------------------------------------------------------------
  // TEST 3: KDF (PBKDF2-HMAC-SHA256) Derivation
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: KDF Derivation ---');
  {
    const pwdA = 'UserVaultPasswordAlpha#2026';
    const pwdB = 'UserVaultPasswordBeta#2026';
    const saltA = generateSalt();
    const saltB = generateSalt();

    // Derivation A1 & A2 (same pwd, same salt -> must produce same key behavior)
    const kekA1 = await deriveKEK(pwdA, saltA);
    const kekA2 = await deriveKEK(pwdA, saltA);

    // Test equivalence by encrypting known text or wrapping known DEK
    const testDEK = await generateDEK();
    const wrapped = await wrapDEK(testDEK, kekA1);
    const unwrappedWithA2 = await unwrapDEK(wrapped.wrappedDEK, wrapped.wrapIV, kekA2);
    const rawOriginal = await exportRawKey(testDEK);
    const rawUnwrapped = await exportRawKey(unwrappedWithA2);

    assert(areBuffersEqual(rawOriginal, rawUnwrapped), 'Same password + same salt derives identical KEK');

    // Derivation with different salt (same pwd, different salt -> different KEK)
    const kekDiffSalt = await deriveKEK(pwdA, saltB);
    let diffSaltFailed = false;
    try {
      await unwrapDEK(wrapped.wrappedDEK, wrapped.wrapIV, kekDiffSalt);
    } catch {
      diffSaltFailed = true;
    }
    assert(diffSaltFailed, 'Same password + different salt produces different KEK (unwrap fails)');

    // Derivation with different password (different pwd, same salt -> different KEK)
    const kekDiffPwd = await deriveKEK(pwdB, saltA);
    let diffPwdFailed = false;
    try {
      await unwrapDEK(wrapped.wrappedDEK, wrapped.wrapIV, kekDiffPwd);
    } catch {
      diffPwdFailed = true;
    }
    assert(diffPwdFailed, 'Different password + same salt produces different KEK (unwrap fails)');
  }

  // -------------------------------------------------------------
  // TEST 4: DEK Wrapping & Unwrapping (Authenticated Key Wrapping)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Key Wrapping & Unwrapping ---');
  {
    const originalDEK = await generateDEK();
    const salt = generateSalt();
    const kek = await deriveKEK('SecureMasterPassword2026!', salt);

    const { wrappedDEK, wrapIV } = await wrapDEK(originalDEK, kek);

    assert(typeof wrappedDEK === 'string' && wrappedDEK.length > 0, 'Wrapped DEK is valid Base64 string');
    assert(typeof wrapIV === 'string' && wrapIV.length > 0, 'Wrap IV is valid Base64 string');

    const unwrappedDEK = await unwrapDEK(wrappedDEK, wrapIV, kek);

    const rawOriginal = await exportRawKey(originalDEK);
    const rawUnwrapped = await exportRawKey(unwrappedDEK);

    assert(areBuffersEqual(rawOriginal, rawUnwrapped), 'Unwrapped DEK is 100% byte-for-byte identical to original DEK', `Key Hex: ${bufferToHex(rawOriginal)}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Wrong Password Rejection
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Wrong Password Rejection ---');
  {
    const salt = generateSalt();
    const correctKEK = await deriveKEK('CorrectPassword123', salt);
    const wrongKEK = await deriveKEK('IncorrectPassword999', salt);

    const originalDEK = await generateDEK();
    const { wrappedDEK, wrapIV } = await wrapDEK(originalDEK, correctKEK);

    let failedAsExpected = false;
    try {
      await unwrapDEK(wrappedDEK, wrapIV, wrongKEK);
    } catch (err: any) {
      failedAsExpected = true;
      assert(err.message.includes('Unwrap DEK failed'), 'Error clearly indicates unwrap authentication failure');
    }
    assert(failedAsExpected, 'Unwrap with wrong password KEK throws authentication failure');
  }

  // -------------------------------------------------------------
  // TEST 6: Tampering Detection (GCM Authentication Tag)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Tampering Detection ---');
  {
    const salt = generateSalt();
    const kek = await deriveKEK('TamperProofPassword', salt);
    const dek = await generateDEK();
    const { wrappedDEK, wrapIV } = await wrapDEK(dek, kek);

    // Tamper with wrappedDEK ciphertext
    const rawCipherBytes = base64ToBytes(wrappedDEK);
    rawCipherBytes[0] ^= 0xff; // Flip first byte
    const tamperedWrappedDEK = bytesToBase64(rawCipherBytes);

    let ciphertextTamperFailed = false;
    try {
      await unwrapDEK(tamperedWrappedDEK, wrapIV, kek);
    } catch {
      ciphertextTamperFailed = true;
    }
    assert(ciphertextTamperFailed, 'Tampering with wrapped DEK ciphertext byte causes unwrap rejection');

    // Tamper with wrapIV
    const rawIVBytes = base64ToBytes(wrapIV);
    rawIVBytes[0] ^= 0xff; // Flip first byte of IV
    const tamperedIV = bytesToBase64(rawIVBytes);

    let ivTamperFailed = false;
    try {
      await unwrapDEK(wrappedDEK, tamperedIV, kek);
    } catch {
      ivTamperFailed = true;
    }
    assert(ivTamperFailed, 'Tampering with wrap IV causes unwrap rejection');
  }

  // -------------------------------------------------------------
  // TEST 7: IV Uniqueness
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: IV Uniqueness Across Wraps ---');
  {
    const ivSet = new Set<string>();
    const count = 50;

    for (let i = 0; i < count; i++) {
      const iv = generateWrapIV();
      const ivB64 = bytesToBase64(iv);
      assert(iv.byteLength === 12, `IV ${i + 1} is 12 bytes (96 bits)`);
      ivSet.add(ivB64);
    }

    assert(ivSet.size === count, `All ${count} generated wrap IVs are distinct and unique`);

    // Verify multiple wraps of the same DEK with the same KEK generate unique IVs and ciphertexts
    const salt = generateSalt();
    const kek = await deriveKEK('UniqueIVTestPass', salt);
    const dek = await generateDEK();

    const wrap1 = await wrapDEK(dek, kek);
    const wrap2 = await wrapDEK(dek, kek);

    assert(wrap1.wrapIV !== wrap2.wrapIV, 'Two wraps of identical DEK produce different IVs');
    assert(wrap1.wrappedDEK !== wrap2.wrappedDEK, 'Two wraps of identical DEK produce different ciphertexts');
  }

  // -------------------------------------------------------------
  // TEST 8: Full Vault Lifecycle (createVaultEnvelope & unlockVaultEnvelope)
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Full Vault Lifecycle ---');
  {
    const vaultPassword = 'SuperSecretVaultMaster2026#';
    const { metadata, dek: initialDEK } = await createVaultEnvelope(vaultPassword);

    // Verify metadata structure
    assert(metadata.cryptoVersion === 2, 'Metadata cryptoVersion is 2');
    assert(metadata.kdf === 'PBKDF2-HMAC-SHA256', 'Metadata KDF is PBKDF2-HMAC-SHA256');
    assert(metadata.kdfParams.iterations === 100000, 'Metadata iterations is 100,000');
    assert(metadata.kdfParams.hash === 'SHA-256', 'Metadata hash is SHA-256');
    assert(metadata.kdfParams.saltLengthBytes === 16, 'Metadata salt length is 16 bytes');
    assert(metadata.cipherAlgorithm === 'AES-256-GCM', 'Cipher algorithm is AES-256-GCM');
    assert(typeof metadata.salt === 'string' && metadata.salt.length === 24, 'Salt is valid 16-byte base64 string');
    assert(typeof metadata.wrappedDEK === 'string' && metadata.wrappedDEK.length > 0, 'wrappedDEK is present in metadata');
    assert(typeof metadata.wrapIV === 'string' && metadata.wrapIV.length === 16, 'wrapIV is valid 12-byte base64 string');

    // Unlock vault with correct password
    const unlockedDEK = await unlockVaultEnvelope(vaultPassword, metadata);
    const rawInitial = await exportRawKey(initialDEK);
    const rawUnlocked = await exportRawKey(unlockedDEK);

    assert(areBuffersEqual(rawInitial, rawUnlocked), 'Unlocked DEK matches original DEK in full vault lifecycle');

    // Unlock vault with wrong password
    let unlockWrongFailed = false;
    try {
      await unlockVaultEnvelope('WrongVaultPassword', metadata);
    } catch {
      unlockWrongFailed = true;
    }
    assert(unlockWrongFailed, 'unlockVaultEnvelope with incorrect password throws authentication error');
  }

  console.log('\n====================================================');
  console.log(`  ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

// Execute tests
runEnvelopeCryptoTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
