// Generic API Types for the API Test Harness template
// Add your own domain-specific types here or in separate files.

export * from './auth';

// ---------------------------------------------------------------------------
// Core Debug / Request-Response Types
// Used by the debug panel and all API clients.
// ---------------------------------------------------------------------------

export type ErrorCategory = 'Network' | 'API' | 'Configuration' | 'React' | 'Unknown';

export interface ApiRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: Date;
}

export interface ApiResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  apiResponseDuration: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  apiName: string;
  duration: number;
  timestamp: Date;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface ErrorResponse {
  id?: string;
  category: ErrorCategory;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
}

// ---------------------------------------------------------------------------
// Generic API status check
// ---------------------------------------------------------------------------

export interface ApiStatusCheck {
  ok: boolean;
  status: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// NOTE: placeholder — kept so existing stub at end of file compiles
// ---------------------------------------------------------------------------
export const _placeholder = true;
