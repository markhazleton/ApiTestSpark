import React from 'react';
import { Link } from 'react-router-dom';
import { getVisibleRemoteProfiles, useRemoteConfigStore } from '../store/remoteConfigStore';
import { useHarnessConfigStore } from '../store/harnessConfigStore';
import { BRANDING } from '../utils';

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="brand-card rounded-md p-6">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-black text-[#040605] mb-4">{children}</h2>;
}

function Badge({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className={`text-sm text-[#040605] ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</span>
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
    <div className="min-h-screen bg-transparent">
      {/* Hero */}
      <div className="brand-shell text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d9aaa0]">{BRANDING.productFamily}</p>
          <h1 className="text-2xl font-black mt-1">{BRANDING.productName}</h1>
          <p className="text-stone-200 mt-1 text-sm">{BRANDING.tagline}</p>
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
          <p className="text-sm text-stone-700 leading-relaxed mb-4">
            {BRANDING.productName} is a lightweight developer harness embedded directly in your
            .NET application via <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">MapApiTestSpark()</code>.
            It serves a React SPA at <code className="text-xs bg-[#f7e6e1] px-1 py-0.5 rounded font-mono">/api-test-spark/</code> and
            provides two main capabilities:
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            <li className="flex gap-2">
              <span className="text-[#982407] font-bold shrink-0">1.</span>
              <span><strong>Host API Explorer</strong> — autodiscovers and tests your own app's endpoints from its OpenAPI document.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[#982407] font-bold shrink-0">2.</span>
              <span><strong>Remote API Explorer</strong> — tests named external API profiles; server-configured specs use a credential-safe proxy and browser-created profiles stay local. Profiles can authenticate with a static API key/Bearer token, a browser-side OAuth2 token configured per Environment, or a server-acquired OAuth2 <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">client_credentials</code> token that never reaches the browser.</span>
            </li>
          </ul>
          <p className="text-sm text-stone-700 leading-relaxed mt-3">
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
                <li>Resolves only server-provided profile ids and adds the API key or Bearer token server-side — or, if the profile has an <code className="bg-gray-100 px-1 rounded font-mono">OAuth</code> config, acquires and caches a <code className="bg-gray-100 px-1 rounded font-mono">client_credentials</code> access token itself.</li>
                <li>Fetches the remote OpenAPI JSON document.</li>
                <li>Returns it to the browser — credentials never appear in the browser's network tab.</li>
              </ol>
              <p className="text-gray-500 italic">
                Browser-created profiles fetch their OpenAPI document directly from the browser, so they cannot submit arbitrary URLs to the server proxy.
              </p>
            </div>
          </div>

          {/* Endpoint calls */}
          <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Path 2 — Endpoint Calls</p>
            </div>
            <div className="p-4 space-y-2 text-xs text-gray-700 leading-relaxed">
              <p>
                Requests are direct from the browser by default and require the remote API to allow CORS.
                A server-configured profile can opt into the server-side
                <code className="bg-gray-100 px-1 rounded font-mono"> /api-test-spark/remote-call</code> proxy,
                which avoids browser CORS restrictions. The configured request headers and credentials are applied
                server-side:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>All <strong>Default Request Headers</strong> (e.g. correlation IDs, session tokens).</li>
                <li>The <strong>API key header</strong> (if configured).</li>
                <li>An <code className="bg-gray-100 px-1 rounded font-mono">Authorization: Bearer …</code> header — from either a static Bearer token or a server-acquired OAuth token, if either is configured.</li>
              </ul>
              <p className="text-gray-500 italic">
                Enable this only for trusted, server-configured targets: the host can make requests on the
                user&apos;s behalf. The proxy accepts only a configured profile and its configured origin; browser-created
                profiles always remain direct. This proxy is also required for an OAuth-configured profile's
                endpoint calls to actually carry the server-acquired token — the token is only ever attached
                server-side and is never sent to the browser.
              </p>
            </div>
          </div>

          {/* Priority */}
          <div className="rounded-md border border-[#d9aaa0] bg-[#fff7f5] p-4 text-xs text-[#741b05] leading-relaxed">
            <p className="font-bold mb-1">Configuration Priority</p>
            <p>
              Browser profiles set on the{' '}
              <Link to="/config" className="underline">Config page</Link>{' '}
              are stored in <code className="bg-[#f7e6e1] px-1 rounded font-mono">localStorage</code>.
              Profiles configured in <code className="bg-[#f7e6e1] px-1 rounded font-mono">Program.cs</code> are
              shown first and can be hidden locally without exposing server-held credentials.
            </p>
          </div>
        </Card>

        {/* ── Current Remote Config Status ── */}
        <Card>
          <H2>Current Remote Configuration</H2>
          <p className="text-sm text-gray-500 mb-3">
            Reflects what is active in this browser session right now.{' '}
            <Link to="/config" className="text-[#982407] hover:underline">Edit on the Config page →</Link>
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
              <Link to="/config" className="text-[#982407] hover:underline">Set it up on the Config page</Link>{' '}
              or add values to <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">MapApiTestSpark()</code> in{' '}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">Program.cs</code>.
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
