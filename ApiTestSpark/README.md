# ApiTestSpark

[![NuGet](https://img.shields.io/nuget/v/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)
[![NuGet Downloads](https://img.shields.io/nuget/dt/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)

**NuGet**: [https://www.nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark)
**Live Site**: [https://apitest.makeboldspark.com](https://apitest.makeboldspark.com)

Embed the **API Test Spark** React SPA into any **.NET 10 Minimal API** project with a single method call. Autodiscovers your OpenAPI v3 endpoints and renders a full-featured interactive test harness at `/api-test-spark/`.

## About

API Test Spark is a lightweight developer tool for testing and debugging REST APIs. Install it into any .NET Minimal API project and it automatically discovers your endpoints via OpenAPI v3, rendering an interactive test harness at `/api-test-spark/`.

> Built by [Mark Hazleton](https://markhazleton.com) — Solutions Architect
> API Test Spark is part of the [Make Bold Spark](https://makeboldspark.com) portfolio.

## Install

```bash
dotnet add package ApiTestSpark
```

## Quickstart

```csharp
// Program.cs — minimal setup
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();
app.MapOpenApi();
app.MapApiTestSpark();   // serves at /api-test-spark/
app.Run();
```

Navigate to `https://localhost:{port}/api-test-spark/` to open the harness.

## With auth and custom headers

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl      = "/openapi.json";
    options.AuthScheme      = "Bearer";
    options.DefaultHeaders["X-Tenant-Id"] = "acme";
    options.Environments    = ["Development", "Staging"];
});
```

## What's in the SPA

### Endpoint discovery and testing

- **Collapsible accordion groups** — endpoints grouped by OpenAPI tag using the `"Namespace: Label"` convention (e.g. `"Products: Catalog"` → `Products > Catalog`). All groups start collapsed when 3+ are present; search filter narrows results in real time.
- **Full OpenAPI metadata surface** — operation description rendered as markdown (bold, italic, code, headings, numbered lists, fenced code blocks, tables); `operationId` shown as a copyable chip; all documented response codes as coloured badges with expandable inline schemas.
- **Schema tables** — request body and response schemas displayed with field names, types, formats, `required` markers, `default` values, `nullable` hints, and `min`/`max`/`minLength`/`maxLength` constraints.
- **JSON scaffold** — request body pre-filled from schema: `example → default → enum[0] → type placeholder`. Nested objects and arrays scaffolded recursively.
- **Response rendering** — arrays render as sortable tables; objects render as editable forms with copy-to-JSON; primitives and raw text render in a pre block.
- **API info header** — title, version, endpoint count, contact name/email/URL, and license from the OpenAPI `info` block shown in the screen header.

### API Doc Builder (`/api-docs`)

Generate complete markdown documentation targeted at front-end developer agents:

1. Select endpoints from the collapsible accordion
2. Capture live HTTP responses (stores the exact curl command + full JSON response)
3. Add prose annotations per section
4. Export a `.md` file with table of contents, parameter tables, request body schema tables, response code tables, and fenced curl + response examples

### Debug panel

- Always-on side panel (drag-resizable) capturing every request, response, metric, and error
- cURL snippet generation for every request
- Performance metrics: average latency, success rate, total count
- FIFO buffers: 50 requests/responses/errors, 100 metrics

### Built-in reference integrations

- **JokeAPI** (`/joke-api`) — JokeAPI v2 reference integration
- **JSONPlaceholder** (`/json-placeholder`) — JSONPlaceholder reference integration

## Local development (Vite dev server)

If the React dev server (`localhost:5151`) and your .NET API run on different ports, the SPA's config fetch will be blocked by same-origin policy. Allow your dev origin:

```csharp
app.MapApiTestSpark(options =>
{
    options.CorsOrigins = ["http://localhost:5151"];
});
```

## Behind a reverse proxy

Call `UseForwardedHeaders()` **before** `MapApiTestSpark()` so the config endpoint reports the correct public base URL:

```csharp
app.UseForwardedHeaders();
app.MapApiTestSpark();
```

## Diagnostics / logging

```json
{
  "Logging": {
    "LogLevel": {
      "ApiTestSpark": "Debug"
    }
  }
}
```

Or set `options.EnableVerboseLogging = true` in code to emit per-asset request logs.

## ApiTestSparkOptions reference

| Property | Default | Description |
| -------- | ------- | ----------- |
| `OpenApiUrl` | `"/openapi.json"` | Relative or absolute URL to your OpenAPI v3 JSON document. `null` disables autodiscovery. |
| `AuthScheme` | `null` | `"Bearer"`, `"ApiKey"`, or `"Basic"` — pre-populates the auth field. Never a token value. |
| `DefaultHeaders` | `{}` | Key-value headers injected into every request the SPA makes to your API. |
| `Environments` | `[]` (all) | Environment names where the harness is active. Empty = all environments. |
| `CorsOrigins` | `[]` (same-origin) | Extra origins allowed to call the config endpoint (e.g. Vite dev server). |
| `EnableVerboseLogging` | `false` | Emits `ILogger.LogDebug` for every static asset served. |

## SPA routing note

All extensionless paths under `/api-test-spark/` return HTTP 200 with `index.html`. WAF rules should not expect HTTP 404 for SPA routes.

## Semver policy

- **Patch** (x.y.Z): bug fixes, no public API changes
- **Minor** (x.Y.0): additive features, no breaking changes
- **Major** (X.0.0): breaking changes to `MapApiTestSpark`, `ApiTestSparkOptions`, or `ApiTestSparkExtensions`

PR titles for changes touching `PublicAPI.Shipped.txt` must include `SEMVER: MAJOR` or `SEMVER: MINOR`.

## How this package is built

See [NUGET-PACKAGE-WALKTHROUGH.md](NUGET-PACKAGE-WALKTHROUGH.md) for the full technical walkthrough: MSBuild/Vite bridge, embedded resources, Source Link, public API tracking, CI/CD pipeline, and security configuration.

**NuGet**: [https://www.nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark)
**Source**: [github.com/MarkHazleton/ApiTestSpark](https://github.com/MarkHazleton/ApiTestSpark)

## License

MIT
