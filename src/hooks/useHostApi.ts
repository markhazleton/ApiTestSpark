import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from '../store/debugStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { useRemoteConfigStore } from '../store/remoteConfigStore';
import { HostApiClient } from '../api/hostApiClient';
import { buildDebugCallbacks, withMetric } from './hookUtils';
import { resolveHeaderTokens } from '../utils/session';
import type { HttpMethod } from '../api/client';

export interface HostApiRequest {
  method: HttpMethod;
  path: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  extraHeaders?: Record<string, string>;
}

function buildUrl(baseUrl: string, path: string, pathParams?: Record<string, string>, queryParams?: Record<string, string>): string {
  let resolved = path;
  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(value));
    }
  }
  const url = new URL(resolved, baseUrl);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function useHostApi() {
  const { addRequest, addResponse, addError, addMetric } = useDebugStore();
  const { config } = useHarnessConfigStore();
  // Read remote config live so headers/credentials saved after startup are picked up immediately.
  const remoteStore = useRemoteConfigStore();

  return useMutation({
    mutationFn: async (req: HostApiRequest) => {
      const isRemote = !!(remoteStore.remoteBaseUrl || config?.remoteBaseUrl);
      const baseUrl = isRemote
        ? (remoteStore.remoteBaseUrl || config!.remoteBaseUrl!)
        : (config?.baseUrl ?? window.location.origin);
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);

      // When targeting remote: read headers/auth from remoteStore (always current).
      // When targeting local: use defaultHeaders from the startup config snapshot.
      const baseConfigHeaders = isRemote
        ? remoteStore.remoteDefaultHeaders
        : (config?.defaultHeaders ?? {});

      const remoteAuthHeaders: Record<string, string> = {};
      if (isRemote) {
        if (remoteStore.remoteOpenApiApiKeyHeader && remoteStore.remoteOpenApiApiKeyValue) {
          remoteAuthHeaders[remoteStore.remoteOpenApiApiKeyHeader] = remoteStore.remoteOpenApiApiKeyValue;
        }
        if (remoteStore.remoteOpenApiBearerToken) {
          remoteAuthHeaders['Authorization'] = `Bearer ${remoteStore.remoteOpenApiBearerToken}`;
        }
      }

      const mergedHeaders = resolveHeaderTokens({
        ...baseConfigHeaders,
        ...remoteAuthHeaders,
        ...(req.extraHeaders ?? {}),
      });

      const client = new HostApiClient(baseUrl, { callbacks, extraHeaders: mergedHeaders });
      const url = buildUrl(baseUrl, req.path, req.pathParams, req.queryParams);
      const relPath = url.replace(baseUrl, '');

      return withMetric(`${req.method} ${req.path}`, addMetric, () => {
        switch (req.method) {
          case 'GET':    return client.get(relPath);
          case 'POST':   return client.post(relPath, req.body);
          case 'PUT':    return client.put(relPath, req.body);
          case 'PATCH':  return client.patch(relPath, req.body);
          case 'DELETE': return client.delete(relPath);
          default:       return client.get(relPath);
        }
      });
    },
    onError: (error) => {
      addError({
        id: uuidv4(),
        category: 'API',
        message: error instanceof Error ? error.message : 'Host API request failed',
        timestamp: new Date(),
        context: {},
      });
    },
  });
}
