/**
 * Hook utilities
 *
 * Shared helpers for API mutation hooks:
 *   withMetric      — wraps an async call with start/stop performance tracking
 *   buildDebugCallbacks — maps debug-store actions to ApiClientCallbacks
 */

import { v4 as uuidv4 } from "uuid";
import type { ApiClientCallbacks } from "../api/client";
import type {
  PerformanceMetrics,
  ApiRequest,
  ApiResponse,
  ErrorRecord,
  ErrorResponse,
} from "../types";

/**
 * Wraps an async call with performance timing and metric recording.
 * Re-throws any error after recording the failure metric.
 */
export async function withMetric<T>(
  apiName: string,
  addMetric: (metric: PerformanceMetrics) => void,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    addMetric({
      apiName,
      duration: performance.now() - start,
      timestamp: new Date(),
      isSuccess: true,
    });
    return result;
  } catch (err) {
    addMetric({
      apiName,
      duration: performance.now() - start,
      timestamp: new Date(),
      isSuccess: false,
      errorMessage: err instanceof Error ? err.message : "Unknown",
    });
    throw err;
  }
}

/**
 * Maps the three debug-store actions to an ApiClientCallbacks object.
 * The onError bridge converts ErrorResponse → ErrorRecord (fills id/context defaults).
 */
export function buildDebugCallbacks(
  addRequest: (req: ApiRequest) => void,
  addResponse: (res: ApiResponse) => void,
  addError: (err: ErrorRecord) => void,
): ApiClientCallbacks {
  return {
    onRequest: addRequest,
    onResponse: addResponse,
    onError: (err: ErrorResponse) =>
      addError({
        id: err.id ?? uuidv4(),
        category: err.category,
        message: err.message,
        timestamp: err.timestamp,
        context: err.context ?? {},
      }),
  };
}
