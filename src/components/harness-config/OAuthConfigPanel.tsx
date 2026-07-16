import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOAuthToken } from '../../hooks';
import type { Environment } from '../../types';

const ENVIRONMENTS: { id: Environment; label: string }[] = [
  { id: 'localhost', label: 'Localhost' },
  { id: 'test', label: 'Test' },
  { id: 'other', label: 'Other' },
];

function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) return '';
  return new Date(expiresAt).toLocaleTimeString();
}

/**
 * Global, per-Environment OAuth token configuration and acquisition panel.
 *
 * Lets a user configure a token endpoint plus application client credentials
 * (client_credentials grant) and, optionally, test user credentials with a distinct
 * client identity (password grant). Explicit "Get App Token" / "Get Test User Token"
 * actions always fetch a fresh token, overwriting any existing one (FR-016).
 */
export function OAuthConfigPanel() {
  const [env, setEnv] = useState<Environment>('localhost');
  const config = useAuthStore((state) => state.config[env]);
  const tokens = useAuthStore((state) => state.tokens);
  const updateAuthConfig = useAuthStore((state) => state.updateAuthConfig);
  const clearToken = useAuthStore((state) => state.clearToken);
  const isTokenValid = useAuthStore((state) => state.isTokenValid);
  const { acquireOAuthToken, isPending, error } = useOAuthToken();

  const token = tokens[env];
  // Re-derive validity on an interval so an expiring token flips to "expired" without a reload.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 5_000);
    return () => clearInterval(id);
  }, []);

  const [localError, setLocalError] = useState<string | null>(null);

  function field<K extends keyof typeof config>(key: K) {
    return {
      value: (config[key] as string) ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateAuthConfig(env, { [key]: e.target.value } as Partial<typeof config>),
    };
  }

  async function handleGetAppToken() {
    setLocalError(null);
    const result = await acquireOAuthToken(env, 'client_credentials');
    if (!result) {
      setLocalError('Unable to acquire an application token. Check the token endpoint, Client ID, and Client Secret.');
    }
  }

  async function handleGetTestUserToken() {
    setLocalError(null);
    const result = await acquireOAuthToken(env, 'password');
    if (!result) {
      setLocalError('Unable to acquire a test-user token. Check the test username/password (and user client ID/secret if set).');
    }
  }

  const validNow = isTokenValid(env);
  const tokenStatusLabel = !token.accessToken
    ? 'No token'
    : validNow
      ? `Valid until ${formatExpiry(token.expiresAt)}`
      : 'Expired';

  return (
    <section className="border border-gray-200 rounded bg-white p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-800">OAuth Token Configuration</h2>
        <div className="flex gap-1">
          {ENVIRONMENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEnv(e.id)}
              className={`text-xs font-semibold px-2 py-1 rounded ${
                env === e.id ? 'bg-[#982407] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Configure how to acquire a bearer token for APIs that require OAuth authentication. Use only
        synthetic/test credentials — never real production secrets (Constitution VIII).
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-base-url">
            Token Endpoint URL
          </label>
          <input
            id="oauth-base-url"
            type="url"
            placeholder="https://auth.example.com/oauth/token"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('baseUrl')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-description">
            Description
          </label>
          <input
            id="oauth-description"
            type="text"
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('description')}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-client-id">
            Client ID
          </label>
          <input
            id="oauth-client-id"
            type="text"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('clientId')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-client-secret">
            Client Secret
          </label>
          <input
            id="oauth-client-secret"
            type="password"
            autoComplete="off"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('clientSecret')}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGetAppToken}
          disabled={isPending}
          className="px-3 py-2 bg-[#982407] text-white rounded text-sm font-semibold hover:bg-[#741b05] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Acquiring…' : 'Get App Token'}
        </button>
      </div>

      <hr className="border-gray-100" />

      <p className="text-xs font-semibold text-gray-700">Test User (password grant) — optional</p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-user-client-id">
            User Client ID <span className="font-normal text-gray-400">(optional, falls back to Client ID)</span>
          </label>
          <input
            id="oauth-user-client-id"
            type="text"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('userClientId')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-user-client-secret">
            User Client Secret <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="oauth-user-client-secret"
            type="password"
            autoComplete="off"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('userClientSecret')}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-test-username">
            Test Username
          </label>
          <input
            id="oauth-test-username"
            type="text"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('testUsername')}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 block" htmlFor="oauth-test-password">
            Test Password
          </label>
          <input
            id="oauth-test-password"
            type="password"
            autoComplete="off"
            className="w-full font-mono text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#982407]"
            {...field('testPassword')}
          />
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Note: many identity providers (Entra ID, Okta, Auth0, Google) disable or deprecate the
        password grant by default — use a dedicated test-only app registration with it enabled.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGetTestUserToken}
          disabled={isPending}
          className="px-3 py-2 bg-[#982407] text-white rounded text-sm font-semibold hover:bg-[#741b05] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Acquiring…' : 'Get Test User Token'}
        </button>
      </div>

      {(localError || error) && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
          {localError ?? (error instanceof Error ? error.message : 'Token acquisition failed')}
        </div>
      )}

      <hr className="border-gray-100" />

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-semibold text-gray-700">Token status: </span>
          <span
            className={
              !token.accessToken
                ? 'text-gray-500'
                : validNow
                  ? 'text-green-700'
                  : 'text-amber-700'
            }
          >
            {tokenStatusLabel}
          </span>
          {token.acquiredVia && (
            <span className="text-gray-400 ml-1">({token.acquiredVia})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => clearToken(env)}
          disabled={!token.accessToken}
          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-40"
        >
          Clear Token
        </button>
      </div>
    </section>
  );
}
