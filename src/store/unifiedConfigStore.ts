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

const STORAGE_KEY = "api-test-harness-config";

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
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: () => createDefaultConfig(),
    },
  ),
);

export default useUnifiedConfigStore;
