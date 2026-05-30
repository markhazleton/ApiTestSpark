# Implementation Plan: Portable NuGet Package for API Test Spark

**Branch**: `001-nuget-portable-harness` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.documentation/specs/001-nuget-portable-harness/spec.md`

## Summary

Package the compiled React SPA (`build/`) as embedded resources inside a new .NET class library project (`ApiTestSpark.csproj`). The library exposes a `MapApiTestSpark()` extension method on `IEndpointRouteBuilder` that serves the SPA at `/api-test-spark/` and exposes a config endpoint at `/api-test-spark/config`. The SPA gains a startup config-fetch phase that reads the config endpoint to discover the host app's OpenAPI v3 document URL, auth scheme, and default headers, then renders discovered endpoints alongside the existing JokeAPI and JsonPlaceholder examples. Vite `base` is fixed at `/api-test-spark/`.

## Technical Context

### React SPA

- Language/Version: TypeScript ~6.0 / React 19 / Vite 8
- Build output: `build/` (index.html + `assets/` with content-hashed JS/CSS/icons)
- Current Vite `base`: not set (defaults to `/` — must change to `/api-test-spark/`)
- Router: `BrowserRouter` — must change to `basename="/api-test-spark"` when embedded
- State: Zustand 5 persist stores; debug store FIFO buffers preserved as-is
- Quality gates: `npm run lint` + `npm run verify` (tsc -b + vite build)

### .NET Package

- Language/Version: C# 13 / .NET 9
- Project type: Class library → NuGet package (`ApiTestSpark`)
- Key dependency: `Microsoft.AspNetCore.StaticFiles` (embedded file serving)
- No additional NuGet dependencies beyond ASP.NET Core framework
- Target framework: `net9.0` (Minimal API pattern, `IEndpointRouteBuilder`)
- Logging: `Microsoft.Extensions.Logging.Abstractions` (ILogger — framework-provided)

### Build Pipeline

- React build runs first → produces `build/`
- `.csproj` embeds `build/**` as `EmbeddedResource`
- `dotnet pack` produces `ApiTestSpark.{version}.nupkg`
- New PowerShell script `scripts/build/pack.ps1` orchestrates both steps

**Testing**: No test framework (constitution VII) — validation via manual install test in `dotnet new webapi` project

**Performance goals**: SPA load < 2s on localhost; NuGet package < 2 MB (SC-002, SC-006)

**Constraints**: Vite base fixed at `/api-test-spark/`; OpenAPI v3 only; no custom mount paths this release

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
*Constitution version: 1.0.0 — see `.documentation/memory/constitution.md`*

| # | Gate | Status |
|---|------|--------|
| I | `npm run verify` (tsc -b + vite build) MUST pass — zero TypeScript errors | ☐ PASS / ☐ FAIL |
| II | `npm run lint` MUST pass — zero ESLint errors (react-hooks/exhaustive-deps enforced) | ☐ PASS / ☐ FAIL |
| III | New feature follows: types → api client → hook → component + barrel exports at every directory | ☐ PASS / ☐ FAIL |
| IV | API client extends `ApiClient`, instantiated per-call, UUID-correlated, debug callbacks injected | ☐ PASS / ☐ FAIL |
| V | Zustand stores: one concern each, mutate via actions only, FIFO buffer limits respected | ☐ PASS / ☐ FAIL |
| VI | No `console.log` in `src/`; all request/response/error routed through `useDebugStore` | ☐ PASS / ☐ FAIL |
| VIII | No PII/PHI in any test data, type, store, log, or App Insights payload | ☐ PASS / ☐ FAIL |

*Gate VII (testing stance) is aspirational and not a blocking gate.*

**Constitution notes for this feature:**

- Gate III: New `src/types/host-api.ts`, `src/api/hostApiClient.ts`, `src/hooks/useHostApi.ts`, `src/components/host-api/` must all be created with barrel exports updated
- Gate IV: `hostApiClient` must extend `ApiClient`, be instantiated per-mutation-call, inject debug callbacks from `useDebugStore`
- Gate VI: Config fetch at startup must route through `useDebugStore`; no `console.log` in new code

## Project Structure

### Documentation (this feature)

```text
.documentation/specs/001-nuget-portable-harness/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── config-endpoint.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/devspark.tasks)
```

### Source Code Layout (full repo after this feature)

```text
ApiTestSpark/                            ← repo root
│
├── src/                                 ← React SPA (existing, modified)
│   ├── types/
│   │   ├── host-api.ts                  ← NEW: HarnessConfig, DiscoveredEndpoint, OpenApiV3Doc types
│   │   └── index.ts                     ← MODIFIED: re-export host-api types
│   ├── api/
│   │   ├── hostApiClient.ts             ← NEW: extends ApiClient, fetches config + OpenAPI doc
│   │   └── index.ts                     ← MODIFIED: re-export hostApiClient
│   ├── hooks/
│   │   ├── useHarnessConfig.ts          ← NEW: TanStack Query useQuery for config fetch on mount
│   │   ├── useHostApi.ts                ← NEW: TanStack Query useMutation for host API calls
│   │   └── index.ts                     ← MODIFIED: re-export new hooks
│   ├── store/
│   │   ├── harnessConfigStore.ts        ← NEW: Zustand store holding resolved HarnessConfig
│   │   └── index.ts                     ← MODIFIED: re-export harnessConfigStore
│   ├── components/
│   │   ├── host-api/
│   │   │   ├── HostApiScreen.tsx        ← NEW: "Your App's APIs" section, endpoint list + tester
│   │   │   ├── EndpointList.tsx         ← NEW: renders discovered endpoints grouped by tag
│   │   │   ├── EndpointTester.tsx       ← NEW: fires requests to selected endpoint
│   │   │   └── index.ts                 ← NEW: barrel export
│   │   ├── HomeScreen.tsx               ← MODIFIED: add "Your App's APIs" card to SECTIONS
│   │   └── index.ts                     ← MODIFIED: re-export host-api components
│   ├── App.tsx                          ← MODIFIED: add /host-api route; BrowserRouter basename
│   └── utils/
│       └── openApiParser.ts             ← NEW: OpenAPI v3 doc → DiscoveredEndpoint[]
│
├── vite.config.ts                       ← MODIFIED: base driven by VITE_BASE_PATH env var
│
├── ApiTestSpark/             ← NEW: .NET class library project
│   ├── ApiTestSpark.csproj   ← NEW: embeds build/** as EmbeddedResource
│   ├── ApiTestSparkExtensions.cs      ← NEW: MapApiTestSpark() extension method
│   ├── ApiTestSparkOptions.cs         ← NEW: HarnessOptions configuration class
│   └── ApiTestSparkMiddleware.cs      ← NEW: serves embedded assets + config endpoint
│
└── scripts/
    └── build/
        ├── build.ps1                    ← EXISTING
        └── pack.ps1                     ← NEW: runs npm build then dotnet pack
```

## Complexity Tracking

No constitution violations. All gates satisfied by design:

- New stores, hooks, types, and components follow the prescribed layer order
- `hostApiClient` extends `ApiClient` with per-call instantiation and debug callbacks
- Config fetch routed through `useDebugStore` via `useHarnessConfig` hook
- No `console.log` introduced

---

## Phase 0: Research

### R-001: Embedding static files in a NuGet package (ASP.NET Core)

**Decision**: Use `EmbeddedResource` in `.csproj` + `EmbeddedFileProvider` from `Microsoft.Extensions.FileProviders.Embedded` to serve files via `UseStaticFiles`.

**Rationale**: This is the exact pattern used by Scalar (`Scalar.AspNetCore`), Swagger UI (`Swashbuckle.AspNetCore.SwaggerUI`), and ASP.NET Core's own Razor Pages. `EmbeddedFileProvider` handles resource name mapping automatically. The `StaticFileOptions.RequestPath` scopes serving to `/api-test-spark`.

**Pattern**:

```csharp
// In .csproj
<ItemGroup>
  <EmbeddedResource Include="build\**" />
</ItemGroup>

// In extension method
var provider = new EmbeddedFileProvider(
    typeof(ApiTestSparkExtensions).Assembly,
    "ApiTestSpark.build");
app.UseStaticFiles(new StaticFileOptions {
    FileProvider = provider,
    RequestPath = "/api-test-spark"
});
```

**Alternatives considered**:

- `PhysicalFileProvider` — requires files on disk at runtime, breaks the "no copy" requirement
- Custom middleware serving streams — more control but reimplements what `StaticFileMiddleware` already does correctly

### R-002: Vite base path for sub-path deployment

**Decision**: Set `base` in `vite.config.ts` from `process.env.VITE_BASE_PATH ?? '/'`. Set `BrowserRouter basename` from `import.meta.env.BASE_URL`.

**Rationale**: Vite bakes the base path into all asset `<script src>` and `<link href>` references in `index.html` at build time. The browser router `basename` ensures client-side navigation routes resolve correctly under the sub-path. These two settings must stay in sync.

**Standalone SWA compatibility**: Standalone build sets no env var → base is `/` → existing SWA deployment unchanged (SC-004). NuGet pack build sets `VITE_BASE_PATH=/api-test-spark/`. Both builds are produced from the same source; `pack.ps1` sets the env var.

### R-003: Config endpoint design

**Decision**: Expose `GET /api-test-spark/config` as a Minimal API endpoint (`app.MapGet`) returning `application/json`.

**Rationale**: Minimal API endpoint is simpler than middleware for a single JSON response. It participates in ASP.NET Core's routing and logging pipeline naturally. The response is serialized from `HarnessOptions` — only safe metadata fields are exposed (never tokens/keys).

**Contract** (see `contracts/config-endpoint.md`):

```json
{
  "baseUrl": "https://localhost:5000",
  "openApiUrl": "/openapi.json",
  "authScheme": "Bearer",
  "defaultHeaders": { "X-Tenant-Id": "acme" }
}
```

### R-004: OpenAPI v3 parsing in TypeScript

**Decision**: Write a lightweight `openApiParser.ts` utility that maps OpenAPI v3 `paths` + `components/schemas` to `DiscoveredEndpoint[]`. No third-party OpenAPI parser library.

**Rationale**: Adding a full OpenAPI parser library (e.g., `swagger-parser`) adds ~200–500 KB to the bundle, approaching the 2 MB package size constraint (SC-006). A targeted parser for the fields the UI needs (method, path, summary, parameters, requestBody ref) stays under 5 KB.

**Alternatives considered**:

- `@readme/openapi-parser` — full validation + dereferencing, but 400 KB gzipped
- `openapi-types` (types only) — acceptable for TypeScript type shapes, no runtime cost; use for type definitions only

### R-005: Standalone SWA deployment compatibility

**Decision**: `VITE_BASE_PATH` environment variable defaults to `/`. Standalone build produces a SPA rooted at `/`. NuGet pack build produces a SPA rooted at `/api-test-spark/`.

**Implementation**: `vite.config.ts` reads `process.env.VITE_BASE_PATH ?? '/'`. `App.tsx` reads `import.meta.env.BASE_URL` for the `BrowserRouter basename`.

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for full entity definitions. Summary:

| Entity | Layer | Description |
|--------|-------|-------------|
| `HarnessConfig` | `src/types/host-api.ts` | Runtime config fetched from `/api-test-spark/config` |
| `DiscoveredEndpoint` | `src/types/host-api.ts` | Single API endpoint parsed from OpenAPI v3 doc |
| `OpenApiV3Doc` | `src/types/host-api.ts` | Minimal TypeScript shape for OpenAPI v3 JSON |
| `HarnessOptions` | `ApiTestSpark/ApiTestSparkOptions.cs` | .NET config object passed by host app |
| `ConfigResponse` | .NET DTO | Serialized JSON response from config endpoint |

### Interface Contracts

See `contracts/config-endpoint.md` for the full contract. Key points:

**Config endpoint** `GET /api-test-spark/config`:

- Always returns HTTP 200
- `openApiUrl`: relative path or absolute URL to OpenAPI v3 JSON; `null` if not configured
- `authScheme`: `"Bearer"`, `"ApiKey"`, `"Basic"`, or `null`
- `defaultHeaders`: object of string→string; empty object `{}` if none configured
- `baseUrl`: the host app's base URL (derived from request `Host` header if not explicitly set)

**Static assets** `GET /api-test-spark/{*path}`:

- Served from embedded resources
- Cache-Control: `public, max-age=31536000, immutable` for hashed asset files
- Cache-Control: `no-cache` for `index.html` (entry point must always be fresh)
- All unmatched paths fall through to `index.html` (SPA fallback)

### Quickstart for consuming apps

```csharp
// 1. Install
// dotnet add package ApiTestSpark

// 2. Program.cs — minimal setup
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();
app.MapOpenApi();
app.MapApiTestSpark();  // serves at /api-test-spark/
app.Run();

// 3. Program.cs — with auth and custom headers
app.MapApiTestSpark(options => {
    options.OpenApiUrl = "/openapi.json";
    options.AuthScheme = "Bearer";
    options.DefaultHeaders["X-Tenant-Id"] = "acme";
    options.Environments = ["Development", "Staging"];
});
```
