# How the ApiTestSpark NuGet Package Is Built

This document is a technical deep-dive for developers who want to understand, reproduce, or extend the packaging approach used in this repository. It covers every layer from project structure to CI publishing.

---

## The Core Problem

A React SPA and a .NET class library exist in the same repository. Consumers want a single `dotnet add package ApiTestSpark` — no npm, no frontend tooling, no static files to copy. The challenge is welding two completely different build systems (Vite and MSBuild) into one reproducible, zero-friction artifact.

---

## 1. Project Layout

```
ApiTestSpark/               ← .NET class library (the NuGet package)
│   ApiTestSpark.csproj
│   ApiTestSparkExtensions.cs
│   ApiTestSparkOptions.cs
│   icon.png
│   README.md
│   PublicAPI.Shipped.txt
│   PublicAPI.Unshipped.txt
src/                        ← React SPA source (Vite, TypeScript, Tailwind)
build/                      ← React SPA compiled output (gitignored except sentinel)
scripts/build/pack.ps1      ← Canonical pack pipeline
.github/workflows/
│   ci.yml                  ← PR/push quality gate
│   publish-nuget.yml       ← Tag-triggered NuGet publish
```

The React source lives in `src/` at the repo root. The .NET project is a sibling directory. MSBuild reaches up with `$(MSBuildProjectDirectory)\..` to find both the source and the compiled output.

---

## 2. Embedding the React SPA as .NET Resources

The compiled Vite output (`build/`) is embedded directly into the assembly as .NET manifest resources. No file copying at runtime; the DLL carries everything.

```xml
<ItemGroup>
  <EmbeddedResource Include="$(MSBuildProjectDirectory)\..\build\**"
                    Link="build\%(RecursiveDir)%(Filename)%(Extension)" />
</ItemGroup>
```

The `Link` metadata is critical. Without it, MSBuild would embed resources with absolute filesystem paths baked in as their logical names. With `Link`, every file gets a stable logical name like `ApiTestSpark.build.assets.index-abc123.js`. The `ApiTestSparkExtensions.cs` then resolves these at runtime using a known prefix:

```csharp
private const string ResourcePrefix = "ApiTestSpark.build.";

var resourceNames = assembly.GetManifestResourceNames();
// e.g. "ApiTestSpark.build.index.html"
//      "ApiTestSpark.build.assets.index-DlpZRdbY.css"
```

A startup guard immediately throws `InvalidOperationException` if no resources matching the prefix are found — catching the silent "404 for everything" failure mode before the first HTTP request.

---

## 3. The MSBuild–Vite Bridge

### 3a. The BuildReactSpa Target

```xml
<PropertyGroup>
  <_SpaSentinel>$(IntermediateOutputPath)spa-built.sentinel</_SpaSentinel>
</PropertyGroup>

<ItemGroup>
  <_SpaSources Include="$(MSBuildProjectDirectory)\..\src\**\*" />
  <_SpaSources Include="$(MSBuildProjectDirectory)\..\index.html" />
  <_SpaSources Include="$(MSBuildProjectDirectory)\..\vite.config.ts" />
  <_SpaSources Include="$(MSBuildProjectDirectory)\..\tsconfig*.json" />
  <_SpaSources Include="$(MSBuildProjectDirectory)\..\package.json" />
</ItemGroup>

<Target Name="BuildReactSpa"
        BeforeTargets="Build"
        Inputs="@(_SpaSources)"
        Outputs="$(_SpaSentinel)">
  <Exec Command="npm run build"
        WorkingDirectory="$(MSBuildProjectDirectory)\.." />
  <Touch Files="$(_SpaSentinel)" AlwaysCreate="true" />
</Target>
```

**Key design decisions:**

- **Sentinel in `obj/`** — `$(IntermediateOutputPath)` is inside `obj/Debug/net10.0/` or `obj/Release/net10.0/`. `dotnet clean` deletes `obj/`, so the sentinel is wiped and the next build unconditionally rebuilds the SPA. This prevents stale assets from surviving a clean cycle.
- **Incremental inputs/outputs** — MSBuild's `Inputs`/`Outputs` mechanism means `BuildReactSpa` is skipped entirely if no source file has changed since the sentinel was last touched. On a fast developer inner loop, repeated `dotnet build` calls after only C# changes complete in ~1.5 seconds.
- **No environment variable needed for the embedded path** — `vite.config.ts` defaults `base` to `/api-test-spark/` unconditionally. A separate standalone SWA build sets `VITE_BASE_PATH=/` explicitly. This way `npm run build` always produces the correct embedded artifact with no ceremony.

