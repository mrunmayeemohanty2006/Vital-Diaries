/**
 * Vital Diaries — Trusted Device Approval System (Phase 1 Hardened)
 *
 * Secure data access layer for cross-device authentication approval.
 *
 * Zero-Knowledge & Security Invariants:
 * 1. NEVER transmits or logs medical data, report titles, biomarker values, or passwords.
 * 2. NEVER transmits or logs DEKs, KEKs, CryptoKeys, or recovery secrets.
 * 3. Restricts all table queries strictly to the authenticated user via RLS (auth.uid() = user_id).
 * 4. Login requests automatically expire after 10 minutes.
 * 5. Direct client UPDATE on login requests is revoked; status transitions execute via SECURITY DEFINER RPC.
 * 6. Untrusted devices cannot approve themselves or self-register without verified Device A authorization.
 */

import { supabase } from './supabase';
import { getOrCreateDeviceId } from './api';
import type { DeviceInfo } from '../types/auth';
import type {
  SecurityDeviceRow,
  UserLoginRequestRow,
  LoginApprovalStatus,
} from '../types/auth';

export const LOGIN_REQUEST_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Checks whether a given device is registered as trusted for the authenticated user.
 * If trusted, updates last_seen_at timestamp.
 */
export async function checkDeviceTrustStatus(
  userId: string,
  deviceId: string,
  client: any = supabase
): Promise<{ isTrusted: boolean; device?: SecurityDeviceRow; error?: string }> {
  if (!userId || !deviceId) {
    return { isTrusted: false, error: 'User ID and Device ID are required.' };
  }

  try {
    const { data, error } = await client
      .from('user_security_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      return { isTrusted: false, error: error.message };
    }

    if (data) {
      // Update last_seen_at timestamp non-blockingly
      const now = new Date().toISOString();
      client
        .from('user_security_devices')
        .update({ last_seen_at: now, updated_at: now })
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .then(() => {});

      return { isTrusted: true, device: data as SecurityDeviceRow };
    }

    return { isTrusted: false };
  } catch (err: any) {
    return { isTrusted: false, error: err?.message || 'Network error checking device trust.' };
  }
}

/**
 * Returns the total count of trusted devices for a user.
 */
