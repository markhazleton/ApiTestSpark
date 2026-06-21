# Changelog

All notable changes to the ApiTestSpark project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.7.0] - 2026-06-21

### Added

- **Server-side remote call proxy** — new `EnableRemoteCallProxy` option routes endpoint calls for server-configured remote API profiles through `GET /api-test-spark/remote-call`, avoiding browser CORS requirements while keeping server-held credentials out of the browser.
- **Expanded identity-aware config payload** — `/api-test-spark/config` now returns resolved `userName`, `userEmail`, and `userId` values, and configured host/remote headers can expand `{user-name}`, `{user-email}`, and `{user-id}` tokens.

### Changed

- **Remote profile management model** — Program.cs server profiles now remain authoritative, while browser customization creates distinct local copies instead of overriding the proxied server entry.
- **Frontend bootstrap and build hygiene** — host runtime config is separated from remote-profile hydration, and Vite now suppresses the known Application Insights pure-annotation warning so release builds stay actionable.

### Fixed

- **Remote explorer CORS regression** — stale browser profiles can no longer shadow server-configured profiles and force browser-direct OpenAPI fetches that bypass the proxy.
- **Required path parameter validation** — host and remote endpoint testers now block requests with missing required path parameters and surface inline validation before sending malformed URLs.

### Breaking Changes

None. This release is backwards-compatible and the new remote call proxy is opt-in.

### Contributors

- Mark Hazleton

## [v1.6.0] - 2026-06-20

### Added

- **User-name token expansion** — profiles and request templates now expand `{userName}` tokens at request time, enabling personalized header and body content for multi-user environments.
- **SampleApi publish package** — added a dedicated SampleApi publish output package for simplified deployment workflows.

### Fixed

- **CSP logo rendering** — resolved Content Security Policy violations preventing inline logo rendering in the harness UI.
- **Base-path build-info fetches** — fixed fetch requests for build metadata when the app is deployed at a non-root base path (e.g., `/api-test-spark/`).

### Changed

- **Package reference updates** — upgraded Microsoft.AspNetCore.OpenApi and Microsoft.OpenApi to the latest stable versions for improved OpenAPI v3 compatibility and maintenance.
- **Make Bold branding metadata** — aligned branding icons and metadata across all delivered assets for consistent product identity.

### Breaking Changes

None. This is a fully backwards-compatible patch release.

### Contributors

- Mark Hazleton

## [v1.5.0] - 2026-06-12

### Changed

- **Make Bold Solutions brand alignment** — refreshed the embedded React UI with the Make Bold Spark product family, Make Bold Solutions ownership, brand colors, Inter Tight typography, updated header/home/footer treatments, and consistent red/black/gray accent states across the app.
- **Favicon and visual assets** — generated a multi-size `favicon.ico`, refreshed PNG favicons, added local Make Bold Solutions logo/font assets to the SPA build, and regenerated the NuGet package icon from the brand asset.
- **NuGet package identity** — updated NuGet authors, company, copyright, title, description, tags, repository casing, package README, root README, packaging walkthrough, and license attribution to consistently present API Test Spark as a Make Bold Spark product owned and managed by Make Bold Solutions.

### Breaking Changes

None. This release does not change the public .NET API surface or runtime configuration model.

### Contributors

- Mark Hazleton

## [v1.4.0] - 2026-06-09

### Added

- **Remote API Profiles** — the remote API experience now supports a collection of named profiles instead of one global remote target. Each profile has a stable id, name, description, base URL, OpenAPI URL, credentials, and profile-scoped headers.
- **Program.cs multi-profile defaults** — host apps can seed multiple remote APIs with `RemoteApiProfiles`. The legacy single-remote options remain supported and seed one compatibility profile when no profile collection is configured.
- **Browser profile management** — the Config page can add, edit, delete, hide, reset, and persist browser-managed remote API profiles. New browser profiles receive GUID ids, and duplicate visible names are blocked with a clear validation alert before save.
- **Profile-specific explorer and documentation routes** — the home screen, Remote API Explorer, and Remote API Doc Builder now render one entry per visible profile using each profile's name and description.
- **Server-profile-only remote spec proxy** — `GET /api-test-spark/remote-spec?profileId=...` resolves only server-provided profile ids. Browser-created profiles fetch OpenAPI documents directly from the browser, preventing browser-submitted URLs from driving server-side fetches.
- **Credential redaction for server profiles** — server-provided API key values and bearer tokens are no longer serialized in `/api-test-spark/config`; configured flags tell the browser that credentials exist without exposing values.

### Changed

- **Remote configuration persistence** — existing single-remote browser configuration migrates into one GUID-backed profile where feasible, while hidden server profile ids and browser overrides preserve the prior reload-surviving behavior.
- **SampleApi demo content** — the demo app now documents the remote profile model, server-default personalization, duplicate-name validation, and profile-specific API/documentation sections.

### Breaking Changes

None. The new `RemoteApiProfiles` collection and `RemoteApiProfile` model are additive. Existing `RemoteBaseUrl`, `RemoteOpenApiUrl`, `RemoteOpenApiApiKeyHeader`, `RemoteOpenApiApiKeyValue`, `RemoteOpenApiBearerToken`, and `RemoteDefaultHeaders` options remain supported for this release.

### Contributors

- Mark Hazleton

## [v1.3.0] - 2026-06-06

### Added

