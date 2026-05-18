/**
 * Storage Warning Banner Component
 * 
 * Displays a prominent warning when localStorage is unavailable.
 * This helps users understand why configuration isn't persisting.
 */

import { useState } from 'react';
import { isLocalStorageAvailable } from '../utils/storage';

export default function StorageWarningBanner() {
  // Check storage availability once during initial render
  const [storageAvailable] = useState(() => isLocalStorageAvailable());
  const [dismissed, setDismissed] = useState(false);

  if (storageAvailable || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Browser Storage Unavailable
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              Your configuration <strong>will not be saved</strong> between browser sessions.
            </p>
            <p className="mb-2">
              This may be caused by:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Browser privacy settings blocking local storage</li>
              <li>Private/Incognito browsing mode</li>
              <li>Content Security Policy restrictions</li>
              <li>Browser extensions blocking storage</li>
            </ul>
            <p className="mt-3 font-medium">
              You will need to re-enter your configuration each time you visit this site.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-3 flex-shrink-0 inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none"
          aria-label="Dismiss storage warning"
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