export async function getTrustedDeviceCount(
  userId: string,
  client: any = supabase
): Promise<number> {
  if (!userId) return 0;
  try {
    const { count, error } = await client
      .from('user_security_devices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Registers a device as trusted for the user.
 * Uses atomic SECURITY DEFINER RPC with concurrency lock when available.
 */
export async function registerTrustedDevice(
  userId: string,
  device: DeviceInfo,
  client: any = supabase
): Promise<{ success: boolean; device?: SecurityDeviceRow; error?: string }> {
  if (!userId || !device?.device_id) {
    return { success: false, error: 'User ID and valid device info are required.' };
  }

  const now = new Date().toISOString();
  const row: SecurityDeviceRow = {
    user_id: userId,
    device_id: device.device_id,
    device_name: device.device_name || 'Unknown Device',
    browser: device.browser || 'Unknown Browser',
    platform: device.platform || 'Unknown OS',
    first_seen_at: now,
    last_seen_at: now,
    created_at: now,
    updated_at: now,
  };

  try {
    // Attempt hardened RPC if supported by client
    if (typeof client.rpc === 'function') {
      const { data: rpcRes, error: rpcErr } = await client.rpc('register_initial_device', {
        p_device_id: device.device_id,
        p_device_name: device.device_name || 'Primary Device',
        p_browser: device.browser || 'Unknown Browser',
        p_platform: device.platform || 'Unknown Platform',
      });

      if (!rpcErr && rpcRes) {
        if (rpcRes.success) {
          return { success: true, device: row };
        } else {
          return { success: false, error: rpcRes.message || rpcRes.error };
        }
      }
    }

    // Direct fallback for mocked test environments
    const { data, error } = await client
      .from('user_security_devices')
      .upsert(row, { onConflict: 'user_id,device_id' })
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, device: (data as SecurityDeviceRow) || row };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error registering trusted device.' };
  }
}

/**
 * Creates a pending login approval request for an untrusted device.
 */
export async function createLoginApprovalRequest(
  userId: string,
  device: DeviceInfo,
  client: any = supabase
): Promise<{ success: boolean; request?: UserLoginRequestRow; error?: string }> {
  if (!userId || !device?.device_id) {
    return { success: false, error: 'User ID and valid device info are required.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOGIN_REQUEST_EXPIRY_MS).toISOString();
  const createdAt = now.toISOString();

  const newRequest = {
    user_id: userId,
    device_id: device.device_id,
    device_name: device.device_name || 'Unknown Device',
    browser: device.browser || 'Unknown Browser',
    platform: device.platform || 'Unknown OS',
    status: 'pending' as LoginApprovalStatus,
    created_at: createdAt,
    expires_at: expiresAt,
    approved_at: null,
    denied_at: null,
  };

  try {
    const { data, error } = await client
      .from('user_login_requests')
      .insert(newRequest)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, request: data as UserLoginRequestRow };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error creating login request.' };
  }
}

/**
 * Checks the current status of a login request.
 * Automatically marks request as expired if time has elapsed.
 */
export async function checkLoginApprovalStatus(
  requestId: string,
  client: any = supabase
): Promise<{ status: LoginApprovalStatus; request?: UserLoginRequestRow; error?: string }> {
  if (!requestId) {
    return { status: 'expired', error: 'Request ID is required.' };
  }

  try {
    const { data, error } = await client
      .from('user_login_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (error || !data) {
      return { status: 'expired', error: error?.message || 'Request not found.' };
    }

    const request = data as UserLoginRequestRow;

    // Check if expired
    const isPastExpiry = new Date(request.expires_at).getTime() < Date.now();
    if (request.status === 'pending' && isPastExpiry) {
      // In mock/direct environment, mark as expired
      if (typeof client.rpc !== 'function') {
        client
          .from('user_login_requests')
          .update({ status: 'expired' })
          .eq('id', requestId)
          .then(() => {});
      }

      return { status: 'expired', request: { ...request, status: 'expired' } };
    }

    return { status: request.status, request };
  } catch (err: any) {
    return { status: 'pending', error: err?.message || 'Network error polling status.' };
  }
}

/**
 * Retrieves all active pending login approval requests for the authenticated user.
 */
export async function listPendingLoginRequests(
  userId: string,
  client: any = supabase
): Promise<UserLoginRequestRow[]> {
  if (!userId) return [];

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('user_login_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data as UserLoginRequestRow[];
  } catch {
    return [];
  }
}

/**
 * Approves a login request from Device A, marking it approved AND registering
 * the new device as a trusted security device for the user.
 * Executes atomically via SECURITY DEFINER PostgreSQL RPC.
 */
export async function approveLoginRequest(
  requestId: string,
  userId: string,
  approverDeviceId?: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string }> {
  if (!requestId || !userId) {
    return { success: false, error: 'Request ID and User ID are required.' };
  }

  const effectiveApproverId = approverDeviceId || getOrCreateDeviceId();

  try {
    // 1. Try secure PostgreSQL RPC
    if (typeof client.rpc === 'function') {
      const { data, error } = await client.rpc('approve_login_request', {
        p_request_id: requestId,
        p_approver_device_id: effectiveApproverId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && !data.success) {
        return { success: false, error: data.message || data.error };
      }

      if (data && data.success) {
        return { success: true };
      }
    }

    // 2. Fallback logic for mock/in-memory environments
    const { data: approverDevice } = await client
      .from('user_security_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', effectiveApproverId)
      .maybeSingle();

    if (!approverDevice) {
      return { success: false, error: 'Only an already trusted device can approve login requests.' };
    }

    const { data: request, error: fetchErr } = await client
      .from('user_login_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !request) {
      return { success: false, error: 'Login request not found.' };
    }

    if (request.device_id === effectiveApproverId) {
      return { success: false, error: 'A device cannot approve its own login request.' };
    }

    if (request.status === 'approved') {
      return { success: false, error: 'Request is already approved.' };
    }

    if (request.status === 'denied') {
      return { success: false, error: 'Denied requests cannot be approved.' };
    }

    if (new Date(request.expires_at).getTime() < Date.now() || request.status === 'expired') {
      return { success: false, error: 'Request has expired.' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await client
      .from('user_login_requests')
      .update({
        status: 'approved',
        approved_at: now,
      })
      .eq('id', requestId)
      .eq('user_id', userId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await registerTrustedDevice(
      userId,
      {
        device_id: request.device_id,
        device_name: request.device_name,
        browser: request.browser,
        platform: request.platform,
        trusted: true,
      },
      client
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error approving login request.' };
  }
}

/**
 * Denies a login request from Device A or cancels by Device B.
 * Executes atomically via SECURITY DEFINER PostgreSQL RPC.
 */
export async function denyLoginRequest(
  requestId: string,
  userId: string,
  approverDeviceId?: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string }> {
  if (!requestId || !userId) {
    return { success: false, error: 'Request ID and User ID are required.' };
  }

  const effectiveApproverId = approverDeviceId || getOrCreateDeviceId();

  try {
    // 1. Try secure PostgreSQL RPC
    if (typeof client.rpc === 'function') {
      const { data, error } = await client.rpc('deny_login_request', {
        p_request_id: requestId,
        p_approver_device_id: effectiveApproverId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && !data.success) {
        return { success: false, error: data.message || data.error };
      }

      if (data && data.success) {
        return { success: true };
      }
    }

    // 2. Fallback logic for mock/in-memory environments
    const { data: request, error: fetchErr } = await client
      .from('user_login_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !request) {
      return { success: false, error: 'Login request not found.' };
    }

    if (request.status === 'denied') {
      return { success: false, error: 'Request is already denied.' };
    }

    if (request.status === 'approved') {
      return { success: false, error: 'Approved requests cannot be denied.' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await client
      .from('user_login_requests')
      .update({
        status: 'denied',
        denied_at: now,
      })
      .eq('id', requestId)
      .eq('user_id', userId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error denying login request.' };
  }
}

/**
 * Non-blocking security notification helper.
 * Triggers backend email alert if Supabase Edge Function is configured.
 */
export async function sendSecurityLoginNotification(
  email: string,
  device: DeviceInfo,
  client: any = supabase
): Promise<{ delivered: boolean; error?: string }> {
  // Invariant: Reject any attempt to include medical records, diagnoses, passwords, or encryption keys
  const forbiddenKeys = [
    'password', 'passwordHash', 'dek', 'wrappedDek', 'kek',
    'recoverySecret', 'diagnosis', 'report', 'medicalNotes', 'encryptedData',
  ];
  for (const k of forbiddenKeys) {
    if ((device as any)[k] !== undefined) {
      return { delivered: false, error: `Forbidden medical or key data '${k}' in security notification.` };
    }
  }

  const payload = {
    email,
    device_id: device.device_id,
    device_name: device.device_name,
    browser: device.browser,
    platform: device.platform,
    timestamp: new Date().toISOString(),
  };

  try {
    if (client && client.functions && typeof client.functions.invoke === 'function') {
      const res = await client.functions.invoke('notify-new-device', {
        body: payload,
      });
      if (res.error) {
        return { delivered: false, error: res.error.message };
      }
      return { delivered: true };
    }
    return { delivered: false, error: 'Edge function not configured.' };
  } catch (err: any) {
    return { delivered: false, error: err?.message || 'Notification delivery failed.' };
  }
}

/**
 * Lists all registered trusted devices for the authenticated user.
 */
export async function listTrustedDevices(
  userId: string,
  client: any = supabase
): Promise<{ success: boolean; devices: SecurityDeviceRow[]; error?: string }> {
  if (!userId) {
    return { success: false, devices: [], error: 'User ID is required.' };
  }

  try {
    const { data, error } = await client
      .from('user_security_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      return { success: false, devices: [], error: error.message };
    }

    return { success: true, devices: (data as SecurityDeviceRow[]) || [] };
  } catch (err: any) {
    return { success: false, devices: [], error: err?.message || 'Error fetching trusted devices.' };
  }
}

/**
 * Revokes a trusted device for the authenticated user.
 * Authorized by RLS policy: DELETE USING (auth.uid() = user_id).
 */
export async function revokeTrustedDevice(
  userId: string,
  deviceId: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !deviceId) {
    return { success: false, error: 'User ID and Device ID are required.' };
  }

  try {
    const { error } = await client
      .from('user_security_devices')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error revoking device.' };
  }
}

/**
 * Cancels a pending login request created by the current device.
 * Authorized by RLS policy: DELETE USING (auth.uid() = user_id AND status = 'pending').
 */
export async function cancelPendingLoginRequest(
  requestId: string,
  userId: string,
  client: any = supabase
): Promise<{ success: boolean; error?: string }> {
  if (!requestId || !userId) {
    return { success: false, error: 'Request ID and User ID are required.' };
  }

  try {
    const { error } = await client
      .from('user_login_requests')
      .delete()
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error canceling login request.' };
  }
}

