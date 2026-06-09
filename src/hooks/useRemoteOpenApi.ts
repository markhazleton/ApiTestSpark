import { useMutation } from '@tanstack/react-query';
import useDebugStore from '../store/debugStore';
import { createBrowserRemoteOpenApiCaller, createRemoteOpenApiCaller } from '../api/remoteOpenApiClient';
import { buildDebugCallbacks } from './hookUtils';
import { parseOpenApiV3 } from '../utils/openApiParser';
import type { DiscoveredEndpoint, OpenApiV3Doc, RemoteApiProfile } from '../types';

export function useRemoteOpenApi() {
  const { addRequest, addResponse, addError } = useDebugStore();

  return useMutation<DiscoveredEndpoint[], Error, { profile: RemoteApiProfile }>({
    mutationFn: async ({ profile }) => {
      if (!profile.remoteOpenApiUrl) {
        throw new Error('Remote OpenAPI URL is not configured.');
      }

      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);
      let raw: unknown;
      if (profile.source === 'server' && profile.proxyMode === 'server') {
        const caller = createRemoteOpenApiCaller(callbacks);
        raw = await caller.fetchRemoteSpec(profile.id);
      } else {
        const caller = createBrowserRemoteOpenApiCaller(profile, callbacks);
        raw = await caller.fetchRemoteSpec();
      }

      const doc = raw as OpenApiV3Doc;
      return parseOpenApiV3(doc);
    },
    onError: (err) => {
      addError({
        id: crypto.randomUUID(),
        category: 'Configuration',
        message: err.message,
        timestamp: new Date(),
        context: {},
      });
    },
  });
}
