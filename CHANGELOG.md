# Changelog

All notable changes to the ApiTestSpark project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.1.0] - 2026-05-31

### Added

- **`EnableDemoIntegrations` option** — new `bool` property on `ApiTestSparkOptions` (default `true`). Set to `false` to hide the built-in JokeAPI and JSONPlaceholder demo screens from the home page and disable their routes entirely, leaving only the Host API Explorer and API Doc Builder. Ideal for production or team installs where the sample integrations add noise.

### Changed

- **`ErrorCategory` type expanded** — added `'React'` variant to the `ErrorCategory` union (`'Network' | 'API' | 'Configuration' | 'React' | 'Unknown'`). `'React'` is the correct category for unhandled render errors caught by `ErrorBoundary`.
- **`ErrorRecord.category` and `ErrorResponse.category`** — both fields now typed as `ErrorCategory` (was loosely typed as `string`). Eliminates an unsafe `as` cast in `debugStore.addError`.
- **`ErrorBoundary` observability** — `componentDidCatch` now uses `category: 'React'` (was `'Unknown'`) and routes exclusively through `useDebugStore.addError()`. The redundant direct `trackException()` call (which bypassed the debug panel) has been removed. `addError` already auto-forwards to App Insights via `trackCategorizedError`.
- **Constitution v1.1.1** — three clarifications applied via full-repo review: §IV recognises `createRestCaller` as a second valid client pattern; §V adds `useHarnessConfigStore` to the canonical store registry (non-persisted); §VI expands `ErrorCategory` union definition and documents the App Insights integration relationship.

### Contributors

- Mark Hazleton

## [v1.0.2] - 2026-05-30

### Fixed

- **CSP blocking harness in Development** — the `Content-Security-Policy` header on the SPA fallback `index.html` response now adds `ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*` to `connect-src` when the host app is running in the `Development` environment. This allows ASP.NET Core Browser Link and hot-reload WebSocket connections to succeed without being blocked. In non-Development environments the CSP is unchanged. The blank/empty harness page seen after upgrading to v1.0.1 in a Development project was caused by this CSP violation.

### Contributors

- Mark Hazleton

## [v1.0.1] - 2026-05-30

### Added

- **API Doc Builder** (`/api-docs`): new screen that lets developers select endpoints, capture live curl commands and real HTTP responses, annotate sections with prose notes, then generate complete markdown documentation targeted at front-end developer agents — includes table of contents, parameters table, request body schema table, response codes table, and fenced curl + JSON response blocks
- **OpenAPI metadata renderer**: full markdown renderer (`renderMarkdown.tsx`) supporting `**bold**`, `*italic*`, `` `code` ``, `## headings`, `- bullet lists`, `1. numbered lists`, ` ```fenced code blocks``` `, and `| markdown tables |`
- **operationId chip**: copyable `operationId` button shown in the endpoint tester header — useful for SDK codegen and cross-referencing API docs
- **Response codes panel**: all documented status codes shown as coloured badges (green 2xx, yellow 4xx, red 5xx); click a badge to expand the inline response schema
- **Schema constraints in UI**: `default`, `nullable`, `minimum`/`maximum`, `minLength`/`maxLength` from OpenAPI schema now shown in property tables and property chips; scaffold pre-fills `default` values
- **API info header**: `info.contact.email` (mailto link) and `info.license` (name + URL) now rendered in the HostApiScreen header
- **Accordion default-collapsed**: endpoint list starts collapsed when 3+ namespaces are present; "expand all / collapse all" buttons appear in the search bar
- **Relational seed data** in SampleApi: `Customer` gains `Address` (street/city/state/postal/country) and `Company` fields; `Product` gains `Category`, `Description`, `StockQuantity`; `OrderCache` seeded with 7 orders across all 5 customers covering every `OrderStatus` value
- **New SampleApi endpoints**: `GET /products/categories`, `GET /products/category/{cat}`, `GET /orders/status/{status}`
- **Tag-based accordion grouping**: SampleApi endpoint tags changed to `"Products: Catalog"`, `"Customers: Accounts"`, `"Orders: Lifecycle"` — feeds the `splitTag()` accordion logic for clean three-level grouping
- **NuGet badges**: `[![NuGet](...)]` version and download count badges added to root `README.md` and `ApiTestSpark/README.md`

### Changed

- **EndpointTester description rendering** now uses the shared `renderMarkdown` utility — fenced code blocks, markdown tables, and italic text in OpenAPI descriptions render correctly instead of as raw text
- **`buildJsonScaffold`**: priority order changed to `example → default → enum[0] → type placeholder`; nested objects and arrays now recursively scaffolded; nullable strings scaffold as `null` instead of `""`
- **`openApiParser`**: `default` and `nullable` extracted from schemas; `operationId` and `requestBodyDescription` parsed from operations; `info.license` and `contact.email` extracted by `parseApiInfo()`; `null` type in arrays normalised with `nullable: true` flag
- **HostApiScreen empty state**: shows full markdown-rendered API `info.description` when no endpoint is selected
- **`harnessConfigStore`**: gains `apiInfo` field populated from the OpenAPI `info` block after fetch

### Fixed

- **`Microsoft.OpenApi` version**: upgraded from `2.0.0` to `2.7.6` (latest non-deprecated 2.x; `3.x` breaks the `Microsoft.AspNetCore.OpenApi` 10.0.8 source generator)
- **`Microsoft.SourceLink.GitHub`**: updated to `10.0.300`

### Contributors

- Mark Hazleton

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

[Unreleased]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.1.0...HEAD
[v1.1.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.2...v1.1.0
[v1.0.2]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/MarkHazleton/ApiTestSpark/releases/tag/v1.0.0
