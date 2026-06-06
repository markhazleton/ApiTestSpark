---
classification: quick-spec
risk_level: high
target_workflow: specify-light
required_artifacts: intent, action-plan
recommended_next_step: plan
required_gates: checklist
---

# Quick Specification: Remote OpenAPI Configuration

**Feature Branch**: `002-remote-openapi-config`
**Created**: 2026-06-05
**Status**: Complete
**Input**: User description: "Add new configuration for remote open api json, that is pointing to a remote open api json file on a server and configures the tool to use that api"

## Intent

Developers who host their OpenAPI specification at a remote URL (e.g., `https://myserver.com/openapi.json`) currently cannot point ApiTestSpark at that remote document directly. They must rely solely on the document auto-discovered from the embedded .NET host. This feature adds a "Remote OpenAPI URL" configuration field that lets users provide a URL to any OpenAPI JSON document served on a remote server. When a remote URL is configured, the tool fetches and parses the remote document and uses its endpoints, base URL, and schema for API testing — replacing or supplementing the locally discovered document.

This matters because teams often run ApiTestSpark against APIs they do not own or whose OpenAPI spec is served from a different host (partner services, staging environments, third-party APIs).

## Scope

- **In scope**:
  - A new configuration field for a remote OpenAPI JSON URL in the configuration UI
  - Optional auth credentials per remote URL: an API key (configurable header name + value) and/or a Bearer token — user selects whichever applies
  - Pre-configuring the remote URL and credentials in `Program.cs` via `ApiTestSparkOptions` so they are set at startup without requiring manual UI entry
  - The .NET harness exposes the pre-configured remote options through the existing `/api-test-spark/config` endpoint so the React app can seed its config store on load
  - Persisting user-entered or pre-seeded remote URL and credentials via the existing `useUnifiedConfigStore` (per-environment)
  - Fetching the remote OpenAPI document when the URL is set and non-empty, injecting the configured auth header(s)
  - Replacing the discovered-endpoints list with endpoints parsed from the remote document
  - Displaying the source of the loaded OpenAPI spec (remote vs. local) in the UI
  - Clearing / resetting to local discovery when the remote URL is removed
- **Out of scope**:
  - Basic auth (username/password) for fetching the remote OpenAPI document
  - Support for YAML-format OpenAPI documents (JSON only in this iteration)
  - Validating that the remote document is a well-formed OpenAPI 3.x spec beyond what the existing parser handles
  - Merging remote and local endpoint lists (remote replaces local when set)
  - A new Zustand store — the remote URL and its credentials are stored in the existing config store

## Constraints

- All observability (fetch errors, parse failures, missing URL) MUST route through `useDebugStore.addError()` using the `'Configuration'` error category — no `console.log` or `console.error` (Constitution §VI)
- The remote URL field MUST be stored per-environment in `useUnifiedConfigStore` via a store action — no direct state assignment (Constitution §V)
- The remote OpenAPI document MUST be fetched server-side via a new .NET proxy endpoint (e.g., `/api-test-spark/remote-spec`) — the React app requests the proxy, not the remote URL directly; this eliminates CORS issues and keeps credentials off the browser network tab
- The proxy endpoint uses the stored credentials to call the remote server; it returns the parsed JSON to the React app (Constitution §IV)
- The remote URL and its credentials are configuration values — API keys and Bearer tokens MUST be stored in the existing config store via store actions, MUST NOT be embedded in the URL itself, and MUST NOT be logged or forwarded to the debug store or App Insights (Constitution §VIII, §VI)
- Credential fields (API key value, Bearer token) MUST be treated as sensitive: masked in the UI by default (password-style input) and excluded from any observability output
- Credential values are persisted as plain-text JSON in localStorage via `useUnifiedConfigStore` — this is an explicit and acceptable trade-off for a local developer tool that MUST NOT be exposed to the public internet; no additional encryption is applied
- **Known limitation — proxy credential source**: the `.NET` proxy endpoint reads credentials from `ApiTestSparkOptions` (startup configuration), not from `useUnifiedConfigStore`. UI-entered or UI-edited credential values are persisted in the store and survive page reloads, but do not reach the proxy until the `.NET` host is restarted with updated `Program.cs` values. This is by design — passing credentials from the React caller to the proxy would put them on the browser network tab, violating the CORS/credential-off-browser constraint. This limitation must be documented in the UI (e.g., a tooltip or note on the credential fields)
- `RemoteOpenApiUrl` MUST begin with `http://` or `https://` — the proxy endpoint validates the scheme and rejects other schemes (e.g., `file://`, `ldap://`) with a `400` response to prevent SSRF to non-HTTP targets
- TypeScript strict mode MUST remain satisfied; ESLint MUST pass with zero errors after implementation (Constitution §I, §II)
- Layer separation MUST be maintained: the fetch client belongs in `src/api/`, the hook in `src/hooks/`, the UI in `src/components/` (Constitution §III)
- The `/api-test-spark/remote-spec` proxy endpoint carries the same open trust model as all other harness endpoints — it MUST be documented that the harness is intended for local/trusted development environments only, not exposed to the public internet

