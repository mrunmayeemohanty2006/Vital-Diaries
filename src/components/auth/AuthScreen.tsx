import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Key,
  ShieldCheck,
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
} from 'lucide-react';
import { AuthScreenMode, UserProfile, DeviceInfo } from '../../types/auth';
import { authApi, devicesApi, getOrCreateDeviceId, getClientDeviceMetadata } from '../../lib/api';
import { generateMasterRecoveryKey } from '../../lib/key-management';


interface AuthScreenProps {
  onAuthSuccess: (
    user: UserProfile,
    dek: CryptoKey,
    device: DeviceInfo,
    passwordUsed?: string
  ) => void;
  onUnlockVaultWithPassword: (password: string) => Promise<CryptoKey | null>;
  onUnlockVaultWithRecovery: (recoverySecret: string) => Promise<CryptoKey | null>;
  onInitializeVault: (password: string, recoverySecret: string) => Promise<{ dek: CryptoKey; recoverySecret: string }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onUnlockVaultWithPassword,
  onUnlockVaultWithRecovery,
  onInitializeVault,
}) => {
  const [mode, setMode] = useState<AuthScreenMode>('login');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');

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

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Authenticating...');

    try {
      const res = await authApi.login(email.trim(), password);

      // Check if user is Administrator (Django staff/superuser)
      if (res.is_admin && res.redirect_url) {
        setLoadingMessage('Administrator verified. Redirecting to Admin Portal...');
        setTimeout(() => {
          window.location.href = res.redirect_url || '/admin/';
        }, 800);
        return;
      }

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
        setMode('new_device');
        return;
      }

      // Trusted Device: Attempt local browser vault unlock
      setLoadingMessage('Unlocking encrypted health vault...');
      const dek = await onUnlockVaultWithPassword(password);
      if (dek) {
        onAuthSuccess(user, dek, device, password);
      } else {
        setError('Incorrect password. Please verify your credentials or use your master recovery key.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };


  // --- 2. HANDLE REGISTER ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      // 1. Register with backend / local
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

      // 2. Generate random Recovery Secret and initialize browser envelope vault
      const recoverySecret = generateMasterRecoveryKey();
      setLoadingMessage('Initializing AES-256-GCM medical vault...');
      const { dek } = await onInitializeVault(password, recoverySecret);

      setGeneratedRecoveryKey(recoverySecret);
      setTempDEK(dek);
      setTempUser(user);
      setTempDevice(device);

      // 3. Show Recovery Key presentation modal
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
        const initRes = await onInitializeVault(password || 'vital12345', generatedRecoveryKey || generateMasterRecoveryKey());
        dek = initRes.dek;
      }

      if (dek) {
        onAuthSuccess(user, dek, device, password);
      } else {
        setError('Could not unlock vault. Please try logging in with your password.');
      }
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

  // --- 4. HANDLE RECOVERY KEY UNLOCK ON NEW DEVICE ---
  const handleRecoveryUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanSecret = recoveryInput.trim().toUpperCase();
    if (!cleanSecret) {
      setError('Please enter your Master Recovery Key.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying recovery key & deriving KEK...');

    try {
      // 1. Client-side cryptographic recovery unwrap
      const dek = await onUnlockVaultWithRecovery(cleanSecret);
      if (!dek) {
        throw new Error('The Recovery Key could not be verified. Please check and try again.');
      }

      // 2. Acknowledge device trust (with offline fallback)
      const deviceId = getOrCreateDeviceId();
      let device: DeviceInfo;
      try {
        const recRes = await devicesApi.recoveryVerification(deviceId);
        device = recRes.device;
      } catch {
        const meta = getClientDeviceMetadata();
        device = {
          device_id: deviceId,
          device_name: meta.device_name,
          platform: meta.platform,
          browser: meta.browser,
          trusted: true,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        };
      }

      let user: UserProfile;
      try {
        user = tempUser || (await authApi.getMe()).user;
      } catch {
        user = tempUser || {
          id: `usr_${Date.now().toString(36)}`,
          email: email || 'user@local',
          name: fullName || 'Patient',
          is_staff: false,
          is_superuser: false,
          created_at: new Date().toISOString(),
        };
      }

      onAuthSuccess(user, dek, device);
    } catch (err: any) {
      setError(err.message || 'Invalid recovery key.');
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
      const deviceId = getOrCreateDeviceId();
      const res = await devicesApi.requestVerification(deviceId);
      setApprovalRequestId(res.request_id);
      setMode('device_approval');
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
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
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
                    onClick={() => setMode('recovery_key_input')}
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
                  onClick={() => setMode('recovery_key_input')}
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
                  onClick={() => setMode('login')}
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

              <h2 className="text-xl font-bold text-stone-900 mb-1">Enter Master Recovery Key</h2>
              <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                Enter your 24-character Master Recovery Key (<code className="font-mono text-emerald-700">VITA-XXXX-...</code>) to authorize this device and derive the vault key.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRecoveryUnlockSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    placeholder="VITA-XXXX-XXXX-XXXX-XXXX"
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 bg-stone-100 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-mono text-xs sm:text-sm tracking-wider outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
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

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setMode('login')}
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
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Smartphone className="w-6 h-6 text-blue-700" />
              </div>

              <h2 className="text-xl font-bold text-stone-900 mb-1">Waiting for Device Approval</h2>
              <p className="text-xs text-stone-600 mb-6 leading-relaxed">
                Open Vital Diaries on an already trusted device (e.g., your laptop or primary phone) and approve the login request.
              </p>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 mb-6 text-xs text-stone-600 space-y-1">
                <div className="font-semibold text-stone-900">Request Identifier:</div>
                <div className="font-mono text-[11px] text-stone-500 break-all">{approvalRequestId || 'req_live_session'}</div>
              </div>

              <button
                type="button"
                onClick={() => setMode('recovery_key_input')}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl mb-3 transition-colors cursor-pointer"
              >
                Use Master Recovery Key Instead
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
              >
                Cancel and return to Sign In
              </button>
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
                    onClick={() => {
                      setError('');
                      setMode('register');
                    }}
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
                    onClick={() => {
                      setError('');
                      setMode('login');
                    }}
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
