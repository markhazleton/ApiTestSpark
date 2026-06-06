/**
 * Unified Config Store
 *
 * Per-section, per-environment API configuration.
 * Each section (jokeapi, jsonplaceholder, …) has its own base URL and API key
 * for each environment (localhost, test, other).
 * Persisted to localStorage via Zustand persist middleware.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApiConfigSet,
  UnifiedConfigState,
  Environment,
} from "../types/state";
import { createDefaultConfig } from "./migrations/configMigration";

const STORAGE_KEY = "api-test-spark-config";

function validateConfigStatus(
  config: ApiConfigSet,
): "complete" | "incomplete" | "stale" {
  const hasBaseUrl = !!config.baseUrl?.trim();
  const hasApiKey = !!config.apiKey?.trim();
  const hasValidUrl = hasBaseUrl && /^https?:\/\/.+/.test(config.baseUrl);

  if (!hasBaseUrl || !hasValidUrl) return "incomplete";

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (config.lastUpdatedAt > 0 && config.lastUpdatedAt < thirtyDaysAgo)
    return "stale";

  return hasApiKey ? "complete" : "incomplete";
}

interface UnifiedConfigStoreState extends UnifiedConfigState {
  setCurrentEnvironment: (env: Environment) => void;
  getSectionConfig: (
    sectionKey: string,
    environment?: Environment,
  ) => ApiConfigSet;
  updateSectionConfig: (
    sectionKey: string,
    environment: Environment,
    updates: Partial<ApiConfigSet>,
  ) => void;
  /** @deprecated Use getSectionConfig('jokeapi') — kept for backward compat. */
  getApiConfig: (environment?: Environment) => ApiConfigSet;
  isComplete: () => boolean;
  reset: () => void;
  setRemoteBaseUrl: (env: Environment, url: string | undefined) => void;
  setRemoteDefaultHeaders: (env: Environment, headers: Record<string, string>) => void;
  setRemoteOpenApiUrl: (env: Environment, url: string | undefined) => void;
  setRemoteOpenApiApiKeyHeader: (env: Environment, header: string | undefined) => void;
  setRemoteOpenApiApiKeyValue: (env: Environment, value: string | undefined) => void;
  setRemoteOpenApiBearerToken: (env: Environment, token: string | undefined) => void;
  /** Sets all remote fields to undefined — makes them re-seed-eligible on next load. */
  clearRemoteOpenApiConfig: (env: Environment) => void;
}

export const useUnifiedConfigStore = create<UnifiedConfigStoreState>()(
  persist(
    (set, get) => ({
      ...createDefaultConfig(),

      setCurrentEnvironment: (env) => set({ currentEnvironment: env }),

      getSectionConfig: (sectionKey, environment) => {
        const env = environment ?? get().currentEnvironment;
        const section = get().sections[sectionKey];
        if (!section) {
          const first = Object.values(get().sections)[0];
          return (
            first?.[env] ?? {
              baseUrl: "",
              apiKey: "",
              lastUpdatedAt: 0,
              status: "incomplete",
            }
          );
        }
        return section[env];
      },

      updateSectionConfig: (sectionKey, environment, updates) => {
        set((state) => {
          const section = state.sections[sectionKey];
          if (!section) return state;
          const current = section[environment];
          const updated: ApiConfigSet = {
            ...current,
            ...updates,
            lastUpdatedAt: Date.now(),
          };
          updated.status = validateConfigStatus(updated);
          return {
            sections: {
              ...state.sections,
              [sectionKey]: { ...section, [environment]: updated },
            },
          };
        });
      },

      getApiConfig: (environment) =>
        get().getSectionConfig("jokeapi", environment),

      isComplete: () => {
        const env = get().currentEnvironment;
        return Object.values(get().sections).some(
          (s) => s[env].status === "complete",
        );
      },

      reset: () => set(createDefaultConfig()),

      setRemoteBaseUrl: (env, url) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: { ...envConfigs[env], remoteBaseUrl: url || undefined },
            };
          }
          return { sections: updated };
        });
      },

      setRemoteDefaultHeaders: (env, headers) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: { ...envConfigs[env], remoteDefaultHeaders: headers },
            };
          }
          return { sections: updated };
        });
      },

      setRemoteOpenApiUrl: (env, url) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            const cfg = envConfigs[env];
            // Atomicity invariant: clearing the URL also clears credentials
            const isClearing = !url;
            updated[key] = {
              ...envConfigs,
              [env]: {
                ...cfg,
                remoteOpenApiUrl: url || undefined,
                ...(isClearing ? {
                  remoteOpenApiApiKeyHeader: undefined,
                  remoteOpenApiApiKeyValue: undefined,
                  remoteOpenApiBearerToken: undefined,
                } : {}),
              },
            };
          }
          return { sections: updated };
        });
      },

      setRemoteOpenApiApiKeyHeader: (env, header) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: { ...envConfigs[env], remoteOpenApiApiKeyHeader: header },
            };
          }
          return { sections: updated };
        });
      },

      setRemoteOpenApiApiKeyValue: (env, value) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: { ...envConfigs[env], remoteOpenApiApiKeyValue: value },
            };
          }
          return { sections: updated };
        });
      },

      setRemoteOpenApiBearerToken: (env, token) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: { ...envConfigs[env], remoteOpenApiBearerToken: token },
            };
          }
          return { sections: updated };
        });
      },

      clearRemoteOpenApiConfig: (env) => {
        set((state) => {
          const updated: Record<string, typeof state.sections[string]> = {};
          for (const [key, envConfigs] of Object.entries(state.sections)) {
            updated[key] = {
              ...envConfigs,
              [env]: {
                ...envConfigs[env],
                remoteBaseUrl: undefined,
                remoteOpenApiUrl: undefined,
                remoteOpenApiApiKeyHeader: undefined,
                remoteOpenApiApiKeyValue: undefined,
                remoteOpenApiBearerToken: undefined,
                remoteDefaultHeaders: undefined,
              },
            };
          }
          return { sections: updated };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      migrate: (persisted, fromVersion) => {
        const base = fromVersion < 2
          ? createDefaultConfig()
          : (persisted as ReturnType<typeof createDefaultConfig>);
        // v2 → v3: add remote fields; add 'harness' section if missing
        for (const envConfigs of Object.values(base.sections ?? {})) {
          for (const envKey of ['localhost', 'test', 'other'] as const) {
            const cfg = (envConfigs as unknown as Record<string, unknown>)[envKey] as Record<string, unknown> | undefined;
            if (cfg) {
              cfg['remoteBaseUrl'] ??= undefined;
              cfg['remoteOpenApiUrl'] ??= undefined;
              cfg['remoteOpenApiApiKeyHeader'] ??= undefined;
              cfg['remoteOpenApiApiKeyValue'] ??= undefined;
              cfg['remoteOpenApiBearerToken'] ??= undefined;
              cfg['remoteDefaultHeaders'] ??= undefined;
            }
          }
        }
        if (!base.sections?.['harness']) {
          const fresh = createDefaultConfig();
          base.sections = { ...base.sections, harness: fresh.sections['harness'] };
        }
        return base;
      },
    },
  ),
);

export default useUnifiedConfigStore;
