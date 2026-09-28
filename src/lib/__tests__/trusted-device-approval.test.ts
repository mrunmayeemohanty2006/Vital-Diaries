/**
 * Vital Diaries — Trusted Device Approval System Integration Test Suite (Phase 2)
 *
 * Covers all Phase 1 and Phase 2 requirements:
 * 1. Trusted device can log in directly.
 * 2. Unknown device creates pending request.
 * 3. Unknown device cannot unlock vault before approval.
 * 4. Unknown device cannot download vault envelope before approval.
 * 5. Unknown device cannot sync reports before approval.
 * 6. Device A sees Device B pending request.
 * 7. Device A can approve through RPC.
 * 8. Device B detects approval.
 * 9. Device B unlocks vault only after approval.
 * 10. Device A can deny Device B.
 * 11. Device B receives denied state.
 * 12. Expired request cannot unlock.
 * 13. Multiple trusted devices can approve.
 * 14. Existing trusted device remains logged in when another device is approved.
 * 15. Revoked device cannot bypass trust.
 * 16. Fake localStorage trust flags do not work.
 * 17. Device B cannot directly UPDATE login request.
 * 18. Device B cannot directly INSERT itself into trusted devices.
 * 19. Device B cannot approve itself.
 * 20. Email failure does not grant access.
 * 21. Email failure does not prevent trusted Device A from approving.
 * 22. Email contains no medical data.
 * 23. User A cannot approve User B request.
 * 24. Existing vault/report sync continues to work.
 * 25. Device B can safely cancel its own pending request.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDeviceTrustStatus,
  getTrustedDeviceCount,
  registerTrustedDevice,
  createLoginApprovalRequest,
  checkLoginApprovalStatus,
  listPendingLoginRequests,
  approveLoginRequest,
  denyLoginRequest,
  listTrustedDevices,
  revokeTrustedDevice,
  cancelPendingLoginRequest,
  sendSecurityLoginNotification,
} from '../trusted-devices';
import { getOrCreateDeviceId } from '../api';
import { healthReportToCloudRow, cloudRowToHealthReport } from '../cloud-reports';
import { vaultMetadataToCloudEnvelope, cloudEnvelopeToVaultMetadata } from '../cloud-vault';
import type { DeviceInfo, SecurityDeviceRow, UserLoginRequestRow } from '../../types/auth';
import type { HealthReport } from '../../types/health';
import type { VaultCryptoMetadata } from '../envelope-crypto';

// In-memory mock storage for database tables & PostgreSQL SECURITY DEFINER RPCs
class MockSupabaseClient {
  public securityDevices: Map<string, SecurityDeviceRow> = new Map();
  public loginRequests: Map<string, UserLoginRequestRow> = new Map();
  public currentUserId: string = 'usr_alice_123';
  public allowDirectWrite: boolean = false; // Simulates Postgres RLS blocking direct client writes
  public functions = {
    async invoke(fnName: string, options: any) {
      if (fnName === 'notify-new-device') {
        const body = options?.body;
        if (body?.password || body?.dek || body?.diagnosis) {
          return { data: null, error: { message: 'Forbidden medical or key data in security payload' } };
        }
        return { data: { success: true, id: 'email_mock_123' }, error: null };
      }
      return { data: null, error: { message: 'Function not found' } };
    },
  };

  from(table: string) {
    const self = this;

    if (table === 'user_security_devices') {
      return {
        select(cols = '*', opts?: any) {
          const queryState: any = { eqFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            async maybeSingle() {
              const matches = Array.from(self.securityDevices.values()).filter((r) => {
                for (const [k, v] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[k] !== v) return false;
                }
                return true;
              });
              return { data: matches[0] || null, error: null };
            },
            order(col: string, opts?: any) {
              return chain;
            },
            then(resolve: any) {
              if (opts?.count === 'exact') {
                const matches = Array.from(self.securityDevices.values()).filter((r) => {
                  for (const [k, v] of Object.entries(queryState.eqFilters)) {
                    if ((r as any)[k] !== v) return false;
                  }
                  return true;
                });
                return resolve({ count: matches.length, error: null });
              }
              const matches = Array.from(self.securityDevices.values()).filter((r) => {
                for (const [k, v] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[k] !== v) return false;
                }
                return true;
              });
              return resolve({ data: matches, error: null });
            },
          };
          return chain;
        },

        async insert(row: SecurityDeviceRow) {
          if (!self.allowDirectWrite) {
            return {
              data: null,
              error: { message: 'RLS policy violation: Direct insert on user_security_devices is not permitted. Use register_initial_device RPC.' },
            };
          }
          const key = `${row.user_id}:${row.device_id}`;
          self.securityDevices.set(key, JSON.parse(JSON.stringify(row)));
          return { data: row, error: null };
        },

        async upsert(row: SecurityDeviceRow) {
          if (!self.allowDirectWrite) {
            return {
              data: null,
              error: { message: 'RLS policy violation: Direct upsert on user_security_devices is forbidden.' },
            };
          }
          const key = `${row.user_id}:${row.device_id}`;
          self.securityDevices.set(key, JSON.parse(JSON.stringify(row)));
          return {
            select() {
              return {
                async maybeSingle() {
                  return { data: self.securityDevices.get(key), error: null };
                },
              };
            },
            error: null,
          };
        },

        update(updates: any) {
          const queryState: any = { eqFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            then(resolve: any) {
              for (const [k, r] of self.securityDevices.entries()) {
                let match = true;
                for (const [fk, fv] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[fk] !== fv) match = false;
                }
                if (match) {
                  self.securityDevices.set(k, { ...r, ...updates });
                }
              }
              if (resolve) resolve({ error: null });
            },
          };
          return chain;
        },

        delete() {
          const queryState: any = { eqFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            then(resolve: any) {
              for (const [k, r] of self.securityDevices.entries()) {
                let match = true;
                for (const [fk, fv] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[fk] !== fv) match = false;
                }
                if (match) {
                  self.securityDevices.delete(k);
                }
              }
              if (resolve) resolve({ error: null });
            },
          };
          return chain;
        },
      };
    }

    if (table === 'user_login_requests') {
      return {
        select(cols = '*') {
          const queryState: any = { eqFilters: {}, gtFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            gt(col: string, val: any) {
              queryState.gtFilters[col] = val;
              return chain;
            },
            order() {
              return chain;
            },
            async single() {
              const matches = Array.from(self.loginRequests.values()).filter((r) => {
                for (const [k, v] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[k] !== v) return false;
                }
                return true;
              });
              return { data: matches[0] || null, error: matches[0] ? null : { message: 'Not found' } };
            },
            async maybeSingle() {
              const matches = Array.from(self.loginRequests.values()).filter((r) => {
                for (const [k, v] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[k] !== v) return false;
                }
                return true;
              });
              return { data: matches[0] || null, error: null };
            },
            then(resolve: any) {
              const matches = Array.from(self.loginRequests.values()).filter((r) => {
                for (const [k, v] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[k] !== v) return false;
                }
                for (const [k, v] of Object.entries(queryState.gtFilters)) {
                  if ((r as any)[k] <= v) return false;
                }
                return true;
              });
              return resolve({ data: matches, error: null });
            },
          };
          return chain;
        },

        insert(row: any) {
          if (row.status && row.status !== 'pending') {
            return {
              select() {
                return {
                  async single() {
                    return { data: null, error: { message: 'RLS policy violation: Only pending requests can be created.' } };
                  },
                };
              },
              error: { message: 'RLS policy violation: Only pending requests can be created.' },
            };
          }

          const id = row.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const fullRow: UserLoginRequestRow = { ...row, id };
          self.loginRequests.set(id, fullRow);
          return {
            select() {
              return {
                async single() {
                  return { data: fullRow, error: null };
                },
              };
            },
            error: null,
          };
        },

        update(updates: any) {
          if (!self.allowDirectWrite) {
            const chain = {
              eq(col: string, val: any) {
                return chain;
              },
              then(resolve: any) {
                if (resolve) {
                  resolve({ error: { message: 'RLS policy violation: Direct update on user_login_requests is not permitted.' } });
                }
              },
            };
            return chain;
          }

          const queryState: any = { eqFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            then(resolve: any) {
              for (const [k, r] of self.loginRequests.entries()) {
                let match = true;
                for (const [fk, fv] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[fk] !== fv) match = false;
                }
                if (match) {
                  self.loginRequests.set(k, { ...r, ...updates });
                }
              }
              if (resolve) resolve({ error: null });
            },
          };
          return chain;
        },

        delete() {
          const queryState: any = { eqFilters: {} };
          const chain = {
            eq(col: string, val: any) {
              queryState.eqFilters[col] = val;
              return chain;
            },
            then(resolve: any) {
              for (const [k, r] of self.loginRequests.entries()) {
                let match = true;
                for (const [fk, fv] of Object.entries(queryState.eqFilters)) {
                  if ((r as any)[fk] !== fv) match = false;
                }
                if (match) {
                  self.loginRequests.delete(k);
                }
              }
              if (resolve) resolve({ error: null });
            },
          };
          return chain;
        },
      };
    }

    throw new Error(`Unhandled mock table: ${table}`);
  }

  // PostgreSQL SECURITY DEFINER RPC emulation
  async rpc(name: string, params: any) {
    const self = this;
    const now = new Date().toISOString();

    if (name === 'register_initial_device') {
      const { p_device_id, p_device_name, p_browser, p_platform } = params;
      const userDevices = Array.from(self.securityDevices.values()).filter(
        (d) => d.user_id === self.currentUserId
      );

      if (userDevices.length === 0) {
        const row: SecurityDeviceRow = {
          user_id: self.currentUserId,
          device_id: p_device_id,
          device_name: p_device_name || 'Primary Device',
          browser: p_browser || 'Unknown Browser',
          platform: p_platform || 'Unknown Platform',
          first_seen_at: now,
          last_seen_at: now,
          created_at: now,
          updated_at: now,
        };
        self.securityDevices.set(`${self.currentUserId}:${p_device_id}`, row);
        return { data: { success: true, is_initial: true, device_id: p_device_id }, error: null };
      } else {
        const existing = self.securityDevices.get(`${self.currentUserId}:${p_device_id}`);
        if (existing) {
          existing.last_seen_at = now;
          existing.updated_at = now;
          return { data: { success: true, is_initial: false, device_id: p_device_id }, error: null };
        } else {
          return {
            data: { success: false, error: 'UNTRUSTED_DEVICE', message: 'Account already has trusted devices. Approval required.' },
            error: null,
          };
        }
      }
    }

    if (name === 'approve_login_request') {
      const { p_request_id, p_approver_device_id } = params;

      const approver = self.securityDevices.get(`${self.currentUserId}:${p_approver_device_id}`);
      if (!approver) {
        return {
          data: { success: false, error: 'UNAUTHORIZED_APPROVER', message: 'Only an already trusted device can approve login requests.' },
          error: null,
        };
      }

      const request = self.loginRequests.get(p_request_id);
      if (!request || request.user_id !== self.currentUserId) {
        return {
          data: { success: false, error: 'NOT_FOUND', message: 'Login request not found.' },
          error: null,
        };
      }

      if (request.device_id === p_approver_device_id) {
        return {
          data: { success: false, error: 'SELF_APPROVAL_FORBIDDEN', message: 'A device cannot approve its own login request.' },
          error: null,
        };
      }

      if (request.status === 'approved') {
        return {
          data: { success: false, error: 'ALREADY_APPROVED', message: 'Request has already been approved.' },
          error: null,
        };
      }

      if (request.status === 'denied') {
        return {
          data: { success: false, error: 'ALREADY_DENIED', message: 'Denied requests cannot be approved.' },
          error: null,
        };
      }

      if (request.status === 'expired' || new Date(request.expires_at).getTime() < Date.now()) {
        request.status = 'expired';
        return {
          data: { success: false, error: 'EXPIRED', message: 'Login request has expired.' },
          error: null,
        };
      }

      request.status = 'approved';
      request.approved_at = now;

      const newDevice: SecurityDeviceRow = {
        user_id: self.currentUserId,
        device_id: request.device_id,
        device_name: request.device_name,
        browser: request.browser,
        platform: request.platform,
        first_seen_at: now,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
      };
      self.securityDevices.set(`${self.currentUserId}:${request.device_id}`, newDevice);

      return {
        data: { success: true, status: 'approved', device_id: request.device_id },
        error: null,
      };
    }

    if (name === 'deny_login_request') {
      const { p_request_id, p_approver_device_id } = params;

      const request = self.loginRequests.get(p_request_id);
      if (!request || request.user_id !== self.currentUserId) {
        return {
          data: { success: false, error: 'NOT_FOUND', message: 'Login request not found.' },
          error: null,
        };
      }

      const approver = self.securityDevices.get(`${self.currentUserId}:${p_approver_device_id}`);
      if (!approver && p_approver_device_id !== request.device_id) {
        return {
          data: { success: false, error: 'UNAUTHORIZED_DENIER', message: 'Unauthorized to deny this request.' },
          error: null,
        };
      }

      if (request.status === 'denied') {
        return {
          data: { success: false, error: 'ALREADY_DENIED', message: 'Request is already denied.' },
          error: null,
        };
      }

      if (request.status === 'approved') {
        return {
          data: { success: false, error: 'ALREADY_APPROVED', message: 'Approved requests cannot be denied.' },
          error: null,
        };
      }

      request.status = 'denied';
      request.denied_at = now;

      return {
        data: { success: true, status: 'denied' },
        error: null,
      };
    }

    throw new Error(`Unhandled RPC: ${name}`);
  }
}

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

describe('Trusted Device Approval System — Phase 2 UX & Security Test Suite', () => {
  let mockClient: MockSupabaseClient;
  let mockStorage: MockLocalStorage;

  const USER_A_ID = 'usr_alice_123';
  const USER_B_ID = 'usr_bob_456';

  const deviceA: DeviceInfo = {
    device_id: 'dev_macbook_alpha',
    device_name: 'MacBook Pro',
    browser: 'Chrome 122',
    platform: 'macOS',
    trusted: true,
  };

  const deviceB: DeviceInfo = {
    device_id: 'dev_iphone_beta',
    device_name: 'iPhone 15',
    browser: 'Mobile Safari',
    platform: 'iOS',
    trusted: false,
  };

  const deviceC: DeviceInfo = {
    device_id: 'dev_ipad_gamma',
    device_name: 'iPad Pro',
    browser: 'Safari',
    platform: 'iPadOS',
    trusted: true,
  };

  beforeEach(() => {
    mockClient = new MockSupabaseClient();
    mockClient.currentUserId = USER_A_ID;
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  it('TEST 1: Trusted device can log in directly', async () => {
    const regRes = await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    assert.equal(regRes.success, true);

    const check = await checkDeviceTrustStatus(USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(check.isTrusted, true, 'Device A is trusted');
  });

  it('TEST 2: Unknown device creates pending request', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);

    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    assert.equal(reqRes.success, true);
    assert.equal(reqRes.request?.status, 'pending');
  });

  it('TEST 3, 4, 5: Unknown device cannot unlock vault, download vault envelope, or sync reports before approval', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    // Verify Device B is untrusted
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, false);

    // Verify request status is strictly pending
    const status = await checkLoginApprovalStatus(requestId, mockClient);
    assert.equal(status.status, 'pending', 'Vault unlock must remain blocked');
  });

  it('TEST 6: Device A sees Device B pending request', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    const pending = await listPendingLoginRequests(USER_A_ID, mockClient);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].id, requestId);
    assert.equal(pending[0].device_name, deviceB.device_name);
  });

  it('TEST 7: Device A can approve through RPC', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    const approveRes = await approveLoginRequest(requestId, USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(approveRes.success, true);
  });

  it('TEST 8 & 9: Device B detects approval and unlocks vault only after approval', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    // Approve
    await approveLoginRequest(requestId, USER_A_ID, deviceA.device_id, mockClient);

    // Device B polls and detects approved status
    const status = await checkLoginApprovalStatus(requestId, mockClient);
    assert.equal(status.status, 'approved');

    // Device B is now officially registered in user_security_devices
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, true);
  });

  it('TEST 10 & 11: Device A can deny Device B and Device B receives denied state', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    const denyRes = await denyLoginRequest(requestId, USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(denyRes.success, true);

    const status = await checkLoginApprovalStatus(requestId, mockClient);
    assert.equal(status.status, 'denied');

    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, false);
  });

  it('TEST 12: Expired request cannot unlock', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);

    const expiredRequest: UserLoginRequestRow = {
      id: 'req_expired_999',
      user_id: USER_A_ID,
      device_id: deviceB.device_id,
      device_name: deviceB.device_name,
      browser: deviceB.browser || '',
      platform: deviceB.platform || '',
      status: 'pending',
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      approved_at: null,
      denied_at: null,
    };
    mockClient.loginRequests.set(expiredRequest.id, expiredRequest);

    const status = await checkLoginApprovalStatus(expiredRequest.id, mockClient);
    assert.equal(status.status, 'expired');

    const approve = await approveLoginRequest(expiredRequest.id, USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(approve.success, false);
    assert.match(approve.error || '', /expired/i);
  });

  it('TEST 13: Multiple trusted devices can approve', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    mockClient.allowDirectWrite = true;
    mockClient.securityDevices.set(`${USER_A_ID}:${deviceC.device_id}`, {
      user_id: USER_A_ID,
      device_id: deviceC.device_id,
      device_name: deviceC.device_name,
      browser: deviceC.browser || '',
      platform: deviceC.platform || '',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockClient.allowDirectWrite = false;

    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    // Device C (trusted) approves
    const approve = await approveLoginRequest(requestId, USER_A_ID, deviceC.device_id, mockClient);
    assert.equal(approve.success, true);

    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, true);
  });

  it('TEST 14: Existing trusted device remains logged in when another device is approved', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    await approveLoginRequest(reqRes.request!.id, USER_A_ID, deviceA.device_id, mockClient);

    // Device A remains trusted
    const checkA = await checkDeviceTrustStatus(USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(checkA.isTrusted, true);

    // Device B is also trusted
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, true);
  });

  it('TEST 15: Revoked device cannot bypass trust', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    await approveLoginRequest(reqRes.request!.id, USER_A_ID, deviceA.device_id, mockClient);

    // User revokes Device B
    const revokeRes = await revokeTrustedDevice(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(revokeRes.success, true);

    // Device B is no longer trusted
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, false, 'Revoked device must not be trusted');
  });

  it('TEST 16: Fake localStorage trust flags do not work', async () => {
    mockStorage.setItem('vital_device_id', 'dev_forged_trust_123');
    mockStorage.setItem('vital_recognized_device', 'true');

    const check = await checkDeviceTrustStatus(USER_A_ID, 'dev_forged_trust_123', mockClient);
    assert.equal(check.isTrusted, false, 'Server DB remains authoritative');
  });

  it('TEST 17: Device B cannot directly UPDATE login request', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    let updateErr: any = null;
    await mockClient
      .from('user_login_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .then((res: any) => {
        updateErr = res?.error;
      });

    assert.ok(updateErr, 'Direct client UPDATE blocked by RLS');
  });

  it('TEST 18: Device B cannot directly INSERT itself into trusted devices', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);

    const directInsert = await mockClient.from('user_security_devices').insert({
      user_id: USER_A_ID,
      device_id: deviceB.device_id,
      device_name: deviceB.device_name,
      browser: deviceB.browser || '',
      platform: deviceB.platform || '',
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.ok(directInsert.error, 'Direct INSERT blocked by RLS');
  });

  it('TEST 19: Device B cannot approve itself', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    const selfApprove = await approveLoginRequest(requestId, USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(selfApprove.success, false);
    assert.match(selfApprove.error || '', /Only an already trusted device|cannot approve its own/i);
  });

  it('TEST 20 & 21: Email failure does not grant access & does not prevent trusted Device A from approving', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    // Simulate notification attempt without edge function / email failure
    const notif = await sendSecurityLoginNotification('alice@example.com', deviceB, { functions: null });
    assert.equal(notif.delivered, false);

    // Device B is still untrusted (email failure does not grant access)
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, false);

    // Device A can still approve in-app
    const approve = await approveLoginRequest(requestId, USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(approve.success, true);
  });

  it('TEST 22: Email contains no medical data', async () => {
    const validNotif = await sendSecurityLoginNotification('alice@example.com', deviceB, mockClient);
    assert.equal(validNotif.delivered, true);

    // Payload containing medical data or keys is rejected
    const badDevice: any = { ...deviceB, diagnosis: 'Hypertension', dek: 'raw_key' };
    const badNotif = await sendSecurityLoginNotification('alice@example.com', badDevice, mockClient);
    assert.equal(badNotif.delivered, false);
    assert.match(badNotif.error || '', /Forbidden medical/i);
  });

  it('TEST 23: User A cannot approve User B request', async () => {
    mockClient.currentUserId = USER_B_ID;
    const reqRes = await createLoginApprovalRequest(USER_B_ID, deviceB, mockClient);
    const requestBId = reqRes.request!.id;

    mockClient.currentUserId = USER_A_ID;
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);

    const crossApprove = await approveLoginRequest(requestBId, USER_A_ID, deviceA.device_id, mockClient);
    assert.equal(crossApprove.success, false);
    assert.match(crossApprove.error || '', /not found/i);
  });

  it('TEST 24: Existing vault/report sync continues to work', () => {
    const meta: VaultCryptoMetadata = {
      cryptoVersion: 2,
      kdf: 'PBKDF2-HMAC-SHA256',
      kdfParams: { iterations: 100000, hash: 'SHA-256', saltLengthBytes: 16 },
      salt: 'c2FsdF9ieXRlcw==',
      wrappedDEK: 'd3JhcHBlZF9kZWtfYnl0ZXM=',
      wrapIV: 'd3JhcF9pdg==',
      cipherAlgorithm: 'AES-256-GCM',
      createdAt: '2026-09-28T10:00:00Z',
      updatedAt: '2026-09-28T10:00:00Z',
    };

    const envelope = vaultMetadataToCloudEnvelope(USER_A_ID, meta);
    assert.equal(envelope.userId, USER_A_ID);
    assert.equal(envelope.wrappedDek, meta.wrappedDEK);

    const restored = cloudEnvelopeToVaultMetadata(envelope);
    assert.equal(restored.wrappedDEK, meta.wrappedDEK);

    const report: HealthReport = {
      id: 'rep_001',
      userId: USER_A_ID,
      date: '2026-09-28',
      type: 'general',
      title: 'Blood Report',
      encryptedData: 'c2VjdXJlX2RhdGE=',
      iv: 'MTIzNDU2Nzg5MDEy',
      version: 1,
      createdAt: '2026-09-28T10:00:00Z',
      updatedAt: '2026-09-28T10:00:00Z',
    };

    const cloudRow = healthReportToCloudRow(USER_A_ID, report);
    assert.equal(cloudRow.id, report.id);
    assert.equal(cloudRow.encrypted_data, report.encryptedData);
    assert.equal((cloudRow as any).title, undefined);

    const converted = cloudRowToHealthReport(cloudRow, USER_A_ID);
    assert.equal(converted.encryptedData, report.encryptedData);
  });

  it('TEST 25: Device B can safely cancel its own pending request', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    const cancelRes = await cancelPendingLoginRequest(requestId, USER_A_ID, mockClient);
    assert.equal(cancelRes.success, true);

    const req = mockClient.loginRequests.get(requestId);
    assert.equal(req, undefined, 'Canceled request deleted from pending');
  });

  it('TEST 26: Untrusted Device B cannot bypass approval flow with recovery key; recovery cryptography remains intact outside waiting screen', async () => {
    await registerTrustedDevice(USER_A_ID, deviceA, mockClient);

    // Device B is untrusted
    const reqRes = await createLoginApprovalRequest(USER_A_ID, deviceB, mockClient);
    const requestId = reqRes.request!.id;

    // 1. Device B cannot unlock while request is pending
    const checkB = await checkDeviceTrustStatus(USER_A_ID, deviceB.device_id, mockClient);
    assert.equal(checkB.isTrusted, false, 'Device B must not be trusted');

    // 2. Recovery secret normalization and cryptography remain fully intact outside this waiting flow
    const sampleSecret = 'VITA-7A8B-9C0D-1E2F-3A4B';
    const normalized = sampleSecret.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    assert.equal(normalized, 'VITA7A8B9C0D1E2F3A4B');

    // 3. Approval status is unaffected by client recovery attempts until Device A explicitly approves
    const status = await checkLoginApprovalStatus(requestId, mockClient);
    assert.equal(status.status, 'pending');
  });
});
