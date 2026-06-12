import React, { useState } from 'react';
import { useUnifiedConfigStore } from '../../store';
import { SECTION_CONFIGS } from '../../config';
import type { SectionConfig } from '../../config';
import type { Environment } from '../../types';

type Env = Environment;

const ENV_TABS: { id: Env; label: string }[] = [
  { id: 'localhost', label: 'Localhost' },
  { id: 'test', label: 'TEST' },
  { id: 'other', label: 'Other' },
];

interface SectionConfigPanelProps {
  /** Must match a key in SECTION_CONFIGS, e.g. "jokeapi" or "jsonplaceholder". */
  sectionKey: string;
}

export const SectionConfigPanel: React.FC<SectionConfigPanelProps> = ({ sectionKey }) => {
  const { currentEnvironment, setCurrentEnvironment, getSectionConfig, updateSectionConfig } =
    useUnifiedConfigStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeEnv, setActiveEnv] = useState<Env>(currentEnvironment as Env);
  const [prevEnv, setPrevEnv] = useState<Env>(activeEnv);
  const [baseUrl, setBaseUrl] = useState(() => getSectionConfig(sectionKey, activeEnv).baseUrl);
  const [apiKey, setApiKey] = useState(() => getSectionConfig(sectionKey, activeEnv).apiKey);
  const [saved, setSaved] = useState(false);

  // In-render sync when the active environment tab changes
  if (prevEnv !== activeEnv) {
    setPrevEnv(activeEnv);
    const cfg = getSectionConfig(sectionKey, activeEnv);
    setBaseUrl(cfg.baseUrl);
    setApiKey(cfg.apiKey);
    setSaved(false);
  }

  const handleEnvChange = (env: Env) => {
    setCurrentEnvironment(env);
    setActiveEnv(env);
  };

  const handleSave = () => {
    updateSectionConfig(sectionKey, activeEnv, {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sectionCfg = (SECTION_CONFIGS as Record<string, SectionConfig>)[sectionKey];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          ⚙ Configure
          <span className="text-xs font-normal text-gray-400">active: {currentEnvironment}</span>
        </span>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-3">
          {/* Environment tabs — also sets the global active environment */}
          <div className="flex gap-2">
            {ENV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleEnvChange(tab.id)}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  activeEnv === tab.id
                    ? 'bg-[#982407] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setSaved(false);
              }}
              placeholder={sectionCfg?.baseUrl ?? ''}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#982407]"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              API Key <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              placeholder="Enter API key…"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#982407]"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full px-4 py-2 bg-[#982407] text-white rounded text-sm font-medium hover:bg-[#741b05] transition-colors"
          >
            {saved ? '✓ Saved!' : `Save ${activeEnv} settings`}
          </button>
        </div>
      )}
    </div>
  );
};
