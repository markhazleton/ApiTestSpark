/**
 * Authentication Store
 *
 * Manages OAuth authentication configuration per environment
 * and session-only bearer token state.
 *
 * - Config (baseUrl, clientId, clientSecret, username, password) is persisted per environment
 * - Token state is session-only (not persisted)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthConfigSet,
  AuthEnvironmentConfigs,
  AuthTokenState,
  AuthStoreState,
  Environment,
} from '../types/state';
import type { AuthTokenResponse } from '../types/api';
import { v4 as uuidv4 } from 'uuid';
import useDebugStore from './debugStore';

const AUTH_STORAGE_KEY = 'api-test-spark-auth-config';

function createDefaultAuthConfig(): AuthEnvironmentConfigs {
  const makeDefault = (): AuthConfigSet => ({
    baseUrl: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    lastUpdatedAt: 0,
    status: 'incomplete',
  });

  return {
    localhost: makeDefault(),
    test: makeDefault(),
    other: makeDefault(),
  };
}

const defaultTokenState: AuthTokenState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  userName: null,
  givenName: null,
  surname: null,
  email: null,
  roles: null,
  isAuthenticated: false,
};

function validateAuthConfigStatus(config: AuthConfigSet): 'complete' | 'incomplete' {
  const hasBaseUrl = !!config.baseUrl?.trim();
  const hasClientId = !!config.clientId?.trim();
  const hasClientSecret = !!config.clientSecret?.trim();
  const hasValidUrl = hasBaseUrl && /^https?:\/\/.+/.test(config.baseUrl);

  if (!hasBaseUrl || !hasClientId || !hasClientSecret || !hasValidUrl) {
    return 'incomplete';
  }
  return 'complete';
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      config: createDefaultAuthConfig(),
      token: { ...defaultTokenState },

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
            message: `Auth config updated: ${environment} [${updated.status}]`,
            timestamp: new Date(),
            context: {
              configType: 'authentication',
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
        // We need the current environment from the unified config store
        // but to avoid circular deps, we accept it as a parameter
        // If not provided, default to 'localhost'
        const env = environment || 'localhost';
        return get().config[env];
      },

      setToken: (tokenResponse: AuthTokenResponse) => {
        const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
        set({
          token: {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || null,
            expiresAt,
            userName: tokenResponse.userName,
            givenName: tokenResponse.GivenName,
            surname: tokenResponse.Surname,
            email: tokenResponse.Email,
            roles: tokenResponse.Roles,
            isAuthenticated: true,
          },
        });

        // Audit log
        try {
          const addError = useDebugStore.getState().addError;
          addError({
            id: uuidv4(),
            category: 'Configuration',
            message: `Auth token acquired for user: ${tokenResponse.userName}`,
            timestamp: new Date(),
            context: {
              configType: 'authentication',
              userName: tokenResponse.userName,
              email: tokenResponse.Email,
              expiresIn: tokenResponse.expires_in,
              roles: tokenResponse.Roles,
            },
          });
        } catch {
          // Audit log failure is non-critical; token state already set
        }
      },

      clearToken: () => {
        set({ token: { ...defaultTokenState } });
      },

      isTokenValid: () => {
        const { token } = get();
        if (!token.accessToken || !token.expiresAt) return false;
        // Add 30-second buffer before expiry
        return Date.now() < (token.expiresAt - 30_000);
      },

      isTokenExpired: () => {
        const { token } = get();
        if (!token.accessToken || !token.expiresAt) return false;
        // Token exists but is expired (past the 30s buffer)
        return Date.now() >= (token.expiresAt - 30_000);
      },

      getAccessToken: () => {
        const state = get();
        if (state.isTokenValid()) {
          return state.token.accessToken;
        }
        return null;
      },

      getRefreshToken: () => {
        const { token } = get();
        return token.refreshToken;
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Only persist config, NOT token state
      partialize: (state) => ({
        config: state.config,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthStoreState> | undefined;
        const defaults = currentState.config;

        const mergeConfig = (
          persistedConfig: Partial<AuthConfigSet> | undefined,
          defaultConfig: AuthConfigSet
        ): AuthConfigSet => {
          const merged: AuthConfigSet = {
            ...defaultConfig,
            ...persistedConfig,
            baseUrl: persistedConfig?.baseUrl?.trim() ? persistedConfig.baseUrl : defaultConfig.baseUrl,
            clientId: persistedConfig?.clientId?.trim() ? persistedConfig.clientId : defaultConfig.clientId,
          };

          merged.status = validateAuthConfigStatus(merged);
          return merged;
        };

        return {
          ...currentState,
          ...persisted,
          config: {
            localhost: mergeConfig(persisted?.config?.localhost, defaults.localhost),
            test: mergeConfig(persisted?.config?.test, defaults.test),
            other: mergeConfig(persisted?.config?.other, defaults.other),
          },
        };
      },
    }
  )
);

export default useAuthStore;