### 3b. The ValidateSpaAssets Guard

```xml
<Target Name="ValidateSpaAssets" BeforeTargets="Pack">
  <ItemGroup>
    <_SpaFiles Include="$(MSBuildProjectDirectory)\..\build\**\*.*" />
  </ItemGroup>
  <Error
    Condition="'@(_SpaFiles)' == ''"
    Text="ApiTestSpark: build/ directory is empty. ..." />
</Target>
```

`BeforeTargets="Pack"` means `dotnet pack` fails loudly before a single byte is written if `build/` is empty. Without this guard, MSBuild would silently produce a `.nupkg` with an empty `lib/` and no HTML — a broken package that only surfaces as HTTP 404s at runtime.

---

## 4. The Config Endpoint Bridge

The SPA cannot know the host app's base URL at build time (the package is embedded in hundreds of different apps). Instead, `MapApiTestSpark()` registers a `/api-test-spark/config` GET endpoint that responds with JSON:

```json
{
  "baseUrl": "https://myapp.com",
  "openApiUrl": "/openapi.json",
  "authScheme": "Bearer",
  "defaultHeaders": { "X-Tenant-Id": "acme" },
  "enableDemoIntegrations": true,
  "userName": "Ada Lovelace",
  "userEmail": "ada@example.com",
  "userId": "00000000-0000-0000-0000-000000000001",
  "remoteApiProfiles": [
    {
      "id": "partner-api",
      "name": "Partner API",
      "description": "External partner integration endpoints.",
      "remoteBaseUrl": "https://api.partner.com",
      "remoteOpenApiUrl": "https://api.partner.com/openapi.json",
      "remoteOpenApiApiKeyHeader": "x-api-key",
      "remoteOpenApiApiKeyValue": null,
      "remoteOpenApiBearerToken": null,
      "remoteOpenApiApiKeyConfigured": true,
      "remoteOpenApiBearerTokenConfigured": false,
      "remoteCallProxyEnabled": true,
      "remoteDefaultHeaders": { "correlationId": "{request-guid}" },
      "source": "server",
      "proxyMode": "server"
    }
  ],
  "harnessVersion": "1.8.0",
  "harnessBuiltAt": "2026-06-21T17:52:53Z"
}
```

`baseUrl` is constructed from the incoming request's `Host` header (and `X-Forwarded-*` headers when `UseForwardedHeaders()` is in the pipeline). The SPA fetches this on startup and uses `baseUrl` for all subsequent API calls — so the exact same embedded HTML/JS works correctly whether the host app runs on `localhost:5000`, `staging.myapp.com`, or `api.production.com`.

`harnessVersion` and `harnessBuiltAt` are baked in at pack time from the assembly's `AssemblyInformationalVersionAttribute` and the DLL's last-write timestamp. The About page in the SPA reads these from the config response — no separate `build-info.json` fetch required, which was the approach that failed silently in NuGet embedded mode.

Remote API profile credentials configured on the server are redacted from the config response. The browser receives profile metadata, configured flags, and a `profileId`; `GET /api-test-spark/remote-spec?profileId=...` resolves only server-provided profiles and uses the server-held credentials to proxy the OpenAPI document. When `EnableRemoteCallProxy` is enabled, server-configured profile endpoint calls can also be forwarded through `GET|POST|PUT|PATCH|DELETE /api-test-spark/remote-call?profileId=...&path=...`. Browser-created profiles stay local and fetch OpenAPI documents and endpoint calls directly from the browser.

---

## 5. Static File Serving from Embedded Resources

`MapApiTestSpark()` uses `ManifestEmbeddedFileProvider` to serve the `build/` tree as static files:

```csharp
var fileProvider = new ManifestEmbeddedFileProvider(
    typeof(ApiTestSparkExtensions).Assembly,
    "build");

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider  = fileProvider,
    RequestPath   = MountPath,   // "/api-test-spark"
});
```

SPA-style navigation (e.g. `GET /api-test-spark/endpoints`) falls back to `index.html` via a catch-all route — React Router handles the rest client-side.

---

## 6. NuGet Package Metadata

Every `PackageReference` consumer-facing property is declared in the `<PropertyGroup>` of `ApiTestSpark.csproj` following the [Microsoft library guidance](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/nuget):

