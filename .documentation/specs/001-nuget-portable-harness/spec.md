---
classification: full-spec
risk_level: medium
target_workflow: specify-full
required_artifacts: spec, plan, tasks
recommended_next_step: plan
required_gates: checklist, analyze, critic
---

# Feature Specification: Portable NuGet Package for API Test Harness

**Feature Branch**: `001-nuget-portable-harness`
**Created**: 2026-05-29
**Status**: Draft
**Input**: User description: "Transform the API Test Harness React SPA into a portable NuGet package (WebSpark.ApiTestHarness) that can be installed into any .NET Minimal API project."

## Rationale Summary

### Core Problem

The API Test Harness is currently a standalone React SPA deployed to Azure Static Web Apps. Developers building .NET Minimal API projects have no easy way to embed a rich, interactive API testing tool directly into their application — they must maintain a separate deployment, configure cross-origin access, and manually keep the tool in sync with their API surface. This friction reduces adoption and limits the tool's value.

### Decision Summary

Package the compiled React SPA as embedded resources inside a NuGet package (`WebSpark.ApiTestHarness`). The package exposes a single `MapApiTestHarness()` extension method and a config endpoint that allows the host app to inject its OpenAPI document URL, auth scheme, and custom headers at registration time. The SPA autodiscovers the host app's endpoints via OpenAPI and renders them alongside built-in examples.

### Key Drivers

- Developer experience: One-line installation in any .NET Minimal API project
- Reusability: Same React SPA codebase serves standalone and embedded use cases
- OpenAPI ubiquity: Most .NET Minimal API projects already expose an OpenAPI document, enabling zero-config autodiscovery

### Source Inputs

- Existing API Test Harness React SPA (JokeAPI reference implementation)
- .NET ecosystem patterns: Scalar, Swagger UI, Aspire ship NuGet-embedded SPAs
- User conversation: portability and extensibility requirements documented in session

### Tradeoffs Considered

- Option A: Copy `build/` output into each consuming project's `wwwroot/` — simplest but not automated, no versioning
- Option B: Serve from a CDN and embed a thin script tag — fast but requires internet access and CDN dependency
- Selected: NuGet embedded resources with `MapApiTestHarness()` — self-contained, versioned, offline-capable, follows established .NET tooling patterns

### Architectural Impact

- React SPA Vite `base` path is fixed at `/api-test-harness/` — this is a hard constraint for this release; custom mount paths are explicitly out of scope
- SPA startup flow gains a config fetch step before rendering, replacing hardcoded environment assumptions
- A new companion `.csproj` (`WebSpark.ApiTestHarness`) is added to the repository alongside the existing React project
- No changes to existing standalone Azure Static Web Apps deployment path

### Out of Scope — This Release

- **Response diffing**: Comparing responses across environments is not included
- **Saved request templates**: Persisting named request body templates is not included
- **Custom mount paths**: The harness always serves at `/api-test-harness/` (deferred to follow-on)
- **OpenAPI v2 / Swagger 2.0**: Only OpenAPI v3.x documents are parsed

### In Scope — Clarified

- **Request history persistence**: The existing debug store (request/response/error/metrics capture) MUST be preserved and functional when the harness is embedded in a host app

### Reviewer Guidance

Focus on: (1) whether the config endpoint contract is flexible enough for diverse host app auth schemes; (2) whether the Vite base path change breaks the existing standalone deployment; (3) whether the NuGet packaging step integrates cleanly into the existing build pipeline.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install Harness in a New .NET API (Priority: P1)

A .NET developer adds `WebSpark.ApiTestHarness` from NuGet to their Minimal API project. They add one line to `Program.cs` and run the app. Navigating to `/api-test-harness/` in the browser opens the test harness UI, which has already discovered and listed the host app's API endpoints via its OpenAPI document.

**Why this priority**: This is the entire value proposition — zero-friction installation. If this fails nothing else matters.

**Independent Test**: Can be fully tested by creating a new `dotnet new webapi` project, installing the package, adding `app.MapApiTestHarness()`, and confirming the UI loads at `/api-test-harness/` with the host app's endpoints listed.

**Acceptance Scenarios**:

