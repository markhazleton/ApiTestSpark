/**
 * useOAuthToken
 *
 * Owns all OAuth token-acquisition orchestration (Constitution III/IV — hooks own API
 * orchestration; `authStore` owns state only, no I/O).
 *
 * Exposes two distinct entry points that MUST NOT be conflated (see
 * .documentation/specs/001-oauth-token-config/gates/analyze.md finding A1):
 *
 * - `ensureOAuthToken(environment, grantType)` — returns the cached token immediately if it is
 *   still valid, otherwise acquires a fresh one. Used ONLY by automatic pre-fire callers (e.g.
 *   EndpointTester's opted-in profiles) where silently reusing a valid token is correct (FR-008).
 * - `acquireOAuthToken(environment, grantType)` — ALWAYS acquires a fresh token and overwrites any
 *   existing one. Used ONLY by explicit user actions (Get App Token / Get Test User Token
 *   buttons) to guarantee FR-016's silent-overwrite requirement.
 */
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from '../store/debugStore';
import { useAuthStore } from '../store/authStore';
import { acquireOAuthToken as requestOAuthToken } from '../api/oauthTokenClient';
import { buildDebugCallbacks } from './hookUtils';
import type { Environment, OAuthGrantType } from '../types/state';
import type { AuthTokenResponse } from '../types/api';

interface OAuthTokenMutationInput {
  environment: Environment;
  grantType: OAuthGrantType;
}

export function useOAuthToken() {
  const { addRequest, addResponse, addError } = useDebugStore();
  const { getAuthConfig, setToken } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async ({ environment, grantType }: OAuthTokenMutationInput) => {
      const config = getAuthConfig(environment);
      const callbacks = buildDebugCallbacks(addRequest, addResponse, addError);
      const response = await requestOAuthToken<AuthTokenResponse>({ config, grantType, callbacks });
      setToken(environment, response, grantType);
      return response;
    },
    onError: (error) => {
      addError({
        id: uuidv4(),
        category: 'Network',
        message: error instanceof Error ? error.message : 'OAuth token acquisition failed',
        timestamp: new Date(),
        context: {},
      });
    },
  });

  async function acquireOAuthToken(environment: Environment, grantType: OAuthGrantType): Promise<string | null> {
    try {
      const response = await mutation.mutateAsync({ environment, grantType });
      return response.access_token;
    } catch {
      return null;
    }
  }

  async function ensureOAuthToken(environment: Environment, grantType: OAuthGrantType): Promise<string | null> {
    if (useAuthStore.getState().isTokenValid(environment)) {
      return useAuthStore.getState().getAccessToken(environment);
    }
    return acquireOAuthToken(environment, grantType);
  }

  return {
    acquireOAuthToken,
    ensureOAuthToken,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