| Property | Value | Rationale |
|----------|-------|-----------|
| `PackageId` | `ApiTestSpark` | Unique, prefix-reservable identifier |
| `Version` | `1.8.0` | SemVer; set via `/p:Version` at pack time from `package.json` |
| `Authors` | `Make Bold Solutions; Mark Hazleton` | NuGet author display |
| `Company` | `Make Bold Solutions` | Package ownership and assembly metadata |
| `PackageLicenseExpression` | `MIT` | SPDX identifier — replaces deprecated `LicenseUrl` |
| `PackageIcon` | `icon.png` | 128×128 Make Bold Solutions branded PNG packed at root |
| `PackageReadmeFile` | `README.md` | Rendered on nuget.org package page |
| `PackageReleaseNotes` | v1.0.0 summary | Shown in package manager update prompts |
| `GeneratePackageOnBuild` | `false` | Packing is explicit — only via `pack.ps1` or CI tag workflow |
| `TreatWarningsAsErrors` | `true` | Any compiler or analyzer warning fails the build |
| `GenerateDocumentationFile` | `true` | XML doc comments extracted for IntelliSense |
| `EnablePackageValidation` | `true` | Detects accidental API removals across versions |

Files packed at the `.nupkg` root:

```xml
<None Include="README.md"    Pack="true" PackagePath="\" />
<None Include="icon.png"     Pack="true" PackagePath="\" />
<None Include="..\LICENSE"   Pack="true" PackagePath="\" />
```

---

## 7. Source Link and Symbol Packages

Source Link lets consumers step into the library's source code from within Visual Studio or Rider without manually downloading anything.

```xml
<PackageReference Include="Microsoft.SourceLink.GitHub" Version="10.0.300" PrivateAssets="All" />

<PublishRepositoryUrl>true</PublishRepositoryUrl>
<EmbedUntrackedSources>true</EmbedUntrackedSources>
<IncludeSymbols>true</IncludeSymbols>
<SymbolPackageFormat>snupkg</SymbolPackageFormat>
<Deterministic>true</Deterministic>
<ContinuousIntegrationBuild Condition="'$(GITHUB_ACTIONS)' == 'true'">true</ContinuousIntegrationBuild>
```

- **`IncludeSymbols` + `SymbolPackageFormat snupkg`** — produces a separate `ApiTestSpark.1.0.0.snupkg` alongside the main `.nupkg`. The `.snupkg` is published to NuGet.org's symbol server; consumers opt in by adding `https://symbols.nuget.org/download/symbols` to their IDE symbol sources.
- **`Deterministic`** — byte-for-byte reproducible builds; the same source commit always produces the same binary. Required for proper Source Link verification.
- **`ContinuousIntegrationBuild`** — only set to `true` on GitHub Actions (`GITHUB_ACTIONS == true`), enabling path normalization in PDB files so local developer builds retain their normal filesystem paths.
- **`EmbedUntrackedSources`** — embeds source files not tracked by git (e.g. generated code) into the PDB so debuggers can still find them.

---

## 8. Public API Surface Tracking

`Microsoft.CodeAnalysis.PublicApiAnalyzers` enforces explicit API surface declarations:

```xml
<PackageReference Include="Microsoft.CodeAnalysis.PublicApiAnalyzers" Version="3.3.4">
  <PrivateAssets>all</PrivateAssets>
  <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
</PackageReference>
```

Two files control this:

- **`PublicAPI.Shipped.txt`** — the API surface of the last released version (v1.8.0). Any symbol listed here that disappears from the code becomes a build error (RS0017), preventing accidental breaking changes.
- **`PublicAPI.Unshipped.txt`** — symbols added since the last release. New public members appear here automatically via IDE code fix, then are moved to `Shipped.txt` when the next version is tagged.

