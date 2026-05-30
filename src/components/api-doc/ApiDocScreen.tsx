import { useState, useCallback, useRef, useEffect } from 'react';
import { useHarnessConfig } from '../../hooks';
import { useHarnessConfigStore } from '../../store';
import { EndpointList } from '../host-api/EndpointList';
import { buildCurlCommand, generateMarkdown } from '../../utils/generateMarkdown';
import { buildJsonScaffold } from '../../utils/openApiParser';
import { renderMarkdown } from '../../utils/renderMarkdown';
import type { DiscoveredEndpoint, DocEntry, CapturedCall, ApiDoc } from '../../types';

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-blue-100 text-blue-800',
  POST:   'bg-green-100 text-green-800',
  PUT:    'bg-yellow-100 text-yellow-800',
  PATCH:  'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

// ── Capture form for a single entry ──────────────────────────────────────────

function CaptureForm({
  entry,
  config,
  onCapture,
}: {
  entry: DocEntry;
  config: { baseUrl: string; defaultHeaders: Record<string, string>; authScheme: string | null } | null;
  onCapture: (id: string, capture: CapturedCall, params: DocEntry['captureParams']) => void;
}) {
  const ep = entry.endpoint;
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(ep.method);

  const [pathParams, setPathParams] = useState<Record<string, string>>(entry.captureParams.pathParams);
  const [queryParams, setQueryParams] = useState<Record<string, string>>(entry.captureParams.queryParams);
  const [body, setBody] = useState(entry.captureParams.body || (needsBody ? buildJsonScaffold(ep.requestBodySchema) : ''));
  const [authToken, setAuthToken] = useState(entry.captureParams.authToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathParams_ = ep.parameters.filter((p) => p.in === 'path');
  const queryParams_ = ep.parameters.filter((p) => p.in === 'query');

  async function fire() {
    setLoading(true);
    setError(null);
    try {
      // Build resolved path
      let resolvedPath = ep.path;
      for (const [k, v] of Object.entries(pathParams)) {
        resolvedPath = resolvedPath.replace(`{${k}}`, encodeURIComponent(v));
      }

      // Build query string
      const qs = Object.entries(queryParams)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const baseUrl = config?.baseUrl ?? window.location.origin;
      const url = `${baseUrl}${resolvedPath}${qs ? `?${qs}` : ''}`;

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config?.defaultHeaders ?? {}),
      };
      if (authToken && config?.authScheme) {
        headers['Authorization'] = `${config.authScheme} ${authToken}`;
      }

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

      onCapture(entry.id, capture, { pathParams, queryParams, body, authToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      {/* Path params */}
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
            className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      ))}

      {/* Query params */}
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
              className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
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
              className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
        </div>
      ))}

      {/* Auth token */}
      {config?.authScheme && (
        <div className="flex items-center gap-2">
          <label className="w-24 shrink-0 font-mono text-gray-500">{config.authScheme}</label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="token…"
            className="flex-1 font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}

      {/* Body */}
      {needsBody && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-500">Body (JSON)</span>
            {ep.requestBodySchema && (
              <button type="button" onClick={() => setBody(buildJsonScaffold(ep.requestBodySchema))} className="text-blue-500 hover:underline text-[10px]">
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
            className="w-full font-mono border border-gray-200 rounded px-2 py-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400 text-[11px]"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={fire}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
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

// ── Entry card in the doc builder ────────────────────────────────────────────

function EntryCard({
  entry,
  index,
  total,
  config,
  onMove,
  onRemove,
  onNoteChange,
  onCapture,
}: {
  entry: DocEntry;
  index: number;
  total: number;
  config: { baseUrl: string; defaultHeaders: Record<string, string>; authScheme: string | null } | null;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCapture: (id: string, capture: CapturedCall, params: DocEntry['captureParams']) => void;
}) {
  const [open, setOpen] = useState(true);
  const ep = entry.endpoint;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        {/* Reorder buttons */}
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
          {/* Summary */}
          {ep.summary && ep.summary !== `${ep.method} ${ep.path}` && (
            <p className="text-xs text-gray-600 font-medium">{ep.summary}</p>
          )}

          {/* Author note */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">
              Note for the developer (optional — appears above this section in the doc)
            </label>
            <textarea
              value={entry.note}
              onChange={(e) => onNoteChange(entry.id, e.target.value)}
              rows={2}
              placeholder="e.g. Call this endpoint first to get a customer ID before placing an order…"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Capture form */}
          <div className="border-t border-gray-100 pt-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Capture live request & response
            </p>
            <CaptureForm entry={entry} config={config} onCapture={onCapture} />
          </div>

          {/* Captured curl preview */}
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

export function ApiDocScreen() {
  useHarnessConfig();

  const { apiInfo, endpoints, configStatus, openApiStatus, config } = useHarnessConfigStore();

  const [selected, setSelected] = useState<DiscoveredEndpoint | null>(null);
  const [doc, setDoc] = useState<ApiDoc>({
    title: apiInfo?.title ? `${apiInfo.title} Integration Guide` : 'API Integration Guide',
    intro: '',
    entries: [],
  });
  const [view, setView] = useState<'builder' | 'preview'>('builder');
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLTextAreaElement>(null);

  // Sync title once apiInfo loads (effect — not during render)
  const titleInitialised = useRef(false);
  useEffect(() => {
    if (apiInfo?.title && !titleInitialised.current) {
      titleInitialised.current = true;
      setDoc((d) =>
        d.title === 'API Integration Guide'
          ? { ...d, title: `${apiInfo.title} Integration Guide` }
          : d
      );
    }
  }, [apiInfo?.title]);

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

  const isLoading = configStatus === 'idle' || configStatus === 'loading' || openApiStatus === 'loading';
  const isReady = openApiStatus === 'ready' && endpoints.length > 0;

  const captureConfig = config ? {
    baseUrl: config.baseUrl,
    defaultHeaders: config.defaultHeaders,
    authScheme: config.authScheme,
  } : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="px-6 py-3 border-b border-gray-200 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900">API Doc Builder</h1>
          <p className="text-xs text-gray-400">
            Select endpoints → capture live responses → generate markdown for your front-end developer agent
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setView('builder')}
            className={`px-3 py-1 rounded text-xs font-medium ${view === 'builder' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Builder
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className={`px-3 py-1 rounded text-xs font-medium ${view === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && openApiStatus === 'skipped' && (
        <div className="p-6 text-sm text-gray-500">
          No OpenAPI document configured. Set <code>options.OpenApiUrl</code> in <code>MapApiTestSpark()</code> to enable endpoint discovery.
        </div>
      )}

      {!isLoading && isReady && (
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
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Document title</label>
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
                      placeholder="API Integration Guide"
                      className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      Overview / introduction
                      <span className="font-normal text-gray-400 ml-1">(markdown supported)</span>
                    </label>
                    <textarea
                      value={doc.intro}
                      onChange={(e) => setDoc((d) => ({ ...d, intro: e.target.value }))}
                      rows={4}
                      placeholder="Describe the API, authentication requirements, base URL, and any key concepts a front-end developer needs to know before integrating..."
                      className="w-full text-xs border border-gray-200 rounded px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                </div>

                {/* Entries */}
                {doc.entries.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-400">
                      Click endpoints in the left panel to add them to your document.
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Endpoints are added in order — use ▲ ▼ to reorder them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">
                        {doc.entries.length} endpoint{doc.entries.length !== 1 ? 's' : ''} in document
                        <span className="ml-2 text-gray-300">
                          {doc.entries.filter((e) => e.capture).length} captured
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setDoc((d) => ({ ...d, entries: [] }))}
                        className="text-[10px] text-red-400 hover:text-red-600 underline"
                      >
                        clear all
                      </button>
                    </div>
                    {doc.entries.map((entry, i) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        index={i}
                        total={doc.entries.length}
                        config={captureConfig}
                        onMove={moveEntry}
                        onRemove={removeEntry}
                        onNoteChange={updateNote}
                        onCapture={saveCapture}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'preview' && (
              <div className="flex flex-col h-full">
                {/* Rendered preview */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-100 shadow-sm p-6">
                    <div className="prose prose-sm max-w-none text-xs space-y-2">
                      {renderMarkdown(markdown)}
                    </div>
                  </div>
                </div>
                {/* Raw markdown textarea */}
                <div className="border-t border-gray-200 shrink-0">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Raw markdown</p>
                    <button type="button" onClick={copyMarkdown} className="text-xs text-blue-500 hover:underline">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    ref={previewRef}
                    readOnly
                    title="Generated markdown output"
                    value={markdown}
                    rows={12}
                    className="w-full font-mono text-[10px] border-0 px-4 py-3 bg-gray-900 text-green-300 resize-none focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
