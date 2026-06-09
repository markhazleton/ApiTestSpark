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
| `RemoteApiProfiles` | `[]` | List of named remote APIs. Each profile has `Id`, `Name`, `Description`, `RemoteBaseUrl`, `RemoteOpenApiUrl`, credentials, and default headers. |
| `RemoteBaseUrl` | `null` | Legacy single-remote base URL. Used as one compatibility profile when `RemoteApiProfiles` is empty. |
| `RemoteOpenApiUrl` | `null` | Legacy single-remote OpenAPI URL. Used as one compatibility profile when `RemoteApiProfiles` is empty. |
| `RemoteOpenApiApiKeyHeader` | `null` | Legacy header name for the remote API key. |
| `RemoteOpenApiApiKeyValue` | `null` | Legacy API key value. Used server-side only and redacted from config. |
| `RemoteOpenApiBearerToken` | `null` | Legacy bearer token. Used server-side only and redacted from config. |
| `RemoteDefaultHeaders` | `{}` | Legacy headers injected into browser-side requests to the remote API. Supports `{session-guid}` and `{request-guid}` tokens. |

### Multiple remote APIs

Configure named profiles in `Program.cs`:

```csharp
app.MapApiTestSpark(options =>
{
    options.RemoteApiProfiles.Add(new RemoteApiProfile
    {
        Id = "orders-api",
        Name = "Orders API",
        Description = "Order management endpoints.",
        RemoteBaseUrl = "https://orders.example.com",
        RemoteOpenApiUrl = "https://orders.example.com/openapi.json",
        RemoteOpenApiApiKeyHeader = "x-api-key",
        RemoteOpenApiApiKeyValue = builder.Configuration["Orders:ApiKey"],
    });
});
```

Server profile credentials are redacted from `/api-test-spark/config` and used only by `/api-test-spark/remote-spec?profileId=...`. Browser-created profiles on the Config page are stored locally and fetch OpenAPI documents directly from the browser.

---

## Features

- **OpenAPI autodiscovery** — endpoints grouped by tag in a collapsible accordion; real-time search filter
- **Remote API Explorer** — browse and test one or more named remote REST APIs from their OpenAPI documents; server-configured credentials stay server-side, browser-created profiles stay local, and duplicate visible names are blocked before save
- **Full metadata surface** — descriptions rendered as markdown, response codes as coloured badges with expandable inline schemas, `operationId` as a copyable chip, schema constraint tables
- **JSON scaffold** — request body pre-filled from `example → default → enum[0] → type placeholder`; nested objects and arrays scaffolded recursively
- **Response rendering** — arrays as sortable tables, objects as editable forms, primitives in pre blocks
- **API Doc Builder** (`/api-docs`) — select endpoints, capture live curl + responses, annotate sections, export markdown
- **Remote API Doc Builder** (`/remote-docs/{profileId}`) — same documentation capture for remote API endpoints
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

### Remote API Profiles

Point the harness at one or more remote REST APIs by configuring `RemoteApiProfiles`. Each profile gets its own explorer and doc builder route, displayed by `Name` and `Description`. Server-configured specs are fetched through `/api-test-spark/remote-spec?profileId=...` with credential values held server-side and redacted from `/api-test-spark/config`. Browser-created profiles are managed on the Config page, stored in `localStorage`, receive GUID ids, and fetch OpenAPI documents directly from the browser. Visible profile names must be unique, so users get a clear validation message before saving duplicates.

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl = "/openapi/v1.json";
    options.RemoteApiProfiles.Add(new RemoteApiProfile
    {
        Id = "partner-api",
        Name = "Partner API",
        Description = "External partner integration endpoints.",
        RemoteBaseUrl = "https://api.example.com",
        RemoteOpenApiUrl = "https://api.example.com/openapi.json",
        RemoteOpenApiApiKeyHeader = "x-api-key",
        RemoteOpenApiApiKeyValue = "your-api-key",
        RemoteDefaultHeaders =
        {
            ["correlationId"] = "{request-guid}",
            ["sessionId"] = "{session-guid}",
        },
    });
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
