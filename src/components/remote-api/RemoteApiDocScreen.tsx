import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useHarnessConfigStore } from '../../store/harnessConfigStore';
import { getRemoteProfileLabel, getVisibleRemoteProfiles, useRemoteConfigStore } from '../../store/remoteConfigStore';
import { useRemoteOpenApi } from '../../hooks/useRemoteOpenApi';
import { EndpointList } from '../host-api/EndpointList';
import { buildCurlCommand, generateMarkdown } from '../../utils/generateMarkdown';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { renderMarkdown } from '../../utils/renderMarkdown';
import { resolveHeaderTokens } from '../../utils/session';
import type { DiscoveredEndpoint, DocEntry, CapturedCall, ApiDoc, HarnessConfig, RemoteApiProfile } from '../../types';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-[#f7e6e1] text-[#741b05]',
  POST:   'bg-green-100 text-green-800',
  PUT:    'bg-yellow-100 text-yellow-800',
  PATCH:  'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

function fallbackProfile(config: HarnessConfig | null): RemoteApiProfile | null {
  if (!config?.remoteBaseUrl && !config?.remoteOpenApiUrl) return null;
  return {
    id: 'legacy-remote-api',
    name: 'Remote API',
    description: 'Configured from Program.cs.',
    remoteBaseUrl: config.remoteBaseUrl ?? '',
    remoteOpenApiUrl: config.remoteOpenApiUrl ?? '',
    remoteOpenApiApiKeyHeader: config.remoteOpenApiApiKeyHeader ?? '',
    remoteOpenApiApiKeyValue: config.remoteOpenApiApiKeyValue ?? '',
    remoteOpenApiBearerToken: config.remoteOpenApiBearerToken ?? '',
    remoteDefaultHeaders: config.remoteDefaultHeaders ?? {},
    source: 'server',
    proxyMode: 'server',
  };
}

// ── Capture form ──────────────────────────────────────────────────────────────

function CaptureForm({
  entry,
  captureConfig,
  onCapture,
}: {
  entry: DocEntry;
  captureConfig: { baseUrl: string; headers: Record<string, string> } | null;
  onCapture: (id: string, capture: CapturedCall, params: DocEntry['captureParams']) => void;
}) {
  const ep = entry.endpoint;
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(ep.method);

  const [pathParams, setPathParams] = useState<Record<string, string>>(entry.captureParams.pathParams);
  const [queryParams, setQueryParams] = useState<Record<string, string>>(entry.captureParams.queryParams);
  const [body, setBody] = useState(entry.captureParams.body || (needsBody ? buildJsonScaffold(ep.requestBodySchema) : ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathParams_ = ep.parameters.filter((p) => p.in === 'path');
  const queryParams_ = ep.parameters.filter((p) => p.in === 'query');

  async function fire() {
    setLoading(true);
    setError(null);
    try {
      let resolvedPath = ep.path;
      for (const [k, v] of Object.entries(pathParams)) {
        resolvedPath = resolvedPath.replace(`{${k}}`, encodeURIComponent(v));
      }

      const qs = Object.entries(queryParams)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const baseUrl = captureConfig?.baseUrl ?? window.location.origin;
      const url = `${baseUrl}${resolvedPath}${qs ? `?${qs}` : ''}`;

      const headers = resolveHeaderTokens({
        'Content-Type': 'application/json',
        ...(captureConfig?.headers ?? {}),
      });

      const parsedBody = needsBody && body.trim()
        ? (() => { try { return JSON.parse(body); } catch { return body; } })()
        : undefined;

      const curlCommand = buildCurlCommand(ep.method, url, headers, parsedBody);

      const startMs = performance.now();
      const resp = await fetch(url, {
        method: ep.method,
        headers,
        body: parsedBody !== undefined ? JSON.stringify(parsedBody) : undefined,
      });
      const durationMs = performance.now() - startMs;

      const rawText = await resp.text();
      let responseBody: unknown;
      try { responseBody = rawText ? JSON.parse(rawText) : null; } catch { responseBody = rawText; }

      const responseHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { responseHeaders[k] = v; });

      const capture: CapturedCall = {
        capturedAt: new Date().toISOString(),
        curlCommand,
        status: resp.status,
        statusText: resp.statusText,
        durationMs,
        responseBody,
        responseHeaders,
      };

      onCapture(entry.id, capture, { pathParams, queryParams, body, authToken: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      {pathParams_.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <label className="w-24 shrink-0 font-mono text-gray-500 truncate" title={p.name}>
            {p.name} <span className="text-gray-300">path</span>
          </label>
          <input
            type="text"
            value={pathParams[p.name] ?? ''}
            onChange={(e) => setPathParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
            placeholder={p.schema.default != null ? String(p.schema.default) : p.schema.type}
            className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407]"
          />
        </div>
      ))}

      {queryParams_.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <label className="w-24 shrink-0 font-mono text-gray-500 truncate" title={p.name}>
            {p.name} <span className="text-gray-300">?</span>
          </label>
          {p.schema.enum?.length ? (
            <select
              title={`${p.name} query parameter`}
              value={queryParams[p.name] ?? ''}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
              className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407] bg-white"
            >
              <option value="">— optional —</option>
              {p.schema.enum.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={queryParams[p.name] ?? ''}
              onChange={(e) => setQueryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
              placeholder={p.schema.default != null ? String(p.schema.default) : p.schema.type}
              className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            />
          )}
        </div>
      ))}

      {needsBody && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-500">Body (JSON)</span>
            {ep.requestBodySchema && (
              <button type="button" onClick={() => setBody(buildJsonScaffold(ep.requestBodySchema))} className="text-[#982407] hover:underline text-[10px]">
                reset scaffold
              </button>
            )}
          </div>
          <textarea
            title="Request body JSON"
            placeholder="{}"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full font-mono border border-gray-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-[#982407] text-[11px]"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={fire}
          disabled={loading}
          className="px-3 py-1 bg-[#982407] text-white rounded hover:bg-[#741b05] disabled:opacity-50 transition-colors font-semibold"
        >
          {loading ? 'Capturing…' : 'Capture Live Response'}
        </button>
        {entry.capture && (
          <span className={`font-mono ${entry.capture.status < 400 ? 'text-green-600' : 'text-red-600'}`}>
            {entry.capture.status} · {Math.round(entry.capture.durationMs)}ms
          </span>
        )}
        {error && <span className="text-red-500">{error}</span>}
      </div>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  index,
  total,
  captureConfig,
  onMove,
  onRemove,
  onNoteChange,
  onCapture,
}: {
  entry: DocEntry;
  index: number;
  total: number;
  captureConfig: { baseUrl: string; headers: Record<string, string> } | null;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCapture: (id: string, capture: CapturedCall, params: DocEntry['captureParams']) => void;
}) {
  const [open, setOpen] = useState(true);
  const ep = entry.endpoint;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-px shrink-0">
          <button type="button" disabled={index === 0} onClick={() => onMove(entry.id, -1)}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] leading-none">▲</button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(entry.id, 1)}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] leading-none">▼</button>
        </div>

        <span className="text-xs text-gray-400 font-mono shrink-0 w-5 text-center">{index + 1}</span>

        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${METHOD_COLORS[ep.method] ?? 'bg-gray-100'}`}>
          {ep.method}
        </span>
        <span className="text-xs font-mono text-gray-700 truncate flex-1" title={ep.path}>{ep.path}</span>

        {entry.capture && (
          <span className={`text-[10px] font-mono px-1.5 rounded shrink-0 ${entry.capture.status < 400 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {entry.capture.status}
          </span>
        )}

        <button type="button" onClick={() => setOpen((o) => !o)}
          className="text-gray-400 hover:text-gray-600 text-xs shrink-0 ml-auto">
          {open ? '▾' : '▸'}
        </button>
        <button type="button" onClick={() => onRemove(entry.id)}
          className="text-red-400 hover:text-red-600 text-xs shrink-0" title="Remove from doc">✕</button>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          {ep.summary && ep.summary !== `${ep.method} ${ep.path}` && (
            <p className="text-xs text-gray-600 font-medium">{ep.summary}</p>
          )}

          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">
              Note for the developer (optional — appears above this section in the doc)
            </label>
            <textarea
              value={entry.note}
              onChange={(e) => onNoteChange(entry.id, e.target.value)}
              rows={2}
              placeholder="e.g. Call this endpoint first to get a customer ID before placing an order…"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-[#982407]"
            />
          </div>

          <div className="border-t border-gray-100 pt-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Capture live request & response
            </p>
            <CaptureForm entry={entry} captureConfig={captureConfig} onCapture={onCapture} />
          </div>

          {entry.capture && (
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Captured curl</p>
              <pre className="text-[10px] bg-gray-900 text-green-300 rounded p-2 overflow-x-auto font-mono whitespace-pre-wrap">
                {entry.capture.curlCommand}
              </pre>
              <p className="text-[10px] font-semibold text-gray-500 mt-2 mb-1">Response preview</p>
              <pre className="text-[10px] bg-gray-50 border border-gray-100 rounded p-2 overflow-x-auto font-mono max-h-32 whitespace-pre-wrap">
                {JSON.stringify(entry.capture.responseBody, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function RemoteApiDocScreen() {
  const { profileId } = useParams();
  const { config } = useHarnessConfigStore();
  const remoteStore = useRemoteConfigStore();
  const { mutateAsync: fetchRemoteSpec, isPending, isError, error } = useRemoteOpenApi();

  const [endpoints, setEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  const visibleProfiles = getVisibleRemoteProfiles(remoteStore);
  const decodedProfileId = profileId ? decodeURIComponent(profileId) : '';
  const profile = visibleProfiles.find((item) => item.id === decodedProfileId)
    ?? visibleProfiles[0]
    ?? fallbackProfile(config);
  const remoteBaseUrl = profile?.remoteBaseUrl;
  const remoteOpenApiUrl = profile?.remoteOpenApiUrl;
  const profileLabel = profile ? getRemoteProfileLabel(profile) : 'Remote API';

  useEffect(() => {
    if (!profile || !remoteOpenApiUrl) return;
    fetchRemoteSpec({ profile })
      .then((eps) => { setEndpoints(eps); setLoaded(true); })
      .catch(() => { setLoaded(true); });
  // Only re-fetch when the remote spec URL changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, remoteOpenApiUrl]);

  // Build the capture config from remote settings (credentials injected server-side for spec fetch,
  // but direct browser calls use the headers from config)
  const captureConfig = remoteBaseUrl ? {
    baseUrl: remoteBaseUrl,
    headers: {
      ...(profile?.remoteDefaultHeaders ?? {}),
      ...(profile?.source !== 'server' && profile?.remoteOpenApiApiKeyHeader && profile?.remoteOpenApiApiKeyValue
        ? { [profile.remoteOpenApiApiKeyHeader]: profile.remoteOpenApiApiKeyValue }
        : {}),
      ...(profile?.source !== 'server' && profile?.remoteOpenApiBearerToken
        ? { Authorization: `Bearer ${profile.remoteOpenApiBearerToken}` }
        : {}),
    },
  } : null;

  const [selected, setSelected] = useState<DiscoveredEndpoint | null>(null);
  const [doc, setDoc] = useState<ApiDoc>({
    title: 'Remote API Integration Guide',
    intro: '',
    entries: [],
  });
  const [view, setView] = useState<'builder' | 'preview'>('builder');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  // Seed doc title from remoteBaseUrl once loaded
  const titleInitialised = useRef(false);
  useEffect(() => {
    if (profileLabel && !titleInitialised.current && loaded) {
      titleInitialised.current = true;
      setDoc((d) =>
        d.title === 'Remote API Integration Guide'
          ? { ...d, title: `${profileLabel} Integration Guide` }
          : d
      );
    }
  }, [profileLabel, loaded]);

  const addEndpoint = useCallback((ep: DiscoveredEndpoint) => {
    setDoc((d) => {
      if (d.entries.some((e) => e.endpoint.method === ep.method && e.endpoint.path === ep.path)) return d;
      const newEntry: DocEntry = {
        id: `${ep.method}-${ep.path}-${Date.now()}`,
        endpoint: ep,
        capture: null,
        captureParams: { pathParams: {}, queryParams: {}, body: '', authToken: '' },
        note: '',
      };
      return { ...d, entries: [...d.entries, newEntry] };
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setDoc((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  const moveEntry = useCallback((id: string, dir: -1 | 1) => {
    setDoc((d) => {
      const idx = d.entries.findIndex((e) => e.id === id);
      if (idx < 0) return d;
      const next = idx + dir;
      if (next < 0 || next >= d.entries.length) return d;
      const arr = [...d.entries];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...d, entries: arr };
    });
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setDoc((d) => ({ ...d, entries: d.entries.map((e) => e.id === id ? { ...e, note } : e) }));
  }, []);

  const saveCapture = useCallback((id: string, capture: CapturedCall, params: DocEntry['captureParams']) => {
    setDoc((d) => ({
      ...d,
      entries: d.entries.map((e) => e.id === id ? { ...e, capture, captureParams: params } : e),
    }));
  }, []);

  const markdown = generateMarkdown(doc);

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!remoteBaseUrl && !remoteOpenApiUrl) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded p-4 max-w-lg">
          <p className="text-sm font-semibold text-gray-700">Remote API not configured</p>
          <p className="text-xs text-gray-500 mt-1">
            Add <code>options.RemoteApiProfiles</code> in <code>MapApiTestSpark()</code> or create a browser profile on the Config page.
          </p>
        </div>
      </div>
    );
  }

  if (isPending || !loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#982407] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isReady = !isError && loaded && endpoints.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="px-6 py-3 border-b border-gray-200 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900">{profileLabel} Doc Builder</h1>
          <p className="text-xs text-gray-400">
            {remoteBaseUrl
              ? <span className="font-mono">{remoteBaseUrl}</span>
              : 'Select endpoints → capture live responses → generate markdown'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView('builder')}
            className={`px-3 py-1 rounded text-xs font-medium ${view === 'builder' ? 'bg-[#982407] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Builder
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className={`px-3 py-1 rounded text-xs font-medium ${view === 'preview' ? 'bg-[#982407] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={copyMarkdown}
            className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            {copied ? 'Copied!' : 'Copy MD'}
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="px-3 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700"
          >
            ↓ Download .md
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <div className="px-6 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-xs font-semibold text-yellow-700">Remote OpenAPI fetch failed</p>
            <p className="text-xs text-yellow-600 mt-0.5 font-mono">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {!isError && loaded && endpoints.length === 0 && (
        <div className="p-6 text-sm text-gray-500">
          No endpoints found in the remote OpenAPI document.
        </div>
      )}

      {isReady && (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: endpoint selector ── */}
          <div className="w-68 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Endpoints — click to add to doc
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EndpointList
                endpoints={endpoints}
                selected={selected}
                onSelect={(ep) => {
                  setSelected(ep);
                  addEndpoint(ep);
                }}
              />
            </div>
          </div>

          {/* ── Centre/right: builder or preview ── */}
          <div className="flex-1 overflow-y-auto">

            {view === 'builder' && (
              <div className="p-4 space-y-4 max-w-3xl mx-auto">

                {/* Doc metadata */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Document title</label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#982407]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Introduction (optional)</label>
                    <textarea
                      value={doc.intro}
                      onChange={(e) => setDoc((d) => ({ ...d, intro: e.target.value }))}
                      rows={3}
                      placeholder="Overview of this API for the developer…"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-[#982407]"
                    />
                  </div>
                </div>

                {doc.entries.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-8">
                    Click an endpoint in the left panel to add it to your doc.
                  </div>
                )}

                {doc.entries.map((entry, i) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    index={i}
                    total={doc.entries.length}
                    captureConfig={captureConfig}
                    onMove={moveEntry}
                    onRemove={removeEntry}
                    onNoteChange={updateNote}
                    onCapture={saveCapture}
                  />
                ))}
              </div>
            )}

            {view === 'preview' && (
              <div className="p-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Markdown preview</p>
                </div>
                <textarea
                  ref={previewRef}
                  readOnly
                  value={markdown}
                  className="w-full h-[70vh] font-mono text-xs border border-gray-200 rounded p-3 resize-none focus:outline-none bg-gray-50"
                />
                <div className="mt-3 prose prose-sm max-w-none border border-gray-100 rounded p-4 bg-white text-xs">
                  {renderMarkdown(markdown)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
