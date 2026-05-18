import React, { useState, useEffect } from 'react';
import { useUnifiedConfigStore } from '../store';
import { BRANDING } from '../utils';

interface BuildInfo { version: string; buildDate: string; buildTimestamp: number; }
interface AboutModalProps { isOpen: boolean; onClose: () => void; }

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { getApiConfig, currentEnvironment } = useUnifiedConfigStore();
  const apiConfig = getApiConfig();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/build-info.json')
      .then(r => r.json())
      .then(setBuildInfo)
      .catch(() => setBuildInfo({ version: 'Unknown', buildDate: 'Unknown', buildTimestamp: 0 }));
  }, [isOpen]);

  if (!isOpen) return null;

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  const formatDate = (d: string) => { try { return new Date(d).toLocaleString(); } catch { return d; } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{BRANDING.productName}</h2>
              <p className="text-blue-100 text-sm mt-1">{BRANDING.tagline}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors" aria-label="Close">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-4">
          {/* Build Information */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Build Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Version:</span>
                <span className="text-gray-900 font-mono">{buildInfo?.version ?? 'Loading...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Build Date:</span>
                <span className="text-gray-900">{buildInfo ? formatDate(buildInfo.buildDate) : 'Loading...'}</span>
              </div>
            </div>
          </section>

          {/* Current Configuration */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Configuration</h3>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Environment:</span>
                <span className="text-gray-900 uppercase font-semibold">{currentEnvironment}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Base URL:</span>
                <span className="text-gray-900 text-sm truncate max-w-xs">{apiConfig.baseUrl || 'Not configured'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">API Key:</span>
                <span className="text-gray-900 font-mono text-sm">
                  {apiConfig.apiKey ? maskApiKey(apiConfig.apiKey) : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`font-semibold ${apiConfig.status === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {apiConfig.status.toUpperCase()}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
