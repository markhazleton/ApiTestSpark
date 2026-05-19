import React, { useState, useEffect } from 'react';
import { useUnifiedConfigStore } from '../store';
import { BRANDING } from '../utils';
import { SECTION_CONFIGS } from '../config';

type Env = 'localhost' | 'test' | 'other';
type SectionForms = Record<string, { baseUrl: string; apiKey: string }>;

function loadFormsFromStore(env: Env): SectionForms {
  const store = useUnifiedConfigStore.getState();
  return Object.fromEntries(
    Object.entries(SECTION_CONFIGS).map(([key]) => {
      const cfg = store.getSectionConfig(key, env);
      return [key, { baseUrl: cfg.baseUrl, apiKey: cfg.apiKey }];
    }),
  );
}

export const UnifiedConfigurationScreen: React.FC = () => {
  const { currentEnvironment, setCurrentEnvironment, updateSectionConfig, reset } =
    useUnifiedConfigStore();

  const [forms, setForms] = useState<SectionForms>(() =>
    loadFormsFromStore(currentEnvironment as Env),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    setForms(loadFormsFromStore(currentEnvironment as Env));
    setSaved({});
  }, [currentEnvironment]);

  const handleEnvChange = (env: Env) => setCurrentEnvironment(env);

  const handleFieldChange = (sectionKey: string, field: 'baseUrl' | 'apiKey', value: string) => {
    setForms((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], [field]: value } }));
    setSaved((prev) => ({ ...prev, [sectionKey]: false }));
  };

  const handleSave = (sectionKey: string) => {
    const form = forms[sectionKey];
    updateSectionConfig(sectionKey, currentEnvironment as Env, {
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
    });
    setSaved((prev) => ({ ...prev, [sectionKey]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [sectionKey]: false })), 2000);
  };

  const handleReset = () => {
    reset();
    setForms(loadFormsFromStore(currentEnvironment as Env));
    setShowReset(false);
  };

  const envButtons: { id: Env; label: string }[] = [
    { id: 'localhost', label: 'Localhost' },
    { id: 'test', label: 'TEST' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {BRANDING.productName} — Configuration
            </h1>
            <p className="text-gray-600 text-sm">
              Set the base URL and API key for each integration and environment.
            </p>
          </div>
          <button
            onClick={() => setShowReset(true)}
            className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            Reset All
          </button>
        </div>

        {/* Environment selector */}
        <div className="bg-white rounded-lg shadow-sm p-4">
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

        {/* Per-section config panels */}
        {Object.entries(SECTION_CONFIGS).map(([key, cfg]) => (
          <div key={key} className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {cfg.icon} {cfg.displayName}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="url"
                value={forms[key]?.baseUrl ?? ''}
                onChange={(e) => handleFieldChange(key, 'baseUrl', e.target.value)}
                placeholder={cfg.baseUrl}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="password"
                value={forms[key]?.apiKey ?? ''}
                onChange={(e) => handleFieldChange(key, 'apiKey', e.target.value)}
                placeholder="Enter API key…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => handleSave(key)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              {saved[key] ? '✓ Saved!' : `Save ${cfg.displayName} Configuration`}
            </button>
          </div>
        ))}

        {/* Reset confirm modal */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Reset all configuration?</h2>
              <p className="text-sm text-gray-600 mb-4">
                This will reset all base URLs and API keys to their defaults for all sections and
                environments.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowReset(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium hover:bg-gray-50"
                >
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
