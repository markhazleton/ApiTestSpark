import type { ApiRequest, ApiResponse, PerformanceMetrics } from "./api";

// Configuration State
export type Environment = "localhost" | "test" | "other";

// ============================================================================
// Centralized API Configuration Types
// ============================================================================

/**
 * ApiConfigSet - Configuration block for a single API endpoint.
 */
export interface ApiConfigSet {
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
  lastUpdatedAt: number;
  status: "complete" | "incomplete" | "stale";
}

export interface EnvironmentConfigs {
  localhost: ApiConfigSet;
  test: ApiConfigSet;
  other: ApiConfigSet;
}

export interface EnvironmentProfile {
  id: Environment;
  label: string;
  defaultBaseUrl: string;
  notes?: string[];
}

export interface UnifiedConfigState {
  version: 2;
  currentEnvironment: Environment;
  /** Per-section, per-environment API configuration. Key matches SectionKey. */
  sections: Record<string, EnvironmentConfigs>;
}

// ============================================================================
// Authentication Configuration Types
// ============================================================================

export interface AuthConfigSet {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  lastUpdatedAt: number;
  status: "complete" | "incomplete";
}

export interface AuthEnvironmentConfigs {
  localhost: AuthConfigSet;
  test: AuthConfigSet;
  other: AuthConfigSet;
}

export interface AuthTokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userName: string | null;
  givenName: string | null;
  surname: string | null;
  email: string | null;
  roles: string | null;
  isAuthenticated: boolean;
}

export interface AuthStoreState {
  config: AuthEnvironmentConfigs;
  token: AuthTokenState;
  updateAuthConfig: (
    environment: Environment,
    updates: Partial<AuthConfigSet>,
  ) => void;
  getAuthConfig: (environment?: Environment) => AuthConfigSet;
  setToken: (tokenResponse: import("./api").AuthTokenResponse) => void;
  clearToken: () => void;
  isTokenValid: () => boolean;
  isTokenExpired: () => boolean;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

// ============================================================================
// Debug State
// ============================================================================

export interface ErrorRecord {
  id: string;
  category: string;
  message: string;
  timestamp: Date;
  context: Record<string, unknown>;
  stack?: string;
}

export interface DebugState {
  requests: ApiRequest[];
  responses: ApiResponse[];
  metrics: PerformanceMetrics[];
  errors: ErrorRecord[];
  addRequest: (request: ApiRequest) => void;
  addResponse: (response: ApiResponse) => void;
  addMetric: (metric: PerformanceMetrics) => void;
  addError: (error: ErrorRecord) => void;
  clearAll: () => void;
}
