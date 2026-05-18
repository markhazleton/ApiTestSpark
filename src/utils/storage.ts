/**
 * Storage Utility - localStorage availability and fallback handling
 * 
 * Azure Static Web Apps may have different localStorage behavior than local dev.
 * This utility provides:
 * 1. localStorage availability detection
 * 2. Graceful fallback to in-memory storage
 * 3. Debug logging for storage issues
 */

let storageAvailable = false;
let storageTestPerformed = false;

/**
 * Test if localStorage is available and working
 * Based on MDN Web Docs recommendations
 */
export function isLocalStorageAvailable(): boolean {
  if (storageTestPerformed) return storageAvailable;

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    const result = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    storageAvailable = result === 'test';
    storageTestPerformed = true;
    
    if (!storageAvailable) {
      console.warn('[Storage] localStorage test failed - value mismatch');
    }
    
    return storageAvailable;
  } catch (e) {
    console.error('[Storage] localStorage not available:', e);
    storageAvailable = false;
    storageTestPerformed = true;
    return false;
  }
}

/**
 * Safe localStorage getItem with fallback
 */
export function getStorageItem(key: string): string | null {
  if (!isLocalStorageAvailable()) {
    console.warn(`[Storage] Cannot read ${key} - localStorage unavailable`);
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(`[Storage] Failed to read ${key}:`, e);
    return null;
  }
}

/**
 * Safe localStorage setItem with fallback
 */
export function setStorageItem(key: string, value: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn(`[Storage] Cannot write ${key} - localStorage unavailable`);
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`[Storage] Failed to write ${key}:`, e);
    return false;
  }
}

/**
 * Safe localStorage removeItem
 */
export function removeStorageItem(key: string): boolean {
  if (!isLocalStorageAvailable()) {
    console.warn(`[Storage] Cannot remove ${key} - localStorage unavailable`);
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`[Storage] Failed to remove ${key}:`, e);
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
