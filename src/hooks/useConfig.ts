/**
 * useConfig Hook
 *
 * Returns the current API configuration for the active environment.
 */

import { useUnifiedConfigStore } from '../store';

interface UseConfigResult {
  baseUrl: string;
  apiKey: string;
  hasCredentials: boolean;
  currentEnvironment: string;
}

export const useConfig = (): UseConfigResult => {
  const { getApiConfig, currentEnvironment } = useUnifiedConfigStore();
  const apiConfig = getApiConfig();
  return {
    baseUrl: apiConfig.baseUrl,
    apiKey: apiConfig.apiKey,
    hasCredentials: Boolean(apiConfig.baseUrl?.trim()),
    currentEnvironment,
  };
};
