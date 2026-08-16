import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteDataModalProps {
  onConfirmDelete: () => Promise<void>;
  onClose: () => void;
}

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({
  onConfirmDelete,
  onClose,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmationText.trim().toUpperCase() === 'DELETE MY HEALTH DATA';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl sm:rounded-[2.5rem] border border-red-200 dark:border-red-900/60 shadow-2xl p-5 sm:p-8 overflow-hidden my-auto max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        <h2 className="text-2xl font-bold text-stone-900 mb-2">Delete All Local Health Data?</h2>
        <p className="text-xs text-stone-600 leading-relaxed mb-6">
          This action will permanently delete all local IndexedDB records, medical reports, vitals logs, and encryption metadata stored on this browser.
        </p>

        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6 text-xs text-red-900 font-medium">
          ⚠️ This cannot be undone. Make sure you have exported a .healthbackup file if you wish to retain your data.
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Type "DELETE MY HEALTH DATA" to confirm:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="DELETE MY HEALTH DATA"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-40"
            >
              {isDeleting ? 'Deleting Data...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
