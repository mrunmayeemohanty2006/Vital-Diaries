import React, { useState, useEffect } from 'react';
import { ShieldCheck, Smartphone, Laptop, Check, X, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import { listPendingLoginRequests, approveLoginRequest, denyLoginRequest } from '../../lib/trusted-devices';
import { getOrCreateDeviceId } from '../../lib/api';
import type { UserLoginRequestRow } from '../../types/auth';

interface TrustedDeviceApprovalModalProps {
  userId: string;
}

export const TrustedDeviceApprovalModal: React.FC<TrustedDeviceApprovalModalProps> = ({ userId }) => {
  const [pendingRequests, setPendingRequests] = useState<UserLoginRequestRow[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const approverDeviceId = getOrCreateDeviceId();

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const fetchPending = async () => {
      try {
        const requests = await listPendingLoginRequests(userId);
        if (isMounted) {
          setPendingRequests(requests);
        }
      } catch {}
    };

    fetchPending();
    const interval = setInterval(fetchPending, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  if (pendingRequests.length === 0) return null;

  const currentRequest = pendingRequests[0];
  const isPhone = /iPhone|Android|Mobile/i.test(currentRequest.platform || currentRequest.browser);

  const handleApprove = async (requestId: string) => {
    setLoadingId(requestId);
    setActionError(null);
    try {
      const res = await approveLoginRequest(requestId, userId, approverDeviceId);
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        setActionError(res.error || 'Failed to approve request.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Approval error.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    setLoadingId(requestId);
    setActionError(null);
    try {
      const res = await denyLoginRequest(requestId, userId, approverDeviceId);
      if (res.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        setActionError(res.error || 'Failed to deny request.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Denial error.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF9F6] text-stone-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 relative overflow-hidden">
        {/* Top Emerald Line */}
        <div className="absolute top-0 left-8 right-8 h-[3px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800 shrink-0">
            {isPhone ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">New Sign-In Request</h2>
            <p className="text-xs text-stone-500">A new device is requesting access to your account</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-stone-700 space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="font-semibold text-stone-600">Device:</span>
            <span className="font-bold text-stone-900">{currentRequest.device_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-600">Browser:</span>
            <span className="font-medium text-stone-900">{currentRequest.browser}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-600">Platform:</span>
            <span className="font-medium text-stone-900">{currentRequest.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-stone-600">Requested:</span>
            <span className="font-mono text-stone-600 text-[11px]">
              {new Date(currentRequest.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="p-3 bg-stone-100 rounded-xl text-stone-600 text-[11px] leading-relaxed mb-5 flex items-start gap-2 border border-stone-200">
          <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <span>
            Approving this request will authorize this device to unlock and sync your encrypted health records.
          </span>
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleDeny(currentRequest.id)}
            disabled={loadingId === currentRequest.id}
            className="flex-1 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingId === currentRequest.id ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Deny</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleApprove(currentRequest.id)}
            disabled={loadingId === currentRequest.id}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingId === currentRequest.id ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
