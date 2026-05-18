import { create } from 'zustand';
import type { DebugState, ApiRequest, ApiResponse, PerformanceMetrics, ErrorRecord } from '../types';
import { trackApiCall, trackCategorizedError, trackMetric } from '../utils/appInsights';

const useDebugStore = create<DebugState>()((set, get) => ({
  requests: [],
  responses: [],
  metrics: [],
  errors: [],

  addRequest: (request: ApiRequest) => {
    set((state) => ({
      requests: [...state.requests, request].slice(-50), // Keep last 50
    }));
  },

  addResponse: (response: ApiResponse) => {
    set((state) => ({
      responses: [...state.responses, response].slice(-50), // Keep last 50
    }));

    // Track API call telemetry to Application Insights
    const request = get().requests.find(r => r.id === response.requestId);
    if (request) {
      trackApiCall(
        request.url,
        request.method,
        response.apiResponseDuration,
        response.status,
        response.status >= 200 && response.status < 300,
        request.headers?.['X-Environment'] || 'unknown'
      );
    }
  },

  addMetric: (metric: PerformanceMetrics) => {
    set((state) => ({
      metrics: [...state.metrics, metric].slice(-100), // Keep last 100
    }));

    // Track performance metric to Application Insights
    trackMetric(`API_${metric.apiName}`, metric.duration, {
      success: metric.isSuccess,
      error: metric.errorMessage,
    });
  },

  addError: (error: ErrorRecord) => {
    set((state) => ({
      errors: [...state.errors, error].slice(-50), // Keep last 50
    }));

    // Track categorized error to Application Insights
    trackCategorizedError(
      error.category as 'Network' | 'API' | 'Configuration' | 'React',
      error.message,
      error.context
    );
  },

  clearAll: () => {
    set({
      requests: [],
      responses: [],
      metrics: [],
      errors: [],
    });
  },
}));

export default useDebugStore;
