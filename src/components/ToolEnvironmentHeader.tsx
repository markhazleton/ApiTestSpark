import React from 'react';
import { useUnifiedConfigStore } from '../store';

export const ToolEnvironmentHeader: React.FC = () => {
  const { getApiConfig, currentEnvironment } = useUnifiedConfigStore();
  const config = getApiConfig();

  const envColors: Record<string, string> = {
    localhost: '#10b981',
    test: '#3b82f6',
    other: '#f59e0b',
  };

  const color = envColors[currentEnvironment] ?? '#6b7280';
  const hasApiKey = (config.apiKey?.length ?? 0) > 0;

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-900">{currentEnvironment.toUpperCase()}</span>
        </div>
        <div className="text-sm text-gray-600">{config.baseUrl}</div>
      </div>
      <div className="flex items-center space-x-2">
        {hasApiKey ? (
          <span className="text-sm text-green-700 font-medium">API Key Configured</span>
        ) : (
          <span className="text-sm text-orange-700 font-medium">API Key Not Configured</span>
        )}
      </div>
    </div>
  );
};