## Action Plan

1. **Extend `ApiTestSparkOptions` (.NET)** — add optional properties: `RemoteOpenApiUrl`, `RemoteOpenApiApiKeyHeader`, `RemoteOpenApiApiKeyValue`, `RemoteOpenApiBearerToken`; update `PublicAPI.Shipped.txt` and make a `SEMVER: MINOR` decision
2. **Expose via `/api-test-spark/config`** — include the remote OpenAPI options in the `HarnessConfig` JSON response so the React app can read pre-configured values on startup; credentials MUST be included (the endpoint is served only to the local dev session) — document this trust boundary
3. **Extend the React config type** — add the same optional fields to the per-environment config type in `src/types/`; re-export from `src/types/index.ts`
4. **Update the config store** — add store actions to `useUnifiedConfigStore` for setting the remote URL and each credential field independently; seed from `HarnessConfig` on load if values are present and no persisted value already exists; ensure all fields are persisted
5. **Add a .NET proxy endpoint** — add `GET /api-test-spark/remote-spec` to the harness; it reads the configured `RemoteOpenApiUrl` and credentials, fetches the remote document server-side, and returns the JSON to the caller — credentials never reach the browser
6. **Create a React API client** — add `src/api/remoteOpenApiClient.ts` using `createRestCaller` (Pattern B) to call `/api-test-spark/remote-spec` (the proxy); re-export from `src/api/index.ts`
7. **Create a hook** — add `src/hooks/useRemoteOpenApi.ts` using `useMutation` that calls the proxy client, parses the result through the existing `openApiParser`, routes errors to the debug store, and returns the parsed endpoint list; re-export from `src/hooks/index.ts`
8. **Update the config UI** — add a "Remote OpenAPI" configuration panel to the existing configuration screen with: a URL field, an API Key section (header name + masked key value), and a Bearer Token section (masked token value); all fields are always editable regardless of whether values were pre-configured at startup; wire each field to its store action; show the active source (remote / local)
9. **Wire into endpoint discovery** — in the harness config flow, prefer the remote document over locally discovered endpoints when the remote URL is set and the fetch succeeds; fall back to local discovery on failure (error logged to debug store, credentials never included in error messages)
10. **Add .NET integration tests** — cover `ApiTestSparkOptions` serialization of remote config fields and their presence in the `/api-test-spark/config` response; run `dotnet test ApiTestSpark.Tests`
11. **Validate all quality gates** — run `npm run lint`, `npm run verify`, `dotnet build ApiTestSpark`, `dotnet test ApiTestSpark.Tests`; confirm all four pass

## Validation Notes

