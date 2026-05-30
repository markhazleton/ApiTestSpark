import { create } from 'zustand';
import type { HarnessConfig, DiscoveredEndpoint } from '../types';

interface HarnessConfigState {
  config: HarnessConfig | null;
  endpoints: DiscoveredEndpoint[];
  configStatus: 'idle' | 'loading' | 'ready' | 'error';
  openApiStatus: 'idle' | 'loading' | 'ready' | 'error' | 'skipped';
  configError: string | null;
  openApiError: string | null;

  setConfig: (config: HarnessConfig) => void;
  setEndpoints: (endpoints: DiscoveredEndpoint[]) => void;
  setConfigStatus: (status: HarnessConfigState['configStatus']) => void;
  setOpenApiStatus: (status: HarnessConfigState['openApiStatus']) => void;
  setConfigError: (error: string | null) => void;
  setOpenApiError: (error: string | null) => void;
}

// Not persisted — config is always re-fetched fresh on app load.
const useHarnessConfigStore = create<HarnessConfigState>((set) => ({
  config: null,
  endpoints: [],
  configStatus: 'idle',
  openApiStatus: 'idle',
  configError: null,
  openApiError: null,

  setConfig: (config) => set({ config }),
  setEndpoints: (endpoints) => set({ endpoints }),
  setConfigStatus: (configStatus) => set({ configStatus }),
  setOpenApiStatus: (openApiStatus) => set({ openApiStatus }),
  setConfigError: (configError) => set({ configError }),
  setOpenApiError: (openApiError) => set({ openApiError }),
}));

export { useHarnessConfigStore };
