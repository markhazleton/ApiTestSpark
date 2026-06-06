import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RemoteConfig {
  remoteBaseUrl: string;
  remoteOpenApiUrl: string;
  remoteOpenApiApiKeyHeader: string;
  remoteOpenApiApiKeyValue: string;
  remoteOpenApiBearerToken: string;
  remoteDefaultHeaders: Record<string, string>;
}

interface RemoteConfigStore extends RemoteConfig {
  set: (patch: Partial<RemoteConfig>) => void;
  clear: () => void;
}

const EMPTY: RemoteConfig = {
  remoteBaseUrl: '',
  remoteOpenApiUrl: '',
  remoteOpenApiApiKeyHeader: '',
  remoteOpenApiApiKeyValue: '',
  remoteOpenApiBearerToken: '',
  remoteDefaultHeaders: {},
};

export const useRemoteConfigStore = create<RemoteConfigStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      clear: () => set(EMPTY),
    }),
    {
      name: 'api-test-spark-remote-config',
      version: 1,
    },
  ),
);
