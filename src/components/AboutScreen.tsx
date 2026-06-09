import React from 'react';
import { Link } from 'react-router-dom';
import { getVisibleRemoteProfiles, useRemoteConfigStore } from '../store/remoteConfigStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { BRANDING } from '../utils';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mb-4">{children}</h2>;
}

function Badge({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm text-gray-900 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

export const AboutScreen: React.FC = () => {
  const remote = useRemoteConfigStore();
  const harnessConfig = useHarnessConfigStore((s) => s.config);

  const localStorageSize = (() => {
    let total = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  })();

  const visibleProfiles = getVisibleRemoteProfiles(remote);
  const remoteConfigured = visibleProfiles.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">{BRANDING.productName}</h1>
          <p className="text-blue-100 mt-1 text-sm">{BRANDING.tagline}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Build Info ── */}
        <Card>
          <H2>Build Information</H2>
          <div className="divide-y divide-gray-100">
            <Badge label="Version"    value={harnessConfig?.harnessVersion  ?? 'Loading…'} mono />
            <Badge
              label="Build Date"
              value={harnessConfig?.harnessBuiltAt
                ? new Date(harnessConfig.harnessBuiltAt).toLocaleString()
                : 'Loading…'}
            />
          </div>
        </Card>

        {/* ── What This Tool Is ── */}
        <Card>
          <H2>What Is {BRANDING.productName}?</H2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            {BRANDING.productName} is a lightweight developer harness embedded directly in your
            .NET application via <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">MapApiTestSpark()</code>.
            It serves a React SPA at <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">/api-test-spark/</code> and
            provides two main capabilities:
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Host API Explorer</strong> — autodiscovers and tests your own app's endpoints from its OpenAPI document.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Remote API Explorer</strong> — tests named external API profiles; server-configured specs use a credential-safe proxy and browser-created profiles stay local.</span>
            </li>
          </ul>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            Both explorers have a companion <strong>Doc Builder</strong> that captures live
            endpoint responses and exports markdown documentation.
          </p>
        </Card>

        {/* ── Remote API Architecture ── */}
        <Card>
          <H2>How Remote API Configuration Works</H2>

          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            The remote API feature has two distinct request paths, each with different security
            properties:
          </p>

          {/* Spec fetch */}
          <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Path 1 — Spec Fetch (server-side proxy)</p>
            </div>
            <div className="p-4 space-y-2 text-xs text-gray-700 leading-relaxed">
              <p>
                When a server-configured Remote API Explorer loads, the browser calls{' '}
                <code className="bg-gray-100 px-1 rounded font-mono">GET /api-test-spark/remote-spec?profileId=...</code>.
                This is a .NET endpoint that:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Validates the configured remote URL uses <code className="bg-gray-100 px-1 rounded font-mono">http://</code> or <code className="bg-gray-100 px-1 rounded font-mono">https://</code> (SSRF guard).</li>
                <li>Resolves only server-provided profile ids and adds the API key or Bearer token server-side.</li>
                <li>Fetches the remote OpenAPI JSON document.</li>
                <li>Returns it to the browser — credentials never appear in the browser's network tab.</li>
              </ol>
              <p className="text-gray-500 italic">
                Browser-created profiles fetch their OpenAPI document directly from the browser, so they cannot submit arbitrary URLs to the server proxy.
              </p>
            </div>
          </div>

          {/* Direct calls */}
          <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Path 2 — Endpoint Calls (direct from browser)</p>
            </div>
            <div className="p-4 space-y-2 text-xs text-gray-700 leading-relaxed">
              <p>
                When you click <strong>Send</strong> in the Remote API Explorer, the request goes
                directly from your browser to the remote server. The harness injects:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>All <strong>Default Request Headers</strong> (e.g. correlation IDs, session tokens).</li>
                <li>The <strong>API key header</strong> (if configured).</li>
                <li>An <code className="bg-gray-100 px-1 rounded font-mono">Authorization: Bearer …</code> header (if a Bearer token is configured).</li>
              </ul>
              <p className="text-gray-500 italic">
                The .NET CSP header is automatically extended to include the remote base URL, so
                the browser permits these cross-origin calls without requiring a CORS preflight
                change on the remote server.
              </p>
            </div>
          </div>

          {/* Priority */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 leading-relaxed">
            <p className="font-bold mb-1">Configuration Priority</p>
            <p>
              Browser profiles set on the{' '}
              <Link to="/config" className="underline">Config page</Link>{' '}
              are stored in <code className="bg-blue-100 px-1 rounded font-mono">localStorage</code>.
              Profiles configured in <code className="bg-blue-100 px-1 rounded font-mono">Program.cs</code> are
              shown first and can be hidden locally without exposing server-held credentials.
            </p>
          </div>
        </Card>

        {/* ── Current Remote Config Status ── */}
        <Card>
          <H2>Current Remote Configuration</H2>
          <p className="text-sm text-gray-500 mb-3">
            Reflects what is active in this browser session right now.{' '}
            <Link to="/config" className="text-blue-600 hover:underline">Edit on the Config page →</Link>
          </p>

          {remoteConfigured ? (
            <div className="space-y-0 divide-y divide-gray-100">
              {visibleProfiles.map((profile) => {
                const headerCount = Object.keys(profile.remoteDefaultHeaders ?? {}).length;
                return (
                  <Badge
                    key={profile.id}
                    label={profile.name || 'Remote API'}
                    value={`${profile.source === 'server' ? 'Program.cs' : 'browser'} • ${profile.remoteBaseUrl || profile.remoteOpenApiUrl || 'not set'} • ${headerCount} header${headerCount === 1 ? '' : 's'}`}
                    mono
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
              No remote API configured.{' '}
              <Link to="/config" className="text-blue-600 hover:underline">Set it up on the Config page</Link>{' '}
              or add values to <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">MapApiTestSpark()</code> in{' '}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">Program.cs</code>.
            </div>
          )}

          {/* Server defaults */}
          {harnessConfig?.remoteBaseUrl && (
            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Server defaults (from Program.cs)</p>
              <p className="font-mono break-all">{harnessConfig.remoteBaseUrl}</p>
            </div>
          )}
        </Card>

        {/* ── Storage ── */}
        <Card>
          <H2>Browser Storage</H2>
          <div className="divide-y divide-gray-100">
            <Badge
              label="Total localStorage used"
              value={`${(localStorageSize / 1024).toFixed(2)} KB`}
              mono
            />
            <Badge
              label="Remote config key"
              value="api-test-spark-remote-config"
              mono
            />
            <Badge
              label="Unified config key"
              value="api-test-spark-config"
              mono
            />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            All configuration is stored in browser <code className="bg-gray-100 px-1 rounded font-mono">localStorage</code> only.
            Nothing is sent to any analytics or telemetry service.
            Credential values (API keys, tokens) are stored in plaintext in localStorage —
            suitable for local development machines, not shared or public computers.
          </p>
        </Card>

        {/* ── System Info ── */}
        <Card>
          <H2>System Information</H2>
          <div className="divide-y divide-gray-100">
            <Badge label="Browser"  value={navigator.userAgent.split(' ').slice(-2).join(' ')} />
            <Badge label="Language" value={navigator.language} />
          </div>
        </Card>

      </div>
    </div>
  );
};
