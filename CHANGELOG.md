# Changelog

All notable changes to the ApiTestSpark project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-30

### Added

- `MapApiTestSpark()` extension on `WebApplication` — single-call registration for the embedded SPA
- `ApiTestSparkOptions` with `OpenApiUrl`, `AuthScheme`, `DefaultHeaders`, `Environments`, `EnableVerboseLogging`, and `CorsOrigins`
- `/api-test-spark/config` JSON endpoint bridging SPA to host API (base URL, OpenAPI URL, auth scheme, default headers)
- Environment gating: `Environments` array limits which environments the harness is active in; empty = all
- Startup-time validation: embedded resource check, sensitive-header warning, OpenApiUrl URI validation
- CORS support without requiring host `AddCors()` — controlled via `CorsOrigins` option
- Content-Security-Policy header on SPA fallback responses
- `EnableVerboseLogging` option for per-request debug output via `ILogger`
- MSBuild target `BuildReactSpa` auto-builds the React SPA before every `dotnet build`
- MSBuild target `ValidateSpaAssets` guards `dotnet pack` against empty `build/` directory
- `Microsoft.SourceLink.GitHub` integration — consumers can step through source in debugger
- `.snupkg` symbol package published alongside the main package
- React SPA features:
  - OpenAPI v3 autodiscovery — fetches `openApiUrl` from config and builds endpoint list
  - Full `$ref` resolution including .NET 10 nullable wrapper (`oneOf: [null, $ref]`) unwrapping
  - Endpoint list grouped by tag with sticky headers, deprecated badge, operation summary
  - `buildJsonScaffold()` — typed JSON stub pre-fills body textarea from resolved schema
  - Smart response rendering: array → sortable table, object → editable form, other → raw pre block
  - Draggable debug panel captures all requests, responses, and errors (50-item FIFO)
  - Azure Application Insights integration via `@microsoft/applicationinsights-react-js`
  - Route-level lazy loading for all screens
  - Sample integrations: JokeAPI v2, JSONPlaceholder
  - Per-section configuration via `SECTION_CONFIGS` engine

### Internal

- Initial project configuration: React 19, Vite 8, TypeScript 6, Zustand 5, TanStack Query 5, Tailwind CSS 4 (2026-05-18)
- API layer refactor: `createRestCaller` factory replaces `ApiClient` subclass pattern (2026-05-18)
- Section config engine: single source of truth for all API metadata (2026-05-18)
- Performance: route-level lazy loading; build tools moved to devDependencies (2026-05-18)
- Config co-located with each section screen; Configuration nav link removed (2026-05-27)
- First NuGet package implementation as `WebSpark.ApiTestHarness`; upgraded to .NET 10; xUnit → MSTest (2026-05-29)
- Renamed from `WebSpark.ApiTestHarness` / `MapApiTestHarness` / `/api-test-harness/` to `ApiTestSpark` / `MapApiTestSpark` / `/api-test-spark/` (2026-05-30)
- OpenAPI decorator enrichment: description, deprecated flag, `$ref` resolution, example placeholders (2026-05-30)
- Smart response rendering: sortable table, editable form, raw fallback (2026-05-30)
- SampleApi refactored into vertical slices (Products + Home) as live demo site (2026-05-30)

[Unreleased]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/MarkHazleton/ApiTestSpark/releases/tag/v1.0.0
