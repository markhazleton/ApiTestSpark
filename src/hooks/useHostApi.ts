import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from '../store/debugStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { HostApiClient } from '../api/hostApiClient';
import { buildRemoteCallProxyUrl, usesServerRemoteCallProxy } from '../api/remoteCallProxy';
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
  /** Pre-acquired OAuth access token (see useOAuthToken). When the profile has
   * remoteUseOAuthToken set, this takes precedence over remoteOpenApiBearerToken. */
  oauthToken?: string | null;
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
      // The caller chooses the target. Host API requests do not carry a profile and
      // must always use the harness base URL, regardless of configured remotes.
      const remoteProfile = req.remoteProfile;
      const isRemote = remoteProfile !== undefined;
      const directBaseUrl = isRemote
        ? remoteProfile.remoteBaseUrl?.trim()
        : (config?.baseUrl ?? window.location.origin);
      if (!directBaseUrl) {
        throw new Error('Remote API base URL is not configured.');
      }
      const directUrl = buildUrl(directBaseUrl, req.path, req.pathParams, req.queryParams);
      const requestUrl = isRemote && usesServerRemoteCallProxy(remoteProfile)
        ? buildRemoteCallProxyUrl(remoteProfile.id, directUrl)
        : directUrl;
      const targetUrl = new URL(requestUrl);
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);

      // Remote requests use only the profile passed by the remote explorer.
      // Host requests use only defaultHeaders from the harness config snapshot.
      const baseConfigHeaders = isRemote
        ? (remoteProfile?.remoteDefaultHeaders ?? {})
        : (config?.defaultHeaders ?? {});

      const remoteAuthHeaders: Record<string, string> = {};
      if (isRemote && remoteProfile?.source !== 'server') {
        if (remoteProfile?.remoteOpenApiApiKeyHeader && remoteProfile.remoteOpenApiApiKeyValue) {
          remoteAuthHeaders[remoteProfile.remoteOpenApiApiKeyHeader] = remoteProfile.remoteOpenApiApiKeyValue;
        }
        // OAuth-derived token (when the profile opts in) takes precedence over a
        // manually entered static Bearer Token — FR-008/FR-011.
        if (remoteProfile?.remoteUseOAuthToken && req.oauthToken) {
          remoteAuthHeaders.Authorization = `Bearer ${req.oauthToken}`;
        } else if (remoteProfile?.remoteOpenApiBearerToken) {
          remoteAuthHeaders.Authorization = `Bearer ${remoteProfile.remoteOpenApiBearerToken}`;
        }
      }

      const mergedHeaders = resolveHeaderTokens({
        ...baseConfigHeaders,
        ...remoteAuthHeaders,
        ...(req.extraHeaders ?? {}),
      });

      const client = new HostApiClient(targetUrl.origin, { callbacks, extraHeaders: mergedHeaders });
      const relPath = `${targetUrl.pathname}${targetUrl.search}`;

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
