# API Test Spark — AI Coding Agent Instructions

> **Engineering rules live in the constitution.**
> All MUST/MUST-NOT constraints, quality gates, and architectural principles are defined in
> `.documentation/memory/constitution.md`. This file covers quick-reference patterns and
> project-specific context for AI code generation. Do not duplicate constitution content here.

## Project Structure

| What | Where |
|------|-------|
| React SPA source | `/src` |
| .NET NuGet library | `/ApiTestSpark/` |
| .NET integration tests | `/ApiTestSpark.Tests/` |
| Demo / promo site | `/SampleApi/` |
| Feature specs | `/.documentation/specs/` |
| Constitution | `/.documentation/memory/constitution.md` |
| DevSpark framework | `/.devspark/` |
| Build scripts | `/scripts/build/`, `/scripts/lint/` |

## Development Commands

```
.\scripts\build\dev.ps1      # React dev server
.\scripts\build\build.ps1    # Production build (tsc -b + vite)
.\scripts\build\pack.ps1     # Build SPA + pack NuGet (ApiTestSpark)
.\scripts\lint\lint.ps1      # ESLint check
.\scripts\lint\fix.ps1       # Auto-fix linting
dotnet build ApiTestSpark    # Build .NET library
dotnet test ApiTestSpark.Tests  # Run .NET integration tests
```

## Quality Gates — all must pass before merge

1. `npm run lint` — zero ESLint errors (Constitution II)
2. `npm run verify` — `tsc -b` + `vite build` (Constitution I)
3. `dotnet build ApiTestSpark` — zero C# errors
4. `dotnet test ApiTestSpark.Tests` — all integration tests pass

## Key Implementation Patterns

### Adding a new API integration (Constitution III — all 6 steps required)

```
src/types/my-api.ts                    → re-export from src/types/index.ts
src/api/myApiClient.ts                 → extends ApiClient, re-export from src/api/index.ts
src/hooks/useMyApi.ts                  → useMutation, re-export from src/hooks/index.ts
src/components/my-api/MyApiScreen.tsx  → index.ts barrel, re-export from src/components/index.ts
src/App.tsx                            → add route
src/components/HomeScreen.tsx          → add card to SECTIONS
```

### Key component locations

| Screen | Route | File |
|--------|-------|------|
| Endpoint Explorer | `/host-api` | `src/components/host-api/HostApiScreen.tsx` |
| API Doc Builder | `/api-docs` | `src/components/api-doc/ApiDocScreen.tsx` |
| JokeAPI | `/joke-api` | `src/components/joke-api/JokeApiScreen.tsx` |
| JSONPlaceholder | `/json-placeholder` | `src/components/json-placeholder/JsonPlaceholderScreen.tsx` |

### Key utilities

| Utility | File | Purpose |
|---------|------|---------|
| `parseOpenApiV3` | `src/utils/openApiParser.ts` | Parse OpenAPI doc → DiscoveredEndpoint[] |
| `buildJsonScaffold` | `src/utils/openApiParser.ts` | Build JSON scaffold from schema |
| `renderMarkdown` | `src/utils/renderMarkdown.tsx` | Render OpenAPI description markdown |
| `generateMarkdown` | `src/utils/generateMarkdown.ts` | Generate API doc markdown |
| `buildCurlCommand` | `src/utils/generateMarkdown.ts` | Build curl command from request |

### API client instantiation (Constitution IV)

```typescript
// Per-call instantiation with debug callbacks — never a singleton
new JokeApiClient(baseUrl, apiKey, {
  onRequest:  addRequest,   // from useDebugStore
  onResponse: addResponse,
  onError:    addError,
});
```

### Zustand store usage (Constitution V)

```typescript
const { updateApiConfig, getApiConfig } = useUnifiedConfigStore();
const { addRequest, addResponse, addError, addMetric } = useDebugStore();
```

## Store Registry (Constitution V)

| Store | Storage Key | Persists |
|-------|-------------|----------|
| `useUnifiedConfigStore` | `api-test-spark-config` | Full config |
| `useAuthStore` | `api-test-spark-auth-config` | Config only |
| `useDebugStore` | `api-test-spark-debug` | Enabled flag only |
| `useHarnessConfigStore` | (none) | Session only — config, endpoints, apiInfo |

Debug buffer limits: 50 requests/responses/errors, 100 metrics (FIFO).

## NuGet Package (ApiTestSpark)

The `.NET` class library embeds the compiled React SPA as `EmbeddedResource` assets.

- **Pack**: always use `pack.ps1` — sets `VITE_BASE_PATH=/api-test-spark/`, runs `npm audit`, builds React, then `dotnet pack`
- **Standalone build**: `VITE_BASE_PATH` unset → base path `/` (Azure Static Web Apps)
- **Public API surface**: changes to `MapApiTestSpark`, `ApiTestSparkOptions`, or `ApiTestSparkExtensions` require updating `PublicAPI.Shipped.txt` and a `SEMVER: MAJOR` or `SEMVER: MINOR` label in the PR title
- **Integration tests**: `ApiTestSpark.Tests/` uses MSTest + `WebApplicationFactory` — run with `dotnet test`
- **Reverse proxy**: call `app.UseForwardedHeaders()` before `app.MapApiTestSpark()`

## Error Handling Patterns

| Error Type | Cause | Handling |
|------------|-------|----------|
| Network | Fetch failure | Synthetic response, status 0 |
| API | Non-2xx response | Wrapped response with status |
| Configuration | Invalid config | Validate at system boundary |

All errors route through `useDebugStore.addError` with category
`'Network' | 'API' | 'Configuration' | 'Unknown'` (Constitution VI).
`console.log` is banned in `src/`. `console.error` only in catch blocks for unrecoverable errors.

## AI Agent Pre-completion Checklist

Before reporting a task complete:

1. `npm run verify` passes — zero TypeScript errors and successful vite build
2. `npm run lint` passes — zero ESLint errors including `react-hooks/exhaustive-deps`
3. All new `src/` directories have `index.ts` barrel exports
4. No `console.log` introduced anywhere in `src/`
5. No PII or PHI in any test data, type, store, or log output (Constitution VIII)
6. If `.NET` code changed: `dotnet build` and `dotnet test ApiTestSpark.Tests` pass
7. If public `.NET` API changed: `PublicAPI.Shipped.txt` updated and PR title includes semver label
