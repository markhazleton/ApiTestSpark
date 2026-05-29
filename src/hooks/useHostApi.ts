import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from '../store/debugStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { HostApiClient } from '../api/hostApiClient';
import { buildDebugCallbacks, withMetric } from './hookUtils';
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

  return useMutation({
    mutationFn: async (req: HostApiRequest) => {
      const baseUrl = config?.baseUrl ?? window.location.origin;
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);

      // Merge defaultHeaders from config into extraHeaders
      const mergedHeaders: Record<string, string> = {
        ...(config?.defaultHeaders ?? {}),
        ...(req.extraHeaders ?? {}),
      };

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
