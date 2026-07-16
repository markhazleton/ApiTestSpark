import type { ApiRequest, ApiResponse, PerformanceMetrics, ErrorCategory } from "./api";

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
  remoteBaseUrl?: string;
  remoteOpenApiUrl?: string;
  remoteOpenApiApiKeyHeader?: string;
  remoteOpenApiApiKeyValue?: string;
  remoteOpenApiBearerToken?: string;
  remoteDefaultHeaders?: Record<string, string>;
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
  version: 3;
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
  /** Overrides clientId for the password grant only. Falls back to clientId when empty. */
  userClientId?: string;
  /** Overrides clientSecret for the password grant only. Falls back to clientSecret when empty. */
  userClientSecret?: string;
  testUsername?: string;
  testPassword?: string;
  description?: string;
  lastUpdatedAt: number;
  status: "complete" | "incomplete";
}

export interface AuthEnvironmentConfigs {
  localhost: AuthConfigSet;
  test: AuthConfigSet;
  other: AuthConfigSet;
}

export type OAuthGrantType = "client_credentials" | "password";

export interface AccessTokenState {
  accessToken: string | null;
  tokenType: string | null;
  expiresAt: number | null;
  acquiredVia: OAuthGrantType | null;
  isAuthenticated: boolean;
}

export interface AccessTokenEnvironmentState {
  localhost: AccessTokenState;
  test: AccessTokenState;
  other: AccessTokenState;
}

export interface AuthStoreState {
  config: AuthEnvironmentConfigs;
  /** Per-Environment access token cache, persisted across page refresh (FR-015). */
  tokens: AccessTokenEnvironmentState;
  updateAuthConfig: (
    environment: Environment,
    updates: Partial<AuthConfigSet>,
  ) => void;
  getAuthConfig: (environment?: Environment) => AuthConfigSet;
  setToken: (
    environment: Environment,
    tokenResponse: import("./api").AuthTokenResponse,
    grantType: OAuthGrantType,
  ) => void;
  clearToken: (environment: Environment) => void;
  isTokenValid: (environment: Environment) => boolean;
  isTokenExpired: (environment: Environment) => boolean;
  getAccessToken: (environment: Environment) => string | null;
}


// ============================================================================
// Debug State
// ============================================================================

export interface ErrorRecord {
  id: string;
  category: ErrorCategory;
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
