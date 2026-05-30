import { useState } from 'react';
import { useHarnessConfig } from '../../hooks';
import { useHarnessConfigStore } from '../../store';
import { EndpointList } from './EndpointList';
import { EndpointTester } from './EndpointTester';
import type { DiscoveredEndpoint } from '../../types';

export function HostApiScreen() {
  // Must be called here — this component IS the root consumer of useHarnessConfig
  useHarnessConfig();

  const { apiInfo, endpoints, configStatus, openApiStatus, configError, openApiError } =
    useHarnessConfigStore();
  const [selected, setSelected] = useState<DiscoveredEndpoint | null>(null);

  if (configStatus === 'loading' || configStatus === 'idle') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (configStatus === 'error') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm font-semibold text-red-700">Failed to load harness configuration</p>
          <p className="text-xs text-red-600 mt-1 font-mono">{configError}</p>
          <p className="text-xs text-gray-500 mt-2">
            Check that the host app is running and <code>/api-test-spark/config</code> is accessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header: API info from OpenAPI info block ── */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-lg font-semibold text-gray-900">
            {apiInfo?.title ?? "Your App's APIs"}
          </h1>
          {apiInfo?.version && (
            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {apiInfo.version}
            </span>
          )}
          {endpoints.length > 0 && (
            <span className="text-xs text-gray-400">
              {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {apiInfo?.description && !apiInfo.description.includes('##') && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{apiInfo.description}</p>
        )}
        {!apiInfo && (
          <p className="text-xs text-gray-400 mt-0.5">Autodiscovered from the host app's OpenAPI v3 document</p>
        )}
        {apiInfo?.contactName && (
          <p className="text-xs text-gray-400 mt-0.5">
            Contact:{' '}
            {apiInfo.contactUrl
              ? <a href={apiInfo.contactUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{apiInfo.contactName}</a>
              : apiInfo.contactName}
          </p>
        )}
      </div>

      {/* ── Status banners ── */}
      {openApiStatus === 'skipped' && (
        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <p className="text-sm font-semibold text-gray-700">No host API endpoints configured</p>
            <p className="text-xs text-gray-500 mt-1">
              Set <code>options.OpenApiUrl</code> in <code>MapApiTestSpark()</code> to enable endpoint autodiscovery.
              See the <a href="/how-to-use" className="text-blue-600 underline">how-to-use guide</a> for setup instructions.
            </p>
          </div>
        </div>
      )}

      {openApiStatus === 'error' && (
        <div className="px-6 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-xs font-semibold text-yellow-700">OpenAPI fetch failed</p>
            <p className="text-xs text-yellow-600 mt-0.5 font-mono">{openApiError}</p>
          </div>
        </div>
      )}

      {openApiStatus === 'loading' && (
        <div className="px-6 py-3 text-xs text-gray-500">Loading OpenAPI document…</div>
      )}

      {openApiStatus === 'ready' && endpoints.length === 0 && (
        <div className="px-6 py-4 text-sm text-gray-500">
          OpenAPI document loaded but no endpoints were found.
        </div>
      )}

      {/* ── Two-pane layout ── */}
      {openApiStatus === 'ready' && endpoints.length > 0 && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto flex flex-col">
            <EndpointList
              endpoints={endpoints}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <EndpointTester key={`${selected.method}-${selected.path}`} endpoint={selected} />
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">Select an endpoint from the list to test it.</p>
                {apiInfo?.description && (
                  <div className="mt-4 text-left max-w-lg mx-auto bg-gray-50 border border-gray-100 rounded p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">About this API</p>
                    <div className="text-xs text-gray-500 leading-relaxed space-y-1">
                      {apiInfo.description.split('\n').filter(Boolean).slice(0, 12).map((line, i) => {
                        const html = line
                          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-700 px-0.5 rounded font-mono">$1</code>');
                        return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
