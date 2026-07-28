# Quickstart: OAuth Token Configuration for API Authentication

**Feature**: `001-oauth-token-config`

This is an internal-only SPA feature (no new public interface/contract is exposed by the
`ApiTestSpark` NuGet package or its endpoints in this iteration — see spec Out of Scope). This
quickstart describes how to exercise the feature manually once implemented; there is no `contracts/`
directory because there is no external interface change.

## Manual verification flow

1. Start the dev server: `.\scripts\build\dev.ps1`.
2. Open the Config screen, select an Environment (e.g. `test`).
3. In the new OAuth section, enter a token endpoint URL, Client ID, and Client Secret for an
   OAuth2-compatible `client_credentials` provider. Click **Get App Token**. Confirm the token
   status shows "valid until …".
4. Optionally enter Test Username/Password (and User Client ID/Secret if the provider needs a
   different client identity for the resource-owner flow). Click **Get Test User Token**. Confirm
   a token is acquired.

   > **Password grant support caveat**: many modern OAuth/OIDC providers (Microsoft Entra ID,
   > Okta, Auth0, Google) disable or deprecate the Resource Owner Password Credentials (password)
   > grant by default per OAuth 2.1 guidance. If step 4 fails with `unsupported_grant_type`, this
   > is a provider configuration gap, not a tool defect — use a dedicated test-only app
   > registration with the password grant explicitly enabled, never a production app registration.
5. Refresh the browser page. Confirm the token status still shows "valid" (FR-015 — persisted).
6. Open (or create) a Remote API profile pointed at an endpoint that requires a bearer token.
   Enable "Use environment OAuth token". Fire a request from the Endpoint Explorer. Open the debug
   panel and confirm the request's `Authorization` header carries the OAuth-acquired token, not any
   manually entered static Bearer Token.
7. In the same debug panel, inspect the captured **token acquisition** request from steps 3/4 and
   confirm the Client Secret / User Client Secret / Test Password values appear redacted
   (`***redacted***`), never in plaintext — this is the fix for a SHOWSTOPPER finding
   (gates/critic.md critic-001); do not sign off on this feature if a secret value is visible here.
8. Click **Clear Token**. Fire the same request again. Confirm the request is blocked with a clear
   error (FR-014) rather than being sent unauthenticated.
9. Acquire a **test-user (password grant)** token, then click **Clear Token** again (or wait for it
   to expire). Fire an opted-in request and confirm the system blocks it per FR-014 — it must
   **not** silently re-run the password grant with the stored test credentials (FR-009).
10. Switch the active Environment. Confirm no token from the previous environment is ever attached
    to a request made under the new environment (FR-010).

## Security reminder

Per Constitution VIII, use only synthetic test credentials (e.g., a disposable test-tenant
client secret / a dedicated non-production test user) — never real production secrets or real
personal credentials, since these fields are visible in the browser and (for errors) may be
forwarded to the debug panel / Application Insights. Token-acquisition requests are exempt from
this general observability capture for their secret fields specifically — see step 7 above.
