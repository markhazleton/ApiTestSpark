/**
 * Config Migration Utility
 * Handles default state creation for the unified config store.
 * Default base URLs are seeded from SECTION_CONFIGS so there is one
 * source of truth for API endpoint defaults.
 */

import type {
  ApiConfigSet,
  EnvironmentConfigs,
  UnifiedConfigState,
} from "../../types/state";
import { SECTION_CONFIGS } from "../../config";

function createDefaultApiConfigSet(baseUrl: string): ApiConfigSet {
  return { baseUrl, apiKey: "", lastUpdatedAt: 0, status: "incomplete" };
}

function createDefaultSectionEnvConfigs(baseUrl: string): EnvironmentConfigs {
  const d = createDefaultApiConfigSet(baseUrl);
  return { localhost: { ...d }, test: { ...d }, other: { ...d } };
}

export function createDefaultConfig(): UnifiedConfigState {
  const sections: Record<string, EnvironmentConfigs> = {};
  for (const [key, cfg] of Object.entries(SECTION_CONFIGS)) {
    sections[key] = createDefaultSectionEnvConfigs(cfg.baseUrl);
  }
  // 'harness' section holds harness-level per-environment config (e.g. remoteOpenApiUrl)
  sections['harness'] = createDefaultSectionEnvConfigs('');
  return { version: 3, currentEnvironment: "test", sections };
}
