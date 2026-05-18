import { ApiClient } from './client';
import type { ApiClientOptions } from './client';
import type { JokeFilters, JokeResponse } from '../types/joke-api';

export const JOKE_API_BASE_URL = 'https://v2.jokeapi.dev';

/**
 * JokeAPI v2 client
 * Extends the generic ApiClient – all requests are captured in the debug panel.
 */
export class JokeApiClient extends ApiClient {
  constructor(options: ApiClientOptions = {}) {
    super(JOKE_API_BASE_URL, '', options);
  }

  /** Fetch one (or more) jokes with optional filters. */
  async getJoke(filters: JokeFilters = {}): Promise<JokeResponse> {
    const {
      category = 'Any',
      type,
      blacklistFlags,
      safeMode,
      lang,
      contains,
      amount = 1,
    } = filters;

    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (lang) params.set('lang', lang);
    if (contains) params.set('contains', contains);
    if (amount > 1) params.set('amount', String(Math.min(amount, 10)));
    if (blacklistFlags && blacklistFlags.length > 0) {
      params.set('blacklistFlags', blacklistFlags.join(','));
    }
    if (safeMode) params.set('safe-mode', '');

    const qs = params.toString();
    const path = `/joke/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`;
    return this.get<JokeResponse>(path);
  }

  /** Ping the JokeAPI server. */
  async ping(): Promise<{ ping: string; timestamp: number }> {
    return this.get('/ping');
  }
}
