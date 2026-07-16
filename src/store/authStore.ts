/**
 * Authentication Store
 *
 * Manages OAuth authentication configuration and acquired access tokens, both scoped
 * per Environment (localhost/test/other).
 *
 * - Config (baseUrl, clientId, clientSecret, userClientId, userClientSecret, testUsername,
 *   testPassword, description) is persisted per environment.
 * - Access tokens are also persisted per environment (FR-015). This store performs no network
 *   I/O itself — token acquisition is orchestrated by the useOAuthToken hook (Constitution
 *   III/IV: hooks own API orchestration, stores own state only).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthConfigSet,
  AuthEnvironmentConfigs,
  AccessTokenState,
  AccessTokenEnvironmentState,
  AuthStoreState,
  Environment,
} from '../types/state';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from './debugStore';

const AUTH_STORAGE_KEY = 'api-test-spark-auth-config';
const TOKEN_EXPIRY_BUFFER_MS = 30_000;

function createDefaultAuthConfig(): AuthEnvironmentConfigs {
  const makeDefault = (): AuthConfigSet => ({
    baseUrl: '',
    clientId: '',
    clientSecret: '',
    userClientId: '',
    userClientSecret: '',
    testUsername: '',
    testPassword: '',
    description: '',
    lastUpdatedAt: 0,
    status: 'incomplete',
  });

  return {
    localhost: makeDefault(),
    test: makeDefault(),
    other: makeDefault(),
  };
}

function createDefaultTokenState(): AccessTokenState {
  return {
    accessToken: null,
    tokenType: null,
    expiresAt: null,
    acquiredVia: null,
    isAuthenticated: false,
  };
}

function createDefaultTokens(): AccessTokenEnvironmentState {
  return {
    localhost: createDefaultTokenState(),
    test: createDefaultTokenState(),
    other: createDefaultTokenState(),
  };
}

function validateAuthConfigStatus(config: AuthConfigSet): 'complete' | 'incomplete' {
  const hasBaseUrl = !!config.baseUrl?.trim();
  const hasValidUrl = hasBaseUrl && /^https?:\/\/.+/.test(config.baseUrl);
  const hasClientCredentials = !!config.clientId?.trim() && !!config.clientSecret?.trim();
  const hasTestUserCredentials = !!config.testUsername?.trim() && !!config.testPassword?.trim();

  if (!hasBaseUrl || !hasValidUrl || (!hasClientCredentials && !hasTestUserCredentials)) {
    return 'incomplete';
  }
  return 'complete';
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      config: createDefaultAuthConfig(),
      tokens: createDefaultTokens(),

      updateAuthConfig: (environment: Environment, updates: Partial<AuthConfigSet>) => {
        const current = get().config[environment];
        const updated: AuthConfigSet = {
          ...current,
          ...updates,
          lastUpdatedAt: Date.now(),
        };
        updated.status = validateAuthConfigStatus(updated);

        set((state) => ({
          config: {
            ...state.config,
            [environment]: updated,
          },
        }));

        // Audit log
        try {
          const addError = useDebugStore.getState().addError;
          addError({
            id: uuidv4(),
            category: 'Configuration',
            message: `OAuth config updated: ${environment} [${updated.status}]`,
            timestamp: new Date(),
            context: {
              configType: 'oauth',
              environment,
              status: updated.status,
              hasBaseUrl: !!updated.baseUrl,
              hasClientId: !!updated.clientId,
              hasClientSecret: !!updated.clientSecret,
            },
          });
        } catch {
          // Audit log failure is non-critical; primary config update already succeeded
        }
      },

      getAuthConfig: (environment?: Environment) => {
        const env = environment || 'localhost';
        return get().config[env];
      },

      setToken: (environment, tokenResponse, grantType) => {
        const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
        set((state) => ({
          tokens: {
            ...state.tokens,
            [environment]: {
              accessToken: tokenResponse.access_token,
              tokenType: tokenResponse.token_type ?? 'Bearer',
              expiresAt,
              acquiredVia: grantType,
              isAuthenticated: true,
            },
          },
        }));

        // Audit log
        try {
          const addError = useDebugStore.getState().addError;
          addError({
            id: uuidv4(),
            category: 'Configuration',
            message: `OAuth access token acquired for ${environment} via ${grantType}`,
            timestamp: new Date(),
            context: {
              configType: 'oauth',
              environment,
              grantType,
              expiresIn: tokenResponse.expires_in,
            },
          });
        } catch {
          // Audit log failure is non-critical; token state already set
        }
      },

      clearToken: (environment) => {
        set((state) => ({
          tokens: {
            ...state.tokens,
            [environment]: createDefaultTokenState(),
          },
        }));
      },

      isTokenValid: (environment) => {
        const token = get().tokens[environment];
        if (!token.accessToken || !token.expiresAt) return false;
        // Add 30-second buffer before expiry
        return Date.now() < (token.expiresAt - TOKEN_EXPIRY_BUFFER_MS);
      },

      isTokenExpired: (environment) => {
        const token = get().tokens[environment];
        if (!token.accessToken || !token.expiresAt) return false;
        // Token exists but is expired (past the 30s buffer)
        return Date.now() >= (token.expiresAt - TOKEN_EXPIRY_BUFFER_MS);
      },

      getAccessToken: (environment) => {
        const state = get();
        return state.isTokenValid(environment) ? state.tokens[environment].accessToken : null;
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Config AND tokens are both persisted (FR-015 reverses the prior token-is-session-only intent).
      partialize: (state) => ({
        config: state.config,
        tokens: state.tokens,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthStoreState> | undefined;
        const defaultConfig = currentState.config;
        const defaultTokens = currentState.tokens;

        const mergeConfig = (
          persistedConfig: Partial<AuthConfigSet> | undefined,
          defaultConfigSet: AuthConfigSet
        ): AuthConfigSet => {
          const merged: AuthConfigSet = {
            ...defaultConfigSet,
            ...persistedConfig,
            baseUrl: persistedConfig?.baseUrl?.trim() ? persistedConfig.baseUrl : defaultConfigSet.baseUrl,
            clientId: persistedConfig?.clientId?.trim() ? persistedConfig.clientId : defaultConfigSet.clientId,
          };

          merged.status = validateAuthConfigStatus(merged);
          return merged;
        };

        const mergeToken = (
          persistedToken: Partial<AccessTokenState> | undefined,
          defaultToken: AccessTokenState
        ): AccessTokenState => ({
          ...defaultToken,
          ...persistedToken,
        });

        return {
          ...currentState,
          ...persisted,
          config: {
            localhost: mergeConfig(persisted?.config?.localhost, defaultConfig.localhost),
            test: mergeConfig(persisted?.config?.test, defaultConfig.test),
            other: mergeConfig(persisted?.config?.other, defaultConfig.other),
          },
          tokens: {
            localhost: mergeToken(persisted?.tokens?.localhost, defaultTokens.localhost),
            test: mergeToken(persisted?.tokens?.test, defaultTokens.test),
            other: mergeToken(persisted?.tokens?.other, defaultTokens.other),
          },
        };
      },
    }
  )
);

export default useAuthStore;
