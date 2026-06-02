import { create } from 'zustand';
import type { ApiInfo, HarnessConfig, DiscoveredEndpoint } from '../types';

interface HarnessConfigState {
  config: HarnessConfig | null;
  apiInfo: ApiInfo | null;
  endpoints: DiscoveredEndpoint[];
  configStatus: 'idle' | 'loading' | 'ready' | 'error';
  openApiStatus: 'idle' | 'loading' | 'ready' | 'error' | 'skipped';
  configError: string | null;
  openApiError: string | null;
  jsonViewMode: 'pretty' | 'minified';

  setConfig: (config: HarnessConfig) => void;
  setApiInfo: (info: ApiInfo | null) => void;
  setEndpoints: (endpoints: DiscoveredEndpoint[]) => void;
  setConfigStatus: (status: HarnessConfigState['configStatus']) => void;
  setOpenApiStatus: (status: HarnessConfigState['openApiStatus']) => void;
  setConfigError: (error: string | null) => void;
  setOpenApiError: (error: string | null) => void;
  setJsonViewMode: (mode: 'pretty' | 'minified') => void;
}

// Not persisted — config is always re-fetched fresh on app load.
const useHarnessConfigStore = create<HarnessConfigState>((set) => ({
  config: null,
  apiInfo: null,
  endpoints: [],
  configStatus: 'idle',
  openApiStatus: 'idle',
  configError: null,
  openApiError: null,
  jsonViewMode: 'pretty',

  setConfig: (config) => set({ config }),
  setApiInfo: (apiInfo) => set({ apiInfo }),
  setEndpoints: (endpoints) => set({ endpoints }),
  setConfigStatus: (configStatus) => set({ configStatus }),
  setOpenApiStatus: (openApiStatus) => set({ openApiStatus }),
  setConfigError: (configError) => set({ configError }),
  setOpenApiError: (openApiError) => set({ openApiError }),
  setJsonViewMode: (jsonViewMode) => set({ jsonViewMode }),
}));

export { useHarnessConfigStore };
