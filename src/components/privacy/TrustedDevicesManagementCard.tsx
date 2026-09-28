import React, { useState, useEffect } from 'react';
import { Smartphone, Laptop, ShieldCheck, Trash2, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { listTrustedDevices, revokeTrustedDevice } from '../../lib/trusted-devices';
import { getOrCreateDeviceId } from '../../lib/api';
import type { SecurityDeviceRow } from '../../types/auth';

interface TrustedDevicesManagementCardProps {
  userId: string;
}

export const TrustedDevicesManagementCard: React.FC<TrustedDevicesManagementCardProps> = ({ userId }) => {
  const [devices, setDevices] = useState<SecurityDeviceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const currentDeviceId = getOrCreateDeviceId();

  const fetchDevices = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await listTrustedDevices(userId);
      if (res.success) {
        setDevices(res.devices);
      } else {
        setStatusMessage({ text: res.error || 'Failed to load devices.', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error loading devices.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [userId]);

  const handleRevoke = async (deviceId: string) => {
    setRevokingId(deviceId);
    setStatusMessage(null);
    try {
      const res = await revokeTrustedDevice(userId, deviceId);
      if (res.success) {
        setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
        setConfirmRevokeId(null);
        setStatusMessage({ text: 'Device successfully revoked.', isError: false });
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({ text: res.error || 'Failed to revoke device.', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error revoking device.', isError: true });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Authorized Security Devices</h3>
            <p className="text-xs text-stone-500">Devices trusted to access and decrypt your health records</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDevices}
          disabled={loading}
          className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          title="Refresh device list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.isError
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
          }`}
        >
          {statusMessage.isError ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {loading && devices.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">Loading authorized devices...</div>
      ) : devices.length === 0 ? (
        <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-100">
          No registered devices found.
        </div>
      ) : (
        <div className="space-y-2.5">
          {devices.map((device) => {
            const isCurrent = device.device_id === currentDeviceId;
            const isPhone = /iPhone|Android|Mobile/i.test(device.platform || device.browser);

            return (
              <div
                key={device.device_id}
                className="p-3.5 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-stone-200/70 rounded-xl flex items-center justify-center text-stone-700 shrink-0">
                    {isPhone ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">
                        {device.device_name}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-200">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                      <span>{device.browser} • {device.platform}</span>
                      <span>•</span>
                      <span>Active: {new Date(device.last_seen_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {confirmRevokeId === device.device_id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200">
                      <span className="text-[10px] text-red-700 font-bold px-1">Revoke?</span>
                      <button
                        type="button"
                        onClick={() => handleRevoke(device.device_id)}
                        disabled={revokingId === device.device_id}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revokingId === device.device_id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRevokeId(null)}
                        className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeId(device.device_id)}
                      className="text-stone-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title={isCurrent ? 'Revoke this device' : 'Revoke trusted device'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
