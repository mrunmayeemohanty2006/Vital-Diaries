-- Migration: 20260928000000_create_trusted_device_system.sql
-- Description: Trusted Device Approval System & Security Audit Tables (Hardened)
--
-- Security Model & Invariants:
-- 1. User Security Devices cannot be directly inserted by clients; only created via:
--    a) Atomic initial device registration RPC (register_initial_device) with advisory locking
--    b) Atomic cross-device approval RPC (approve_login_request) executed from a verified trusted device
-- 2. User Login Requests:
--    a) Insertion restricted to status='pending' with max 15m expiration
--    b) Direct UPDATE revoked from client RLS to prevent Device B self-approval/tampering
--    c) Status transitions (pending -> approved/denied) strictly gated by SECURITY DEFINER RPCs

-- 1. Table: public.user_security_devices
CREATE TABLE IF NOT EXISTS public.user_security_devices (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  browser TEXT NOT NULL,
  platform TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_security_devices_user 
  ON public.user_security_devices(user_id);

CREATE INDEX IF NOT EXISTS idx_user_security_devices_last_seen 
  ON public.user_security_devices(user_id, last_seen_at DESC);

ALTER TABLE public.user_security_devices ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can inspect their own trusted devices
CREATE POLICY "Users can view own security devices"
  ON public.user_security_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Direct INSERT is forbidden for authenticated role; only SECURITY DEFINER RPCs can register trusted devices.

-- UPDATE: Users can update last_seen_at for their existing devices
CREATE POLICY "Users can update own existing security devices"
  ON public.user_security_devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can revoke their own trusted devices
CREATE POLICY "Users can delete own security devices"
  ON public.user_security_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. Table: public.user_login_requests
CREATE TABLE IF NOT EXISTS public.user_login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  browser TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '10 minutes'),
  approved_at TIMESTAMPTZ DEFAULT NULL,
  denied_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_login_requests_user 
  ON public.user_login_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_user_login_requests_pending 
  ON public.user_login_requests(user_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_login_requests_expires 
  ON public.user_login_requests(expires_at);

ALTER TABLE public.user_login_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own login requests
CREATE POLICY "Users can view own login requests"
  ON public.user_login_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Clients can only insert requests with status = 'pending' and expires_at <= 15m
CREATE POLICY "Users can insert own pending login requests"
  ON public.user_login_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending' 
    AND expires_at <= (timezone('utc'::text, now()) + interval '15 minutes')
  );

-- Direct UPDATE is explicitly DISALLOWED for client roles to prevent self-approval tampering.
-- Transitions MUST execute through approve_login_request() or deny_login_request() RPCs.

-- DELETE: Users can cancel/clean up their own pending login requests
CREATE POLICY "Users can delete own pending login requests"
  ON public.user_login_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');


-- 3. Stored RPC Functions (SECURITY DEFINER with fixed search_path)

