import React from "react";
import { BRANDING } from "../utils";

export const HowToUseScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">{BRANDING.productName}</h1>
          <p className="text-gray-600 mt-1">{BRANDING.tagline}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
          <p className="text-gray-700">
            This tool lets you send requests to different APIs, inspect requests and responses in the
            debug panel, and verify behaviour across multiple environments. Each section owns its own
            configuration—there is no global configuration.
          </p>
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Getting Started</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Navigate to a feature section (e.g., JokeAPI, JSON Placeholder).</li>
            <li>
              Configure the API endpoint, environment, and authentication in the configuration panel
              at the top of that section.
            </li>
            <li>Make a request using the section's controls.</li>
            <li>Inspect the captured request and response in the debug panel on the right.</li>
          </ol>
        </div>

        {/* Debug Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Debug Panel</h2>
          <p className="text-gray-700 mb-3">
            The debug panel (right side) shows every outgoing HTTP request with full headers,
            body, response status, and timing. Use it to verify payloads and troubleshoot errors.
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Requests tab — outbound call headers and body</li>
            <li>Responses tab — status, response body, duration</li>
            <li>Metrics tab — latency per API call</li>
            <li>Errors tab — categorised network and API errors</li>
          </ul>
        </div>

        {/* Adding a New API */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-3">Adding a New API Feature</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Create a typed API client in <code className="bg-blue-100 px-1 rounded">src/api/</code> extending <code className="bg-blue-100 px-1 rounded">ApiClient</code>.</li>
            <li>Add domain types in <code className="bg-blue-100 px-1 rounded">src/types/</code> and export from <code className="bg-blue-100 px-1 rounded">src/types/index.ts</code>.</li>
            <li>Create a hook in <code className="bg-blue-100 px-1 rounded">src/hooks/</code> for orchestrating API calls with TanStack Query.</li>
            <li>Build a screen component in <code className="bg-blue-100 px-1 rounded">src/components/</code>.</li>
            <li>Register the route in <code className="bg-blue-100 px-1 rounded">src/App.tsx</code>.</li>
            <li>Add a navigation card in the SECTIONS array in <code className="bg-blue-100 px-1 rounded">src/components/HomeScreen.tsx</code>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};