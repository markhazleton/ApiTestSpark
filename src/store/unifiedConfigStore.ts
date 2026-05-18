/**
 * Unified Config Store
 * 
 * Single API endpoint configuration per environment (localhost, test, other).
 * Persisted to localStorage via Zustand persist middleware.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiConfigSet, UnifiedConfigState, Environment } from '../types/state';
import { createDefaultConfig } from './migrations/configMigration';

const STORAGE_KEY = 'api-test-harness-config';

function validateConfigStatus(config: ApiConfigSet): 'complete' | 'incomplete' | 'stale' {
  const hasBaseUrl = !!config.baseUrl?.trim();
  const hasApiKey = !!config.apiKey?.trim();
  const hasValidUrl = hasBaseUrl && /^https?:\/\/.+/.test(config.baseUrl);

  if (!hasBaseUrl || !hasValidUrl) {
    return 'incomplete';
  }

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  if (config.lastUpdatedAt > 0 && config.lastUpdatedAt < thirtyDaysAgo) {
    return 'stale';
  }

  return hasApiKey ? 'complete' : 'incomplete';
}

interface UnifiedConfigStoreState extends UnifiedConfigState {
  setCurrentEnvironment: (env: Environment) => void;
  updateApiConfig: (environment: Environment, updates: Partial<ApiConfigSet>) => void;
  getApiConfig: (environment?: Environment) => ApiConfigSet;
  isComplete: () => boolean;
  reset: () => void;
}

export const useUnifiedConfigStore = create<UnifiedConfigStoreState>()(
  persist(
    (set, get) => ({
      ...createDefaultConfig(),

      setCurrentEnvironment: (env) => set({ currentEnvironment: env }),

      updateApiConfig: (environment, updates) => {
        set((state) => {
          const current = state.api[environment];
          const updated: ApiConfigSet = {
            ...current,
            ...updates,
            lastUpdatedAt: Date.now(),
          };
          updated.status = validateConfigStatus(updated);
          return {
            api: {
              ...state.api,
              [environment]: updated,
            },
          };
        });
      },

      getApiConfig: (environment) => {
        const env = environment ?? get().currentEnvironment;
        return get().api[env];
      },

      isComplete: () => {
        const config = get().getApiConfig();
        return config.status === 'complete';
      },

      reset: () => set(createDefaultConfig()),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
    }
  )
);

export default useUnifiedConfigStore;