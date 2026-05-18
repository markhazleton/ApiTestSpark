/**
 * Config Migration Utility
 * Handles migration from legacy configuration to the current schema.
 */

import type { ApiConfigSet, EnvironmentConfigs, UnifiedConfigState } from '../../types/state';

const JOKE_API_DEFAULT_URL = 'https://v2.jokeapi.dev';

export function createDefaultApiConfigSet(): ApiConfigSet {
  return {
    baseUrl: JOKE_API_DEFAULT_URL,
    apiKey: '',
    lastUpdatedAt: 0,
    status: 'incomplete',
  };
}

export function createDefaultConfig(): UnifiedConfigState {
  const defaultSet = createDefaultApiConfigSet();
  const envConfigs: EnvironmentConfigs = {
    localhost: { ...defaultSet },
    test: { ...defaultSet },
    other: { ...defaultSet },
  };
  return {
    version: 1,
    currentEnvironment: 'test',
    api: envConfigs,
  };
}
