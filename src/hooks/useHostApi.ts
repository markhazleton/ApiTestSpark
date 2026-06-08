import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from '../store/debugStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { useRemoteConfigStore } from '../store/remoteConfigStore';
import { HostApiClient } from '../api/hostApiClient';
import { buildDebugCallbacks, withMetric } from './hookUtils';
import { resolveHeaderTokens } from '../utils/session';
import type { HttpMethod } from '../api/client';
import type { RemoteApiProfile } from '../types';

export interface HostApiRequest {
  method: HttpMethod;
  path: string;
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
  extraHeaders?: Record<string, string>;
  remoteProfile?: RemoteApiProfile;
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
  const remoteStore = useRemoteConfigStore();

  return useMutation({
    mutationFn: async (req: HostApiRequest) => {
      const visibleProfiles = [
        ...remoteStore.serverProfiles.filter((profile) => !remoteStore.hiddenServerProfileIds.includes(profile.id)),
        ...remoteStore.profiles,
      ];
      const remoteProfile = req.remoteProfile
        ?? visibleProfiles.find((profile) => profile.id === remoteStore.selectedProfileId)
        ?? visibleProfiles[0];
      const isRemote = !!remoteProfile?.remoteBaseUrl || !!config?.remoteBaseUrl;
      const baseUrl = isRemote
        ? (remoteProfile?.remoteBaseUrl || config!.remoteBaseUrl!)
        : (config?.baseUrl ?? window.location.origin);
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);

      // When targeting remote: read headers/auth from remoteStore (always current).
      // When targeting local: use defaultHeaders from the startup config snapshot.
      const baseConfigHeaders = isRemote
        ? (remoteProfile?.remoteDefaultHeaders ?? {})
        : (config?.defaultHeaders ?? {});

      const remoteAuthHeaders: Record<string, string> = {};
      if (isRemote && remoteProfile?.source !== 'server') {
        if (remoteProfile?.remoteOpenApiApiKeyHeader && remoteProfile.remoteOpenApiApiKeyValue) {
          remoteAuthHeaders[remoteProfile.remoteOpenApiApiKeyHeader] = remoteProfile.remoteOpenApiApiKeyValue;
        }
        if (remoteProfile?.remoteOpenApiBearerToken) {
          remoteAuthHeaders.Authorization = `Bearer ${remoteProfile.remoteOpenApiBearerToken}`;
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
