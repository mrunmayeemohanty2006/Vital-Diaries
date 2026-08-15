import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Lock, Trash2, AlertCircle } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData, decryptData } from '../../lib/crypto';
import type { SymptomEntry, DecryptedSymptomData } from '../../types/health';
import { formatDate } from '../../lib/utils';

interface SymptomsTrackerProps {
  encryptionKey: CryptoKey | null;
  userId: string;
}

interface DecryptedSymptomItem extends SymptomEntry {
  data?: DecryptedSymptomData;
}

export const SymptomsTracker: React.FC<SymptomsTrackerProps> = ({ encryptionKey, userId }) => {
  const [items, setItems] = useState<DecryptedSymptomItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [symptom, setSymptom] = useState('');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [duration, setDuration] = useState('2');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAndDecryptSymptoms();
  }, [encryptionKey]);

  async function loadAndDecryptSymptoms() {
    const rawList = await db.symptoms.orderBy('timestamp').reverse().toArray();

    if (!encryptionKey) {
      setItems(rawList);
      return;
    }

    const decryptedList = await Promise.all(
      rawList.map(async (s) => {
        try {
          const json = await decryptData(s.encryptedData, s.iv, encryptionKey);
          return { ...s, data: JSON.parse(json) };
        } catch {
          return s;
        }
      })
    );

    setItems(decryptedList);
  }

  const handleSaveSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey || !symptom.trim()) return;

    setIsSubmitting(true);
    try {
      const data: DecryptedSymptomData = {
        symptom: symptom.trim(),
        severity,
        durationHours: Number(duration) || undefined,
        notes: notes.trim() || undefined,
      };

      const { cipherText, iv } = await encryptData(JSON.stringify(data), encryptionKey);
      const now = new Date();

      const newEntry: SymptomEntry = {
        id: `sym_${Date.now()}`,
        userId,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        encryptedData: cipherText,
        iv,
        createdAt: now.toISOString(),
      };

      await db.symptoms.put(newEntry);
      setIsAdding(false);
      setSymptom('');
      setNotes('');
      await loadAndDecryptSymptoms();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await db.symptoms.delete(id);
    await loadAndDecryptSymptoms();
  };

  const getSeverityBadge = (level: number = 1) => {
    switch (level) {
      case 1:
        return 'bg-emerald-100 text-emerald-800';
      case 2:
        return 'bg-blue-100 text-blue-800';
      case 3:
        return 'bg-amber-100 text-amber-800';
      case 4:
        return 'bg-orange-100 text-orange-800';
      case 5:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-stone-100 text-stone-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-stone-900">Symptoms & Health Observations</h3>
          <p className="text-xs text-stone-500">Log episodic symptoms with severity ratings</p>
        </div>
        {encryptionKey && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Symptom</span>
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSaveSymptom} className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Symptom Description
            </label>
            <input
              type="text"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="e.g., Mild tightness in chest or seasonal fatigue"
              className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Severity (1 - Mild, 5 - Severe)
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value) as 1|2|3|4|5)}
                className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-bold text-stone-900 dark:text-stone-100"
              >
                <option value={1} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">1 - Barely noticeable</option>
                <option value={2} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">2 - Mild discomfort</option>
                <option value={3} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">3 - Moderate impact</option>
                <option value={4} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">4 - High intensity</option>
                <option value={5} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">5 - Severe / Requires rest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Duration (Hours)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm text-stone-900"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Triggers, remedies, or accompanying sensations..."
              className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-2xs"
            >
              {isSubmitting ? 'Encrypting...' : 'Save Symptom'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="p-4 bg-white rounded-2xl border border-stone-200 flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${getSeverityBadge(item.data?.severity)}`}>
                  Severity {item.data?.severity || 1}
                </span>
                <span className="text-xs text-stone-400 font-medium">{formatDate(item.timestamp)}</span>
              </div>
              <p className="font-bold text-stone-900 text-sm">{item.data?.symptom || 'Encrypted Symptom'}</p>
              {item.data?.notes && <p className="text-xs text-stone-500 italic">{item.data.notes}</p>}
            </div>

            <button
              onClick={() => handleDelete(item.id)}
              className="text-stone-300 hover:text-red-600 p-1 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
