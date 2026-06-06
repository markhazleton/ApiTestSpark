# Research: Remote OpenAPI Configuration

**Feature**: `002-remote-openapi-config` | **Date**: 2026-06-05

## Decision Log

### CORS Strategy

- **Decision**: Fetch the remote OpenAPI document server-side via a new .NET proxy endpoint (`GET /api-test-spark/remote-spec`)
- **Rationale**: Browser CORS restrictions would silently block cross-origin fetches from many real-world API servers. Server-side fetch sidesteps CORS entirely and keeps credentials off the browser network tab — a meaningful security improvement at no functional cost.
- **Alternatives considered**: Direct browser fetch (blocked by CORS on most servers); automatic fallback from browser to proxy (complex, confusing failure modes)

### Credential Scope

- **Decision**: Per-environment — stored under each environment entry in `useUnifiedConfigStore`
- **Rationale**: Consistent with how all other config (base URLs, auth tokens for the API under test) works in the store. Teams may legitimately use different API keys against a staging vs. production OpenAPI spec URL.
- **Alternatives considered**: Global single credential set (simpler but breaks multi-env workflows)

### Seed Priority (Program.cs vs. persisted UI value)

- **Decision**: Persisted UI value always wins; `Program.cs` value seeds only when no persisted value exists for that environment field
- **Rationale**: Silently overwriting user-saved config on every reload would be destructive and surprising. The startup config is a convenience default, not an enforcement mechanism.
- **Alternatives considered**: Startup always wins (destructive); conflict UI prompt (high friction for a dev tool)

### UI Editability of Pre-Configured Values

- **Decision**: All fields always editable regardless of source
- **Rationale**: Pre-configured values are defaults, not policy. Developers need to be able to temporarily change them without restarting the host app.
- **Alternatives considered**: Read-only when sourced from startup (too restrictive); reset button (adds complexity without proportional value)

### Proxy Endpoint Protection

- **Decision**: No additional protection — same open trust model as all `/api-test-spark/*` endpoints
- **Rationale**: The harness is a local developer tool; adding auth to the proxy adds friction with no meaningful security gain in the intended deployment context.
- **Documented assumption**: The harness MUST NOT be exposed to the public internet. This is consistent with all other harness endpoints and the existing CSP/CORS posture.
- **Alternatives considered**: Same-origin check via Referer header (spoofable, adds complexity); host app auth middleware participation (breaks standalone dev use)

### React API Client Pattern

- **Decision**: Pattern B (`createRestCaller`) for `remoteOpenApiClient.ts`
- **Rationale**: No constructor-level config or cancellation needed — the caller just hits one endpoint (`/api-test-spark/remote-spec`). `createRestCaller` is the lighter pattern and matches the simpler clients in the codebase.
- **Alternatives considered**: Pattern A (`ApiClient` subclass) — more boilerplate than needed for a single-endpoint client

### Store Approach

- **Decision**: Extend existing `useUnifiedConfigStore` with four new optional fields per environment + four new actions
- **Rationale**: Remote OpenAPI config is per-environment API config — exactly the concern `useUnifiedConfigStore` owns. Creating a new store would violate the one-concern-per-store principle (Constitution §V).
- **Alternatives considered**: New `useRemoteOpenApiStore` — rejected as it splits what is logically one config concern across two stores

### Credential Storage in localStorage (plain text)

- **Decision**: Credential values (`remoteOpenApiApiKeyValue`, `remoteOpenApiBearerToken`) are persisted as plain-text JSON in localStorage via the `useUnifiedConfigStore` Zustand `persist` middleware — no additional encryption is applied
- **Rationale**: ApiTestSpark is a local developer tool. The data is already on the developer's own machine. Adding client-side encryption (e.g., Web Crypto) would add complexity with marginal security benefit in the local-dev-tool context, and the credentials are masked in the UI. The harness must not be deployed to public-facing servers; if it is, the broader open-trust-model of all harness endpoints is the more significant risk.
- **Explicit trade-off**: This decision is recorded here and in spec Constraints so implementers and reviewers know it was deliberate, not an oversight.
- **Alternatives considered**: Web Crypto AES encryption of credential fields (rejected — complexity, key storage problem, no meaningful gain for local tool); not persisting credential fields at all (rejected — would require re-entry on every page reload, defeating the startup-seed use case)

### Proxy Credential Source — Startup Config Only

- **Decision**: The `.NET` proxy endpoint (`GET /api-test-spark/remote-spec`) reads credentials from `ApiTestSparkOptions` at request time, not from `useUnifiedConfigStore`. UI-edited credentials take effect only after the `.NET` host is restarted.
- **Rationale**: The primary motivation for using a server-side proxy is to keep credentials off the browser network tab. If the proxy accepted credentials from the React caller (e.g., as request headers), those credentials would appear in the browser's network panel on every proxy call, defeating the design. The startup-config-only approach is a deliberate constraint, not an oversight.
- **Impact on UX**: Users who change credentials in the UI see the change persisted to localStorage and surviving page reloads — but the proxy uses the old startup values until restart. This is documented as a known limitation in the UI near the credential fields and in spec Constraints.
- **Alternatives considered**: Passing credentials as encrypted request headers to the proxy (rejected — still visible in network tab, key management problem); storing credentials in a server-side session (rejected — overkill for a local tool, adds server-side state management)

### Zustand Persist Migration Strategy

- **Decision**: Bump the `useUnifiedConfigStore` persist version when adding the four new optional fields to `ApiConfigSet`; write a non-destructive migration function that preserves all existing fields and defaults new fields to `undefined`
- **Rationale**: The existing `migrate` handler uses `createDefaultConfig()` which wipes all saved config on version change. If the version is not bumped when `ApiConfigSet` shape changes, Zustand will attempt to rehydrate old persisted data into the new type — TypeScript strict mode will catch most issues at compile time, but optional fields defaulting silently is the correct behavior.
- **Alternatives considered**: Not bumping the version (rejected — undefined behavior on rehydration, potential for subtle bugs); wiping config on migration (rejected — destroys existing user config unnecessarily)

### SSRF Prevention on Proxy Endpoint

- **Decision**: Validate `RemoteOpenApiUrl` scheme before making any outbound `HttpClient` call; reject non-`http://`/`https://` schemes with `400`
- **Rationale**: `HttpClient` behavior on non-HTTP schemes is implementation-dependent. A `file://` or `ldap://` URL would either throw, silently no-op, or access local filesystem/directory resources. Even though `RemoteOpenApiUrl` is set by the developer in `Program.cs` (not by an end user), validating the scheme is a defense-in-depth measure and documents the intended scope of the proxy.
- **Alternatives considered**: No validation (rejected — SSRF surface for shared/container deployments); allow-list of specific domains (rejected — overly restrictive, breaks legitimate use cases)

### Existing OpenAPI Parser Reuse

- **Decision**: Reuse `src/utils/openApiParser.ts` to parse the remote document
- **Rationale**: The parser already handles `DiscoveredEndpoint[]` extraction from an OpenAPI JSON document. The remote document is the same format as the local one — no new parser needed.
- **Impact**: Zero parser changes required; `useRemoteOpenApi` hook feeds the parsed result into `useHarnessConfigStore.setEndpoints()`
