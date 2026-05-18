import React, { useState } from 'react';
import { useUnifiedConfigStore } from '../store';
import { BRANDING } from '../utils';

type Env = 'localhost' | 'test' | 'other';

export const UnifiedConfigurationScreen: React.FC = () => {
  const { currentEnvironment, setCurrentEnvironment, updateApiConfig, getApiConfig, reset } =
    useUnifiedConfigStore();

  const config = getApiConfig();
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleEnvChange = (env: Env) => {
    setCurrentEnvironment(env);
    const c = useUnifiedConfigStore.getState().getApiConfig(env);
    setBaseUrl(c.baseUrl);
    setApiKey(c.apiKey);
    setSaved(false);
  };

  const handleSave = () => {
    updateApiConfig(currentEnvironment, { baseUrl: baseUrl.trim(), apiKey: apiKey.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    reset();
    setBaseUrl('https://v2.jokeapi.dev');
    setApiKey('');
    setShowReset(false);
  };

  const envButtons: { id: Env; label: string }[] = [
    { id: 'localhost', label: 'Localhost' },
    { id: 'test', label: 'TEST' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{BRANDING.productName} — Configuration</h1>
              <p className="text-gray-600 text-sm">Set the base URL and API key for each environment.</p>
            </div>
            <button
              onClick={() => setShowReset(true)}
              className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Environment selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
            <div className="flex gap-2">
              {envButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleEnvChange(btn.id)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    currentEnvironment === btn.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Joke API Configuration</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); setSaved(false); }}
              placeholder="https://v2.jokeapi.dev"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* API Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
              placeholder="Enter API key..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>

        {/* Reset confirm */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Reset all configuration?</h2>
              <p className="text-sm text-gray-600 mb-4">This will clear base URLs and API keys for all environments.</p>
              <div className="flex gap-3">
                <button onClick={handleReset} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700">
                  Reset
                </button>
                <button onClick={() => setShowReset(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