1. **Given** a new .NET Minimal API project with OpenAPI enabled, **When** `app.MapApiTestHarness()` is called and the app starts, **Then** `GET /api-test-harness/` returns the test harness HTML page
2. **Given** the harness UI has loaded, **When** the SPA initializes, **Then** it fetches `/api-test-harness/config` and uses the returned `openApiUrl` to populate the endpoint list
3. **Given** the host app exposes `GET /openapi.json`, **When** the SPA reads it, **Then** all endpoints defined in the document appear in the harness UI under a "Your App's APIs" section

---

### User Story 2 - Configure Auth and Custom Headers (Priority: P2)

A developer's API requires a bearer token and a tenant header for every request. They configure these in `Program.cs` when registering the harness. The test harness UI pre-populates the auth header and tenant header fields for all requests made to the host app's endpoints.

**Why this priority**: Auth is a near-universal requirement for real APIs. A test harness that can't authenticate against the host app is only useful for public endpoints.

**Independent Test**: Can be tested independently by registering the harness with `AuthScheme = "Bearer"` and `DefaultHeaders = { "X-Tenant-Id": "acme" }`, then firing a request in the UI and confirming the correct headers appear in the debug panel.

**Acceptance Scenarios**:

1. **Given** the harness is registered with `options.AuthScheme = "Bearer"`, **When** the config endpoint is called, **Then** the response includes `"authScheme": "Bearer"`
2. **Given** `DefaultHeaders` contains `{ "X-Tenant-Id": "acme" }`, **When** the SPA fires a request to a host app endpoint, **Then** the request includes the `X-Tenant-Id: acme` header
3. **Given** no auth options are configured, **When** the SPA initializes, **Then** auth fields are empty and no default headers are injected

---

### User Story 3 - Built-in Examples Still Work (Priority: P3)

A developer installs the harness in a project that has no OpenAPI document. The JokeAPI and JsonPlaceholder reference examples are still available in the UI and fully functional, demonstrating the tool's capabilities even without host app integration.

**Why this priority**: Preserves existing value and ensures graceful degradation when OpenAPI is unavailable.

**Independent Test**: Can be tested by installing the harness without configuring an `openApiUrl`, loading the UI, and confirming JokeAPI and JsonPlaceholder screens load and execute requests successfully.

**Acceptance Scenarios**:

1. **Given** no `openApiUrl` is configured, **When** the SPA loads, **Then** the "Your App's APIs" section is hidden or shows a "no endpoints configured" message, and built-in examples remain accessible
2. **Given** the JokeAPI screen is opened, **When** a request is fired, **Then** a joke response is returned and displayed as in the current standalone deployment

---

### User Story 4 - Custom Mount Path (Priority: P4 — Deferred)

> **Deferred**: Custom mount path support requires dynamic Vite base-path injection at request time, which adds complexity incompatible with the fixed-base embedded-asset approach chosen for this release. The harness is always served at `/api-test-harness/`. This story is a candidate for a follow-on release.

**Known constraint**: `MapApiTestHarness()` does NOT accept a path parameter in this release. The harness is always served at `/api-test-harness/` and the method signature is `MapApiTestHarness(this WebApplication app, Action<ApiTestHarnessOptions>? configure = null)`. A path parameter may be added in a future release when dynamic base-path injection is implemented.

---

### Edge Cases

- What happens when the host app's OpenAPI document is unreachable or returns an error? The SPA shows a clear error message and falls back to built-in examples only.
- What happens when the host app's OpenAPI document is very large (hundreds of endpoints)? The endpoint list must remain usable — grouping by tag or search/filter should be considered.
- How does the system handle requests to `/api-test-harness` (no trailing slash) versus `/api-test-harness/`? The middleware normalizes both to serve `index.html` correctly. This applies only to the default fixed path — custom mount paths are out of scope for this release.
- What happens when two packages that embed SPAs at the same path are installed? A clear startup exception identifies the path conflict.
- How does the harness behave in a production environment? The registration should support an environments restriction so it can be limited to non-production environments.

## Clarifications

### Session 2026-05-29

