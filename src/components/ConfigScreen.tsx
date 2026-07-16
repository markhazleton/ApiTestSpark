import { useMemo, useState } from 'react';
import {
  createEmptyRemoteProfile,
  getRemoteProfileLabel,
  getVisibleRemoteProfiles,
  useRemoteConfigStore,
  validateRemoteProfile,
} from '../store/remoteConfigStore';
import { OAuthConfigPanel } from './harness-config';
import type { RemoteApiProfile } from '../types';

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-gray-700 block">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function KeyInput({ initialValue, onCommit }: { initialValue: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(initialValue);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      placeholder="Header name"
      className="w-40 shrink-0 font-mono text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#982407]"
    />
  );
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}) {
  const rows = Object.entries(headers);

  function commitKey(oldKey: string, newKey: string) {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [key, value] of rows) {
      next[key === oldKey ? newKey : key] = value;
    }
    onChange(next);
  }

  function removeRow(key: string) {
    const next = { ...headers };
    delete next[key];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {rows.map(([key, value], index) => (
        <div key={`${key}-${index}`} className="flex items-center gap-2">
          <KeyInput initialValue={key} onCommit={(nextKey) => commitKey(key, nextKey)} />
          <span className="text-gray-400 text-xs shrink-0">:</span>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange({ ...headers, [key]: e.target.value })}
            placeholder="Value or {session-guid} / {request-guid}"
            className="flex-1 font-mono text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
          <button
            type="button"
            onClick={() => removeRow(key)}
            className="text-red-500 hover:text-red-700 text-sm shrink-0 px-1"
            title="Remove header"
          >
            X
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...headers, '': '' })}
        className="text-xs text-[#982407] hover:text-[#741b05] font-medium"
      >
        + Add header
      </button>
    </div>
  );
}

function normalizedProfileLabel(profile: RemoteApiProfile): string {
  return getRemoteProfileLabel(profile).trim().toLowerCase();
}

function hasDuplicateVisibleLabel(
  visibleProfiles: RemoteApiProfile[],
  profile: RemoteApiProfile,
  patch: Partial<RemoteApiProfile>
): boolean {
  const candidate = createEmptyRemoteProfile({ ...profile, ...patch, id: profile.id });
  const candidateLabel = normalizedProfileLabel(candidate);
  return visibleProfiles.some((item) => item.id !== profile.id && normalizedProfileLabel(item) === candidateLabel);
}

