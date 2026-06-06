# Implementation Plan: Remote OpenAPI Configuration

**Branch**: `002-remote-openapi-config` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.documentation/specs/002-remote-openapi-config/spec.md`

## Summary

Add support for pointing ApiTestSpark at a remote OpenAPI JSON document via a configurable URL, optional API key, and optional Bearer token — all settable in `Program.cs` at startup and editable in the UI. The remote document is fetched server-side via a new .NET proxy endpoint (`GET /api-test-spark/remote-spec`) to avoid CORS and keep credentials off the browser network tab. The React app calls the proxy, parses the returned JSON through the existing OpenAPI parser, and uses the resulting endpoints in place of locally discovered ones. Credentials are stored per-environment in `useUnifiedConfigStore` and persisted across reloads; `Program.cs` values seed only when no persisted value exists.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19 / Vite 8) + C# / .NET 10
**Primary Dependencies**: Zustand 5 (persist), TanStack Query 5, `createRestCaller` (Pattern B), MSTest
**Storage**: localStorage via `useUnifiedConfigStore` (persist middleware, key `api-test-spark-config`)
**Testing**: MSTest integration tests (`ApiTestSpark.Tests/`) for all .NET changes; TypeScript strict + ESLint for React
**Target Platform**: Browser SPA embedded in ASP.NET Core Minimal API via NuGet
**Project Type**: Dual-artifact — React SPA (`src/`) + .NET NuGet library (`ApiTestSpark/`)
**Performance Goals**: Proxy fetch should complete within normal HTTP timeout; no additional latency budget required
**Constraints**: No raw `fetch` in React hooks/components; credentials never reach browser network tab; SEMVER: MINOR for `ApiTestSparkOptions` public API change
**Scale/Scope**: Single developer tool session; no concurrency concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
*Constitution version: 1.1.1 — see `.documentation/memory/constitution.md`*

| # | Gate | Status | Notes |
|---|------|--------|-------|
| I | `npm run verify` (tsc -b + vite build) MUST pass — zero TypeScript errors | ✅ PLANNED | New types are strict-typed; no `any`; optional fields use `?:` |
| II | `npm run lint` MUST pass — zero ESLint errors (`react-hooks/exhaustive-deps` enforced) | ✅ PLANNED | Hook deps will be declared correctly; no console.log |
| III | Layer separation: types → api client → hook → component + barrel exports | ✅ PLANNED | Each new file added to its layer barrel; see Source Structure below |
| IV | API client uses `createRestCaller` (Pattern B), per-call, UUID-correlated, debug callbacks | ✅ PLANNED | `remoteOpenApiClient.ts` uses `createRestCaller`; callbacks injected from debug store |
| V | Zustand: one concern per store, action-gated, FIFO limits respected | ✅ PLANNED | New fields added to existing `useUnifiedConfigStore` via new actions only; no new store |
| VI | No `console.log` in `src/`; all errors via `useDebugStore.addError()` category `'Configuration'` | ✅ PLANNED | All fetch/parse errors routed through debug store; credentials excluded from messages |
| VIII | No PII/PHI in types, stores, logs, or test data | ✅ PLANNED | Credential fields are config strings, not PII; test data uses synthetic URLs |

*Gate VII (React testing stance) is aspirational — not a blocking gate. .NET integration tests are required (Gate VII .NET).*

**Post-Phase-1 re-check**: All gates remain clear after design. No constitution waivers required.

## Project Structure

### Documentation (this feature)

```text
.documentation/specs/002-remote-openapi-config/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   ├── remote-spec-proxy.md    ← proxy endpoint contract
│   └── harness-config-delta.md ← HarnessConfig additions
└── tasks.md             ← Phase 2 output (devspark.tasks)
```

### Source Code

```text
# .NET library additions
ApiTestSpark/
├── ApiTestSparkOptions.cs          ← add RemoteOpenApiUrl, RemoteOpenApiApiKeyHeader,
│                                      RemoteOpenApiApiKeyValue, RemoteOpenApiBearerToken
├── ApiTestSparkExtensions.cs       ← add GET /api-test-spark/remote-spec proxy route;
│                                      expose remote fields in /api-test-spark/config response
└── PublicAPI.Shipped.txt           ← update for new public properties (SEMVER: MINOR)

ApiTestSpark.Tests/
└── HarnessIntegrationTests.cs      ← add tests: remote config round-trip, proxy route,
                                       credential non-exposure, seed-on-first-load behaviour

# React SPA additions (all layers)
src/types/
├── harness-config.ts               ← extend HarnessConfig + add RemoteOpenApiConfig type
└── index.ts                        ← re-export (already does wildcard, no change needed)

src/store/
└── unifiedConfigStore.ts           ← add remoteOpenApiUrl, remoteOpenApiApiKeyHeader,
                                       remoteOpenApiApiKeyValue, remoteOpenApiBearerToken
                                       fields to per-environment shape + 4 new actions

src/api/
├── remoteOpenApiClient.ts          ← new: createRestCaller calling /api-test-spark/remote-spec
└── index.ts                        ← re-export remoteOpenApiClient

src/hooks/
├── useRemoteOpenApi.ts             ← new: useMutation → proxy client → openApiParser
└── index.ts                        ← re-export useRemoteOpenApi

src/components/
└── harness-config/                 ← extend existing config panel with Remote OpenAPI section
    └── RemoteOpenApiConfig.tsx     ← new sub-component: URL field + API Key panel + Bearer panel
    └── index.ts                    ← re-export
