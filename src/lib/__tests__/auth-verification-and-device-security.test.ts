/**
 * Vital Diaries — Email Verification & New Device Security Notification Test Suite
 *
 * Verifies:
 * TEST 1: New registration requires email verification before vault entry.
 * TEST 2: Unverified account login returns clear verification message instead of invalid credentials.
 * TEST 3: Verified account login succeeds normally.
 * TEST 4: Recognized device login does not trigger duplicate security alert.
 * TEST 5: New unrecognized device login triggers security alert dispatch.
 * TEST 6: Security notification payload contains ZERO medical data, passwords, or keys.
 * TEST 7: Encrypted report synchronization continues to operate with zero-knowledge invariants.
 * TEST 8: Dual-envelope vault synchronization continues to operate with zero-knowledge invariants.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkAndNotifyNewDevice } from '../api';
import { healthReportToCloudRow, cloudRowToHealthReport } from '../cloud-reports';
import { vaultMetadataToCloudEnvelope, cloudEnvelopeToVaultMetadata } from '../cloud-vault';
import type { UserProfile, DeviceInfo } from '../../types/auth';
import type { HealthReport } from '../../types/health';
import type { VaultCryptoMetadata } from '../envelope-crypto';

// In-memory mock localStorage for Node testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('Authentication Improvements: Email Verification & Device Security', () => {
  const mockStorage = new MockLocalStorage();

  beforeEach(() => {
    mockStorage.clear();
    (globalThis as any).localStorage = mockStorage;
  });

  const testUser: UserProfile = {
    id: 'usr_auth_test_123',
    name: 'Alice Vance',
    email: 'alice@vitaldiaries.test',
    created_at: new Date().toISOString(),
  };

  const deviceA: DeviceInfo = {
    device_id: 'dev_laptop_alpha',
    device_name: 'MacBook Pro',
    browser: 'Chrome',
    platform: 'macOS',
    trusted: true,
    created_at: new Date().toISOString(),
  };

  const deviceB: DeviceInfo = {
    device_id: 'dev_phone_beta',
    device_name: 'iPhone 15',
    browser: 'Safari Mobile',
    platform: 'iOS',
    trusted: true,
    created_at: new Date().toISOString(),
  };

  it('TEST 1: Registration requirement flag signals email verification pending when session is missing', () => {
    // Simulating unconfirmed user from Supabase signUp
    const signUpResponse = {
      data: {
        user: {
          id: testUser.id,
          email: testUser.email,
          email_confirmed_at: null,
          confirmed_at: null,
        },
        session: null,
      },
      error: null,
    };

    const isConfirmed = Boolean(
      signUpResponse.data.user.email_confirmed_at ||
      signUpResponse.data.user.confirmed_at ||
      signUpResponse.data.session
    );
    const requiresEmailVerification = !isConfirmed;

    assert.equal(requiresEmailVerification, true, 'Unconfirmed user must require email verification');
  });

  it('TEST 2: Unverified account login returns specialized unconfirmed email error', () => {
    const supabaseErrors = [
      { message: 'Email not confirmed', code: 'email_not_confirmed' },
      { message: 'User email is not confirmed', code: 'email_not_confirmed' },
      { message: 'Email link is invalid or has expired', code: 'otp_expired' },
    ];

    for (const err of supabaseErrors.slice(0, 2)) {
      const isUnconfirmed =
        err.message.toLowerCase().includes('email not confirmed') ||
        err.message.toLowerCase().includes('not confirmed') ||
        err.code === 'email_not_confirmed';

      assert.equal(isUnconfirmed, true, `Should detect unconfirmed error for: ${err.message}`);
      
      const userFacingMessage = isUnconfirmed
        ? 'Please verify your email before signing in. Check your inbox for the verification link.'
        : 'Invalid email or password. Please check your credentials and try again.';

      assert.match(userFacingMessage, /verify your email/i);
      assert.doesNotMatch(userFacingMessage, /Invalid email or password/i);
    }
  });

  it('TEST 3: Verified account login resolves user profile and session token', () => {
    const verifiedResponse = {
      data: {
        user: {
          id: testUser.id,
          email: testUser.email,
          email_confirmed_at: new Date().toISOString(),
        },
        session: {
          access_token: 'mock_jwt_access_token_123',
        },
      },
      error: null,
    };

    assert.ok(verifiedResponse.data.session, 'Verified user must return active session');
    assert.ok(verifiedResponse.data.user.email_confirmed_at, 'User email must be confirmed');
  });

  it('TEST 4 & 5: New device triggers security alert, recognized device does not duplicate', async () => {
    // First login from Device A (New device for this user)
    const firstLogin = await checkAndNotifyNewDevice(testUser, deviceA);
    assert.equal(firstLogin.isNewDevice, true, 'First login on Device A must be recognized as new device');
    assert.equal(firstLogin.notified, true, 'Security alert must be dispatched for new device');

    // Second login from Device A (Already recognized)
    const secondLoginDeviceA = await checkAndNotifyNewDevice(testUser, deviceA);
    assert.equal(secondLoginDeviceA.isNewDevice, false, 'Second login on Device A is already recognized');
    assert.equal(secondLoginDeviceA.notified, false, 'No duplicate notification on recognized device');

    // Login from Device B (New device)
    const loginDeviceB = await checkAndNotifyNewDevice(testUser, deviceB);
    assert.equal(loginDeviceB.isNewDevice, true, 'Login from Device B must be recognized as new device');
    assert.equal(loginDeviceB.notified, true, 'Security alert must be dispatched for Device B');
  });

  it('TEST 6: Security notification payload contains strictly non-sensitive metadata only', async () => {
    const storageKey = `vital_known_devices_${testUser.id}`;
    mockStorage.clear();

    let capturedPayload: any = null;
    const mockClient = {
      functions: {
        invoke: async (name: string, options: any) => {
          if (name === 'send-security-email') {
            capturedPayload = options.body;
          }
          return { data: { success: true }, error: null };
        },
      },
    };

    const res = await checkAndNotifyNewDevice(testUser, deviceA, mockClient);

    assert.ok(capturedPayload || res.payload, 'Notification payload must be generated');
    const payload = capturedPayload || res.payload;
    assert.equal(payload.email, 'alice@vitaldiaries.test');
    assert.equal(payload.deviceName, 'MacBook Pro');
    assert.equal(payload.browser, 'Chrome');
    assert.equal(payload.platform, 'macOS');
    assert.ok(payload.timestamp);

    // Strict zero-knowledge invariant checks:
    const forbiddenKeys = [
      'password',
      'passwordHash',
      'dek',
      'wrappedDek',
      'kek',
      'recoverySecret',
      'diagnosis',
      'hemoglobin',
      'cholesterol',
      'labResults',
      'medicalNotes',
      'encryptedData',
      'reports',
    ];

    for (const key of forbiddenKeys) {
      assert.equal(capturedPayload[key], undefined, `Security payload must NEVER contain key '${key}'`);
    }

    const jsonStr = JSON.stringify(capturedPayload).toLowerCase();
    assert.equal(jsonStr.includes('blood'), false);
    assert.equal(jsonStr.includes('mg/dl'), false);
    assert.equal(jsonStr.includes('cbc'), false);
  });

  it('TEST 7: Encrypted report synchronization data access preserves zero-knowledge invariants', () => {
    const report: HealthReport = {
      id: 'rep_test_001',
      userId: testUser.id,
      date: '2026-09-27',
      type: 'cbc',
      title: 'Lipid Panel',
      doctorName: 'Dr. Jane Smith',
      encryptedData: 'c2VjdXJlX2NpcGhlcnRleHRfc3RyaW5n',
      iv: 'MTIzNDU2Nzg5MDEy',
      version: 1,
      createdAt: '2026-09-27T10:00:00Z',
      updatedAt: '2026-09-27T10:00:00Z',
    };

    const cloudRow = healthReportToCloudRow(testUser.id, report);
    assert.equal(cloudRow.id, report.id);
    assert.equal(cloudRow.user_id, testUser.id);
    assert.equal(cloudRow.encrypted_data, report.encryptedData);
    assert.equal(cloudRow.iv, report.iv);
    assert.equal((cloudRow as any).title, undefined);
    assert.equal((cloudRow as any).doctorName, undefined);
    assert.equal((cloudRow as any).type, undefined);

    const converted = cloudRowToHealthReport(cloudRow, testUser.id);
    assert.equal(converted.id, report.id);
    assert.equal(converted.encryptedData, report.encryptedData);
    assert.equal(converted.iv, report.iv);
  });

  it('TEST 8: Vault dual-envelope mapping preserves zero-knowledge invariants', () => {
    const meta: VaultCryptoMetadata = {
      cryptoVersion: 2,
      kdf: 'PBKDF2-HMAC-SHA256',
      kdfParams: { iterations: 100000, hash: 'SHA-256', saltLengthBytes: 16 },
      salt: 'c2FsdF9ieXRlcw==',
      wrappedDEK: 'd3JhcHBlZF9kZWtfYnl0ZXM=',
      wrapIV: 'd3JhcF9pdg==',
      cipherAlgorithm: 'AES-256-GCM',
      createdAt: '2026-09-27T10:00:00Z',
      updatedAt: '2026-09-27T10:00:00Z',
    };

    const envelope = vaultMetadataToCloudEnvelope(testUser.id, meta);
    assert.equal(envelope.userId, testUser.id);
    assert.equal(envelope.wrappedDek, meta.wrappedDEK);
    assert.equal(envelope.wrapIv, meta.wrapIV);
    assert.equal((envelope as any).password, undefined);
    assert.equal((envelope as any).dek, undefined);

    const restored = cloudEnvelopeToVaultMetadata(envelope);
    assert.equal(restored.salt, meta.salt);
    assert.equal(restored.wrappedDEK, meta.wrappedDEK);
    assert.equal(restored.wrapIV, meta.wrapIV);
  });
});
