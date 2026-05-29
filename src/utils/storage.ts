/**
 * Storage Utility - localStorage availability and fallback handling
 *
 * Azure Static Web Apps may have different localStorage behavior than local dev.
 * This utility provides:
 * 1. localStorage availability detection
 * 2. Graceful fallback to in-memory storage
 */

let storageAvailable = false;
let storageTestPerformed = false;

export function isLocalStorageAvailable(): boolean {
  if (storageTestPerformed) return storageAvailable;

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    const result = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    storageAvailable = result === 'test';
  } catch {
    storageAvailable = false;
  }
  storageTestPerformed = true;
  return storageAvailable;
}

export function getStorageItem(key: string): string | null {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setStorageItem(key: string, value: string): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get diagnostic information about storage
 */
export function getStorageDiagnostics() {
  const available = isLocalStorageAvailable();
  
  if (!available) {
    return {
      available: false,
      size: 0,
      keys: [],
      error: 'localStorage is not available or blocked',
    };
  }

  try {
    let size = 0;
    const keys: string[] = [];
    
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        keys.push(key);
        size += localStorage[key].length + key.length;
      }
    }

    return {
      available: true,
      size,
      keys,
      itemCount: keys.length,
    };
  } catch (e) {
    return {
      available: false,
      size: 0,
      keys: [],
      error: String(e),
    };
  }
}

// ============================================================================
// End of storage utilities
// ============================================================================
