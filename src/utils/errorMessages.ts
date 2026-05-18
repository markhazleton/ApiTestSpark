/**
 * User-friendly error messages for API status codes
 * Provides consistent, actionable error messages across the application
 */

interface ErrorMessageResult {
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
}

/**
 * Get user-friendly error message for HTTP status code
 */
export function getErrorMessage(status: number, statusText?: string): ErrorMessageResult {
  switch (status) {
    case 0:
      return {
        title: 'Network Error',
        message: 'Unable to reach the API server. Please check your network connection.',
        action: 'Verify your internet connection and try again.',
        retryable: true,
      };

    case 400:
      return {
        title: 'Invalid Request',
        message: 'The request contains invalid data. Please check all required fields.',
        action: 'Review the form for errors and ensure all required fields are filled correctly.',
        retryable: false,
      };

    case 401:
      return {
        title: 'Authentication Failed',
        message: 'Invalid or expired API key.',
        action: 'Please update your API key in the configuration screen.',
        retryable: false,
      };

    case 403:
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        action: 'Contact your administrator for access.',
        retryable: false,
      };

    case 404:
      return {
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        action: 'The item may have been deleted or the URL is incorrect.',
        retryable: false,
      };

    case 409:
      return {
        title: 'Conflict Detected',
        message: 'This resource has been modified by another user.',
        action: 'Please reload the latest version and try again.',
        retryable: true,
      };

    case 412:
      return {
        title: 'Precondition Failed',
        message: 'The resource has changed since you last loaded it.',
        action: 'Reloading the latest version automatically...',
        retryable: true,
      };

    case 422:
      return {
        title: 'Validation Error',
        message: 'The data submitted does not meet validation requirements.',
        action: 'Check the error details below for specific validation failures.',
        retryable: false,
      };

    case 429:
      return {
        title: 'Too Many Requests',
        message: 'You have exceeded the API rate limit.',
        action: 'Please wait a moment before trying again.',
        retryable: true,
      };

    case 500:
      return {
        title: 'Server Error',
        message: 'The server encountered an unexpected error.',
        action: 'Please try again later. If the problem persists, contact support.',
        retryable: true,
      };

    case 502:
      return {
        title: 'Bad Gateway',
        message: 'The server received an invalid response from an upstream server.',
        action: 'The service may be temporarily unavailable. Please try again in a few minutes.',
        retryable: true,
      };

    case 503:
      return {
        title: 'Service Unavailable',
        message: 'The API service is temporarily unavailable.',
        action: 'The service may be undergoing maintenance. Please try again later.',
        retryable: true,
      };

    case 504:
      return {
        title: 'Gateway Timeout',
        message: 'The server took too long to respond.',
        action: 'The request may be too complex. Try simplifying your request or try again later.',
        retryable: true,
      };

    default:
      if (status >= 500) {
        return {
          title: 'Server Error',
          message: `The server returned an error: ${status} ${statusText || 'Unknown Error'}`,
          action: 'Please try again later. If the problem persists, contact support.',
          retryable: true,
        };
      }

      if (status >= 400) {
        return {
          title: 'Request Error',
          message: `The request failed: ${status} ${statusText || 'Unknown Error'}`,
          action: 'Please check your input and try again.',
          retryable: false,
        };
      }

      return {
        title: 'Unknown Error',
        message: `An unexpected error occurred: ${status} ${statusText || 'Unknown Error'}`,
        action: 'Please try again or contact support if the problem persists.',
        retryable: false,
      };
  }
}

/**
 * Format error for display in UI components
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  details?: string;
  retryable: boolean;
} {
  if (error && typeof error === 'object' && 'context' in error) {
    const errorObj = error as { context?: { status?: number; statusText?: string; responseBody?: unknown } };
    const status = errorObj.context?.status || 0;
    const statusText = errorObj.context?.statusText;
    const errorMsg = getErrorMessage(status, statusText);

    return {
      title: errorMsg.title,
      message: errorMsg.message,
      details: errorMsg.action,
      retryable: errorMsg.retryable,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message,
      retryable: false,
    };
  }

  return {
    title: 'Unknown Error',
    message: 'An unexpected error occurred',
    retryable: false,
  };
}
