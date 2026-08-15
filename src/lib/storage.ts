import type { StorageStatus } from '../types/backup';

/**
 * Checks storage persistence and requests persistent storage if available.
 */
export async function checkStoragePersistence(): Promise<StorageStatus> {
  if (!navigator.storage || !navigator.storage.persisted) {
    return {
      isPersistent: false,
      canPersist: false,
    };
  }

  try {
    const isPersistent = await navigator.storage.persisted();
    let canPersist = true;
    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;

    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    }

    return {
      isPersistent,
      canPersist,
      quotaBytes,
      usageBytes,
    };
  } catch (error) {
    console.error('Storage check failed:', error);
    return {
      isPersistent: false,
      canPersist: false,
    };
  }
}

/**
 * Requests persistent storage from the browser.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const granted = await navigator.storage.persist();
    return granted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Formats byte counts into human readable MB/GB strings
 */
export function formatBytes(bytes?: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
