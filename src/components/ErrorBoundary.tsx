import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useDebugStore } from '../store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // addError routes to debug panel and auto-forwards to App Insights via trackCategorizedError
    const debugStore = useDebugStore.getState();
    debugStore.addError({
      id: `error-${Date.now()}`,
      category: 'React',
      message: error.message,
      timestamp: new Date(),
      context: {
        componentStack: errorInfo.componentStack,
      },
      stack: error.stack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                <p className="text-gray-600">The application encountered an unexpected error</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-red-900 mb-2">Error Details</h2>
                <p className="text-red-800 text-sm font-mono">{this.state.error.message}</p>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-[#982407] hover:text-[#982407] mb-2">
                  Show Stack Trace
                </summary>
                <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-x-auto">
                  {this.state.error?.stack}
                </pre>
                <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-x-auto mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-[#982407] text-white rounded-md hover:bg-[#741b05] transition-colors"
              >
                Return to Configuration
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Reload Application
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-500 text-center">
              If this problem persists, please check the debug panel for more information.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
