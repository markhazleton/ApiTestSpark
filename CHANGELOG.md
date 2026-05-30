# Changelog

All notable changes to the ApiTestSpark project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0] - 2026-05-30

### Added

- **Portable NuGet Harness**: `MapApiTestSpark()` extension on `WebApplication` — single-call registration embeds the React SPA into any .NET Minimal API project at `/api-test-spark/`
- **Config endpoint**: `GET /api-test-spark/config` bridges host .NET options to the SPA (OpenAPI URL, auth scheme, default headers, base URL)
- **OpenAPI v3 autodiscovery**: SPA fetches the host app's OpenAPI document on startup and renders discovered endpoints grouped by tag with operation summaries
- **`ApiTestSparkOptions`**: `OpenApiUrl`, `AuthScheme`, `DefaultHeaders`, `Environments`, `EnableVerboseLogging`, `CorsOrigins`
- **Environment gating**: restrict harness to specific environments (e.g., `Development` only)
- **Built-in CORS support**: no host `AddCors()` required — controlled via `CorsOrigins` option
- **Content-Security-Policy** headers on SPA fallback responses (includes App Insights `connect-src`)
- **`EnableVerboseLogging`** option for per-asset debug output via `ILogger`
- **MSBuild targets**: `BuildReactSpa` (auto-build before `dotnet build`), `ValidateSpaAssets` (guard `dotnet pack` against empty `build/`)
- **Dual-build strategy**: `VITE_BASE_PATH` env var produces standalone (`/`) and NuGet (`/api-test-spark/`) builds from one source
- **Smart response rendering**: array → sortable table, object → editable form, other → raw pre block
- **`$ref` resolution**: full dereferencing including .NET 10 nullable wrapper (`oneOf: [null, $ref]`)
- **Integration tests**: `ApiTestSpark.Tests` with MSTest + `WebApplicationFactory` covering 200/404/SPA-fallback/config-shape/embedded-resource-prefix
- `Microsoft.SourceLink.GitHub` integration — consumers can step through source in debugger
- `.snupkg` symbol package published alongside the main package
- Azure Application Insights integration via `@microsoft/applicationinsights-react-js`
- Route-level lazy loading for all screens
- Sample integrations: JokeAPI v2, JSONPlaceholder

### Architectural Decisions

- **ADR-001**: Embedded Resource SPA serving via `EmbeddedFileProvider`
- **ADR-002**: Dual-build strategy via `VITE_BASE_PATH` environment variable
- **ADR-003**: Config endpoint as Minimal API `MapGet`
- **ADR-004**: Lightweight bespoke OpenAPI v3 parser (no third-party dependency)

### Internal

- Initial project configuration: React 19, Vite 8, TypeScript 6, Zustand 5, TanStack Query 5, Tailwind CSS 4 (2026-05-18)
- API layer refactor: `createRestCaller` factory replaces `ApiClient` subclass pattern (2026-05-18)
- Section config engine: single source of truth for all API metadata (2026-05-18)
- Performance: route-level lazy loading; build tools moved to devDependencies (2026-05-18)
- Config co-located with each section screen; Configuration nav link removed (2026-05-27)
- First NuGet package implementation as `WebSpark.ApiTestHarness`; upgraded to .NET 10; xUnit → MSTest (2026-05-29)
- Renamed from `WebSpark.ApiTestHarness` / `MapApiTestHarness` / `/api-test-harness/` to `ApiTestSpark` / `MapApiTestSpark` / `/api-test-spark/` (2026-05-30)
- OpenAPI decorator enrichment, smart response rendering, SampleApi vertical slices (2026-05-30)

### Contributors

- Mark Hazleton

[Unreleased]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.0...HEAD
[v1.0.0]: https://github.com/MarkHazleton/ApiTestSpark/releases/tag/v1.0.0
