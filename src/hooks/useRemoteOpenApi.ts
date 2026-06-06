import { useMutation } from '@tanstack/react-query';
import useDebugStore from '../store/debugStore';
import { createRemoteOpenApiCaller } from '../api/remoteOpenApiClient';
import { buildDebugCallbacks } from './hookUtils';
import { parseOpenApiV3 } from '../utils/openApiParser';
import type { DiscoveredEndpoint, OpenApiV3Doc } from '../types';

export function useRemoteOpenApi() {
  const { addRequest, addResponse, addError } = useDebugStore();

  return useMutation<DiscoveredEndpoint[], Error>({
    mutationFn: async () => {
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);
      const caller = createRemoteOpenApiCaller(callbacks);
      const raw = await caller.fetchRemoteSpec();
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
