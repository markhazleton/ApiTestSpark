/**
 * Version Mismatch Banner Component
 * 
 * Detects when the deployed version is newer than the cached version
 * and prompts user to refresh the page.
 */

import { useState, useEffect } from 'react';

interface BuildInfo {
  version: string;
  buildDate: string;
  buildTimestamp: number;
}

export default function VersionMismatchBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Get embedded build info (from app bundle)
        const embeddedResponse = await fetch('/build-info.json');
        if (!embeddedResponse.ok) return;
        
        const embeddedInfo: BuildInfo = await embeddedResponse.json();
        
        // Force fetch latest build info from server (no cache)
        const cacheBuster = new Date().getTime();
        const latestResponse = await fetch(`/build-info.json?v=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          }
        });
        
        if (!latestResponse.ok) return;
        
        const latestInfo: BuildInfo = await latestResponse.json();
        
        // Compare versions - show banner if mismatch
        if (embeddedInfo.version !== latestInfo.version) {
          setLatestVersion(latestInfo.version);
          setShowBanner(true);
        }
      } catch {
        // Version check is non-critical; silently skip on fetch failure
      }
    };

    // Check on mount
    checkVersion();

    // Check periodically (every 5 minutes)
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (!showBanner) {
    return null;
  }

  const handleRefresh = () => {
    // Hard refresh to bypass all caches
    window.location.reload();
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <svg 
            className="h-5 w-5 text-blue-600 flex-shrink-0" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
              clipRule="evenodd" 
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">
              New version available: <span className="font-semibold">{latestVersion}</span>
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              You're viewing an older cached version. Refresh to get the latest updates.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="text-blue-600 hover:text-blue-800 focus:outline-none"
            aria-label="Dismiss version notice"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
