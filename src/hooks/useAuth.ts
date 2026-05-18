/**
 * useAuth Hook
 * 
 * Provides authentication state and simple token management.
 * For OAuth flows, wire up your own auth client here.
 */

import { useAuthStore } from '../store/authStore';
import { useUnifiedConfigStore } from '../store';

export const useAuth = () => {
  const { token, clearToken, isTokenValid, isTokenExpired, getAccessToken, getRefreshToken } = useAuthStore();
  const { currentEnvironment } = useUnifiedConfigStore();

  /**
   * Set a bearer token manually (e.g. paste from another tool).
   * For full OAuth flows, add your auth client calls here.
   */
  const setManualToken = (accessToken: string) => {
    // Direct store manipulation for simple token injection
    useAuthStore.setState((state) => ({
      token: {
        ...state.token,
        accessToken,
        isAuthenticated: true,
        expiresAt: null, // No expiry tracking for manual tokens
      },
    }));
  };

  return {
    token,
    currentEnvironment,
    setManualToken,
    clearToken,
    isTokenValid,
    isTokenExpired,
    getAccessToken,
    getRefreshToken,
    isAuthenticated: token.isAuthenticated,
  };
};