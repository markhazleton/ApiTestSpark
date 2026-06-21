/**
 * Request identity helpers.
 *
 * Session GUID: created once per page load, reused on every request.
 * Request GUID: a fresh UUID generated on every individual request.
 *
 * Header values may contain the tokens {session-guid} and {request-guid}.
 * Call resolveHeaderTokens() before sending any request to expand them.
 */

let sessionGuid: string | null = null;

/** Returns the session-scoped GUID, creating it on first call. */
export function getSessionGuid(): string {
  if (!sessionGuid) {
    sessionGuid = crypto.randomUUID();
  }
  return sessionGuid;
}

/** Returns a brand-new UUID — call once per request. */
export function getRequestGuid(): string {
  return crypto.randomUUID();
}

/**
 * Expand {session-guid} and {request-guid} tokens in header values.
 * The same request-guid is used for every header in a single call so all
 * correlation headers on one request share the same value.
 */
export function resolveHeaderTokens(headers: Record<string, string>): Record<string, string> {
  const hasSessionToken = Object.values(headers).some((v) => v.includes('{session-guid}'));
  const hasRequestToken = Object.values(headers).some((v) => v.includes('{request-guid}'));

  if (!hasSessionToken && !hasRequestToken) return headers;

  const sessionGuidValue = hasSessionToken ? getSessionGuid() : '';
  const requestGuidValue = hasRequestToken ? getRequestGuid() : '';

  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    resolved[k] = v
      .replace(/\{session-guid\}/g, sessionGuidValue)
      .replace(/\{request-guid\}/g, requestGuidValue);
  }
  return resolved;
}

// ── Legacy exports (kept for backward compatibility) ──────────────────────────

let globalSessionId: string | null = null;

function padTimeSegment(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatRequestId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = padTimeSegment(date.getMonth() + 1);
  const day = padTimeSegment(date.getDate());
  const minute = padTimeSegment(date.getMinutes());
  const second = padTimeSegment(date.getSeconds());
  return `req_${year}-${month}-${day}.${minute}.${second}`;
}

export function createCorrelationId(): string {
  return formatRequestId();
}

export function getSessionId(): string {
  if (!globalSessionId) {
    globalSessionId = formatRequestId();
  }
  return globalSessionId;
}

export function getRequestIdentityHeaders(): Record<string, string> {
  return {
    'X-ApiTestSpark-SessionGuid': getSessionGuid(),
    'X-ApiTestSpark-RequestGuid': getRequestGuid(),
  };
}

export function resetSessionId(): void {
  globalSessionId = null;
}
