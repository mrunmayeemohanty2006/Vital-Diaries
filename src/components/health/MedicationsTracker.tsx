import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, Lock, Trash2, Clock, Search, ShieldCheck, Sun, Sunset, Moon, Activity } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData, decryptData } from '../../lib/crypto';
import type { MedicationEntry, DecryptedMedicationData } from '../../types/health';

interface MedicationsTrackerProps {
  encryptionKey: CryptoKey | null;
  userId: string;
}

interface DecryptedMedItem extends MedicationEntry {
  data?: DecryptedMedicationData;
}

export const MedicationsTracker: React.FC<MedicationsTrackerProps> = ({ encryptionKey, userId }) => {
  const [items, setItems] = useState<DecryptedMedItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  
  // Form fields
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAndDecryptMedications();
  }, [encryptionKey]);

  async function loadAndDecryptMedications() {
    const rawList = await db.medications.toArray();

    if (!encryptionKey) {
      setItems(rawList);
      return;
    }

    const decryptedList = await Promise.all(
      rawList.map(async (m) => {
        try {
          const json = await decryptData(m.encryptedData, m.iv, encryptionKey);
          return { ...m, data: JSON.parse(json) };
        } catch {
          return m;
        }
      })
    );

    setItems(decryptedList);
  }

  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const data: DecryptedMedicationData = {
        name: name.trim(),
        dosage: dosage.trim() || 'As prescribed',
        frequency,
        timeOfDay: [timeOfDay],
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        notes: notes.trim() || undefined,
      };

      const { cipherText, iv } = await encryptData(JSON.stringify(data), encryptionKey);
      const now = new Date().toISOString();

      const newEntry: MedicationEntry = {
        id: `med_${Date.now()}`,
        userId,
        encryptedData: cipherText,
        iv,
        createdAt: now,
        updatedAt: now,
      };

      await db.medications.put(newEntry);
      setIsAdding(false);
      setName('');
      setDosage('');
      setNotes('');
      await loadAndDecryptMedications();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await db.medications.delete(id);
    await loadAndDecryptMedications();
  };

  const filteredItems = items.filter((med) => {
    const medName = med.data?.name || '';
    const medDosage = med.data?.dosage || '';
    const medTime = med.data?.timeOfDay?.[0] || '';

    const matchesSearch =
      searchQuery === '' ||
      medName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      medDosage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTime =
      timeFilter === 'all' || medTime.toLowerCase() === timeFilter.toLowerCase();

    return matchesSearch && matchesTime;
  });

  const morningCount = items.filter((m) => m.data?.timeOfDay?.includes('Morning')).length;
  const eveningCount = items.filter((m) => m.data?.timeOfDay?.includes('Evening') || m.data?.timeOfDay?.includes('Bedtime')).length;
  const prnCount = items.filter((m) => m.data?.frequency?.includes('PRN') || m.data?.frequency?.includes('needed')).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Medications Tracker</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Encrypted schedule of active prescriptions, supplements, and daily dosages
          </p>
        </div>

        {encryptionKey && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Close Form' : 'Add Medication'}</span>
          </button>
        )}
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">
            Total Active
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{items.length}</h3>
            <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Logged prescriptions</p>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">
            Morning Schedule
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{morningCount}</h3>
            <Sun className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">AM dosages</p>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">
            Evening Schedule
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{eveningCount}</h3>
            <Moon className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">PM dosages</p>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">
            As Needed (PRN)
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{prnCount}</h3>
            <Activity className="w-5 h-5 text-teal-500" />
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Symptomatic / PRN</p>
        </div>
      </div>

      {/* Add Medication Form */}
      {isAdding && (
        <form onSubmit={handleSaveMed} className="p-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-stone-800">
            <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Add New Medication or Supplement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Medication Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Omega-3 Fish Oil or Lisinopril"
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Dosage Amount
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 1000mg or 1 tablet"
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Once daily" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Once daily</option>
                <option value="Twice daily" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Twice daily</option>
                <option value="Three times daily" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Three times daily</option>
                <option value="As needed (PRN)" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">As needed (PRN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Time of Day
              </label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Morning" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Morning</option>
                <option value="Midday" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Midday</option>
                <option value="Evening" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Evening</option>
                <option value="Bedtime" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Bedtime</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
              Special Instructions / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take with food, after breakfast..."
              className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              {isSubmitting ? 'Encrypting...' : 'Save Medication'}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Alignment Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search medications or dosage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-400 dark:text-stone-500 shrink-0">Filter:</span>
          {['all', 'morning', 'midday', 'evening', 'bedtime'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all shrink-0 ${
                timeFilter === t
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Medications Grid - Fully Aligned */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">No Medications Logged</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {searchQuery || timeFilter !== 'all'
              ? 'No medications match your filter parameters.'
              : 'Add your active prescriptions and daily supplements to keep track of dosages securely.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((med) => (
            <div
              key={med.id}
              className="p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full min-h-[200px]"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/80 rounded-xl flex items-center justify-center">
                    <Pill className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="text-stone-300 dark:text-stone-600 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Delete medication entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base line-clamp-1">
                    {med.data?.name || 'Encrypted Medication'}
                  </h3>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                    {med.data?.dosage || 'Dosage specified'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    {med.data?.frequency} ({med.data?.timeOfDay?.join(', ') || 'Anytime'})
                  </span>
                </div>

                {med.data?.notes && (
                  <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800/80 leading-relaxed">
                    {med.data.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 mt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] font-semibold text-stone-400 dark:text-stone-500">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  AES Encrypted
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

