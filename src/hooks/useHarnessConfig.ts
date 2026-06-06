/**
 * useHarnessConfig — fetch harness config + OpenAPI endpoints on app startup.
 * MUST be called at app root level (e.g. in App.tsx or a top-level provider),
 * NOT inside lazy-loaded route components, to ensure it runs exactly once per session.
 *
 * If the OpenAPI document requires authentication, it must be publicly accessible
 * or credentials must be embedded in the openApiUrl (e.g. via query string).
 * defaultHeaders are NOT sent on the OpenAPI fetch — only on host endpoint requests.
 */
import { useQuery } from '@tanstack/react-query';
import useDebugStore from '../store/debugStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { useRemoteConfigStore } from '../store/remoteConfigStore';
import { HostApiClient } from '../api/hostApiClient';
import { buildDebugCallbacks } from './hookUtils';
import { parseOpenApiV3, parseApiInfo } from '../utils/openApiParser';
import type { OpenApiV3Doc } from '../types';

const HARNESS_CONFIG_QUERY_KEY = ['harness-config'] as const;
const FETCH_TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, signal: AbortSignal): Promise<Response> {
  const timeoutId = setTimeout(() => {
    // AbortController.abort() already handled by caller's timeout logic
  }, FETCH_TIMEOUT_MS);
  return fetch(url, { signal }).finally(() => clearTimeout(timeoutId));
}

export function useHarnessConfig() {
  const { addRequest, addResponse, addError } = useDebugStore();
  const {
    setConfig,
    setApiInfo,
    setEndpoints,
    setConfigStatus,
    setOpenApiStatus,
    setConfigError,
    setOpenApiError,
  } = useHarnessConfigStore();
  return useQuery({
    queryKey: HARNESS_CONFIG_QUERY_KEY,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      setConfigStatus('loading');

      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);
      const client = new HostApiClient(window.location.origin, { callbacks });

      // Fetch config with 5s timeout
      const configController = new AbortController();
      const configTimeout = setTimeout(() => configController.abort(), FETCH_TIMEOUT_MS);
      let config;
      try {
        config = await client.fetchConfig();
        clearTimeout(configTimeout);
      } catch (err) {
        clearTimeout(configTimeout);
        const msg = err instanceof Error ? err.message : 'Config fetch failed';
        setConfigError(msg);
        setConfigStatus('error');
        setOpenApiStatus('skipped');
        throw err;
      }

      setConfigStatus('ready');

      // Seed remoteConfigStore from Program.cs values — browser-persisted value always wins.
      // Then merge browser config on top of server config before storing in harnessConfigStore.
      // Must run inside queryFn (not onSuccess — removed in TanStack Query v5).
      {
        const remote = useRemoteConfigStore.getState();

        // Only seed fields that the user hasn't already set in the browser
        const patch: Partial<typeof remote> = {};
        if (config.remoteBaseUrl && !remote.remoteBaseUrl)
          patch.remoteBaseUrl = config.remoteBaseUrl;
        if (config.remoteOpenApiUrl && !remote.remoteOpenApiUrl)
          patch.remoteOpenApiUrl = config.remoteOpenApiUrl;
        if (config.remoteOpenApiApiKeyHeader && !remote.remoteOpenApiApiKeyHeader)
          patch.remoteOpenApiApiKeyHeader = config.remoteOpenApiApiKeyHeader;
        if (config.remoteOpenApiApiKeyValue && !remote.remoteOpenApiApiKeyValue)
          patch.remoteOpenApiApiKeyValue = config.remoteOpenApiApiKeyValue;
        if (config.remoteOpenApiBearerToken && !remote.remoteOpenApiBearerToken)
          patch.remoteOpenApiBearerToken = config.remoteOpenApiBearerToken;
        if (config.remoteDefaultHeaders && Object.keys(config.remoteDefaultHeaders).length > 0
            && Object.keys(remote.remoteDefaultHeaders).length === 0)
          patch.remoteDefaultHeaders = config.remoteDefaultHeaders;
        if (Object.keys(patch).length > 0) remote.set(patch);

        // Re-read after seeding so merged state reflects any patch applied above
        const r = useRemoteConfigStore.getState();
        setConfig({
          ...config,
          remoteBaseUrl:              r.remoteBaseUrl              || config.remoteBaseUrl,
          remoteOpenApiUrl:           r.remoteOpenApiUrl           || config.remoteOpenApiUrl,
          remoteOpenApiApiKeyHeader:  r.remoteOpenApiApiKeyHeader  || config.remoteOpenApiApiKeyHeader,
          remoteOpenApiApiKeyValue:   r.remoteOpenApiApiKeyValue   || config.remoteOpenApiApiKeyValue,
          remoteOpenApiBearerToken:   r.remoteOpenApiBearerToken   || config.remoteOpenApiBearerToken,
          remoteDefaultHeaders:       Object.keys(r.remoteDefaultHeaders).length > 0
            ? r.remoteDefaultHeaders
            : (config.remoteDefaultHeaders ?? {}),
        });
      }

      // Skip OpenAPI fetch if no URL configured
      if (!config.openApiUrl) {
        setOpenApiStatus('skipped');
        return config;
      }

      // Fetch OpenAPI document with 5s timeout — no defaultHeaders on this fetch
      setOpenApiStatus('loading');
      const openApiController = new AbortController();
      const openApiTimeout = setTimeout(() => openApiController.abort(), FETCH_TIMEOUT_MS);
      try {
        const resp = await fetchWithTimeout(config.openApiUrl, openApiController.signal);
        clearTimeout(openApiTimeout);
        if (!resp.ok) {
          throw new Error(`OpenAPI fetch failed: ${resp.status} ${resp.statusText}`);
        }
        const doc = await resp.json() as OpenApiV3Doc;
        const endpoints = parseOpenApiV3(doc);
        setApiInfo(parseApiInfo(doc));

        if (!doc.paths || Object.keys(doc.paths).length === 0) {
          addError({
            id: crypto.randomUUID(),
            category: 'API',
            message: `OpenAPI document at ${config.openApiUrl} has no paths defined`,
            timestamp: new Date(),
            context: { url: config.openApiUrl },
          });
        }

        setEndpoints(endpoints);
        setOpenApiStatus('ready');
      } catch (err) {
        clearTimeout(openApiTimeout);
        const msg = err instanceof Error ? err.message : 'OpenAPI fetch failed';
        setOpenApiError(msg);
        setOpenApiStatus('error');
        // Graceful degradation — don't rethrow; config was successful
        addError({
          id: crypto.randomUUID(),
          category: 'Network',
          message: msg,
          timestamp: new Date(),
          context: { url: config.openApiUrl },
        });
      }

      return config;
    },
  });
}