```
# PublicAPI.Shipped.txt (v1.8.0 baseline)
#nullable enable
ApiTestSpark.ApiTestSparkExtensions
ApiTestSpark.ApiTestSparkOptions
ApiTestSpark.ApiTestSparkOptions.ApiTestSparkOptions() -> void
ApiTestSpark.ApiTestSparkOptions.AuthScheme.get -> string?
ApiTestSpark.ApiTestSparkOptions.AuthScheme.set -> void
ApiTestSpark.ApiTestSparkOptions.CorsOrigins.get -> string![]!
ApiTestSpark.ApiTestSparkOptions.CorsOrigins.set -> void
ApiTestSpark.ApiTestSparkOptions.DefaultHeaders.get -> System.Collections.Generic.Dictionary<string!, string!>!
ApiTestSpark.ApiTestSparkOptions.DefaultHeaders.set -> void
ApiTestSpark.ApiTestSparkOptions.EnableDemoIntegrations.get -> bool
ApiTestSpark.ApiTestSparkOptions.EnableDemoIntegrations.set -> void
ApiTestSpark.ApiTestSparkOptions.EnableRemoteCallProxy.get -> bool
ApiTestSpark.ApiTestSparkOptions.EnableRemoteCallProxy.set -> void
ApiTestSpark.ApiTestSparkOptions.EnableVerboseLogging.get -> bool
ApiTestSpark.ApiTestSparkOptions.EnableVerboseLogging.set -> void
ApiTestSpark.ApiTestSparkOptions.Environments.get -> string![]!
ApiTestSpark.ApiTestSparkOptions.Environments.set -> void
ApiTestSpark.ApiTestSparkOptions.OpenApiUrl.get -> string?
ApiTestSpark.ApiTestSparkOptions.OpenApiUrl.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteApiProfiles.get -> System.Collections.Generic.List<ApiTestSpark.RemoteApiProfile!>!
ApiTestSpark.ApiTestSparkOptions.RemoteApiProfiles.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteBaseUrl.get -> string?
ApiTestSpark.ApiTestSparkOptions.RemoteBaseUrl.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteDefaultHeaders.get -> System.Collections.Generic.Dictionary<string!, string!>!
ApiTestSpark.ApiTestSparkOptions.RemoteDefaultHeaders.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiUrl.get -> string?
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiUrl.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiApiKeyHeader.get -> string?
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiApiKeyHeader.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiApiKeyValue.get -> string?
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiApiKeyValue.set -> void
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiBearerToken.get -> string?
ApiTestSpark.ApiTestSparkOptions.RemoteOpenApiBearerToken.set -> void
ApiTestSpark.ApiTestSparkOptions.TestHttpClient.get -> System.Net.Http.HttpClient?
ApiTestSpark.ApiTestSparkOptions.TestHttpClient.set -> void
static ApiTestSpark.ApiTestSparkExtensions.MapApiTestSpark(this Microsoft.AspNetCore.Builder.WebApplication! app, System.Action<ApiTestSpark.ApiTestSparkOptions!>? configure = null) -> Microsoft.AspNetCore.Builder.WebApplication!
```

If you add a new public method in `ApiTestSparkExtensions.cs`, the build produces RS0016 ("Symbol is not part of the declared public API") until you add it to `PublicAPI.Unshipped.txt`.

---

## 9. Integration Tests

`ApiTestSpark.Tests/` uses MSTest and `WebApplicationFactory`'s `UseTestServer` to spin up a real in-process ASP.NET Core pipeline without a network socket:

```csharp
private static WebApplication BuildTestApp(Action<ApiTestSparkOptions>? configure = null)
{
    var builder = WebApplication.CreateBuilder(new WebApplicationOptions
    {
        EnvironmentName = Environments.Development,
    });
    builder.WebHost.UseTestServer();
    var app = builder.Build();
    app.MapApiTestSpark(configure);
    app.StartAsync().GetAwaiter().GetResult();
    return app;
}
```

The 49 integration tests cover:

| Area | What is verified |
|------|-----------------|
| **SPA serving** | `GET /api-test-spark/` → 200 `text/html`; extensionless sub-paths → SPA fallback; unknown extensions → 404 |
| **Config endpoint** | JSON shape: `baseUrl`, `openApiUrl`, `authScheme`, `defaultHeaders`, `enableDemoIntegrations`, resolved `userName` / `userEmail` / `userId`, redacted `remoteApiProfiles`, `harnessVersion`, `harnessBuiltAt` |
| **Remote config fields** | Multiple `RemoteApiProfiles`, legacy single-remote compatibility seeding, per-profile headers, and redacted server credentials |
| **Remote spec proxy** | Server-provided `profileId` resolution, rejection of unknown/browser-created profile ids, SSRF scheme guard, network failure handling, and correct passthrough for happy path |
| **Environment gating** | `Environments = ["Production"]` in Development → harness not registered |
| **`ApiTestSparkOptions` defaults** | All new properties default to `null` / empty dictionary |

Run with:

```powershell
dotnet test ApiTestSpark.Tests
```

---

## 10. The Pack Pipeline (`pack.ps1`)

The canonical pack script enforces a 7-step quality gate before any artifact is produced:

```
[1/7] npm audit          — fail on critical CVEs, warn on high
[2/7] npm run lint       — ESLint, zero errors required
[3/7] npm run build      — Vite build → build/ (base=/api-test-spark/)
[4/7] Read version       — from package.json, validate as NuGet SemVer
[5/7] dotnet build       — .NET compile; incremental sentinel skips SPA rebuild
[6/7] dotnet pack --no-build  — creates .nupkg + .snupkg from compiled artifacts
[7/7] Size check         — warn if package > 2 MB (SC-006 budget)
```

