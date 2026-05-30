# ApiTestSpark

**Live Site**: [https://apitest.makeboldspark.com](https://apitest.makeboldspark.com)

Embed the **API Test Spark** React SPA into any **.NET 10 Minimal API** project with a single method call. Autodiscovers your OpenAPI v3 endpoints and renders an interactive test UI at `/api-test-spark/`.

## About

API Test Spark is a lightweight developer tool for testing and debugging REST APIs. Install it into any .NET Minimal API project and it automatically discovers your endpoints via OpenAPI v3, rendering an interactive test harness at `/api-test-spark/`.

> Built by [Mark Hazleton](https://markhazleton.com) — Mark Hazleton, Solutions Architect
> API Test Spark is part of the [Make Bold Spark](https://makeboldspark.com) portfolio of technical demonstrations.

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
    options.OpenApiUrl      = "/openapi.json";   // default
    options.AuthScheme      = "Bearer";          // pre-populates auth field in UI
    options.DefaultHeaders["X-Tenant-Id"] = "acme";  // injected into every request
    options.Environments    = ["Development", "Staging"];
});
```

## Local development (Vite dev server)

If you run the React SPA on a separate dev server (e.g. Vite on `:5151`) alongside your .NET API (e.g. on `:5000`), the same-origin CORS policy will block the SPA's config fetch. Add your dev origin:

```csharp
app.MapApiTestSpark(options =>
{
    options.CorsOrigins = ["http://localhost:5151"];
});
```

## Behind a reverse proxy

Call `UseForwardedHeaders()` **before** `MapApiTestSpark()` so `baseUrl` in the config response reflects the public-facing URL:

```csharp
app.UseForwardedHeaders();
app.MapApiTestSpark();
```

## Diagnostics / logging

The harness uses the `ApiTestSpark` logger category. To enable verbose asset logging without redeploying, add to `appsettings.json` at runtime:

```json
{
  "Logging": {
    "LogLevel": {
      "ApiTestSpark": "Debug"
    }
  }
}
```

Or set `options.EnableVerboseLogging = true` in code.

## SPA routing note

The harness uses client-side SPA routing. All extensionless paths under `/api-test-spark/` return HTTP 200 with `index.html` — the React router handles invalid paths client-side. WAF rules should not expect HTTP 404 for SPA routes.

## Semver policy

- **Patch** (x.y.Z): bug fixes, no public API changes
- **Minor** (x.Y.0): additive features, no breaking changes
- **Major** (X.0.0): breaking changes to `MapApiTestSpark`, `ApiTestSparkOptions`, or `ApiTestSparkExtensions`

PR titles for changes touching `PublicAPI.Shipped.txt` must include `SEMVER: MAJOR` or `SEMVER: MINOR`.

## License

MIT
