import React, { useState } from 'react';
import { useJokeApi } from '../../hooks/useJokeApi';
import { SECTION_CONFIGS } from '../../config';
import { ApiHero, ErrorAlert, SectionConfigPanel } from '../shared';
import type { JokeCategory, JokeFlag, JokeType, JokeLang } from '../../types/joke-api';

const config = SECTION_CONFIGS.jokeapi;

const CATEGORIES: JokeCategory[] = ['Any', 'Misc', 'Programming', 'Dark', 'Pun', 'Spooky', 'Christmas'];
const FLAGS: JokeFlag[] = ['nsfw', 'religious', 'political', 'racist', 'sexist', 'explicit'];
const TYPES: Array<{ value: JokeType | ''; label: string }> = [
  { value: '', label: 'Any' },
  { value: 'single', label: 'Single' },
  { value: 'twopart', label: 'Two-Part' },
];
const LANGS: Array<{ value: JokeLang; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'cs', label: 'Czech' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
];

export const JokeApiScreen: React.FC = () => {
  const { fetchJoke, ping, lastJoke } = useJokeApi();

  const [category, setCategory]         = useState<JokeCategory>('Programming');
  const [jokeType, setJokeType]         = useState<JokeType | ''>('');
  const [lang, setLang]                 = useState<JokeLang>('en');
  const [safeMode, setSafeMode]         = useState(true);
  const [blacklist, setBlacklist]       = useState<JokeFlag[]>(['nsfw', 'racist', 'sexist', 'explicit']);
  const [searchStr, setSearchStr]       = useState('');
  const [showDelivery, setShowDelivery] = useState(false);

  const toggleFlag = (flag: JokeFlag) =>
    setBlacklist((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );

  const handleFetch = () => {
    setShowDelivery(false);
    fetchJoke.mutate({
      category,
      type: jokeType || undefined,
      lang,
      safeMode,
      blacklistFlags: blacklist,
      contains: searchStr.trim() || undefined,
    });
  };

  const isPending = fetchJoke.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      <ApiHero
        config={config}
        gradientClass="bg-gradient-to-r from-yellow-400 to-orange-400"
        subtitleClass="text-yellow-100"
        codeBgClass="bg-yellow-500/40"
      />

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <SectionConfigPanel sectionKey="jokeapi" />

        {/* Ping */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Health Check</h2>
            <p className="text-sm text-gray-500">GET /ping – verifies the API is reachable</p>
          </div>
          <div className="flex items-center gap-3">
            {ping.data && (
              <span className="text-sm text-green-700 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                {ping.data.ping}
              </span>
            )}
            {ping.isError && (
              <span className="text-sm text-red-600">Error</span>
            )}
            <button
              onClick={() => ping.mutate()}
              disabled={ping.isPending}
              className="px-4 py-2 bg-[#982407] text-white rounded-md text-sm font-medium hover:bg-[#741b05] disabled:opacity-50"
            >
              {ping.isPending ? 'Pinging…' : 'Ping'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Filters</h2>

          {/* Category + Type + Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                aria-label="Joke category"
                value={category}
                onChange={(e) => setCategory(e.target.value as JokeCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joke Type</label>
              <select
                aria-label="Joke type"
                value={jokeType}
                onChange={(e) => setJokeType(e.target.value as JokeType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                aria-label="Joke language"
                value={lang}
                onChange={(e) => setLang(e.target.value as JokeLang)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search string */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contains (optional)</label>
            <input
              type="text"
              value={searchStr}
              onChange={(e) => setSearchStr(e.target.value)}
              placeholder="Filter jokes that contain this text…"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {/* Safe mode + blacklist flags */}
          <div className="flex flex-wrap gap-4 items-start">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={safeMode}
                onChange={(e) => setSafeMode(e.target.checked)}
                className="rounded"
              />
              Safe Mode
            </label>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Blacklist Flags</p>
              <div className="flex flex-wrap gap-2">
                {FLAGS.map((flag) => (
                  <label key={flag} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blacklist.includes(flag)}
                      onChange={() => toggleFlag(flag)}
                      className="rounded"
                    />
                    {flag}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Fetch button */}
          <button
            onClick={handleFetch}
            disabled={isPending}
            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
          >
            {isPending ? '⏳ Fetching joke…' : '🎲 Get Joke'}
          </button>

          {fetchJoke.isError && (
            <ErrorAlert
              message={fetchJoke.error instanceof Error ? fetchJoke.error.message : 'Error fetching joke'}
            />
          )}
        </div>

        {/* Result */}
        {lastJoke && (
          <div className="bg-white rounded-lg border-2 border-yellow-300 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                  {lastJoke.category}
                </span>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {lastJoke.type}
                </span>
                {lastJoke.safe && (
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    ✓ safe
                  </span>
                )}
                <span className="text-xs text-gray-400">#{lastJoke.id}</span>
              </div>
            </div>

            {lastJoke.type === 'single' ? (
              <p className="text-gray-900 text-lg leading-relaxed">{lastJoke.joke}</p>
            ) : (
              <div>
                <p className="text-gray-900 text-lg font-medium mb-3">{lastJoke.setup}</p>
                {showDelivery ? (
                  <p className="text-yellow-700 text-lg italic border-t border-yellow-200 pt-3 mt-3">
                    {lastJoke.delivery}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowDelivery(true)}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors"
                  >
                    🥁 Reveal Punchline
                  </button>
                )}
              </div>
            )}

            {/* Flags */}
            {Object.values(lastJoke.flags).some(Boolean) && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-1">
                {(Object.entries(lastJoke.flags) as [string, boolean][])
                  .filter(([, v]) => v)
                  .map(([flag]) => (
                    <span key={flag} className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                      {flag}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="bg-[#fff7f5] border border-[#d9aaa0] rounded-lg p-4 text-sm text-[#741b05]">
          <p className="font-semibold mb-1">📝 Template note</p>
          <p>
            This screen is the sample API integration. To add your own API, follow the same
            pattern: create a typed client in <code className="bg-[#f7e6e1] px-1 rounded">src/api/</code>,
            a hook in <code className="bg-[#f7e6e1] px-1 rounded">src/hooks/</code>, and a screen
            component in <code className="bg-[#f7e6e1] px-1 rounded">src/components/</code>.
            All HTTP traffic is automatically captured in the Debug Panel.
          </p>
        </div>
      </div>
    </div>
  );
};
