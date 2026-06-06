# ApiTestSpark

[![NuGet](https://img.shields.io/nuget/v/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)
[![NuGet Downloads](https://img.shields.io/nuget/dt/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/markhazleton/apitestspark/blob/main/LICENSE)

Embed the **API Test Spark** React SPA into any **.NET 10 Minimal API** with a single method call.
Autodiscovers your OpenAPI v3 endpoints and renders a full-featured interactive test harness at `/api-test-spark/`.

**[Live Demo](https://apitest.makeboldspark.com)** &nbsp;·&nbsp;
**[GitHub](https://github.com/markhazleton/apitestspark)** &nbsp;·&nbsp;
**[NuGet](https://www.nuget.org/packages/ApiTestSpark)**

---

## Install

```bash
dotnet add package ApiTestSpark
```

## Quickstart

```csharp
using ApiTestSpark;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();

var app = builder.Build();
app.MapOpenApi();          // /openapi/v1.json
app.MapApiTestSpark();     // /api-test-spark/

app.Run();
```

Navigate to `https://localhost:{port}/api-test-spark/` — the harness autodiscovers all your endpoints.

---

## Configuration

All options are optional. Pass an `Action<ApiTestSparkOptions>` to configure:

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl             = "/openapi/v1.json";        // default: "/openapi.json"
    options.AuthScheme             = "Bearer";                  // pre-populates auth field
    options.DefaultHeaders["X-Tenant-Id"] = "acme";            // injected into every SPA request
    options.Environments           = ["Development", "Staging"]; // empty = all environments
    options.EnableDemoIntegrations = false;                     // hide JokeAPI + JSONPlaceholder
});
```

### Options reference

| Property | Default | Description |
|---|---|---|
| `OpenApiUrl` | `"/openapi.json"` | URL of your OpenAPI v3 JSON document. `null` disables autodiscovery. |
| `AuthScheme` | `null` | `"Bearer"`, `"ApiKey"`, or `"Basic"` — metadata only, never a token value. |
| `DefaultHeaders` | `{}` | Headers injected into every host API SPA request. Must not contain credentials — values are served publicly via the config endpoint. |
| `Environments` | `[]` (all) | Environment names where the harness is active. Empty = everywhere. Example: `["Development", "Staging"]` keeps it off production. |
| `CorsOrigins` | `[]` (same-origin) | Extra origins allowed to call the config endpoint. Use when the Vite dev server and .NET API run on different ports. |
| `EnableVerboseLogging` | `false` | Emits `ILogger.LogDebug` for every asset served and SPA fallback. Alternatively set `Logging:LogLevel:ApiTestSpark=Debug` in appsettings. |
| `EnableDemoIntegrations` | `true` | When `false`, hides the built-in JokeAPI and JSONPlaceholder demo screens from the home page and disables their routes. Set to `false` to present a clean harness showing only your host API and API Doc Builder. |
| `RemoteBaseUrl` | `null` | Base URL of the remote REST API. Added to CSP `connect-src` so browser direct-calls are permitted. |
| `RemoteOpenApiUrl` | `null` | Full URL of the remote OpenAPI JSON document. Fetched server-side via the spec proxy. Must begin with `http://` or `https://`. |
| `RemoteOpenApiApiKeyHeader` | `null` | Header name for the remote API key (e.g. `x-api-key`). Only used when `RemoteOpenApiApiKeyValue` is also set. |
| `RemoteOpenApiApiKeyValue` | `null` | API key value. Injected server-side; never sent to the browser. |
| `RemoteOpenApiBearerToken` | `null` | Bearer token for the remote spec proxy. Injected server-side as `Authorization: Bearer <token>`. |
| `RemoteDefaultHeaders` | `{}` | Headers injected into every browser-side request to the remote API. Supports `{session-guid}` and `{request-guid}` tokens expanded at request time. |

---

## Features

- **OpenAPI autodiscovery** — endpoints grouped by tag in a collapsible accordion; real-time search filter
- **Remote API Explorer** — browse and test a remote REST API from its OpenAPI document via a server-side spec proxy; API key and Bearer token injected server-side so credentials never appear in the browser network tab
- **Full metadata surface** — descriptions rendered as markdown, response codes as coloured badges with expandable inline schemas, `operationId` as a copyable chip, schema constraint tables
- **JSON scaffold** — request body pre-filled from `example → default → enum[0] → type placeholder`; nested objects and arrays scaffolded recursively
- **Response rendering** — arrays as sortable tables, objects as editable forms, primitives in pre blocks
- **API Doc Builder** (`/api-docs`) — select endpoints, capture live curl + responses, annotate sections, export markdown
- **Remote API Doc Builder** (`/remote-api-docs`) — same documentation capture for remote API endpoints
- **Header token expansion** — `{session-guid}` and `{request-guid}` tokens in header values are replaced at request time with real UUIDs
- **Debug panel** — drag-resizable, captures every request/response/error/metric; cURL snippet per request; FIFO buffered
- **Environment gating** — one option keeps the harness off production
- **Demo integration toggle** — set `EnableDemoIntegrations = false` to hide the built-in JokeAPI and JSONPlaceholder screens; show only your host API and the API Doc Builder
- **Zero extra dependencies** — 181 KB package, no `wwwroot` changes, nothing copied to your project

### Clean install — your API only

Set `EnableDemoIntegrations = false` to remove the JokeAPI and JSONPlaceholder demo screens entirely.
The home page shows only **Host API Explorer** and **API Doc Builder** — no sample data, no external API noise.

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl             = "/openapi/v1.json";
    options.Environments           = ["Development", "Staging"];
    options.EnableDemoIntegrations = false;
});
```

### Remote API Explorer

Point the harness at a remote REST API by configuring `RemoteBaseUrl` and `RemoteOpenApiUrl`. The harness fetches the remote spec server-side (credentials stay off the browser network tab) and exposes a full endpoint explorer and doc builder for the remote API.

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl                   = "/openapi/v1.json";
    options.RemoteBaseUrl                = "https://api.example.com";
    options.RemoteOpenApiUrl             = "https://api.example.com/openapi.json";
    options.RemoteOpenApiApiKeyHeader    = "x-api-key";
    options.RemoteOpenApiApiKeyValue     = "your-api-key";
    // Optional: correlation headers with per-request UUID tokens
    options.RemoteDefaultHeaders["correlationId"] = "{request-guid}";
    options.RemoteDefaultHeaders["sessionId"]     = "{session-guid}";
});
```

> **Security note**: The harness is intended for local and trusted development environments only. Do not expose it to the public internet.

---

## Getting the most out of API Test Spark

API Test Spark reads your OpenAPI v3 document. Every annotation you add to your API is surfaced directly in the harness. The more metadata you provide, the richer the testing experience.

**Tag endpoints with `"Namespace: Label"` format** — creates a two-level collapsible accordion:

```csharp
app.MapGroup("/products").WithTags("Products: Catalog").MapProducts();
app.MapGroup("/orders").WithTags("Orders: Lifecycle").MapOrders();
```

**Name, summarise, and describe every operation** — summary is the card title; description renders as markdown:

```csharp
group.MapGet("/{id}", GetById)
     .WithName("GetProductById")
     .WithSummary("Get a product by ID")
     .WithDescription("Returns a single product. Seeded IDs are **1–10**. Returns **404** if not found.");
```

**Declare every response code** — each becomes a coloured badge with an expandable inline schema:

```csharp
.Produces<Product>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound)
```

Or use `TypedResults` — it infers response types automatically without extra `.Produces()` calls.

**Annotate your schema types** — `[Description]`, `[Required]`, `[Range]`, `[MinLength]`, `[MaxLength]` all appear as columns in the schema property table:

```csharp
public record Product(
    [property: Description("Display name.")][property: Required][property: MaxLength(100)]
    string Name,
    [property: Description("Unit price in USD.")][property: Range(0.01, 99999.99)]
    decimal Price
);
```

**Set examples or defaults** — the JSON scaffold fills from `example → default → enum[0] → type placeholder`. Without examples every field shows a generic placeholder; with them testers can fire requests immediately.

**Add a workflow walkthrough to `info.description`** — renders as markdown in the API info header; ideal for linking resource groups and describing end-to-end flows.

See the [live demo](https://apitest.makeboldspark.com) and [full best-practices guide](https://github.com/markhazleton/apitestspark#maximising-your-api-test-spark-experience) for annotated source examples.

---

## Reverse proxy

Call `UseForwardedHeaders()` **before** `MapApiTestSpark()` so the config endpoint reports the correct public base URL:

```csharp
app.UseForwardedHeaders();
app.MapApiTestSpark();
```

## Local development (Vite dev server)

If your React dev server and .NET API run on different ports, allow the dev origin:

```csharp
app.MapApiTestSpark(options =>
{
    options.CorsOrigins = ["http://localhost:5151"];
});
```

## Diagnostics

```json
{
  "Logging": {
    "LogLevel": {
      "ApiTestSpark": "Debug"
    }
  }
}
```

---

## License

MIT — [github.com/markhazleton/apitestspark](https://github.com/markhazleton/apitestspark)
