import React, { useEffect, useState } from 'react';
import { User, ShieldCheck, Heart, AlertCircle, Phone, Save, Check, Lock, Calendar, Droplets } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData, decryptData } from '../../lib/crypto';
import type { DecryptedHealthProfile } from '../../types/health';

interface HealthProfileProps {
  encryptionKey: CryptoKey | null;
  userId: string;
  userName?: string;
  onUpdateUserName?: (name: string) => Promise<void>;
}

export const HealthProfile: React.FC<HealthProfileProps> = ({
  encryptionKey,
  userId,
  userName = 'User',
  onUpdateUserName,
}) => {
  const [profile, setProfile] = useState<DecryptedHealthProfile>({
    fullName: userName,
    dateOfBirth: '1995-06-15',
    bloodType: 'O+',
    allergies: ['Penicillin'],
    chronicConditions: ['Mild Asthma'],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!encryptionKey || !userId) return;

      try {
        const record = await db.healthProfile.get(`profile_${userId}`);
        if (record) {
          const raw = await decryptData(record.encryptedData, record.iv, encryptionKey);
          const parsed = JSON.parse(raw) as DecryptedHealthProfile;
          setProfile(parsed);
        }
      } catch (err) {
        console.error('Failed to decrypt local health profile:', err);
      }
    }

    loadProfile();
  }, [encryptionKey, userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey) {
      setError('Vault is locked. Please unlock vault to update profile.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const rawJson = JSON.stringify(profile);
      const { cipherText, iv } = await encryptData(rawJson, encryptionKey);

      await db.healthProfile.put({
        id: `profile_${userId}`,
        userId,
        encryptedData: cipherText,
        iv,
        updatedAt: new Date().toISOString(),
      });

      if (profile.fullName && onUpdateUserName && profile.fullName !== userName) {
        await onUpdateUserName(profile.fullName);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save health profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const addAllergy = () => {
    if (!allergyInput.trim()) return;
    setProfile({ ...profile, allergies: [...profile.allergies, allergyInput.trim()] });
    setAllergyInput('');
  };

  const removeAllergy = (idx: number) => {
    setProfile({
      ...profile,
      allergies: profile.allergies.filter((_, i) => i !== idx),
    });
  };

  const addCondition = () => {
    if (!conditionInput.trim()) return;
    setProfile({ ...profile, chronicConditions: [...profile.chronicConditions, conditionInput.trim()] });
    setConditionInput('');
  };

  const removeCondition = (idx: number) => {
    setProfile({
      ...profile,
      chronicConditions: profile.chronicConditions.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">My Health Profile</h2>
          <p className="text-sm text-stone-500">
            Personal health details stored locally and encrypted with AES-256-GCM.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Local Vault Encrypted</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Demographics */}
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Personal Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Blood Group
              </label>
              <select
                value={profile.bloodType}
                onChange={(e) => setProfile({ ...profile, bloodType: e.target.value })}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bt) => (
                  <option key={bt} value={bt} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">{bt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Allergies & Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>Known Allergies</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                placeholder="e.g., Peanuts, Latex, Sulfa"
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={addAllergy}
                className="px-3 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {profile.allergies.map((alg, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-red-50 text-red-800 border border-red-200/80 rounded-full text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>{alg}</span>
                  <button type="button" onClick={() => removeAllergy(i)} className="text-red-500 hover:text-red-800 font-bold">×</button>
                </span>
              ))}
              {profile.allergies.length === 0 && (
                <p className="text-xs text-stone-400 italic">No allergies listed.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-600" />
              <span>Chronic / Pre-existing Conditions</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                placeholder="e.g., Hypertension, Type 2 Diabetes"
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={addCondition}
                className="px-3 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {profile.chronicConditions.map((cond, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>{cond}</span>
                  <button type="button" onClick={() => removeCondition(i)} className="text-amber-600 hover:text-amber-900 font-bold">×</button>
                </span>
              ))}
              {profile.chronicConditions.length === 0 && (
                <p className="text-xs text-stone-400 italic">No chronic conditions listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Emergency Contact</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Contact Name
              </label>
              <input
                type="text"
                placeholder="e.g. Full Name"
                value={profile.emergencyContact.name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, name: e.target.value },
                  })
                }
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Relationship
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse, Parent, Sibling"
                value={profile.emergencyContact.relationship}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, relationship: e.target.value },
                  })
                }
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="Phone Number"
                value={profile.emergencyContact.phone}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    emergencyContact: { ...profile.emergencyContact, phone: e.target.value },
                  })
                }
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Encrypted before saving to IndexedDB</span>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Saved to Vault!</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Encrypting Profile...' : 'Save Health Profile'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
