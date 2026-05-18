import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// Azure Application Insights Configuration
// Replace CONNECTION_STRING with your own Application Insights connection string.
// Set to empty string to disable telemetry.
const CONNECTION_STRING = '';

// React Plugin for enhanced React integration
const reactPlugin = new ReactPlugin();

// Application Insights Instance — only initialized when a connection string is provided
const appInsights = CONNECTION_STRING
  ? new ApplicationInsights({
      config: {
        connectionString: CONNECTION_STRING,
        enableAutoRouteTracking: true,
        disableFetchTracking: false,
        disableAjaxTracking: false,
        disableExceptionTracking: false,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        extensions: [reactPlugin],
        disableTelemetry: false,
        samplingPercentage: 100,
        maxBatchInterval: 15000,
        disableDataLossAnalysis: true,
      }
    })
  : null;

// Initialize Application Insights
if (appInsights) {
  appInsights.loadAppInsights();
  appInsights.trackPageView();
}

// Custom telemetry helpers — all are no-ops when CONNECTION_STRING is not set
export const trackEvent = (name: string, properties?: Record<string, unknown>) => {
  appInsights?.trackEvent({ name }, properties);
};

export const trackException = (error: Error, properties?: Record<string, unknown>) => {
  appInsights?.trackException({ exception: error }, properties);
};

export const trackMetric = (name: string, average: number, properties?: Record<string, unknown>) => {
  appInsights?.trackMetric({ name, average }, properties);
};

export const trackTrace = (message: string, properties?: Record<string, unknown>) => {
  appInsights?.trackTrace({ message }, properties);
};

// API-specific telemetry
export const trackApiCall = (
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  success: boolean,
  environment: string
) => {
  appInsights?.trackDependencyData({
    id: `${method}-${endpoint}-${Date.now()}`,
    target: endpoint,
    name: `${method} ${endpoint}`,
    data: endpoint,
    duration,
    success,
    responseCode: statusCode,
    type: 'HTTP',
    properties: { environment, method },
  });
};

// Error categorization telemetry
export const trackCategorizedError = (
  category: 'Network' | 'API' | 'Configuration' | 'React',
  message: string,
  context: Record<string, unknown>
) => {
  appInsights?.trackTrace({
    message: `[${category}] ${message}`,
    severityLevel: category === 'Configuration' ? 2 : 3,
  }, context);
};

// Export for React integration
export { reactPlugin, appInsights };
