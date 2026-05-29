# WebSpark.ApiTestHarness

Embed the API Test Harness React SPA into any **.NET 9 Minimal API** project with a single method call. Autodiscovers your OpenAPI v3 endpoints and renders an interactive test UI at `/api-test-harness/`.

## Install

```bash
dotnet add package WebSpark.ApiTestHarness
```

## Quickstart

```csharp
// Program.cs — minimal setup
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();
app.MapOpenApi();
app.MapApiTestHarness();   // serves at /api-test-harness/
app.Run();
```

Navigate to `https://localhost:{port}/api-test-harness/` to open the harness.

## With auth and custom headers

```csharp
app.MapApiTestHarness(options =>
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
app.MapApiTestHarness(options =>
{
    options.CorsOrigins = ["http://localhost:5151"];
});
```

## Behind a reverse proxy

Call `UseForwardedHeaders()` **before** `MapApiTestHarness()` so `baseUrl` in the config response reflects the public-facing URL:

```csharp
app.UseForwardedHeaders();
app.MapApiTestHarness();
```

## Diagnostics / logging

The harness uses the `WebSpark.ApiTestHarness` logger category. To enable verbose asset logging without redeploying, add to `appsettings.json` at runtime:

```json
{
  "Logging": {
    "LogLevel": {
      "WebSpark.ApiTestHarness": "Debug"
    }
  }
}
```

Or set `options.EnableVerboseLogging = true` in code.

## SPA routing note

The harness uses client-side SPA routing. All extensionless paths under `/api-test-harness/` return HTTP 200 with `index.html` — the React router handles invalid paths client-side. WAF rules should not expect HTTP 404 for SPA routes.

## Semver policy

- **Patch** (x.y.Z): bug fixes, no public API changes
- **Minor** (x.Y.0): additive features, no breaking changes
- **Major** (X.0.0): breaking changes to `MapApiTestHarness`, `ApiTestHarnessOptions`, or `ApiTestHarnessExtensions`

PR titles for changes touching `PublicAPI.Shipped.txt` must include `SEMVER: MAJOR` or `SEMVER: MINOR`.

## License

MIT
