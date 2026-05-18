/**
 * Request identity headers for API correlation.
 *
 * Session ID is created once per application session.
 * Correlation ID is created per request.
 */

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
  return {};
}

export function resetSessionId(): void {
  globalSessionId = null;
}