```

## Phase 0: Research

*See [research.md](research.md) for full findings. Key decisions:*

| Decision | Choice | Rationale |
|---|---|---|
| CORS strategy | .NET server-side proxy | Avoids browser CORS restrictions; keeps credentials off network tab |
| Credential scope | Per-environment in `useUnifiedConfigStore` | Consistent with all existing config; different envs may use different keys |
| Seed priority | Persisted UI value wins; `Program.cs` seeds only on first use | Prevents silent overwrite of user-saved config on every reload |
| UI editability | Always editable regardless of source | Pre-configured values are defaults, not enforcement points |
| Proxy auth | No additional protection | Same trust model as all `/api-test-spark/*` endpoints; local dev tool only |
| Client pattern | Pattern B (`createRestCaller`) | No constructor-level config needed; matches simpler client pattern in codebase |
| Store approach | Extend existing `useUnifiedConfigStore` | Single concern (per-env API config); no new store needed |

## Phase 1: Design & Contracts

### Data Model

*See [data-model.md](data-model.md) for full entity definitions.*

**New fields on `ApiConfigSet`** (per-environment config shape in `src/types/state.ts`):

```typescript
remoteOpenApiUrl?: string           // URL of remote OpenAPI JSON
remoteOpenApiApiKeyHeader?: string  // Header name for API key (e.g. "X-Api-Key")
remoteOpenApiApiKeyValue?: string   // API key value — never logged
remoteOpenApiBearerToken?: string   // Bearer token value — never logged
```

**New fields on `HarnessConfig`** (served by `/api-test-spark/config`):

```typescript
remoteOpenApiUrl?: string
remoteOpenApiApiKeyHeader?: string
remoteOpenApiApiKeyValue?: string   // included: endpoint is local-only trust boundary
remoteOpenApiBearerToken?: string   // included: same trust boundary
```

**New .NET properties on `ApiTestSparkOptions`**:

```csharp
public string? RemoteOpenApiUrl { get; set; }
public string? RemoteOpenApiApiKeyHeader { get; set; }
public string? RemoteOpenApiApiKeyValue { get; set; }
public string? RemoteOpenApiBearerToken { get; set; }
```

### Interface Contracts

*See [contracts/](contracts/) for full contract documents.*

**`GET /api-test-spark/remote-spec`** (new proxy endpoint):

- No request body; no query params
- Reads `RemoteOpenApiUrl` + credentials from `ApiTestSparkOptions` at request time
- Returns: `200 OK` with `Content-Type: application/json` — the raw remote OpenAPI JSON body
- Returns: `400 Bad Request` if `RemoteOpenApiUrl` is not configured
- Returns: `502 Bad Gateway` if the remote fetch fails (non-2xx or network error)
- Credentials are forwarded to the remote server; they are NOT included in error response bodies
- Same CORS and cache headers as other harness endpoints

**`GET /api-test-spark/config`** (existing endpoint — delta only):

- Adds `remoteOpenApiUrl`, `remoteOpenApiApiKeyHeader`, `remoteOpenApiApiKeyValue`, `remoteOpenApiBearerToken` to JSON response
- Null/absent when not configured in `ApiTestSparkOptions`

### Key Implementation Decisions

**Seeding logic** (React app boot):

```text
On HarnessConfig load:
  For each remote field (url, apiKeyHeader, apiKeyValue, bearerToken):
    If HarnessConfig.field is non-null AND store has no persisted value for this env+field:
      dispatch setRemoteOpenApiXxx(currentEnv, value)
```

**Endpoint discovery wiring**:

```text
If useUnifiedConfigStore.remoteOpenApiUrl is set for currentEnvironment:
  → call useRemoteOpenApi mutation → GET /api-test-spark/remote-spec
  → on success: replace harnessConfigStore.endpoints with parsed results
  → on failure: log to debugStore ('Configuration'), retain existing endpoints
Else:
  → use locally discovered endpoints (existing behaviour)
```

**Credential masking in UI**: `<input type="password">` for `remoteOpenApiApiKeyValue` and `remoteOpenApiBearerToken` fields. Display-only label shows header name but never value.

**CSP impact**: The proxy fetches from the .NET server (`self`), so no CSP changes are required. The remote server URL is never accessed directly from the browser.

## Complexity Tracking

No constitution violations. No waivers required.

| Concern | Resolution |
|---|---|
| Credentials in `/api-test-spark/config` response | Acceptable — endpoint is local-only (same trust as all harness routes); documented in XML doc comments on the credential properties in `ApiTestSparkOptions` |
| SEMVER: MINOR | `ApiTestSparkOptions` gains 4 new optional properties — additive, backward-compatible; `PublicAPI.Shipped.txt` must be updated before merge |
| Credentials persisted as plain-text JSON in localStorage | Explicit decision: acceptable for a local developer tool that must not be exposed to the public internet. No additional encryption applied. Recorded in research.md and spec Constraints. |
| Proxy credential source — startup config only | By design: proxy reads from `ApiTestSparkOptions`, not `useUnifiedConfigStore`. Passing credentials from React caller to proxy would expose them on the browser network tab. UI-edited credentials take effect on `.NET` host restart. This limitation is surfaced in the UI near credential fields and noted in spec Constraints. |
| Zustand persist migration version bump required | Adding new fields to `ApiConfigSet` requires bumping the store `version` and writing a non-destructive migration; handled in T013a. Without this, the existing `migrate: () => createDefaultConfig()` wipes all saved config on version change. |
| SPA middleware pass-through | The existing pass-through exempts only `/api-test-spark/config`. The new `/api-test-spark/remote-spec` route must also be exempted; handled in T010. |
| SSRF prevention | `RemoteOpenApiUrl` is validated to `http://` or `https://` scheme before any outbound call is made; handled in T010. |
