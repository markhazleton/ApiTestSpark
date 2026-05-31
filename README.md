# API Test Spark

> Embed an interactive API test harness into any .NET 10 Minimal API with one line of code.

[![NuGet Version](https://img.shields.io/nuget/v/ApiTestSpark?label=NuGet&color=004880)](https://www.nuget.org/packages/ApiTestSpark)
[![NuGet Downloads](https://img.shields.io/nuget/dt/ApiTestSpark?label=Downloads&color=004880)](https://www.nuget.org/packages/ApiTestSpark)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4)](https://dotnet.microsoft.com/download/dotnet/10.0)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-apitest.makeboldspark.com-0ea5e9)](https://apitest.makeboldspark.com)

**[NuGet Package](https://www.nuget.org/packages/ApiTestSpark)** &nbsp;·&nbsp;
**[Live Demo](https://apitest.makeboldspark.com)** &nbsp;·&nbsp;
**[GitHub Repository](https://github.com/markhazleton/apitestspark)** &nbsp;·&nbsp;
**[Report an Issue](https://github.com/markhazleton/apitestspark/issues)**

---

## What is API Test Spark?

**API Test Spark** is a NuGet package that embeds a full-featured, React-powered API test harness directly into any **.NET 10 Minimal API** application. Drop in one method call — `MapApiTestSpark()` — and your API instantly gains an interactive testing UI at `/api-test-spark/`.

No separate deployment. No Swagger UI dependency. No `wwwroot` changes. The entire React SPA (181 KB) ships as embedded resources inside the package.

```
dotnet add package ApiTestSpark
```

See it live at **[https://apitest.makeboldspark.com](https://apitest.makeboldspark.com)** — the demo runs against a real .NET 10 Minimal API with 16 endpoints across Products, Customers, and Orders.

---

## Package Details

| Property | Value |
|---|---|
| **Package ID** | `ApiTestSpark` |
| **Version** | 1.0.2 |
| **Author** | [Mark Hazleton](https://markhazleton.com) |
| **License** | MIT |
| **Target Framework** | net10.0 |
| **Package Size** | 181 KB |
| **Symbol Package** | 15.7 KB (`.snupkg`) |
| **Dependencies** | None |
| **Last Updated** | May 30, 2026 |
| **NuGet** | [nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark) |
| **Live Demo** | [apitest.makeboldspark.com](https://apitest.makeboldspark.com) |
| **Source** | [github.com/markhazleton/apitestspark](https://github.com/markhazleton/apitestspark) |

---

## Quick Start

### 1. Install

```bash
dotnet add package ApiTestSpark
```

Or via the NuGet Package Manager:

```powershell
Install-Package ApiTestSpark
```

### 2. Register in `Program.cs`

```csharp
using ApiTestSpark;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();          // built-in .NET 9+

var app = builder.Build();
app.MapOpenApi();                        // exposes /openapi/v1.json

app.MapGet("/products", () => new[] {
    new { Id = 1, Name = "Widget", Price = 9.99 }
}).WithSummary("List all products");

app.MapApiTestSpark();                   // harness live at /api-test-spark/

app.Run();
```

### 3. Open the harness

Navigate to `https://localhost:{port}/api-test-spark/` — API Test Spark autodiscovers all your OpenAPI v3 endpoints and renders them ready to test.

---

## Features

| Feature | Description |
|---|---|
| **OpenAPI Autodiscovery** | Points at your OpenAPI v3 document and renders every endpoint in a collapsible accordion, grouped by tag |
| **Zero Configuration** | Works with .NET's built-in `MapOpenApi()` — sensible defaults for every option |
| **No Dependencies** | The React SPA is compiled into embedded resources; nothing is copied to your project |
| **Auth & Header Injection** | Pre-populate Bearer tokens, API keys, or custom headers for every request |
| **Request Body Scaffolding** | JSON body pre-filled from schema `example → default → enum[0] → type placeholder` |
| **Full OpenAPI Metadata** | Descriptions rendered as markdown, response codes as coloured badges with expandable schemas |
| **API Doc Builder** | Select endpoints, capture live curl + responses, annotate, and export markdown at `/api-docs` |
| **Live Debug Panel** | Every request, response, error, and performance metric — drag-resizable, FIFO buffered |
| **Environment Gating** | Restrict the harness to Development or Staging; keep it off production with one option |
| **Demo Integration Toggle** | Hide the built-in JokeAPI and JSONPlaceholder demo screens with one option — show only your host API |
| **Source Link** | Step-through debugging into the package source from Visual Studio / Rider |

---

## Configuration

All options are set via the `Action<ApiTestSparkOptions>` delegate:

```csharp
app.MapApiTestSpark(options =>
{
    options.OpenApiUrl              = "/openapi/v1.json";   // default: "/openapi.json"
    options.AuthScheme              = "Bearer";             // "Bearer" | "ApiKey" | "Basic" | null
    options.DefaultHeaders["X-Tenant-Id"] = "acme";
    options.Environments            = ["Development", "Staging"];
    options.CorsOrigins             = ["http://localhost:5151"];
    options.EnableVerboseLogging    = false;
    options.EnableDemoIntegrations  = false;                // hide JokeAPI + JSONPlaceholder demos
});
```

| Option | Default | Description |
|---|---|---|
| `OpenApiUrl` | `"/openapi.json"` | Relative or absolute URL of your OpenAPI v3 JSON document |
| `AuthScheme` | `null` | Advertises the auth scheme to the UI — never a token value |
| `DefaultHeaders` | `{}` | Headers injected into every request the SPA sends to your API |
| `Environments` | `[]` (all) | Environment names where the harness is active; empty = everywhere |
| `CorsOrigins` | `[]` | Extra origins allowed to call the config endpoint |
| `EnableVerboseLogging` | `false` | Emits `ILogger.LogDebug` for every asset served and SPA fallback |
| `EnableDemoIntegrations` | `true` | When `false`, hides the built-in JokeAPI and JSONPlaceholder demo screens and disables their routes. Set to `false` for a clean harness showing only your host API. |

---

## Live Demo

**[https://apitest.makeboldspark.com](https://apitest.makeboldspark.com)** is the official demo and product site for API Test Spark. It runs on .NET 10 with ApiTestSpark v1.0.2 installed and exposes 16 real endpoints:

| Group | Endpoints |
|---|---|
| **Products** | `GET /products`, `GET /products/{id}`, `GET /products/categories`, `GET /products/category/{name}`, `POST /products`, `PUT /products/{id}`, `DELETE /products/{id}` |
| **Customers** | `GET /customers`, `GET /customers/{id}`, `POST /customers`, `PUT /customers/{id}`, `DELETE /customers/{id}` |
| **Orders** | `GET /orders`, `GET /orders/{id}`, `GET /orders/customer/{customerId}`, `GET /orders/status/{status}`, `POST /orders`, `PATCH /orders/{id}/status`, `DELETE /orders/{id}` |

Open the harness directly: **[https://apitest.makeboldspark.com/api-test-spark/](https://apitest.makeboldspark.com/api-test-spark/)**

---

## How It Works

`MapApiTestSpark()` registers three things into your ASP.NET Core pipeline:

1. **Static file middleware** — serves the embedded SPA assets (HTML, JS, CSS) from `EmbeddedFileProvider` at `/api-test-spark/`. No files are copied to your project.
2. **Config endpoint** — `GET /api-test-spark/config` returns your `OpenApiUrl`, `AuthScheme`, `DefaultHeaders`, and `EnableDemoIntegrations` at runtime. The SPA fetches this on startup — no values are hardcoded in the bundle.
3. **SPA fallback** — extensionless paths under `/api-test-spark/` serve `index.html` so client-side routing works. Unknown file extensions return HTTP 404.

---

## Release Notes

### v1.0.2 — May 30, 2026

Fixed Content-Security-Policy on the `index.html` SPA fallback to allow localhost WebSocket and HTTP connections in Development, so ASP.NET Core Browser Link and hot-reload no longer block the harness from loading. No public API changes.

### v1.0.1

Documentation update — all docs brought current to code.

### v1.0.0

Initial release. OpenAPI autodiscovery, collapsible accordion endpoint groups, full response documentation, API Doc Builder, debug panel, Azure Application Insights integration, environment gating, curl generation.

See [CHANGELOG.md](CHANGELOG.md) for the full history.

---

## Repository Structure

```
ApiTestSpark/          # .NET NuGet library — MapApiTestSpark() extension
ApiTestSpark.Tests/    # .NET MSTest integration tests
SampleApi/             # Demo + product site (live at apitest.makeboldspark.com)
src/                   # React 19 / TypeScript SPA source
scripts/               # PowerShell build, lint, and pack helpers
.documentation/        # Feature specs, plan, constitution
```

### React SPA Stack

- **React 19** / TypeScript 5.x / Vite 8
- **Zustand 5** (persist) — config, auth, harness, debug stores
- **TanStack Query 5** — mutation-based API calls
- **Tailwind CSS 4** — utility-first styles
- **React Router DOM 7** — client-side routing

### .NET Library Stack

- **.NET 10** / ASP.NET Core Minimal API
- `EmbeddedFileProvider` for zero-copy static asset serving
- `Microsoft.SourceLink.GitHub` — step-through debugging support
- `Microsoft.CodeAnalysis.PublicApiAnalyzers` — public API surface tracking

---

## Development

```powershell
.\scripts\build\dev.ps1      # Start React dev server (http://localhost:5151)
.\scripts\build\build.ps1    # Production build (tsc -b + vite)
.\scripts\build\pack.ps1     # Build SPA + pack NuGet
.\scripts\lint\lint.ps1      # ESLint check
.\scripts\lint\fix.ps1       # Auto-fix linting
dotnet build ApiTestSpark    # Build .NET library
dotnet test ApiTestSpark.Tests  # Run integration tests
```

**Quality gates (required before merge):**

1. `npm run lint` — zero ESLint errors
2. `npm run verify` — `tsc -b` + `vite build` with zero errors
3. `dotnet build ApiTestSpark` — zero C# errors
4. `dotnet test ApiTestSpark.Tests` — all tests pass

---

## Security

- The `/api-test-spark/config` endpoint is publicly accessible and returns metadata only — auth scheme name and header names, never token values.
- Use `options.Environments = ["Development", "Staging"]` to prevent the harness from loading in production.
- API tokens stored in the browser are base64-obfuscated in `localStorage` — treat the browser as an untrusted environment.

---

## FAQ

**Does it work on .NET 8 or 9?**
The package targets `net10.0`. For .NET 8/9, reference the source directly and adjust the target framework. For .NET 8 you will also need Swashbuckle for OpenAPI — point `OpenApiUrl` at the Swagger JSON URL.

**Will it conflict with my existing middleware?**
No. The harness is scoped entirely to `/api-test-spark/`. It does not modify any other routes, middleware, or pipeline behaviour.

**Can I use it behind a reverse proxy?**
Yes. Call `app.UseForwardedHeaders()` before `app.MapApiTestSpark()` so the config endpoint reports the correct public base URL.

**Can I hide the JokeAPI and JSONPlaceholder demo screens?**
Yes. Set `options.EnableDemoIntegrations = false`. The home page will show only the Host API Explorer and API Doc Builder, and the demo routes (`/joke-api`, `/json-placeholder`) are disabled entirely.

**Does it support OpenAPI v2 / Swagger 2.0?**
Only OpenAPI v3.x. Use [converter.swagger.io](https://converter.swagger.io/) to produce a v3 document and point `OpenApiUrl` at it.

---

## Maximising your API Test Spark experience

API Test Spark's only input is your OpenAPI v3 document. Everything it renders — endpoint groups, descriptions, request scaffolds, response schemas, status-code badges — comes directly from that document. The richer your OpenAPI metadata, the better your test harness.

### Impact reference

| OpenAPI feature | What API Test Spark does with it | Impact |
|---|---|---|
| `tags` in `"Namespace: Label"` format | Two-level collapsible accordion groups | **High** |
| `summary` on each operation | Bold title on every endpoint card | **High** |
| `description` (markdown) on each operation | Rendered below the summary — bold, lists, code blocks, tables | **High** |
| `operationId` / `WithName()` | Copyable chip beside each endpoint; API Doc Builder section heading | **High** |
| Request body schema with `example` / `default` | JSON scaffold pre-filled in the request body editor | **High** |
| Schema property `description` | Shown in the property table beside each field | **High** |
| `Produces<T>` per status code | Coloured badges with expandable inline schemas | **High** |
| `info.title`, `info.version`, `info.contact` | API info header at top of the Host API screen | **Medium** |
| `info.description` (markdown) | Rendered in the API info header — ideal for workflow walkthroughs | **Medium** |
| Parameter `description` + `example` | Shown in parameter table; example pre-fills path/query fields | **Medium** |
| Schema constraints (`minLength`, `maximum`, `enum`) | Constraint columns in property tables; enum drives a select input | **Medium** |
| `deprecated: true` | Endpoint visually flagged in the accordion | **Low** |

### Best practices

**1. Tag with `"Namespace: Label"` format**

```csharp
// Minimal API — on the group
app.MapGroup("/products").WithTags("Products: Catalog").MapProducts();

// Controller
[Tags("Products: Catalog")]
public class ProductsController : ControllerBase { }
```

The colon-space separator creates a two-level accordion. Without it, all endpoints land in one unsorted list.

---

**2. Give every operation a summary, description, and name**

```csharp
group.MapGet("/{id}", GetById)
     .WithName("GetProductById")                      // operationId → copyable chip
     .WithSummary("Get a product by ID")              // card title
     .WithDescription(
         "Returns a single product. Seeded IDs are **1–10**. " +
         "Returns **404** if no product exists with the given ID.");
```

Descriptions accept markdown. Use bold for key values, inline code for field names, and numbered lists for workflow steps.

---

**3. Declare every response code with `Produces<T>`**

```csharp
group.MapGet("/{id}", GetById)
     .Produces<Product>(StatusCodes.Status200OK)
     .Produces(StatusCodes.Status404NotFound);
```

Or use `TypedResults` — it infers response types automatically:

```csharp
static Results<Ok<Product>, NotFound> GetById(int id, ProductCache cache) =>
    cache.GetById(id) is { } p ? TypedResults.Ok(p) : TypedResults.NotFound();
```

Each declared status code becomes a coloured badge. Undeclared codes produce no badge and no inline schema.

---

**4. Annotate schema types with descriptions and constraints**

```csharp
public record Product(
    [property: Description("Server-assigned unique identifier. Ignored on create.")]
    int Id,

    [property: Description("Display name shown in the catalog.")]
    [property: Required][property: MinLength(1)][property: MaxLength(100)]
    string Name,

    [property: Description("Unit price in USD.")]
    [property: Range(0.01, 99999.99)]
    decimal Price
);
```

`[Description]`, `[Required]`, `[Range]`, `[MinLength]`, `[MaxLength]` all appear as columns in the schema property table.

---

**5. Set examples and defaults to pre-fill the JSON scaffold**

The scaffold fills from `example → default → enum[0] → type placeholder`. Without examples, every field shows a generic placeholder:

```csharp
// Record default parameter values
int StockQuantity = 0

// DefaultValue attribute
[DefaultValue("Electronics")]
string? Category

// Full example body via transformer
.WithOpenApi(op => {
    op.RequestBody.Content["application/json"].Example =
        new OpenApiString("""{"name":"Widget","price":9.99}""");
    return op;
})
```

---

**6. Write a workflow walkthrough in `info.description`**

```csharp
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, _, _) =>
    {
        doc.Info.Description = """
            ## Full workflow demo
            1. `POST /customers` — create a customer, note the returned `id`
            2. `POST /products` — create a product, note the returned `id`
            3. `POST /orders` — place an order using those ids
            4. `PATCH /orders/{id}/status?status=Confirmed` — advance the order
            """;
        return Task.CompletedTask;
    });
});
```

This renders as markdown in the API info header at the top of the Host API screen.

---

**What degrades the experience**

| Pattern | Effect |
|---|---|
| No `tags` | All endpoints in one unsorted flat list |
| No `summary` | Cards show raw `METHOD /path` only |
| No `Produces<T>` | No response-code badges, no inline schemas |
| No property `[Description]` | Schema table has blank description column |
| `IResult` return type without `TypedResults` | Response schema lost entirely |
| Anonymous object response types | Schema inferred as empty object |

The [SampleApi source](SampleApi/) is the live reference implementation — every practice above is demonstrated there.

---

## Further Reading

| Document | What it covers |
|---|---|
| [Current State of OpenAPI in .NET](OPENAPI-DOTNET.md) | Complete ecosystem guide — package versions, compatibility matrix, known issues, recommended combinations, React SPA parsing tips |
| [NuGet Package Walkthrough](NUGET-PACKAGE-WALKTHROUGH.md) | How ApiTestSpark is built and packed — MSBuild/Vite bridge, embedded resources, Source Link, public API tracking, CI/CD |
| [Package README](ApiTestSpark/README.md) | Consumer-facing reference — all `ApiTestSparkOptions`, quickstart snippets, semver policy |
| [Repo Story (2026-05-31)](.documentation/repo-story/repo-story-2026-05-31.md) | Evidence-based narrative of this repository's development history, contributor patterns, and architecture |
| [Live Demo](https://apitest.makeboldspark.com) | Running SampleApi on .NET 10 with 16 endpoints and ApiTestSpark installed |
| [NuGet Package](https://www.nuget.org/packages/ApiTestSpark) | Package page, download stats, version history |

### OpenAPI ecosystem quick reference

ApiTestSpark works with any OpenAPI v3 generator. The recommended stack for a new .NET 10 project:

```xml
<!-- Document generation — Microsoft first-party -->
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.8" />

<!-- UI renderer — modern Swagger UI alternative, zero dependencies -->
<PackageReference Include="Scalar.AspNetCore" Version="2.14.14" />
```

```csharp
builder.Services.AddOpenApi();
var app = builder.Build();
app.MapOpenApi();                 // /openapi/v1.json
app.MapScalarApiReference();      // /scalar/v1
app.MapApiTestSpark();            // /api-test-spark/
```

See [OPENAPI-DOTNET.md](OPENAPI-DOTNET.md) for the full breakdown including Swashbuckle migration, NSwag, build-time generation, and React SPA parsing guidance.

---

## Contributing

Issues and pull requests are welcome at [github.com/markhazleton/apitestspark](https://github.com/markhazleton/apitestspark).

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built by [Mark Hazleton](https://markhazleton.com) &nbsp;·&nbsp;
Part of the [Make Bold Spark](https://makeboldspark.com) portfolio &nbsp;·&nbsp;
[Make Bold Solutions](https://makeboldsolutions.com)