The `--no-build` flag on `dotnet pack` is important: it prevents MSBuild from running `BuildReactSpa` a second time, since the assets are already fresh from step 3. The version flows from `package.json` into the `.nupkg` via `/p:Version`:

```powershell
$nugetVersion = (Get-Content package.json | ConvertFrom-Json).version -replace '\+.*$', ''
dotnet pack ApiTestSpark/ApiTestSpark.csproj `
    --configuration Release `
    --no-build `
    /p:Version=$nugetVersion `
    --output ./nupkg
```

---

## 11. CI and Publish Workflows

### `ci.yml` — runs on every PR and push to `main`

```
npm ci
npm run lint
tsc -b + vite build  (npm run verify)
dotnet restore
dotnet build          ← triggers incremental BuildReactSpa
dotnet test           ← 49 integration tests, TRX + coverage upload
dotnet list package --vulnerable
npm audit --audit-level=high
```

### `publish-nuget.yml` — runs on `v*.*.*` tags

```
[full CI pipeline]
VERSION=$(node -p "require('./package.json').version")
dotnet pack --no-build /p:Version=$VERSION
unzip -l *.nupkg      ← verify icon.png, README.md, LICENSE present
Upload artifact
dotnet nuget push *.nupkg   → nuget.org (NUGET_API_KEY secret, --skip-duplicate)
dotnet nuget push *.snupkg  → nuget.org symbols (continue-on-error)
softprops/action-gh-release → GitHub Release with CHANGELOG.md as body
```

To publish a new version:

1. Update `version` in `package.json` (e.g. `1.8.0`)
2. Add a `[v1.8.0]` entry to `CHANGELOG.md`
3. Commit and push
4. `git tag -a v1.8.0 -m "Release v1.8.0" && git push origin main --tags`

The publish workflow fires automatically. See [DEPLOYMENT.md](DEPLOYMENT.md) for the full step-by-step release process.

---

## 12. Security Configuration

### `nuget.config` — dependency confusion mitigation

```xml
<packageSources>
  <clear />
  <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
</packageSources>
<packageSourceMapping>
  <packageSource key="nuget.org">
    <package pattern="*" />
  </packageSource>
</packageSourceMapping>
```

`<clear />` removes any machine-level or user-level NuGet sources, leaving only nuget.org. `packageSourceMapping` prevents [dependency confusion attacks](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610) where a private package name could be hijacked by a malicious public package with a higher version number.

### `global.json` — reproducible SDK version

```json
{
  "sdk": {
    "version": "10.0.100",
    "rollForward": "latestFeature",
    "allowPrerelease": false
  }
}
```

Pins the SDK so CI, local development, and pack all use the same compiler. `rollForward: latestFeature` allows patch updates (e.g. 10.0.101) but not minor version jumps.

---

## 13. Verifying a Built Package

After running `pack.ps1`, inspect the `.nupkg` (which is a zip file):

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead(".\nupkg\ApiTestSpark.1.0.0.nupkg")
$zip.Entries | Select-Object FullName | Sort-Object FullName
$zip.Dispose()
```

Expected entries at the package root: `ApiTestSpark.nuspec`, `icon.png`, `LICENSE`, `README.md`.

Expected under `lib/net10.0/`: `ApiTestSpark.dll`, `ApiTestSpark.xml` (XML docs).

All React assets live inside `ApiTestSpark.dll` as manifest resources — they are **not** visible as separate files in the `.nupkg`.

Use [NuGet Package Explorer](https://github.com/NuGetPackageExplorer/NuGetPackageExplorer) for a GUI view, or [nuget.info](https://nuget.info/) to inspect a published package online and verify Source Link metadata is embedded correctly.

---

## Further Reading

- [Microsoft .NET Library Guidance — NuGet](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/nuget)
- [NuGet Package Authoring Best Practices](https://learn.microsoft.com/en-us/nuget/create-packages/package-authoring-best-practices)
- [Source Link documentation](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/sourcelink)
- [Symbol packages (.snupkg)](https://learn.microsoft.com/en-us/nuget/create-packages/symbol-packages-snupkg)
- [MSBuild targets reference](https://learn.microsoft.com/en-us/nuget/reference/msbuild-targets)
- [PublicApiAnalyzers](https://github.com/dotnet/roslyn-analyzers/blob/main/src/PublicApiAnalyzers/PublicApiAnalyzers.Help.md)
