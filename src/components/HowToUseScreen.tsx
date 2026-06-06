import React from "react";
import { Link } from "react-router-dom";
import { BRANDING } from "../utils";

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mb-3">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-gray-800 mt-4 mb-1.5">{children}</h3>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
    </div>
  );
}

function Callout({ color = 'blue', title, children }: { color?: 'blue' | 'amber' | 'green'; title: string; children: React.ReactNode }) {
  const styles = {
    blue:  'bg-blue-50 border-blue-200 text-blue-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    green: 'bg-green-50 border-green-200 text-green-900',
  };
  return (
    <div className={`rounded-lg border p-4 ${styles[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export const HowToUseScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">{BRANDING.productName} — How to Use</h1>
          <p className="text-gray-500 mt-1 text-sm">
            A complete guide to testing local and remote REST APIs with the harness.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Overview ── */}
        <Card>
          <H2>Overview</H2>
          <p className="text-sm text-gray-700 leading-relaxed">
            {BRANDING.productName} is embedded in your .NET application at{' '}
            <Code>/api-test-spark/</Code>. It autodiscovers your app's OpenAPI endpoints and
            lets you call them interactively — plus it can proxy a <em>second</em>, remote API
            so you can test integrations between your local service and an external one, all
            from the same browser tab.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="font-semibold text-gray-800 mb-1">Host API Explorer</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                Tests endpoints from your own .NET app. Reads the spec from the URL you set in{' '}
                <Code>options.OpenApiUrl</Code>.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="font-semibold text-gray-800 mb-1">Remote API Explorer</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                Tests endpoints from a completely separate API. The spec is fetched server-side
                so credentials never appear in the browser network tab.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="font-semibold text-gray-800 mb-1">API Doc Builder</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                Select endpoints, capture live responses, add notes, and export markdown
                documentation for your local or remote API.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="font-semibold text-gray-800 mb-1">Debug Panel</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                Captures every outbound HTTP call with full headers, body, status, and timing.
                Resizable and collapsible — always visible alongside the current screen.
              </p>
            </div>
          </div>
        </Card>

        {/* ── Host API ── */}
        <Card>
          <H2>Testing Your Host API</H2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            The Host API Explorer works out of the box once you register the harness with an
            OpenAPI URL in <Code>Program.cs</Code>:
          </p>
          <pre className="text-xs bg-gray-900 text-green-300 rounded p-4 overflow-x-auto font-mono leading-relaxed">
{`app.MapApiTestSpark(options =>
{
    options.OpenApiUrl = "/openapi/v1.json";
});`}
          </pre>
          <div className="mt-4 space-y-3">
            <Step n={1}>
              Navigate to <strong>Host API Explorer</strong> from the home screen.
            </Step>
            <Step n={2}>
              The endpoint list on the left is populated automatically from your OpenAPI document.
              Endpoints are grouped by tag namespace and version prefix.
            </Step>
            <Step n={3}>
              Click any endpoint to open the tester. Fill in path params, query params, and body
              (if needed), then click <strong>Send</strong>.
            </Step>
            <Step n={4}>
              Inspect the response in the right pane and the full request/response in the Debug Panel.
            </Step>
          </div>
        </Card>

        {/* ── Remote API ── */}
        <Card>
          <H2>Remote API Configuration</H2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            The remote API feature lets you point the harness at a second API — typically one
            you are integrating with. There are two places to set it up: server-side in{' '}
            <Code>Program.cs</Code> (permanent, shared across all users of the harness) or
            browser-side on the <Link to="/config" className="text-blue-600 hover:underline">Config page</Link>{' '}
            (persisted in <Code>localStorage</Code>, personal to your browser).
          </p>

          <H3>Option A — Configure in Program.cs</H3>
          <p className="text-xs text-gray-500 mb-2">
            Permanent defaults. Every developer who opens the harness gets these values pre-loaded.
          </p>
          <pre className="text-xs bg-gray-900 text-green-300 rounded p-4 overflow-x-auto font-mono leading-relaxed">
{`app.MapApiTestSpark(options =>
{
    options.OpenApiUrl = "/openapi/v1.json";         // host API spec

    // ── Remote API ──────────────────────────────────
    options.RemoteBaseUrl     = "https://api.example.com";
    options.RemoteOpenApiUrl  = "https://api.example.com/openapi.json";

    // API key sent when fetching the spec AND on every call
    options.RemoteOpenApiApiKeyHeader = "x-api-key";
    options.RemoteOpenApiApiKeyValue  = "your-key-here";

    // OR: Bearer token (use one or the other)
    // options.RemoteOpenApiBearerToken = "your-token-here";

    // Headers injected into every remote API call
    options.RemoteDefaultHeaders["bsw-CorrelationId"] = "abc-123";
    options.RemoteDefaultHeaders["bsw-SessionId"]     = "session-456";
});`}
          </pre>

          <H3>Option B — Configure in the Browser</H3>
          <p className="text-xs text-gray-500 mb-2">
            Personal overrides stored in <Code>localStorage</Code>.
            Browser values take precedence over <Code>Program.cs</Code> values.
            Useful when you need different credentials than the shared defaults.
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <Step n={1}>
              Open the <Link to="/config" className="text-blue-600 hover:underline font-medium">Config page</Link> from the top navigation bar.
            </Step>
            <Step n={2}>
              Fill in <strong>Remote Base URL</strong> (where API calls are sent) and{' '}
              <strong>OpenAPI Spec URL</strong> (where the spec JSON is fetched from — these
              can be the same host or different).
            </Step>
            <Step n={3}>
              Add your <strong>API Key Header</strong> + <strong>API Key Value</strong>, or a{' '}
              <strong>Bearer Token</strong>. Credential fields are masked. They are stored only
              in your browser's <Code>localStorage</Code> — they never leave your machine except
              as request headers.
            </Step>
            <Step n={4}>
              Add any <strong>Default Request Headers</strong> that every call needs (e.g.
              correlation IDs, session tokens, tenant identifiers).
            </Step>
            <Step n={5}>
              Click <strong>Save</strong>. The Remote API Explorer and Doc Builder are now
              available on the home screen.
            </Step>
          </div>

          <div className="mt-4 space-y-3">
            <Callout color="amber" title="How the spec fetch works">
              When you open the Remote API Explorer, the browser calls{' '}
              <InlineCode>GET /api-test-spark/remote-spec</InlineCode> — a proxy endpoint
              inside your .NET app. That proxy forwards the request to the remote server,
              injecting the API key or Bearer token server-side. This means credentials never
              appear in the browser's network tab, which is especially important when the
              harness is used in a team environment.
            </Callout>

            <Callout color="blue" title="How API calls work">
              Actual endpoint calls (e.g. <InlineCode>GET /v3/conversations</InlineCode>) go
              directly from the browser to the remote server using the <strong>Remote Base URL</strong>.
              The API key / Bearer token and all default headers are injected by the browser
              before the fetch — exactly as they would be from any HTTP client. The .NET CSP
              header is automatically updated to allow these cross-origin calls.
            </Callout>

            <Callout color="green" title="Priority: browser overrides server">
              If both <Code>Program.cs</Code> and the Config page have a value set for the
              same field, the browser-stored value wins. This lets each developer use their
              own credentials without changing the shared server configuration. Use{' '}
              <strong>Clear all remote config</strong> on the Config page to revert to the
              server defaults.
            </Callout>
          </div>
        </Card>

        {/* ── Remote API Fields reference ── */}
        <Card>
          <H2>Remote Config Field Reference</H2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">Field</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">Program.cs property</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">What it does</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  ['Remote Base URL',       'RemoteBaseUrl',             'Base URL for all remote API endpoint calls. Enables the Remote API section on the home screen.'],
                  ['OpenAPI Spec URL',       'RemoteOpenApiUrl',          'URL of the remote OpenAPI JSON document. Fetched server-side via the /api-test-spark/remote-spec proxy.'],
                  ['API Key Header',         'RemoteOpenApiApiKeyHeader', 'Name of the header to send the API key in, e.g. x-api-key.'],
                  ['API Key Value',          'RemoteOpenApiApiKeyValue',  'Value of the API key. Sent on both the spec fetch (server-side) and every direct API call.'],
                  ['Bearer Token',           'RemoteOpenApiBearerToken',  'Token sent as Authorization: Bearer <value>. Alternative to API key — use one or the other.'],
                  ['Default Request Headers','RemoteDefaultHeaders',      'Key-value pairs injected into every direct remote API call (not the spec fetch). Good for correlation IDs, session tokens, tenant IDs.'],
                ].map(([field, prop, desc]) => (
                  <tr key={field} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-semibold text-gray-800 not-italic font-sans text-xs">{field}</td>
                    <td className="px-3 py-2 border border-gray-200 text-blue-700">{prop}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600 font-sans not-italic">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Doc Builder ── */}
        <Card>
          <H2>API Doc Builder</H2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Both the host API and the remote API have a Doc Builder. It generates markdown
            documentation including live-captured curl commands and response bodies — ready to
            paste into a context window for a front-end developer agent.
          </p>
          <div className="space-y-3">
            <Step n={1}>Open <strong>API Doc Builder</strong> (host) or <strong>Remote API Doc Builder</strong> (remote) from the home screen.</Step>
            <Step n={2}>Click endpoints in the left panel to add them to the document. They appear in the builder area on the right.</Step>
            <Step n={3}>Optionally add a developer note above each endpoint (appears as a paragraph in the final markdown).</Step>
            <Step n={4}>Fill in path / query params, click <strong>Capture Live Response</strong>. The curl command and truncated response body are stored in the document.</Step>
            <Step n={5}>Switch to <strong>Preview</strong> to see the rendered markdown. Use <strong>Copy MD</strong> or <strong>↓ Download .md</strong> to export.</Step>
          </div>
        </Card>

        {/* ── Debug Panel ── */}
        <Card>
          <H2>Debug Panel</H2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            The resizable panel on the right captures every HTTP call made by the harness.
            Drag the divider to resize it, or click the collapse arrow to hide it.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
            {[
              ['Requests',  'Outbound call URL, method, headers, and body.'],
              ['Responses', 'Status code, response body, and duration (ms).'],
              ['Metrics',   'Per-call latency chart — useful for spotting slow endpoints.'],
              ['Errors',    'Categorised network and configuration errors with stack traces.'],
            ].map(([tab, desc]) => (
              <div key={tab} className="rounded bg-gray-50 border border-gray-100 p-3">
                <p className="font-semibold text-gray-800 mb-0.5">{tab}</p>
                <p className="text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Extending ── */}
        <Card className="border-blue-200 bg-blue-50">
          <H2>Adding a New API Integration (for developers)</H2>
          <p className="text-sm text-blue-800 leading-relaxed mb-4">
            Follow the six-step pattern to add a new sample integration to the harness:
          </p>
          <div className="space-y-2.5">
            {[
              [<><Code>src/types/my-api.ts</Code> — domain types; re-export from <Code>src/types/index.ts</Code></>, '1'],
              [<><Code>src/api/myApiClient.ts</Code> — extends <Code>ApiClient</Code>; re-export from <Code>src/api/index.ts</Code></>, '2'],
              [<><Code>src/hooks/useMyApi.ts</Code> — TanStack Query <Code>useMutation</Code>; re-export from <Code>src/hooks/index.ts</Code></>, '3'],
              [<><Code>src/components/my-api/MyApiScreen.tsx</Code> + barrel; re-export from <Code>src/components/index.ts</Code></>, '4'],
              [<>Route in <Code>src/App.tsx</Code></>, '5'],
              [<>Nav card in <Code>SECTIONS</Code> in <Code>src/components/HomeScreen.tsx</Code></>, '6'],
            ].map(([label, n]) => (
              <Step key={String(n)} n={Number(n)}>{label}</Step>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
};