- **Remote API Explorer** — a new screen (`/remote-api`) that loads, browses, and tests endpoints from a remote OpenAPI JSON document. The remote URL, API key, and Bearer token are configured via `MapApiTestSpark()` in `Program.cs` and are editable on the Config page.
- **Remote spec proxy** — `GET /api-test-spark/remote-spec` is a new .NET endpoint that fetches the remote OpenAPI document server-side. API key and Bearer token are injected at the proxy level; credentials never appear in the browser network tab or DevTools.
- **SSRF guard** — the proxy validates that `RemoteOpenApiUrl` uses `http://` or `https://` and rejects all other schemes (`file://`, `ldap://`, etc.) with a `400` response.
- **`ApiTestSparkOptions` additions** — four new properties: `RemoteBaseUrl`, `RemoteOpenApiUrl`, `RemoteOpenApiApiKeyHeader`, `RemoteOpenApiApiKeyValue`, `RemoteOpenApiBearerToken`, and `RemoteDefaultHeaders` (dictionary of headers injected into every browser-side request to the remote API).
- **Remote API Doc Builder** — captures live remote endpoint calls and exports markdown documentation, mirroring the host API Doc Builder.
- **Config page — Remote API section** — dedicated configuration panel for all remote API settings; credential fields are masked (password inputs) by default.
- **Header token expansion** — header values support `{session-guid}` (one UUID per page load) and `{request-guid}` (fresh UUID per call), expanded at request-send time. Works for both default headers and per-request extra headers.
- **Harness version and build date** — `GET /api-test-spark/config` now includes `harnessVersion` (NuGet package version) and `harnessBuiltAt` (ISO-8601 assembly build timestamp); displayed on the About page.
- **`useRemoteConfigStore`** — new dedicated Zustand persist store (key `api-test-spark-remote-config`) holding all remote API configuration. Reads live in `useHostApi` so Config page saves take effect immediately without page reload.
- **CSP auto-extension** — `RemoteBaseUrl` is automatically added to `Content-Security-Policy connect-src`, allowing direct browser-to-remote-API calls without modifying the remote server.

### Changed

- **About page** — Version and Build Date now sourced from the `harnessConfig` store (populated from the config endpoint) instead of a separate `build-info.json` fetch that fails in NuGet embedded mode.
- **Config page HeadersEditor** — typing a header key no longer loses focus on each keystroke (isolated via uncontrolled `KeyInput` sub-component that commits on blur). Newly saved headers are sent in the next request without a page reload.
- **Constitution v1.1.2** — `useRemoteConfigStore` added to the §V canonical store registry; ratification history and sync impact report updated.

### Architectural Decisions

- **ADR-008**: Server-side proxy for remote OpenAPI spec fetch — credentials off browser, SSRF guard, `useRemoteConfigStore` for live remote config reads

### Contributors

- Mark Hazleton

## [v1.2.0] - 2026-06-02

### Added

- **Editable depth-1 nested objects** — primitive fields inside nested response objects render as collapsible editable sub-forms (collapsed by default); edited values are merged back into the "Copy as JSON" output with correct type coercion. Arrays of objects inside nested objects render as read-only sortable tables; flat primitive arrays render as read-only JSON blocks.
- **Copy as cURL in response panel** — a "Copy as cURL" button appears in the response panel after each successful API call, generating the same cURL format already available on the request side. Captured at `onSuccess` time (not fire time) to guarantee the command always corresponds to the response shown.
- **Pretty / minified JSON toggle** — raw JSON display contexts now offer a toggle between 2-space-indented (pretty) and single-line (minified) views. The active view is reflected when copying JSON. Toggle is absent on sortable table views.
- **Session-persistent toggle preference** — the pretty/minified preference persists across all API calls within the same browser session via `useHarnessConfigStore`; resets to pretty-print on page reload.
- **JSONPath field tooltips** — every field in the response form displays its dot-notation JSONPath address (`$.field`, `$.parent.field`, `$[*].col`) as a hover/focus tooltip. Clicking the label copies the path to the clipboard.
- **2-row table truncation** — sortable tables (top-level and nested arrays of objects) show only the first 2 rows by default. A "Show all N items" control reveals the rest inline; "Show less" collapses back. Expanded state resets with each new API call.
- **`buildCurl` shared utility** — extracted from `DebugPanel.tsx` into `src/utils/curlBuilder.ts`; re-exported from `src/utils/index.ts`. Both `DebugPanel.tsx` and `EndpointTester.tsx` now share one authoritative cURL format.

### Architectural Decisions

- **ADR-005**: Session-only UI preference stored in `useHarnessConfigStore` — no new store, no `persist` middleware
- **ADR-006**: `buildCurl` extracted to `src/utils/curlBuilder.ts` — single authoritative cURL format for request and response panels
- **ADR-007**: Native `<details>`/`<summary>` for collapsible nested object sections — zero JS, browser-native, matches existing `LazyDetails` pattern

### Contributors

- Mark Hazleton

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

[Unreleased]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.7.0...HEAD
[v1.7.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.6.0...v1.7.0
[v1.6.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.5.0...v1.6.0
[v1.5.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.4.0...v1.5.0
[v1.4.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.3.0...v1.4.0
[v1.3.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.1.0...v1.2.0
[v1.1.0]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.2...v1.1.0
[v1.0.2]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.1...v1.0.2
[v1.0.1]: https://github.com/MarkHazleton/ApiTestSpark/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/MarkHazleton/ApiTestSpark/releases/tag/v1.0.0