- Configuring a valid `http://` or `https://` remote OpenAPI URL (no auth) causes the endpoint list to refresh and display endpoints from the remote document
- Configuring a `file://` or other non-HTTP URL returns a `400` error and the endpoint list is not updated
- Configuring a valid remote URL with an API key causes the fetch to include the configured header; the endpoint list populates correctly
- Configuring a valid remote URL with a Bearer token causes the fetch to include `Authorization: Bearer <token>`; the endpoint list populates correctly
- Configuring an invalid or unreachable URL shows an error in the debug panel (category `'Configuration'`) and retains the previously loaded endpoint list — credentials are not included in the error message
- Clearing the remote URL (via the "Clear" button or by emptying the URL field) reverts the tool to locally discovered endpoints and clears all four credential fields atomically — stale credentials are not left in storage
- UI credential changes (API key, Bearer token) are saved to the store and persist across page reloads, but do not affect the proxy's outbound auth headers until the `.NET` host is restarted; the UI indicates this limitation near the credential fields
- Credential fields (API key value, Bearer token) are masked in the UI; their values do not appear in the debug panel or any logged output
- When `options.RemoteOpenApiUrl` is set in `Program.cs`, the React app loads with the remote URL and credentials already populated — no manual UI entry required
- Pre-configured values appear in the `/api-test-spark/config` response; the React app seeds `useUnifiedConfigStore` from them on first load if no persisted value overrides them
- The configuration (URL + credentials) persists across page reloads (stored in `useUnifiedConfigStore`)
- The UI clearly indicates whether the current endpoint list came from a remote URL or from local discovery
- `npm run verify` (tsc -b + vite build) passes with zero TypeScript errors
- `npm run lint` passes with zero ESLint errors

## Clarifications

### Session 2026-06-05

- Q: Should auth credentials for fetching the remote OpenAPI JSON be supported? → A: Yes — both an API key (configurable header name + value) and a Bearer token. User selects whichever applies. Basic auth is excluded.
- Q: Should remote OpenAPI options be configurable at startup in `Program.cs` via `ApiTestSparkOptions`, not only through the UI? → A: Yes — `ApiTestSparkOptions` should expose `RemoteOpenApiUrl` and the corresponding credential properties alongside the existing `OpenApiUrl`, `Environments`, and `EnableDemoIntegrations` options. Pre-configured values seed the React config on load.
- Q: How should CORS be handled when fetching the remote OpenAPI document? → A: Option B — fetch server-side via a new .NET proxy endpoint (e.g., `/api-test-spark/remote-spec`). The React app calls the proxy; the proxy forwards credentials and returns the JSON. No browser-side cross-origin request is made.
- Q: Are remote OpenAPI credentials (API key, Bearer token) stored per-environment or globally? → A: Per-environment — stored alongside the remote URL under each environment entry in `useUnifiedConfigStore`, consistent with all other config in the store.
- Q: When `Program.cs` pre-configures a remote URL and the user has a different persisted value, which wins on load? → A: Persisted UI value always wins — the `Program.cs` value seeds only when no persisted value exists for that environment.
- Q: Can users edit or clear pre-configured remote OpenAPI values in the UI? → A: Always editable — pre-configured values appear as editable defaults; user changes persist and are not overwritten on subsequent loads.
- Q: Does the `/api-test-spark/remote-spec` proxy endpoint require additional protection? → A: No — same open trust model as all other `/api-test-spark/*` endpoints; the spec documents the assumption that the harness is only accessible in a local/trusted dev environment.

### Session 2026-06-06 (gate findings resolution)

- Q: What does "clearing" the remote URL write to the store — `undefined` or `''`? → A: `undefined`. This makes cleared fields re-seed-eligible from `Program.cs` values on next page load, which is the expected behavior (clear = "return to startup default"). An empty string would permanently block re-seeding.
- Q: Do UI-entered credentials immediately reach the proxy, or only after a host restart? → A: Restart only. The proxy reads credentials from `ApiTestSparkOptions` at request time, not from `useUnifiedConfigStore`. Passing credentials from the React caller to the proxy would put them on the browser network tab, defeating the CORS-avoidance design. This is a known limitation, documented in the UI near the credential fields.
- Q: Are credential values stored in plain text in localStorage acceptable? → A: Yes — explicit and acceptable trade-off for a local developer tool. The harness must not be exposed to the public internet. No additional encryption is applied; the spec now documents this decision explicitly.
