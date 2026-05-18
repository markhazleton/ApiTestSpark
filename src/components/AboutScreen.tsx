import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUnifiedConfigStore } from '../store';
import { BRANDING } from '../utils';

interface BuildInfo {
  version: string;
  buildDate: string;
  buildTimestamp: number;
}

export const AboutScreen: React.FC = () => {
  const { getApiConfig, currentEnvironment } = useUnifiedConfigStore();
  const config = getApiConfig();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    fetch('/build-info.json')
      .then(res => res.json())
      .then(data => setBuildInfo(data))
      .catch(() => setBuildInfo({ version: 'Unknown', buildDate: 'Unknown', buildTimestamp: 0 }));
  }, []);

  const localStorageSize = (() => {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  })();

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">{BRANDING.productName}</h1>
          <p className="text-blue-100 mt-1">{BRANDING.tagline}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Build Info */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Build Information</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Version</dt>
              <dd className="font-mono text-gray-900">{buildInfo?.version ?? 'Loading...'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Build Date</dt>
              <dd className="text-gray-900">{buildInfo?.buildDate ?? 'Loading...'}</dd>
            </div>
          </dl>
        </section>

        {/* Current Config */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Configuration</h2>
          <dl className="space-y-2 text-sm bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Environment</dt>
              <dd className="font-semibold text-gray-900 uppercase">{currentEnvironment}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Base URL</dt>
              <dd className="text-gray-900 truncate max-w-xs">{config.baseUrl || 'Not configured'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">API Key</dt>
              <dd className="font-mono text-gray-900">{config.apiKey ? maskApiKey(config.apiKey) : 'Not configured'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Status</dt>
              <dd className={`font-semibold ${config.status === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                {config.status.toUpperCase()}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <Link to="/config" className="text-sm text-blue-600 hover:underline">
              Edit Configuration →
            </Link>
          </div>
        </section>

        {/* LocalStorage */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">LocalStorage</h2>
          <p className="text-sm text-gray-600">
            Total size: <span className="font-mono">{(localStorageSize / 1024).toFixed(2)} KB</span>
          </p>
        </section>

        {/* System Info */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Browser</dt>
              <dd className="text-gray-900">{navigator.userAgent.split(' ').slice(-2).join(' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-gray-700">Language</dt>
              <dd className="text-gray-900">{navigator.language}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
};