-- Function: register_initial_device
-- Atomically registers the user's very first device with concurrency lock protection.
CREATE OR REPLACE FUNCTION public.register_initial_device(
  p_device_id TEXT,
  p_device_name TEXT,
  p_browser TEXT,
  p_platform TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_count INT;
  v_existing RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED', 'message', 'Authentication required.');
  END IF;

  IF p_device_id IS NULL OR length(trim(p_device_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DEVICE', 'message', 'Device ID cannot be empty.');
  END IF;

  -- Transaction-level advisory lock prevents competing simultaneous first logins from bypassing approval
  PERFORM pg_advisory_xact_lock(hashtext('user_device_init_' || v_user_id::text));

  -- Check existing device count
  SELECT count(*) INTO v_count FROM public.user_security_devices WHERE user_id = v_user_id;

  IF v_count = 0 THEN
    -- First device ever: register as trusted
    INSERT INTO public.user_security_devices (
      user_id,
      device_id,
      device_name,
      browser,
      platform,
      first_seen_at,
      last_seen_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_device_id,
      COALESCE(p_device_name, 'Primary Device'),
      COALESCE(p_browser, 'Unknown Browser'),
      COALESCE(p_platform, 'Unknown Platform'),
      v_now,
      v_now,
      v_now,
      v_now
    );
    RETURN jsonb_build_object('success', true, 'is_initial', true, 'device_id', p_device_id);
  ELSE
    -- Check if this specific device is already trusted
    SELECT * INTO v_existing FROM public.user_security_devices WHERE user_id = v_user_id AND device_id = p_device_id;
    IF FOUND THEN
      UPDATE public.user_security_devices 
      SET last_seen_at = v_now, updated_at = v_now 
      WHERE user_id = v_user_id AND device_id = p_device_id;

      RETURN jsonb_build_object('success', true, 'is_initial', false, 'device_id', p_device_id);
    ELSE
      -- Account already has trusted devices, untrusted new device cannot self-register
      RETURN jsonb_build_object('success', false, 'error', 'UNTRUSTED_DEVICE', 'message', 'Account already has trusted devices. Approval required.');
    END IF;
  END IF;
END;
$$;


-- Function: approve_login_request
-- Atomically validates approver trust, request status, and registers new device.
CREATE OR REPLACE FUNCTION public.approve_login_request(
  p_request_id UUID,
  p_approver_device_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_approver_trusted BOOLEAN;
  v_request RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED', 'message', 'Authentication required.');
  END IF;

  IF p_approver_device_id IS NULL OR length(trim(p_approver_device_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_APPROVER', 'message', 'Approver device ID required.');
  END IF;

  -- 1. Invariant: Approver device MUST already be in user_security_devices
  SELECT EXISTS(
    SELECT 1 FROM public.user_security_devices 
    WHERE user_id = v_user_id AND device_id = p_approver_device_id
  ) INTO v_is_approver_trusted;

  IF NOT v_is_approver_trusted THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_APPROVER', 'message', 'Only an already trusted device can approve login requests.');
  END IF;

  -- 2. Lock and fetch the login request
  SELECT * INTO v_request 
  FROM public.user_login_requests 
  WHERE id = p_request_id AND user_id = v_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Login request not found.');
  END IF;

  -- 3. Invariant: A device cannot approve its own login request
  IF v_request.device_id = p_approver_device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELF_APPROVAL_FORBIDDEN', 'message', 'A device cannot approve its own login request.');
  END IF;

  -- 4. Invariant: Status check and immutability
  IF v_request.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_APPROVED', 'message', 'Request has already been approved.');
  ELSIF v_request.status = 'denied' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_DENIED', 'message', 'Denied requests cannot be approved.');
  ELSIF v_request.status = 'expired' OR v_request.expires_at < v_now THEN
    IF v_request.status <> 'expired' THEN
      UPDATE public.user_login_requests SET status = 'expired' WHERE id = p_request_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'EXPIRED', 'message', 'Login request has expired.');
  END IF;

  -- 5. Atomically transition request to approved
  UPDATE public.user_login_requests 
  SET status = 'approved', approved_at = v_now 
  WHERE id = p_request_id;

  -- 6. Atomically register approved device in user_security_devices
  INSERT INTO public.user_security_devices (
    user_id,
    device_id,
    device_name,
    browser,
    platform,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_request.device_id,
    v_request.device_name,
    v_request.browser,
    v_request.platform,
    v_now,
    v_now,
    v_now,
    v_now
  )
  ON CONFLICT (user_id, device_id) 
  DO UPDATE SET last_seen_at = v_now, updated_at = v_now;

  RETURN jsonb_build_object('success', true, 'status', 'approved', 'device_id', v_request.device_id);
END;
$$;


-- Function: deny_login_request
-- Atomically denies a pending login request.
CREATE OR REPLACE FUNCTION public.deny_login_request(
  p_request_id UUID,
  p_approver_device_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_approver_trusted BOOLEAN;
  v_request RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED', 'message', 'Authentication required.');
  END IF;

  -- Lock and fetch login request
  SELECT * INTO v_request 
  FROM public.user_login_requests 
  WHERE id = p_request_id AND user_id = v_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Login request not found.');
  END IF;

  -- Check if approver is trusted OR if it is the requesting device cancelling its own request
  SELECT EXISTS(
    SELECT 1 FROM public.user_security_devices 
    WHERE user_id = v_user_id AND device_id = p_approver_device_id
  ) INTO v_is_approver_trusted;

  IF NOT v_is_approver_trusted AND (p_approver_device_id IS NULL OR p_approver_device_id <> v_request.device_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED_DENIER', 'message', 'Unauthorized to deny this request.');
  END IF;

  IF v_request.status = 'denied' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_DENIED', 'message', 'Request is already denied.');
  ELSIF v_request.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_APPROVED', 'message', 'Approved requests cannot be denied.');
  END IF;

  -- Atomically transition to denied
  UPDATE public.user_login_requests 
  SET status = 'denied', denied_at = v_now 
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'status', 'denied');
END;
$$;


-- 4. Grants on Functions
GRANT EXECUTE ON FUNCTION public.register_initial_device(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_login_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deny_login_request(UUID, TEXT) TO authenticated;
