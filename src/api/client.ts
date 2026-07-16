/**
 * Generic API Client
 *
 * Base HTTP client that captures requests and responses to the debug store.
 * Extend this class or compose it into feature-specific clients.
 */

import type { ApiRequest, ApiResponse, ErrorResponse } from "../types";
import { v4 as uuidv4 } from "uuid";
import { getRequestIdentityHeaders } from "../utils/session";

export class RequestAbortedError extends Error {
  readonly url: string;
  readonly method: string;
  constructor(url: string, method: string) {
    super(`Request cancelled: ${method} ${url}`);
    this.name = "RequestAbortedError";
    this.url = url;
    this.method = method;
  }
}

export interface ApiClientCallbacks {
  onRequest?: (request: ApiRequest) => void;
  onResponse?: (response: ApiResponse) => void;
  onError?: (error: ErrorResponse) => void;
}

export interface ApiClientOptions {
  bearerToken?: string;
  extraHeaders?: Record<string, string>;
  callbacks?: ApiClientCallbacks;
}

// ---------------------------------------------------------------------------
// Functional API — pass a config object instead of extending ApiClient.
// Handles UUID correlation, timing, debug callbacks, and error categorisation.
// ---------------------------------------------------------------------------

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestConfig {
  method: HttpMethod;
  /** Fully-qualified URL (baseUrl + path already combined). */
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  callbacks?: ApiClientCallbacks;
  /** Pass an AbortController.signal to support cancellation. */
  signal?: AbortSignal;
  /** Body serialization mode. Defaults to 'json' (JSON.stringify). Use 'form' for
   * application/x-www-form-urlencoded bodies (e.g. OAuth token requests). */
  contentType?: "json" | "form";
  /** Optional request timeout in milliseconds. Composed with any caller-supplied
   * `signal` (both can abort the request independently) rather than replacing it. */
  timeoutMs?: number;
}

