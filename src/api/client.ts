/**
 * Generic API Client
 *
 * Base HTTP client that captures requests and responses to the debug store.
 * Extend this class or compose it into feature-specific clients.
 */

import type { ApiRequest, ApiResponse, ErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getRequestIdentityHeaders } from '../utils/session';

export class RequestAbortedError extends Error {
  readonly url: string;
  readonly method: string;
  constructor(url: string, method: string) {
    super(`Request cancelled: ${method} ${url}`);
    this.name = 'RequestAbortedError';
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
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.bearerToken = options.bearerToken;
    this.extraHeaders = options.extraHeaders ?? {};
    this.onRequest = options.callbacks?.onRequest;
    this.onResponse = options.callbacks?.onResponse;
    this.onError = options.callbacks?.onError;
  }

  cancel(): void { this.abortController?.abort(); }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getRequestIdentityHeaders(),
      ...this.extraHeaders,
    };
    if (this.apiKey) headers['X-API-KEY'] = this.apiKey;
    if (this.bearerToken) headers['Authorization'] = `Bearer ${this.bearerToken}`;
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
    const requestId = uuidv4();
    const startTime = performance.now();

    this.onRequest?.({ id: requestId, url, method, headers, body, timestamp: new Date() });
    this.abortController = new AbortController();

    let responseStatus = 0;
    let responseBody: unknown;

    try {
      const resp = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: this.abortController.signal,
      });
      responseStatus = resp.status;
      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });
      const rawText = await resp.text();
      try { responseBody = rawText ? JSON.parse(rawText) : null; }
      catch { responseBody = { raw_text: rawText, parse_error: true }; }

      const duration = performance.now() - startTime;
      this.onResponse?.({
        requestId, status: responseStatus, statusText: resp.statusText,
        headers: respHeaders, body: responseBody,
        apiResponseDuration: duration, timestamp: new Date(),
      });

      if (!resp.ok) {
        const err: ErrorResponse = {
          id: uuidv4(), category: 'API',
          message: `HTTP ${responseStatus}: ${resp.statusText}`,
          timestamp: new Date(), context: { url, method, status: responseStatus },
        };
        this.onError?.(err);
        throw new Error(err.message);
      }
      return responseBody as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestAbortedError(url, method);
      }
      if (error instanceof Error && !(error instanceof RequestAbortedError)) {
        this.onError?.({
          id: uuidv4(), category: 'Network', message: error.message,
          timestamp: new Date(), context: { url, method }, stack: error.stack,
        });
        if (responseStatus === 0) {
          this.onResponse?.({
            requestId, status: 0, statusText: 'Network Error', headers: {},
            body: { error: error.message },
            apiResponseDuration: performance.now() - startTime, timestamp: new Date(),
          });
        }
      }
      throw error;
    }
  }

  async get<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, extraHeaders);
  }
  async post<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('POST', path, body, extraHeaders);
  }
  async put<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('PUT', path, body, extraHeaders);
  }
  async patch<T>(path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('PATCH', path, body, extraHeaders);
  }
  async delete<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    return this.request<T>('DELETE', path, undefined, extraHeaders);
  }
}
