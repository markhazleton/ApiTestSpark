import { useState } from 'react';
import { useRemoteConfigStore } from '../store/remoteConfigStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import type { HarnessConfig } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidUrl(val: string) {
  if (!val) return true;
  return /^https?:\/\/.+/.test(val);
}

// ── Headers key-value editor ──────────────────────────────────────────────────

// Buffers the header name locally while typing; commits to parent on blur.
// Fully uncontrolled after mount — the parent only resets the whole form on
// Save/Clear, at which point React remounts this component via the row's key.
function KeyInput({ initialValue, onCommit }: { initialValue: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(initialValue);
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      placeholder="Header name"
      className="w-40 shrink-0 font-mono text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>;
  onChange: (h: Record<string, string>) => void;
}) {
  const rows = Object.entries(headers);

  function commitKey(oldKey: string, newKey: string) {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of rows) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function updateValue(key: string, value: string) {
    onChange({ ...headers, [key]: value });
  }

  function removeRow(key: string) {
    const next = { ...headers };
    delete next[key];
    onChange(next);
  }

  function addRow() {
    onChange({ ...headers, '': '' });
  }

  return (
    <div className="space-y-2">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-2">
          <KeyInput initialValue={k} onCommit={(newKey) => commitKey(k, newKey)} />
          <span className="text-gray-400 text-xs shrink-0">:</span>
          <input
            type="text"
            value={v}
            onChange={(e) => updateValue(k, e.target.value)}
            placeholder="Value or {session-guid} / {request-guid}"
            className="flex-1 font-mono text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={() => removeRow(k)}
            className="text-red-400 hover:text-red-600 text-sm shrink-0 px-1"
            title="Remove header"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add header
      </button>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

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

// ── Section title ─────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Server info box ───────────────────────────────────────────────────────────

function ServerInfoBox({ cfg }: { cfg: HarnessConfig | null }) {
  if (!cfg) return null;
  const none = <em className="font-sans not-italic text-blue-300">not set</em>;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700 space-y-1">
      <p className="font-semibold">Server-configured values (from Program.cs)</p>
      <p className="text-blue-400">Browser values below override these on save.</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 mt-2 font-mono">
        <span className="text-blue-500">remoteBaseUrl</span>
        <span className="break-all">{cfg.remoteBaseUrl || none}</span>
        <span className="text-blue-500">remoteOpenApiUrl</span>
        <span className="break-all">{cfg.remoteOpenApiUrl || none}</span>
        <span className="text-blue-500">apiKeyHeader</span>
        <span>{cfg.remoteOpenApiApiKeyHeader || none}</span>
        <span className="text-blue-500">defaultHeaders</span>
        <span>
          {cfg.remoteDefaultHeaders && Object.keys(cfg.remoteDefaultHeaders).length > 0
            ? Object.keys(cfg.remoteDefaultHeaders).join(', ')
            : none}
        </span>
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  remoteBaseUrl: string;
  remoteOpenApiUrl: string;
  apiKeyHeader: string;
  apiKeyValue: string;
  bearerToken: string;
  defaultHeaders: Record<string, string>;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ConfigScreen() {
  const remote = useRemoteConfigStore();
  const serverConfig = useHarnessConfigStore((s) => s.config);

  const [form, setForm] = useState<FormState>({
    remoteBaseUrl:    remote.remoteBaseUrl,
    remoteOpenApiUrl: remote.remoteOpenApiUrl,
    apiKeyHeader:     remote.remoteOpenApiApiKeyHeader,
    apiKeyValue:      remote.remoteOpenApiApiKeyValue,
    bearerToken:      remote.remoteOpenApiBearerToken,
    defaultHeaders:   remote.remoteDefaultHeaders,
  });
  const [saved, setSaved] = useState(false);

  const baseUrlError = !isValidUrl(form.remoteBaseUrl)   ? 'Must start with http:// or https://' : undefined;
  const specUrlError = !isValidUrl(form.remoteOpenApiUrl) ? 'Must start with http:// or https://' : undefined;
  const hasErrors    = !!baseUrlError || !!specUrlError;

  function patch(partial: Partial<FormState>) {
    setForm((f) => ({ ...f, ...partial }));
  }

  function handleSave() {
    if (hasErrors) return;
    remote.set({
      remoteBaseUrl:             form.remoteBaseUrl,
      remoteOpenApiUrl:          form.remoteOpenApiUrl,
      remoteOpenApiApiKeyHeader: form.apiKeyHeader,
      remoteOpenApiApiKeyValue:  form.apiKeyValue,
      remoteOpenApiBearerToken:  form.bearerToken,
      remoteDefaultHeaders:      form.defaultHeaders,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    remote.clear();
    setForm({ remoteBaseUrl: '', remoteOpenApiUrl: '', apiKeyHeader: '', apiKeyValue: '', bearerToken: '', defaultHeaders: {} });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Configuration</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Remote API settings are stored in your browser and override values from{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">Program.cs</code>.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        <ServerInfoBox cfg={serverConfig} />

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 space-y-5">

            {/* ── Remote API ── */}
            <SectionTitle
              title="Remote API"
              subtitle="Base URL used for all remote API calls in the explorer and doc builder."
            />

            <Field label="Remote Base URL" hint="All endpoint paths are appended to this." error={baseUrlError}>
              <input
                type="url"
                value={form.remoteBaseUrl}
                onChange={(e) => patch({ remoteBaseUrl: e.target.value })}
                placeholder="https://api.example.com"
                className={`w-full font-mono text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 ${
                  baseUrlError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
                }`}
              />
            </Field>

            {/* ── OpenAPI Spec ── */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <SectionTitle
                title="Remote OpenAPI Spec"
                subtitle="URL of the remote OpenAPI JSON document. Fetched server-side to avoid CORS."
              />

              <Field
                label="OpenAPI Spec URL"
                hint="Credentials below are sent by the .NET proxy — never exposed in the browser network tab."
                error={specUrlError}
              >
                <input
                  type="url"
                  value={form.remoteOpenApiUrl}
                  onChange={(e) => patch({ remoteOpenApiUrl: e.target.value })}
                  placeholder="https://api.example.com/openapi.json"
                  className={`w-full font-mono text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 ${
                    specUrlError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
                  }`}
                />
              </Field>
            </div>

            {/* ── Auth ── */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <SectionTitle
                title="Authentication"
                subtitle="Sent when fetching the remote OpenAPI spec and on every API call."
              />

              <div className="grid grid-cols-2 gap-4">
                <Field label="API Key Header" hint="Header name, e.g. x-api-key">
                  <input
                    type="text"
                    value={form.apiKeyHeader}
                    onChange={(e) => patch({ apiKeyHeader: e.target.value })}
                    placeholder="x-api-key"
                    className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </Field>

                <Field label="API Key Value" hint="Stored in browser localStorage">
                  <input
                    type="password"
                    value={form.apiKeyValue}
                    onChange={(e) => patch({ apiKeyValue: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="off"
                    className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </Field>
              </div>

              <Field
                label="Bearer Token"
                hint="Sent as Authorization: Bearer <token>. Leave blank if using an API key."
              >
                <input
                  type="password"
                  value={form.bearerToken}
                  onChange={(e) => patch({ bearerToken: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="off"
                  className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </Field>
            </div>

            {/* ── Default Headers ── */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <SectionTitle
                title="Default Request Headers"
                subtitle="Headers injected into every remote API call (e.g. correlation IDs, session tokens)."
              />
              <HeadersEditor
                headers={form.defaultHeaders}
                onChange={(h) => patch({ defaultHeaders: h })}
              />
              <p className="text-xs text-gray-400 leading-relaxed">
                Header values support two tokens expanded at request time:{' '}
                <code className="bg-gray-100 px-1 rounded font-mono">{'{session-guid}'}</code> — one UUID per page load, and{' '}
                <code className="bg-gray-100 px-1 rounded font-mono">{'{request-guid}'}</code> — a fresh UUID on every call.
              </p>
            </div>

            {/* ── Actions ── */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear all remote config
              </button>
              <div className="flex items-center gap-3">
                {saved && <span className="text-sm text-green-600 font-medium">Saved to browser</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={hasErrors}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Persisted in <code>localStorage</code> under <code>api-test-spark-remote-config</code>.
          Clearing browser data resets to server defaults.
        </p>
      </div>
    </div>
  );
}
