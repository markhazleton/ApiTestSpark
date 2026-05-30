import { useState } from 'react';
import type { DiscoveredEndpoint } from '../../types';
import { useHostApi } from '../../hooks';
import { useHarnessConfigStore } from '../../store';

interface EndpointTesterProps {
  endpoint: DiscoveredEndpoint;
}

export function EndpointTester({ endpoint }: EndpointTesterProps) {
  const { config } = useHarnessConfigStore();
  const { mutate, isPending, data, error } = useHostApi();

  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState('');
  const [authToken, setAuthToken] = useState('');

  const pathParamNames = endpoint.parameters.filter((p) => p.in === 'path');
  const queryParamList = endpoint.parameters.filter((p) => p.in === 'query');
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);

  function handleFire() {
    const extraHeaders: Record<string, string> = {};
    if (authToken && config?.authScheme) {
      extraHeaders['Authorization'] = `${config.authScheme} ${authToken}`;
    }
    let body: unknown;
    if (needsBody && bodyText.trim()) {
      try { body = JSON.parse(bodyText); } catch { body = bodyText; }
    }
    mutate({ method: endpoint.method, path: endpoint.path, pathParams, queryParams, body, extraHeaders });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
          {endpoint.method}
        </span>
        <span className="text-sm font-mono text-gray-700">{endpoint.path}</span>
      </div>
      {endpoint.summary && (
        <p className="text-sm text-gray-600">{endpoint.summary}</p>
      )}

      {/* Default headers from config — read-only badges */}
      {config?.defaultHeaders && Object.keys(config.defaultHeaders).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Default headers (from config)</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(config.defaultHeaders).map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                {k}: {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Auth token input */}
      {config?.authScheme && (
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            {config.authScheme} token
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Enter token..."
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}

      {/* Path params */}
      {pathParamNames.map((p) => (
        <div key={p.name}>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            {p.name} <span className="text-red-400">*</span> (path)
          </label>
          <input
            type="text"
            value={pathParams[p.name] ?? ''}
            onChange={(e) => setPathParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
            placeholder={p.schema.type}
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1"
          />
        </div>
      ))}

      {/* Query params */}
      {queryParamList.map((p) => (
        <div key={p.name}>
          <label className="text-xs font-semibold text-gray-500 block mb-1">
            {p.name} {p.required && <span className="text-red-400">*</span>} (query)
          </label>
          <input
            type="text"
            value={queryParams[p.name] ?? ''}
            onChange={(e) => setQueryParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
            placeholder={p.schema.type}
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1"
          />
        </div>
      ))}

      {/* Request body */}
      {needsBody && (
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Request body (JSON)</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={4}
            placeholder="{}"
            className="w-full text-xs font-mono border border-gray-200 rounded px-2 py-1 resize-y"
          />
        </div>
      )}

      <button
        onClick={handleFire}
        disabled={isPending}
        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Sending…' : 'Send Request'}
      </button>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2 font-mono">
          {error instanceof Error ? error.message : 'Request failed'}
        </div>
      )}

      {data !== undefined && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Response (see debug panel)</p>
          <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-48 font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
