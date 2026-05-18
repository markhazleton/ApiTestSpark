import { createRestCaller } from './client';
import type { ApiClientCallbacks } from './client';
import type { JokeFilters, JokeResponse } from '../types/joke-api';

export const JOKE_API_BASE_URL = 'https://v2.jokeapi.dev';

function buildJokePath(filters: JokeFilters): string {
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
  if (blacklistFlags?.length) params.set('blacklistFlags', blacklistFlags.join(','));
  if (safeMode) params.set('safe-mode', '');

  const qs = params.toString();
  return `/joke/${encodeURIComponent(category)}${qs ? `?${qs}` : ''}`;
}

/** Create a caller for JokeAPI v2. All requests are captured in the debug panel. */
export function createJokeApiCaller(callbacks: ApiClientCallbacks) {
  const caller = createRestCaller(JOKE_API_BASE_URL, { callbacks });
  return {
    getJoke: (filters: JokeFilters = {}) =>
      caller.get<JokeResponse>(buildJokePath(filters)),
    ping: () =>
      caller.get<{ ping: string; timestamp: number }>('/ping'),
  };
}
