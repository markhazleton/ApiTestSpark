import { useState } from 'react';
import { useHarnessConfig } from '../../hooks';
import { useHarnessConfigStore } from '../../store';
import { EndpointList } from './EndpointList';
import { EndpointTester } from './EndpointTester';
import type { DiscoveredEndpoint } from '../../types';

export function HostApiScreen() {
  // Must be called here — this component IS the root consumer of useHarnessConfig
  useHarnessConfig();

  const { endpoints, configStatus, openApiStatus, configError, openApiError } = useHarnessConfigStore();
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
            Check that the host app is running and <code>/api-test-harness/config</code> is accessible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Your App's APIs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Autodiscovered from the host app's OpenAPI v3 document
        </p>
      </div>

      {openApiStatus === 'skipped' && (
        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <p className="text-sm font-semibold text-gray-700">No host API endpoints configured</p>
            <p className="text-xs text-gray-500 mt-1">
              Set <code>options.OpenApiUrl</code> in <code>MapApiTestHarness()</code> to enable endpoint autodiscovery.
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

      {openApiStatus === 'ready' && endpoints.length > 0 && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto">
            <EndpointList
              endpoints={endpoints}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <EndpointTester endpoint={selected} />
            ) : (
              <div className="p-6 text-sm text-gray-400">Select an endpoint to test it.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
