import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Key,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Download,
  Check,
  CheckCircle2,
  Smartphone,
  Laptop,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { AuthScreenMode, UserProfile, DeviceInfo } from '../../types/auth';
import { authApi, getOrCreateDeviceId, getClientDeviceMetadata, checkAndNotifyNewDevice } from '../../lib/api';
import { checkLoginApprovalStatus, cancelPendingLoginRequest, createLoginApprovalRequest } from '../../lib/trusted-devices';
import { generateMasterRecoveryKey, recoverAndResetPassword, getStoredVaultMetadata } from '../../lib/key-management';
import { normalizeRecoverySecret } from '../../lib/envelope-crypto';
import { resetLocalVault } from '../../lib/account-store';


interface AuthScreenProps {
  initialMode?: AuthScreenMode;
  onBackToLanding?: () => void;
  onAuthSuccess: (
    user: UserProfile,
    dek: CryptoKey,
    device: DeviceInfo,
    passwordUsed?: string
  ) => void;
  onUnlockVaultWithPassword: (password: string, userId?: string) => Promise<{ dek: CryptoKey | null; error?: string } | CryptoKey | null>;
  onUnlockVaultWithRecovery: (recoverySecret: string) => Promise<CryptoKey | null>;
  onInitializeVault: (password: string, recoverySecret: string, userId?: string) => Promise<{ dek: CryptoKey; recoverySecret: string }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onBackToLanding,
  onAuthSuccess,
  onUnlockVaultWithPassword,
  onUnlockVaultWithRecovery,
  onInitializeVault,
}) => {
  const [mode, setMode] = useState<AuthScreenMode>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [showNewRecoveryPassword, setShowNewRecoveryPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Email Verification State
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState('');

  // Generated Recovery State
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState<string>('');
  const [savedKeyConfirmed, setSavedKeyConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState(false);
  const [tempDEK, setTempDEK] = useState<CryptoKey | null>(null);
  const [tempUser, setTempUser] = useState<UserProfile | null>(null);
  const [tempDevice, setTempDevice] = useState<DeviceInfo | null>(null);

  // Approval polling state
  const [approvalRequestId, setApprovalRequestId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'waiting' | 'approved' | 'denied' | 'expired'>('waiting');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const switchMode = (newMode: AuthScreenMode) => {
    setError('');
    setResendSuccessMessage('');
    setShowResetConfirm(false);
    if (newMode === 'device_approval') {
      setApprovalStatus('waiting');
    }
    setMode(newMode);
  };

  const handleCancelApproval = async () => {
    if (approvalRequestId && tempUser?.id) {
      try {
        await cancelPendingLoginRequest(approvalRequestId, tempUser.id);
      } catch {}
    }
    setApprovalRequestId(null);
    setApprovalStatus('waiting');
    switchMode('login');
  };

  const handleResendVerification = async (targetEmail?: string) => {
    const emailToUse = (targetEmail || unconfirmedEmail || email).trim().toLowerCase();
    if (!emailToUse) {
      setError('Please enter your email address to resend the verification link.');
      return;
    }
    setResendLoading(true);
    setResendSuccessMessage('');
    setError('');
    try {
      const res = await authApi.resendVerificationEmail(emailToUse);
      if (res.success) {
        setResendSuccessMessage('Verification email sent! Please check your inbox and spam folder.');
      } else {
        setError(res.error || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  // Poll for login request approval when in device_approval mode
  useEffect(() => {
    if (mode !== 'device_approval' || !approvalRequestId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const { status } = await checkLoginApprovalStatus(approvalRequestId);
        if (!isMounted) return;

        if (status === 'approved') {
          clearInterval(interval);
          setApprovalStatus('approved');
          setLoading(true);
          setLoadingMessage('Device approved! Unlocking health vault...');

          if (password && (tempUser?.id || email)) {
            const targetId = tempUser?.id;
            const unlockRes = await onUnlockVaultWithPassword(password, targetId);
            const dek = unlockRes && typeof unlockRes === 'object' && 'dek' in unlockRes
              ? unlockRes.dek
              : (unlockRes as CryptoKey | null);

            if (dek && tempUser && tempDevice) {
              tempDevice.trusted = true;
              onAuthSuccess(tempUser, dek, tempDevice, password);
              return;
            }
          }
          switchMode('login');
        } else if (status === 'denied') {
          clearInterval(interval);
          setApprovalStatus('denied');
        } else if (status === 'expired') {
          clearInterval(interval);
          setApprovalStatus('expired');
        }
      } catch {}
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mode, approvalRequestId, password, tempUser, tempDevice]);

  // Password Strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { percent: 15, label: 'Cipher Ready', color: 'bg-stone-400' };
    if (pwd.length < 6) return { percent: 35, label: 'Weak', color: 'bg-red-400' };
    if (pwd.length < 10) return { percent: 70, label: 'Good', color: 'bg-amber-400' };
    return { percent: 100, label: 'Cipher Ready', color: 'bg-emerald-600' };
  };
  const strength = getPasswordStrength(password);

  // --- 1. HANDLE LOGIN ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccessMessage('');
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Authenticating...');

    try {
      const res = await authApi.login(email.trim(), password);

      const meta = getClientDeviceMetadata();
      const device: DeviceInfo = res?.device || {
        device_id: meta.device_id,
        device_name: meta.device_name,
        platform: meta.platform,
        browser: meta.browser,
        trusted: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

      const user: UserProfile = res?.user || {
        id: `usr_${Date.now().toString(36)}`,
        name: email.split('@')[0] || 'Patient',
        email: email.trim().toLowerCase(),
        is_staff: false,
        is_superuser: false,
        created_at: new Date().toISOString(),
      };

      setTempUser(user);
      setTempDevice(device);

      // If new / untrusted device detected
      if (res?.requires_device_verification || (res?.device && res.device.trusted === false)) {
        setLoading(false);
        if (res?.approval_request_id) {
          setApprovalRequestId(res.approval_request_id);
          switchMode('device_approval');
        } else {
          switchMode('new_device');
        }
        return;
      }

      // Attempt browser vault unlock (with cloud envelope sync)
      setLoadingMessage('Unlocking encrypted health vault...');
      const unlockRes = await onUnlockVaultWithPassword(password, user.id);
      const dek = unlockRes && typeof unlockRes === 'object' && 'dek' in unlockRes
        ? unlockRes.dek
        : (unlockRes as CryptoKey | null);
      const customError = unlockRes && typeof unlockRes === 'object' && 'error' in unlockRes
        ? unlockRes.error
        : undefined;

      if (dek) {
        // Asynchronously check and notify if this login is from a new/unrecognized device
        checkAndNotifyNewDevice(user, device).catch(() => {});

        onAuthSuccess(user, dek, device, password);
      } else {
        setError(customError || 'Incorrect password. Please verify your credentials or use your master recovery key.');
      }
    } catch (err: any) {
      if (err?.isUnconfirmedEmail || err?.message?.toLowerCase().includes('verify your email')) {
        setUnconfirmedEmail(email.trim().toLowerCase());
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };


  // --- 2. HANDLE REGISTER ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccessMessage('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Creating secure account...');

    try {
      // 1. Register with Supabase / local
      const regRes = await authApi.register(fullName.trim(), email.trim(), password);

      const meta = getClientDeviceMetadata();
      const user: UserProfile = regRes?.user || {
        id: `usr_${Date.now().toString(36)}`,
        name: fullName.trim() || 'Patient',
        email: email.trim().toLowerCase(),
        is_staff: false,
        is_superuser: false,
        created_at: new Date().toISOString(),
      };
      const device: DeviceInfo = regRes?.device || {
        device_id: meta.device_id,
        device_name: meta.device_name,
        platform: meta.platform,
        browser: meta.browser,
        trusted: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

      // 2. Generate random Recovery Secret and initialize browser envelope vault + cloud envelope sync
      const recoverySecret = generateMasterRecoveryKey();
      setLoadingMessage('Initializing AES-256-GCM medical vault...');
      const { dek } = await onInitializeVault(password, recoverySecret, user.id);

      setGeneratedRecoveryKey(recoverySecret);
      setTempDEK(dek);
      setTempUser(user);
      setTempDevice(device);

      // 3. If email verification is required by Supabase, present email confirmation screen
      if (regRes.requires_email_verification) {
        setUnconfirmedEmail(email.trim().toLowerCase());
        setMode('email_verification_pending');
        return;
      }

      // Otherwise show Recovery Key presentation modal
      setMode('recovery_key_display');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // --- 3. HANDLE RECOVERY CONFIRMATION ---
  const handleConfirmRecoverySaved = async () => {
    setLoading(true);
    setLoadingMessage('Unlocking your encrypted vault...');
    try {
      const meta = getClientDeviceMetadata();
      const user: UserProfile = tempUser || {
        id: `usr_${Date.now().toString(36)}`,
        name: fullName.trim() || 'Patient',
        email: email.trim().toLowerCase() || 'user@local',
        is_staff: false,
        is_superuser: false,
        created_at: new Date().toISOString(),
      };
      const device: DeviceInfo = tempDevice || {
        device_id: meta.device_id,
        device_name: meta.device_name,
        platform: meta.platform,
        browser: meta.browser,
        trusted: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

      let dek = tempDEK;
      if (!dek && password) {
        dek = await onUnlockVaultWithPassword(password);
      }
      if (!dek && generatedRecoveryKey) {
        dek = await onUnlockVaultWithRecovery(generatedRecoveryKey);
      }
      if (!dek) {
        throw new Error('Could not unlock vault. Please try logging in with your password.');
      }

      onAuthSuccess(user, dek, device, password);
    } catch (err: any) {
      console.error('Enter Health Vault failed:', err);
      setError(err?.message || 'Failed to enter vault. Please try logging in with your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (!generatedRecoveryKey) return;
    navigator.clipboard.writeText(generatedRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleDownloadRecoveryPackage = () => {
    if (!generatedRecoveryKey) return;
    const text = `=====================================================
VITAL DIARIES - MASTER RECOVERY SAFETY KIT
=====================================================
Account: ${tempUser?.name || 'User'} <${tempUser?.email || ''}>
Date Generated: ${new Date().toLocaleString()}

YOUR MASTER RECOVERY KEY:
${generatedRecoveryKey}

IMPORTANT PRIVACY & SECURITY RULES:
1. This recovery key is the ONLY way to decrypt your local health data
   and backups if you forget your password or lose your device.
2. Vital Diaries does NOT store the plaintext Recovery Key on the server.
3. Keep this file in a secure password manager or encrypted offline drive.
=====================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VitalDiaries-Recovery-Key.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedKey(true);
  };

  // --- 4. HANDLE RECOVERY KEY UNLOCK ON NEW DEVICE / FORGOT PASSWORD ---
  const handleRecoveryUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanSecret = normalizeRecoverySecret(recoveryInput.trim());
    if (!cleanSecret) {
      setError('Please enter your Master Recovery Key.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying recovery key & deriving KEK...');

    try {
      let dek: CryptoKey | null = null;
      const targetEmail = (email || tempUser?.email || '').trim().toLowerCase();

      // If user provided a new password, re-wrap DEK under new password KEK and update credentials
      if (newRecoveryPassword && newRecoveryPassword.length >= 4) {
        setLoadingMessage('Re-wrapping vault with new password...');
        const resetRes = await recoverAndResetPassword(cleanSecret, newRecoveryPassword, targetEmail);
        dek = resetRes.dek;
      } else {
        // 1. Client-side cryptographic recovery unwrap
        dek = await onUnlockVaultWithRecovery(cleanSecret);
      }

      if (!dek) {
        throw new Error('The Master Recovery Key could not be verified for this vault. Please check and try again.');
      }

      // 2. Acknowledge device trust locally
      const deviceId = getOrCreateDeviceId();
      const meta = getClientDeviceMetadata();
      const device: DeviceInfo = {
        device_id: deviceId,
        device_name: meta.device_name,
        platform: meta.platform,
        browser: meta.browser,
        trusted: true,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };

      let user: UserProfile;
      try {
        user = tempUser || (await authApi.getMe()).user;
      } catch {
        user = tempUser || {
          id: `usr_${Date.now().toString(36)}`,
          email: targetEmail || 'user@local',
          name: fullName || targetEmail.split('@')[0] || 'Patient',
          is_staff: false,
          is_superuser: false,
          created_at: new Date().toISOString(),
        };
      }

      onAuthSuccess(user, dek, device, newRecoveryPassword || password);
    } catch (err: any) {
      setError(err.message || 'The Recovery Key could not be verified. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetVault = async () => {
    setLoading(true);
    setLoadingMessage('Clearing local encryption vault...');
    try {
      await resetLocalVault();
      setError('');
      setShowResetConfirm(false);
      setRecoveryInput('');
      setNewRecoveryPassword('');
      setPassword('');
      switchMode('register');
    } catch (e: any) {
      setError(e?.message || 'Failed to reset local vault.');
    } finally {
      setLoading(false);
    }
  };

  // --- 5. HANDLE CROSS-DEVICE APPROVAL INITIATION ---
  const handleInitiateDeviceApproval = async () => {
    setError('');
    setLoading(true);
    setLoadingMessage('Requesting device authorization...');

    try {
      const activeId = tempUser?.id;
      if (!activeId) {
        throw new Error('User session not found. Please log in again.');
      }
      const meta = getClientDeviceMetadata();
      const localDevice: DeviceInfo = {
        device_id: meta.device_id,
        device_name: meta.device_name,
        platform: meta.platform,
        browser: meta.browser,
        trusted: false,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
      const res = await createLoginApprovalRequest(activeId, localDevice);
      if (res.success && res.request) {
        setApprovalRequestId(res.request.id);
        switchMode('device_approval');
      } else {
        throw new Error(res.error || 'Failed to request approval.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request approval.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans text-stone-100"
      style={{
        background: 'linear-gradient(135deg, rgb(6, 78, 59) 0%, rgb(6, 95, 70) 50%, rgb(12, 10, 9) 100%)',
      }}
    >
      <main className="relative z-10 flex flex-col flex-1 w-full max-w-[440px] mx-auto justify-center">
        {/* Back to Landing Navigation */}
        {onBackToLanding && (
          <div className="flex items-center justify-start pb-2 px-1">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6 text-center">
          <h2 className="text-2xl sm:text-3xl uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="text-[#ffffff] font-extrabold">Vital</span>
            <span className="text-[#a7f3d0] font-medium">Diaries</span>
          </h2>
        </div>

        {/* High-Contrast Floating Glass Card */}
        <div className="w-full bg-[#FAF9F6] text-stone-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
          {/* Top Architectural Emerald Hairline */}
          <div className="absolute top-0 left-8 right-8 h-[2.5px] bg-gradient-to-r from-transparent via-emerald-600/40 to-transparent" />

          {/* ========================================================= */}
          {/* VIEW: LOGIN                                               */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <div>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome</h1>
                <p className="text-sm text-stone-500 mt-1">Please sign in to access your health vault</p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex flex-col gap-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span className="leading-snug font-medium">{error}</span>
                  </div>
                  {(unconfirmedEmail || error.toLowerCase().includes('verify your email')) && (
                    <div className="pt-2 border-t border-red-200/70 flex items-center justify-between">
                      <span className="text-[11px] text-stone-600 font-medium">Didn't receive the link?</span>
                      <button
                        type="button"
                        onClick={() => handleResendVerification(email)}
                        disabled={resendLoading}
                        className="text-xs font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {resendLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-emerald-700" />}
                        <span>Resend verification email</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {resendSuccessMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{resendSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-5 h-5 text-[#34d399] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      required
                      autoComplete="email"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 text-[#34d399] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full h-12 pl-11 pr-11 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 pb-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                    <input type="checkbox" defaultChecked className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('recovery_key_input')}
                    className="text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full h-[52px] rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-[#ecfdf5] font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage || 'Signing in...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span className="font-medium">256-bit encrypted authentication</span>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: EMAIL VERIFICATION PENDING                         */}
          {/* ========================================================= */}
          {mode === 'email_verification_pending' && (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Mail className="w-7 h-7 text-emerald-700" />
              </div>

              <h1 className="text-2xl font-bold text-stone-900 tracking-tight mb-1">
                Account Created Successfully
              </h1>
              <p className="text-sm text-stone-600 mb-5 leading-relaxed">
                Please verify your email before signing in.
              </p>

              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-left mb-5 space-y-2">
                <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
                  Verification Link Sent To
                </div>
                <div className="font-mono text-sm font-bold text-emerald-950 break-all">
                  {unconfirmedEmail || email}
                </div>
                <p className="text-xs text-stone-600 pt-1 leading-relaxed">
                  We sent a confirmation link to your email address. Please open your inbox and click the link to activate your account.
                </p>
              </div>

              {resendSuccessMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{resendSuccessMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleResendVerification()}
                  disabled={resendLoading}
                  className="w-full h-12 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-700" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-emerald-700" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setResendSuccessMessage('');
                    switchMode('login');
                  }}
                  className="w-full h-12 bg-[#064e3b] hover:bg-[#065f46] text-[#ecfdf5] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: REGISTER                                            */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <div>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Create your account</h1>
                <p className="text-sm text-stone-500 mt-1">Begin your private, encrypted health archive</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-5 h-5 text-[#34d399] absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Alistair Vance"
                      required
                      autoComplete="name"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-5 h-5 text-[#34d399] absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      required
                      autoComplete="email"
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-5 h-5 text-[#34d399] absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full h-12 pl-11 pr-11 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Indicator */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-1 flex-1 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-stone-500 tracking-wider">
                    {strength.label}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full h-[52px] rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-[#ecfdf5] font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage || 'Creating Account...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-500">
                  <ShieldCheck className="w-4 h-4 text-[#059669]" />
                  <span className="font-medium">256-bit encrypted authentication</span>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: RECOVERY KEY PRESENTATION (First-time setup)        */}
          {/* ========================================================= */}
          {mode === 'recovery_key_display' && (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="w-6 h-6 text-emerald-700" />
              </div>

              <h2 className="text-xl font-bold text-stone-900 mb-1">Your Master Recovery Key</h2>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                This key can restore access to your encrypted health vault if you lose access to a trusted device or password.
              </p>

              <div className="p-4 bg-stone-900 rounded-2xl mb-4 text-emerald-400 font-mono text-sm tracking-wider break-all select-all font-bold border border-emerald-800/40 shadow-inner">
                {generatedRecoveryKey}
              </div>

              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRecoveryPackage}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {downloadedKey ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
                  <span>{downloadedKey ? 'Saved' : 'Download .txt'}</span>
                </button>
              </div>

              <label className="flex items-start gap-2.5 text-left mb-6 p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedKeyConfirmed}
                  onChange={(e) => setSavedKeyConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-emerald-950 font-semibold leading-snug">
                  I have securely saved my Master Recovery Key. I understand Vital Diaries does not store it in plaintext.
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSavedKeyConfirmed(true);
                  handleConfirmRecoverySaved();
                }}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Unlocking Vault...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Health Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}


          {/* ========================================================= */}
          {/* VIEW: NEW DEVICE DETECTED                                 */}
          {/* ========================================================= */}
          {mode === 'new_device' && (
            <div>
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                <Laptop className="w-6 h-6 text-amber-700" />
              </div>

              <h2 className="text-xl font-bold text-stone-900 mb-1">New Device Detected</h2>
              <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 mb-5 font-medium leading-relaxed">
                For your security, this unrecognized device needs additional verification before unlocking your encrypted vault.
              </p>

              <div className="space-y-3 mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('recovery_key_input')}
                  className="w-full p-3.5 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 text-sm block">Use Master Recovery Key</span>
                      <span className="text-[11px] text-stone-500">Authorize device locally via 24-char secret</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={handleInitiateDeviceApproval}
                  className="w-full p-3.5 bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-300 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 text-sm block">Approve from Trusted Device</span>
                      <span className="text-[11px] text-stone-500">Send an approval prompt to an active device</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600" />
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: RECOVERY KEY INPUT                                  */}
          {/* ========================================================= */}
          {mode === 'recovery_key_input' && (
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-emerald-700" />
              </div>

              <h2 className="text-xl font-bold text-stone-900 mb-1">Master Recovery Key</h2>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                Enter your 24-character Master Recovery Key (<code className="font-mono text-emerald-700">VITA-XXXX-...</code>) to restore access and unlock your vault.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRecoveryUnlockSubmit} className="space-y-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Recovery Secret
                  </label>
                  <input
                    type="text"
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    placeholder="VITA-XXXX-XXXX-XXXX-XXXX"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-mono text-xs sm:text-sm tracking-wider outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold ml-0.5">
                    Set New Password (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showNewRecoveryPassword ? 'text' : 'password'}
                      value={newRecoveryPassword}
                      onChange={(e) => setNewRecoveryPassword(e.target.value)}
                      placeholder="Enter new password to reset"
                      className="w-full h-11 pl-10 pr-10 rounded-xl bg-stone-100 text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm outline-none transition-all duration-200 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewRecoveryPassword(!showNewRecoveryPassword)}
                      className="absolute right-3.5 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    >
                      {showNewRecoveryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 ml-1">
                    If specified, your vault will be re-wrapped and your password updated.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !recoveryInput.trim()}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{loadingMessage || 'Authorizing Device...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize & Unlock</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Reset Vault Helper Section */}
              <div className="mt-4 pt-3 border-t border-stone-200">
                {!showResetConfirm ? (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      className="text-xs text-stone-500 hover:text-red-700 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Lost recovery key? Reset local vault</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-left space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
                      <span>Reset Local Health Vault?</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      This will clear local credentials on this device so you can create a fresh account and password.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleResetVault}
                        disabled={loading}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: DEVICE APPROVAL WAITING                             */}
          {/* ========================================================= */}
          {mode === 'device_approval' && (
            <div className="text-center animate-fade-in">
              {approvalStatus === 'waiting' && (
                <>
                  <div className="w-14 h-14 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4 relative">
                    <Smartphone className="w-7 h-7 text-amber-800" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full animate-ping opacity-75" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full border-2 border-white" />
                  </div>

                  <h2 className="text-xl font-bold text-stone-900 mb-1">New Device Detected</h2>
                  <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                    Your sign-in needs authorization from one of your trusted devices.
                  </p>

                  <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200 mb-4 text-xs text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-stone-500">Device:</span>
                      <span className="font-bold text-stone-900">{tempDevice?.device_name || 'Web Client'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-stone-500">Browser:</span>
                      <span className="font-medium text-stone-800">{tempDevice?.browser || 'Browser'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-stone-500">Platform:</span>
                      <span className="font-medium text-stone-800">{tempDevice?.platform || 'Operating System'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl mb-5 flex items-center gap-3 text-left">
                    <RefreshCw className="w-4 h-4 text-amber-700 animate-spin shrink-0" />
                    <div className="text-xs text-amber-900">
                      <span className="font-bold block">Waiting for approval...</span>
                      <span className="text-[11px] text-amber-800/90">Keep this screen open while you approve on your trusted device.</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelApproval}
                    className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-red-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel Sign-In
                  </button>
                </>
              )}

              {approvalStatus === 'approved' && (
                <div className="py-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-emerald-700">
                    <CheckCircle2 className="w-8 h-8 animate-bounce" />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 mb-1">Device Approved!</h2>
                  <p className="text-xs text-stone-600 mb-4">
                    Unlocking your zero-knowledge health vault...
                  </p>
                  <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                </div>
              )}

              {approvalStatus === 'denied' && (
                <>
                  <div className="w-14 h-14 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-red-700">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 mb-1">Login Denied</h2>
                  <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                    This sign-in attempt was rejected by an authorized device on your account. Your health records remain secure.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Return to Sign In
                  </button>
                </>
              )}

              {approvalStatus === 'expired' && (
                <>
                  <div className="w-14 h-14 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-amber-800">
                    <Clock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-stone-900 mb-1">Request Expired</h2>
                  <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                    For your security, login approval requests automatically expire after 10 minutes. Please sign in again.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Start Sign-In Again
                  </button>
                </>
              )}
            </div>
          )}

          {/* Switcher Footer */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-6 pt-4 border-t border-stone-200 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-stone-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-emerald-800 hover:underline ml-1 cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-stone-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-emerald-800 hover:underline ml-1 cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
