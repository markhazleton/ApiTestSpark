# API Test Harness - AI Coding Agent Instructions

## Quick Reference

Purpose: Lightweight React developer tool for testing and debugging REST APIs.
JokeAPI (https://jokeapi.dev/) is included as a working reference implementation.

## File Locations

| What | Where |
|------|-------|
| Source code | /src |
| .NET NuGet library | /WebSpark.ApiTestHarness/ |
| .NET integration tests | /WebSpark.ApiTestHarness.Tests/ |
| Active feature specs | /.documentation/specs/ |
| Scripts | /scripts/build/, /scripts/lint/, /scripts/test/ |

## Development Commands

    .\scripts\build\dev.ps1      # Start dev server
    .\scripts\build\build.ps1    # Production build (tsc -b + vite)
    .\scripts\build\pack.ps1     # Build React SPA + pack NuGet (WebSpark.ApiTestHarness)
    .\scripts\build\clean.ps1    # Clean (-Full for node_modules)
    .\scripts\lint\lint.ps1      # ESLint check
    .\scripts\lint\fix.ps1       # Auto-fix linting

## Key Implementation Patterns

### Store Usage (Zustand)
    const { updateApiConfig, getApiConfig } = useUnifiedConfigStore();
    const { addRequest, addResponse } = useDebugStore();

### API Client Instantiation
    // Client created per-call with debug callbacks
    new JokeApiClient(baseUrl, apiKey, {
      onRequest: addRequest,
      onResponse: addResponse,
      onError: addError,
    });

## File Organization Patterns

### Barrel Exports (Required)
All directories must have index.ts:
- src/store/index.ts
- src/types/index.ts
- src/components/index.ts
- src/hooks/index.ts

## Environment Configuration

| Environment | Purpose |
|-------------|---------|
| localhost | Local API development |
| tst2 | Secondary testing |
| other | Custom endpoint configuration |

Each environment stores: base URL and API key. Persisted in localStorage via Zustand persist middleware.

## Adding a New API

1. Types -> src/types/my-api.ts + re-export from src/types/index.ts
2. Client -> src/api/myApiClient.ts extending ApiClient + re-export from src/api/index.ts
3. Hook -> src/hooks/useMyApi.ts with TanStack useMutation + re-export from src/hooks/index.ts
4. Screen -> src/components/my-api/MyApiScreen.tsx + index.ts barrel + re-export from src/components/index.ts
5. Route -> add route in src/App.tsx
6. Nav -> add entry to SECTIONS array in src/components/HomeScreen.tsx

## Error Handling Patterns

| Error Type | Cause | Handling |
|------------|-------|----------|
| Network | Fetch failure | Synthetic response (status 0) |
| API | Non-2xx response | Wrapped response with status |
| Configuration | Invalid config | Validation before use |

## Debug Store Limits

- Requests/Responses: 50 entries max (FIFO)
- Performance Metrics: 100 entries max (FIFO)

## NuGet Package Notes

The `WebSpark.ApiTestHarness` .NET class library embeds the React SPA as resources.

- **Vite base path**: Controlled by `VITE_BASE_PATH` env var (unset = `/` for SWA; `/api-test-harness/` for NuGet build)
- **`pack.ps1`**: Always use this script — it sets `VITE_BASE_PATH`, runs npm audit, builds React, then `dotnet pack`
- **Public API surface**: Changes to `MapApiTestHarness`, `ApiTestHarnessOptions`, or `ApiTestHarnessExtensions` require updating `PublicAPI.Shipped.txt` and a semver decision (SEMVER: MAJOR/MINOR in PR title)
- **Integration tests**: `WebSpark.ApiTestHarness.Tests/` uses xUnit with `WebApplicationFactory` — run with `dotnet test`

## AI Agent Checklist

Before completing any feature:
1. Type check: npx tsc --noEmit
2. Lint: .\scripts\lint\lint.ps1
3. Build: .\scripts\build\build.ps1
4. Verify barrel exports updated
5. Confirm debug panel captures interactions