function nextBrowserProfileName(visibleProfiles: RemoteApiProfile[]): string {
  const existingNames = new Set(visibleProfiles.map(normalizedProfileLabel));
  const baseName = 'New Remote API';
  if (!existingNames.has(baseName.toLowerCase())) return baseName;

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

function nextBrowserCopyName(baseLabel: string, visibleProfiles: RemoteApiProfile[]): string {
  const existingNames = new Set(visibleProfiles.map(normalizedProfileLabel));
  const copyBase = `${baseLabel.trim() || 'Remote API'} (Browser)`;
  if (!existingNames.has(copyBase.toLowerCase())) return copyBase;

  let index = 2;
  while (existingNames.has(`${copyBase} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${copyBase} ${index}`;
}

function ServerProfileRow({
  profile,
  hidden,
  onToggle,
  onCopyToBrowser,
}: {
  profile: RemoteApiProfile;
  hidden: boolean;
  onToggle: (hidden: boolean) => void;
  onCopyToBrowser: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded bg-white p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-900">{getRemoteProfileLabel(profile)}</h3>
          <span className="text-[10px] uppercase tracking-wide bg-[#fff7f5] text-[#982407] border border-[#f0c8bf] px-2 py-0.5 rounded">
            Program.cs
          </span>
          {hidden && <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded">hidden</span>}
        </div>
        {profile.description && <p className="text-xs text-gray-500 mt-1">{profile.description}</p>}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mt-3 text-xs font-mono">
          <span className="text-gray-400">base</span>
          <span className="break-all text-gray-700">{profile.remoteBaseUrl || 'not set'}</span>
          <span className="text-gray-400">spec</span>
          <span className="break-all text-gray-700">{profile.remoteOpenApiUrl || 'not set'}</span>
          <span className="text-gray-400">auth</span>
          <span className="text-gray-700">
            {profile.remoteOpenApiApiKeyConfigured || profile.remoteOpenApiBearerTokenConfigured
              ? 'configured on server'
              : 'not configured'}
          </span>
          {profile.remoteOAuthConfigured && (
            <>
              <span className="text-gray-400">oauth</span>
              <span className="text-gray-700">configured on server (client_credentials)</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onCopyToBrowser}
          className="text-xs font-semibold text-[#982407] hover:text-[#741b05]"
        >
          Copy to browser
        </button>
        <button
          type="button"
          onClick={() => onToggle(!hidden)}
          className="text-xs font-semibold text-[#982407] hover:text-[#741b05]"
        >
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>
    </div>
  );
}

function BrowserProfileEditor({
  profile,
  duplicateName,
  onChange,
  onDelete,
}: {
  profile: RemoteApiProfile;
  duplicateName: boolean;
  onChange: (patch: Partial<RemoteApiProfile>) => void;
  onDelete: () => void;
}) {
  const errors = validateRemoteProfile(profile);
  const baseError = errors.find((error) => error.startsWith('Remote Base URL'));
  const specError = errors.find((error) => error.startsWith('OpenAPI Spec URL'));
  const authError = errors.find((error) => error.startsWith('API key'));

  return (
    <div id={`browser-profile-${profile.id}`} className="border border-gray-200 rounded bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{getRemoteProfileLabel(profile)}</h3>
          <p className="text-xs text-gray-500 mt-1">Stored in this browser. Spec fetches run directly from the browser.</p>
        </div>
        <button type="button" onClick={onDelete} className="text-xs font-semibold text-red-600 hover:text-red-800">
          Delete
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name" error={duplicateName ? 'Name must be unique in the visible remote API list.' : undefined}>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
        <Field label="Description">
          <input
            type="text"
            value={profile.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Remote Base URL" hint="Endpoint paths are appended to this." error={baseError}>
          <input
            type="url"
            value={profile.remoteBaseUrl ?? ''}
            onChange={(e) => onChange({ remoteBaseUrl: e.target.value })}
            placeholder="https://api.example.com"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
        <Field label="OpenAPI Spec URL" hint="Fetched directly by the browser." error={specError}>
          <input
            type="url"
            value={profile.remoteOpenApiUrl ?? ''}
            onChange={(e) => onChange({ remoteOpenApiUrl: e.target.value })}
            placeholder="https://api.example.com/openapi.json"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="API Key Header" error={authError}>
          <input
            type="text"
            value={profile.remoteOpenApiApiKeyHeader ?? ''}
            onChange={(e) => onChange({ remoteOpenApiApiKeyHeader: e.target.value })}
            placeholder="x-api-key"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
        <Field label="API Key Value" hint="Stored only in browser localStorage.">
          <input
            type="password"
            value={profile.remoteOpenApiApiKeyValue ?? ''}
            onChange={(e) => onChange({ remoteOpenApiApiKeyValue: e.target.value })}
            autoComplete="off"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </Field>
      </div>

      <Field label="Bearer Token" hint="Stored only in browser localStorage.">
        <input
          type="password"
          value={profile.remoteOpenApiBearerToken ?? ''}
          onChange={(e) => onChange({ remoteOpenApiBearerToken: e.target.value })}
          autoComplete="off"
          disabled={!!profile.remoteUseOAuthToken}
          className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407] disabled:opacity-50 disabled:bg-gray-50"
        />
      </Field>

      <Field label="Use environment OAuth token" hint="When enabled, requests use the active Environment's configured OAuth-derived token instead of the Bearer Token above.">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={!!profile.remoteUseOAuthToken}
            onChange={(e) => onChange({ remoteUseOAuthToken: e.target.checked })}
          />
          Use environment OAuth token
        </label>
      </Field>

      <Field label="Default Request Headers" hint="Values support {session-guid} and {request-guid}.">
        <HeadersEditor
          headers={profile.remoteDefaultHeaders ?? {}}
          onChange={(headers) => onChange({ remoteDefaultHeaders: headers })}
        />
      </Field>
    </div>
  );
}

export function ConfigScreen() {
  const remote = useRemoteConfigStore();
  const visibleProfiles = useMemo(() => getVisibleRemoteProfiles(remote), [remote]);
  const activeServerProfiles = useMemo(
    () => remote.serverProfiles.filter((profile) => !remote.hiddenServerProfileIds.includes(profile.id)),
    [remote.hiddenServerProfileIds, remote.serverProfiles]
  );
  const hiddenServerProfiles = useMemo(
    () => remote.serverProfiles.filter((profile) => remote.hiddenServerProfileIds.includes(profile.id)),
    [remote.hiddenServerProfileIds, remote.serverProfiles]
  );
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const profile of visibleProfiles) {
      const key = getRemoteProfileLabel(profile).trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  }, [visibleProfiles]);
  const [saved, setSaved] = useState(false);

  function markSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  function addProfile() {
    remote.addProfile(createEmptyRemoteProfile({ name: nextBrowserProfileName(visibleProfiles) }));
    markSaved();
  }

  function updateBrowserProfile(profile: RemoteApiProfile, patch: Partial<RemoteApiProfile>) {
    if (hasDuplicateVisibleLabel(visibleProfiles, profile, patch)) {
      window.alert('Remote API profile names must be unique. Please choose a unique name before saving.');
      return;
    }
    remote.updateProfile(profile.id, patch);
  }

  function copyServerProfileToBrowser(profile: RemoteApiProfile) {
    const browserCopy = remote.addProfile({
      ...profile,
      id: undefined,
      name: nextBrowserCopyName(getRemoteProfileLabel(profile), visibleProfiles),
      remoteOpenApiApiKeyConfigured: false,
      remoteOpenApiBearerTokenConfigured: false,
      source: 'browser',
      proxyMode: 'browser',
    });
    markSaved();
    setTimeout(() => {
      document.getElementById(`browser-profile-${browserCopy.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage remote API profiles used by the explorer and doc builder.
            </p>
          </div>
          <button
            type="button"
            onClick={addProfile}
            className="px-3 py-2 bg-[#982407] text-white rounded text-sm font-semibold hover:bg-[#741b05] transition-colors"
          >
            + Add remote
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
            Saved to browser
          </div>
        )}

        <OAuthConfigPanel />

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800">Server Profiles</h2>
            <span className="text-xs text-gray-400">{activeServerProfiles.length} visible</span>
          </div>
          {activeServerProfiles.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded p-4 text-sm text-gray-500">
              {remote.serverProfiles.length === 0
                ? 'No remote API profiles are configured in Program.cs.'
                : 'All Program.cs remote API profiles are hidden for this browser.'}
            </div>
          ) : (
            activeServerProfiles.map((profile) => (
              <ServerProfileRow
                key={profile.id}
                profile={profile}
                hidden={remote.hiddenServerProfileIds.includes(profile.id)}
                onToggle={(hidden) => remote.hideServerProfile(profile.id, hidden)}
                onCopyToBrowser={() => copyServerProfileToBrowser(profile)}
              />
            ))
          )}
          {hiddenServerProfiles.length > 0 && (
            <details className="border border-dashed border-gray-300 rounded bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-600">
                Hidden Program.cs profiles ({hiddenServerProfiles.length})
              </summary>
              <div className="px-4 pb-4 space-y-3">
                {hiddenServerProfiles.map((profile) => (
                  <ServerProfileRow
                    key={profile.id}
                    profile={profile}
                    hidden
                    onToggle={(hidden) => remote.hideServerProfile(profile.id, hidden)}
                    onCopyToBrowser={() => copyServerProfileToBrowser(profile)}
                  />
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-800">Browser Profiles</h2>
            <span className="text-xs text-gray-400">{remote.profiles.length} stored locally</span>
          </div>
          {remote.profiles.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded p-4 text-sm text-gray-500">
              Add a browser profile to test a remote API without changing Program.cs.
            </div>
          ) : (
            remote.profiles.map((profile) => (
              <BrowserProfileEditor
                key={profile.id}
                profile={profile}
                duplicateName={duplicateNames.has(getRemoteProfileLabel(profile).trim().toLowerCase())}
                onChange={(patch) => updateBrowserProfile(profile, patch)}
                onDelete={() => remote.deleteProfile(profile.id)}
              />
            ))
          )}
        </section>

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {visibleProfiles.length} visible remote profile{visibleProfiles.length === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            onClick={remote.reset}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Reset browser remote config
          </button>
        </div>
      </div>
    </div>
  );
}