export async function executeRequest<T>(config: ApiRequestConfig): Promise<T> {
  const { method, url, body, headers = {}, callbacks, signal, contentType = "json", timeoutMs } = config;
  const requestId = uuidv4();
  const startTime = performance.now();

  callbacks?.onRequest?.({
    id: requestId,
    url,
    method,
    headers,
    body,
    timestamp: new Date(),
  });

  let responseStatus = 0;
  let responseBody: unknown;

  let effectiveSignal = signal;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  if (timeoutMs !== undefined) {
    const timeoutController = new AbortController();
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
    if (signal) {
      if (typeof AbortSignal.any === "function") {
        effectiveSignal = AbortSignal.any([signal, timeoutController.signal]);
      } else {
        // Fallback bridge for runtimes without AbortSignal.any: forward caller aborts
        // into the timeout controller so both cancellation paths still work.
        signal.addEventListener("abort", () => timeoutController.abort());
        effectiveSignal = timeoutController.signal;
      }
    } else {
      effectiveSignal = timeoutController.signal;
    }
  }

  try {
    const serializedBody =
      body === undefined
        ? undefined
        : contentType === "form"
          ? (body instanceof URLSearchParams ? body : new URLSearchParams(body as Record<string, string>)).toString()
          : JSON.stringify(body);

    const resp = await fetch(url, {
      method,
      headers,
      body: serializedBody,
      signal: effectiveSignal,
    });
    responseStatus = resp.status;
    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      respHeaders[k] = v;
    });
    const rawText = await resp.text();
    try {
      responseBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      responseBody = { raw_text: rawText, parse_error: true };
    }

    const duration = performance.now() - startTime;
    callbacks?.onResponse?.({
      requestId,
      status: responseStatus,
      statusText: resp.statusText,
      headers: respHeaders,
      body: responseBody,
      apiResponseDuration: duration,
      timestamp: new Date(),
    });

    if (!resp.ok) {
      const err: ErrorResponse = {
        id: uuidv4(),
        category: "API",
        message: `HTTP ${responseStatus}: ${resp.statusText}`,
        timestamp: new Date(),
        context: { url, method, status: responseStatus },
      };
      callbacks?.onError?.(err);
      throw new Error(err.message);
    }
    return responseBody as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (timedOut) {
        const err: ErrorResponse = {
          id: uuidv4(),
          category: "Network",
          message: `Request timed out after ${timeoutMs}ms`,
          timestamp: new Date(),
          context: { url, method },
        };
        callbacks?.onError?.(err);
        throw new Error(err.message, { cause: error });
      }
      throw new RequestAbortedError(url, method);
    }
    if (error instanceof Error && !(error instanceof RequestAbortedError)) {
      callbacks?.onError?.({
        id: uuidv4(),
        category: "Network",
        message: error.message,
        timestamp: new Date(),
        context: { url, method },
        stack: error.stack,
      });
      if (responseStatus === 0) {
        callbacks?.onResponse?.({
          requestId,
          status: 0,
          statusText: "Network Error",
          headers: {},
          body: { error: error.message },
          apiResponseDuration: performance.now() - startTime,
          timestamp: new Date(),
        });
      }
    }
    throw error;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export class ApiClient {
  protected readonly baseUrl: string;
  protected readonly apiKey: string;
  private readonly bearerToken?: string;
  private readonly extraHeaders: Record<string, string>;
  private readonly onRequest?: (request: ApiRequest) => void;
  private readonly onResponse?: (response: ApiResponse) => void;
  private readonly onError?: (error: ErrorResponse) => void;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string, apiKey: string, options: ApiClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.bearerToken = options.bearerToken;
    this.extraHeaders = options.extraHeaders ?? {};
    this.onRequest = options.callbacks?.onRequest;
    this.onResponse = options.callbacks?.onResponse;
    this.onError = options.callbacks?.onError;
  }

  cancel(): void {
    this.abortController?.abort();
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getRequestIdentityHeaders(),
      ...this.extraHeaders,
    };
    if (this.apiKey) headers["X-API-KEY"] = this.apiKey;
    if (this.bearerToken)
      headers["Authorization"] = `Bearer ${this.bearerToken}`;
    return headers;
  }

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...this.buildHeaders(), ...(extraHeaders ?? {}) };
    this.abortController = new AbortController();
    return executeRequest<T>({
      method: method as HttpMethod,
      url,
      body,
      headers,
      callbacks: {
        onRequest: this.onRequest,
        onResponse: this.onResponse,
        onError: this.onError,
      },
      signal: this.abortController.signal,
    });
  }

  async get<T>(
    path: string,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, extraHeaders);
  }
  async post<T>(
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("POST", path, body, extraHeaders);
  }
  async put<T>(
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("PUT", path, body, extraHeaders);
  }
  async patch<T>(
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("PATCH", path, body, extraHeaders);
  }
  async delete<T>(
    path: string,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("DELETE", path, undefined, extraHeaders);
  }
}

// ---------------------------------------------------------------------------
// createRestCaller — lightweight factory for feature-specific callers.
// Wraps executeRequest with a fixed baseUrl, shared headers, and optional auth.
// Use this instead of subclassing ApiClient when no extra constructor logic
// is needed.
// ---------------------------------------------------------------------------

export interface RestCallerOptions {
  callbacks?: ApiClientCallbacks;
  apiKey?: string;
  bearerToken?: string;
  extraHeaders?: Record<string, string>;
}

export function createRestCaller(
  baseUrl: string,
  options: RestCallerOptions = {},
) {
  const base = baseUrl.replace(/\/$/, "");
  const { callbacks, apiKey, bearerToken, extraHeaders = {} } = options;

  function buildHeaders(
    callHeaders?: Record<string, string>,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getRequestIdentityHeaders(),
      ...extraHeaders,
      ...(callHeaders ?? {}),
    };
    if (apiKey) headers["X-API-KEY"] = apiKey;
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;
    return headers;
  }

  function call<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    callHeaders?: Record<string, string>,
  ): Promise<T> {
    return executeRequest<T>({
      method,
      url: `${base}${path}`,
      body,
      headers: buildHeaders(callHeaders),
      callbacks,
    });
  }

  return {
    get: <T>(path: string, headers?: Record<string, string>) =>
      call<T>("GET", path, undefined, headers),
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      call<T>("POST", path, body, headers),
    put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      call<T>("PUT", path, body, headers),
    patch: <T>(
      path: string,
      body?: unknown,
      headers?: Record<string, string>,
    ) => call<T>("PATCH", path, body, headers),
    delete: <T>(path: string, headers?: Record<string, string>) =>
      call<T>("DELETE", path, undefined, headers),
  };
}