- Q: Should the config endpoint be publicly accessible or protected? → A: Public endpoint — returns auth scheme metadata only, never actual token values. Actual credentials are entered by the user in the UI and never flow through the config endpoint.
- Q: Which OpenAPI specification version(s) should the SPA parser support? → A: OpenAPI v3.x only — matches .NET 9+ Minimal API default output. v2 support deferred to a future amendment.
- Q: Should custom mount path support (User Story 4) be in scope for this release? → A: Deferred — Vite base path is fixed at `/api-test-harness/` for this version. Custom path support is a known constraint, documented for a follow-on release.
- Q: Should the .NET package component emit structured logging? → A: Full request logging via `ILogger` — log startup mount confirmation, every config endpoint hit, and every static asset request through the standard ASP.NET `ILogger` interface.
- Q: Which capabilities are explicitly out of scope for this release? → A: Response diffing between environments and saved request body templates are out of scope. Request history persistence IS in scope — the existing debug store pattern already captures request/response data and should be preserved when embedded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The NuGet package MUST serve the compiled React SPA at the fixed path `/api-test-harness/`; custom mount paths are out of scope for this release
- **FR-002**: The package MUST expose a `MapApiTestHarness()` extension method on `IEndpointRouteBuilder` (Minimal API pattern)
- **FR-003**: The package MUST expose a publicly accessible config endpoint at `{mountPath}/config` returning JSON with `baseUrl`, `openApiUrl`, `authScheme`, and `defaultHeaders` — the endpoint MUST NOT return actual credential values (tokens, keys), only scheme metadata
- **FR-004**: The SPA MUST fetch the config endpoint on startup before rendering the host app endpoint list
- **FR-005**: The SPA MUST parse OpenAPI v3.x documents at the configured `openApiUrl` and display discovered endpoints under a "Your App's APIs" section; OpenAPI v2 (Swagger 2.0) is explicitly out of scope for this version
- **FR-006**: The package MUST allow host apps to register custom default headers injected into every request the SPA makes to host app endpoints
- **FR-007**: The existing built-in examples (JokeAPI, JsonPlaceholder) MUST remain functional when the package is used
- **FR-008**: The SPA MUST gracefully handle an absent or unreachable OpenAPI document without crashing
- **FR-009**: The NuGet pack build MUST set `VITE_BASE_PATH=/api-test-harness/` so Vite bakes that base into all asset references; the standalone SWA build omits `VITE_BASE_PATH`, which defaults to `/`, preserving the existing deployment unchanged
- **FR-010**: The NuGet package MUST embed all SPA static assets (HTML, JS, CSS, fonts, icons) so the consuming project needs no additional file copying
- **FR-011**: The package MUST support restricting the harness to specific environments (e.g., Development only)
- **FR-012**: The .NET package component MUST emit structured log messages via `ILogger` for: (a) harness mount confirmation at startup, (b) every request to the config endpoint, and (c) every static asset request served — using standard ASP.NET `ILogger` so host apps control log level and sink
- **FR-013**: The existing debug store (request/response/error/metrics history) MUST remain fully functional when the harness is embedded in a host app; response diffing and saved request templates are explicitly excluded from this release

### Key Entities

- **HarnessOptions**: Configuration object the host app provides at registration time — mount path, OpenAPI URL, auth scheme, default headers, allowed environments
- **ConfigResponse**: JSON payload returned by the config endpoint — `baseUrl`, `openApiUrl`, `authScheme`, `defaultHeaders`
- **DiscoveredEndpoint**: An API endpoint parsed from the OpenAPI document — method, path, summary, parameters, request/response schema
- **NuGet Package**: `WebSpark.ApiTestHarness` — contains embedded SPA assets and the .NET extension method

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from `dotnet add package WebSpark.ApiTestHarness` to a running test harness in under 5 minutes, with no additional configuration beyond one line in `Program.cs`
- **SC-002**: All endpoints from a host app's OpenAPI document appear in the harness UI within 2 seconds of the page loading on a local development machine
- **SC-003**: The harness UI loads fully (all assets, no console errors) at the configured mount path in a freshly created `dotnet new webapi` project
- **SC-004**: The existing standalone Azure Static Web Apps deployment continues to pass all current quality gates (lint, typecheck, build) without modification
- **SC-005**: Built-in examples (JokeAPI, JsonPlaceholder) execute successfully when the harness is embedded in a host app with no OpenAPI configuration
- **SC-006**: The NuGet package is under 2 MB so it adds negligible overhead to host project deployment artifacts
