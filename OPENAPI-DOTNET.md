# Current State of OpenAPI in .NET

> **Last updated:** June 20, 2026 — covers .NET 10 GA (10.0.9), .NET 11 preview (preview.5), and the current NuGet package landscape. Package versions and dependency ranges below were verified directly against NuGet's `.nuspec` manifests, not just package-page summaries.

This document explains the OpenAPI package ecosystem for ASP.NET Core: which packages do what, which versions are compatible, which combinations work today, and what is not yet fully supported. It is written for .NET developers choosing or upgrading OpenAPI tooling, and for React SPA developers who consume the JSON output of that tooling.

---

## Table of Contents

1. [The Three-Layer Model](#the-three-layer-model)
2. [The Core Dependency: Microsoft.OpenApi](#the-core-dependency-microsoftopenapi)
3. [Document Generation Packages](#document-generation-packages)
4. [UI / Reference Renderer Packages](#ui--reference-renderer-packages)
5. [Client Code Generation](#client-code-generation)
6. [Compatibility Matrix](#compatibility-matrix)
7. [Known Issues and Gaps (June 2026)](#known-issues-and-gaps-june-2026)
8. [Recommended Combinations](#recommended-combinations)
9. [Consuming OpenAPI from a React SPA](#consuming-openapi-from-a-react-spa)
10. [Relevance to API Test Spark](#relevance-to-api-test-spark)
11. [Roadmap Watch](#roadmap-watch)

---

## The Three-Layer Model

Every OpenAPI integration in .NET consists of three distinct concerns. Each is handled by a different package or set of packages:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — Document Generation                          │
│  Introspects your endpoints and produces OpenAPI JSON   │
│  e.g. Microsoft.AspNetCore.OpenApi, Swashbuckle,NSwag  │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — UI / Reference Renderer  (optional)          │
│  Reads the JSON document and renders an interactive UI  │
│  e.g. Scalar, Swagger UI (via Swashbuckle.UI),Redoc    │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Client Code Generation   (optional)          │
│  Reads the JSON document and generates typed clients    │
│  e.g. NSwag CLI, Kiota, openapi-generator              │
└─────────────────────────────────────────────────────────┘
```

All three layers depend — directly or transitively — on the **`Microsoft.OpenApi`** (OpenAPI.NET) library as their shared object model. Version mismatches in that single library are the primary source of incompatibility in the ecosystem today.

---

## The Core Dependency: Microsoft.OpenApi

**NuGet:** [`Microsoft.OpenApi`](https://www.nuget.org/packages/Microsoft.OpenApi)
**GitHub:** [microsoft/OpenAPI.NET](https://github.com/microsoft/OpenAPI.NET)

OpenAPI.NET provides the in-memory object model (`OpenApiDocument`, `OpenApiOperation`, `OpenApiSchema`, etc.) and the JSON/YAML serializers. Every other package in the ecosystem either depends on it directly or reimplements a subset of it.

### Three Active Major Versions

The library currently ships **three maintained release lines simultaneously**, which is the root cause of most ecosystem friction:

| Major | Latest | OpenAPI Spec Support | Key Change | Status |
|---|---|---|---|---|
| **v1.x** | 1.6.29 | OAS 2.0 (Swagger) / 3.0 | Original model | Maintenance only |
| **v2.x** | **2.9.0** | OAS 3.0 / 3.1 | Complete model rewrite | **Active — .NET 10 ecosystem floor** |
| **v3.x** | **3.7.0** | OAS 3.0 / 3.1 / **3.2** | OAS 3.2 support, `IOpenApiMediaType` interface model | **Active — required by .NET 11 preview** |

### The v1 → v2 Breaking Change

The v2 release was a **complete object model rewrite**. Type names changed, the reader/writer APIs changed, and any package that exposed `Microsoft.OpenApi` types in its public API had to ship its own new major version. This cascaded across the entire ecosystem:

- Swashbuckle had to ship v10 (from v6)
- NSwag shipped v14
- `Microsoft.AspNetCore.OpenApi` was re-authored to target v2 from .NET 9 onwards

**Symptom:** If you have any package in your solution that still references `Microsoft.OpenApi` v1, and another that requires v2, NuGet will escalate to v2 but the v1-targeting package may break at runtime with `TypeLoadException` or missing type errors.

### The v2 → v3 Change — now confirmed underway in .NET 11

This section was previously speculative ("not yet announced"). It is no longer speculative. Pulling the raw `.nuspec` manifests from NuGet directly shows two different floors depending on which `Microsoft.AspNetCore.OpenApi` line you're on:

| `Microsoft.AspNetCore.OpenApi` | Target | `Microsoft.OpenApi` dependency (from `.nuspec`) |
|---|---|---|
| **10.0.9** (GA) | `net10.0` | `Microsoft.OpenApi >= 2.0.0` |
| **11.0.0-preview.5.26302.115** | `net11.0` | **`Microsoft.OpenApi >= 3.3.1`** |

**The .NET 11 preview line has already moved its floor to `Microsoft.OpenApi` v3.** This happened starting around preview.4 and is what enables the new `options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_2` setting and OpenAPI 3.2 document generation (the `OpenApi3_2` enum member only exists in v3 — v2.x tops out at OAS 3.1). The .NET 11 generator also now defaults to emitting **OpenAPI 3.1** documents (a change from .NET 10's OAS 3.0 default), with 3.2 available opt-in.

`Swashbuckle.AspNetCore.Swagger` 10.2.1 still pins `Microsoft.OpenApi >= 2.7.5` for `net10.0`/`net9.0`/`net8.0` — Swashbuckle has **not** moved to v3, and there's no public signal it will until/unless it ships a net11.0-targeted build.

**Practical read:** v3 is no longer "a future possibility to watch" — it is the dependency `Microsoft.AspNetCore.OpenApi` will require once you target `net11.0`. Until then, on `net8.0`/`net9.0`/`net10.0`, the floor is still v2.x, and that's what every shipped package is tested against.

**Current safe floor:** `Microsoft.OpenApi` **2.x** (latest patch **2.9.0**) for any app still targeting .NET 8/9/10. Moving to v3 today only makes sense if you're already on the `net11.0` preview SDK.

---

## Document Generation Packages

### Microsoft.AspNetCore.OpenApi

**NuGet:** [`Microsoft.AspNetCore.OpenApi`](https://www.nuget.org/packages/Microsoft.AspNetCore.OpenApi)
**Maintained by:** Microsoft / ASP.NET Core team
**Current stable:** 10.0.9 &nbsp;|&nbsp; **Preview:** 11.0.0-preview.5.26302.115 (now depends on `Microsoft.OpenApi >= 3.3.1` — see [The Core Dependency](#the-core-dependency-microsoftopenapi))

This is Microsoft's first-party OpenAPI document generator, built into the ASP.NET Core framework since .NET 9. It introspects Minimal API and controller-based endpoints at runtime and serves the result as JSON.

```csharp
// Program.cs — the canonical .NET 9/10 pattern
builder.Services.AddOpenApi();   // registers generation services
app.MapOpenApi();                 // serves at /openapi/v1.json
```

**What it does:**

- Generates an OpenAPI 3.0 document from your endpoint definitions
- Supports `IOpenApiDocumentTransformer` for customising the document
- Supports multiple named documents (`AddOpenApi("v2")`)
- Runtime generation (document built on first request) and build-time generation (via companion package)

**What it does NOT do:**

- It does not include a UI — you must add a renderer separately (Scalar, Swagger UI, etc.)
- It does not generate client code

**New in .NET 11 preview (preview.4/preview.5):**

- Default generated spec version moves from **OAS 3.0 → OAS 3.1**
- OAS **3.2** is available opt-in: `builder.Services.AddOpenApi(o => o.OpenApiVersion = OpenApiSpecVersion.OpenApi3_2)`
- HTTP `QUERY` is now a recognized operation — appears inline in 3.2 documents, falls back to an `x-oai-additionalOperations` extension on 3.0/3.1
- File-streaming endpoints need `.Produces<FileContentHttpResult>()` to document binary responses correctly
- Underlying `Microsoft.OpenApi` dependency floor jumped from `>= 2.0.0` to **`>= 3.3.1`** (confirmed via `.nuspec`)

**Version alignment — always match your .NET SDK version:**

| .NET Version | Package Version | `Microsoft.OpenApi` floor |
|---|---|---|
| .NET 11 (preview) | `11.0.0-preview.*` | `>= 3.3.1` |
| .NET 10 | `10.0.*` | `>= 2.0.0` |
| .NET 9 | `9.0.*` | `>= 2.0.0` |
| .NET 8 | Not available — use Swashbuckle or NSwag | — |

---

### Microsoft.Extensions.ApiDescription.Server

**NuGet:** [`Microsoft.Extensions.ApiDescription.Server`](https://www.nuget.org/packages/Microsoft.Extensions.ApiDescription.Server)
**Current stable:** 10.0.9

Build-time companion to `Microsoft.AspNetCore.OpenApi`. Adds MSBuild targets that generate the OpenAPI JSON file during `dotnet build` — useful for committing the spec, running contract tests, or feeding a client generator in CI.

```xml
<PropertyGroup>
  <OpenApiGenerateDocuments>true</OpenApiGenerateDocuments>
  <OpenApiDocumentsDirectory>$(MSBuildProjectDirectory)</OpenApiDocumentsDirectory>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.*" />
  <PackageReference Include="Microsoft.Extensions.ApiDescription.Server" Version="10.0.*">
    <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
</ItemGroup>
```

This pair is the **recommended approach** for .NET 10 — Microsoft first-party, zero Newtonsoft dependency, actively maintained alongside the framework itself.

---

### Swashbuckle.AspNetCore

**NuGet:** [`Swashbuckle.AspNetCore`](https://www.nuget.org/packages/Swashbuckle.AspNetCore)
**Maintained by:** domaindrivendev (community)
**Current stable:** 10.2.1 &nbsp;|&nbsp; **`Microsoft.OpenApi` dependency:** `>= 2.7.5` (confirmed via `.nuspec` — still v2.x, no net11.0-targeted build yet)
**Total downloads:** 1.1 billion+

The most widely-installed OpenAPI package in the .NET ecosystem by a large margin. Swashbuckle generates an OpenAPI document **and** bundles Swagger UI, making it historically the single-package solution for both layers 1 and 2.

#### Version History and the v6 → v10 Migration

| Swashbuckle | .NET | Microsoft.OpenApi | Status |
|---|---|---|---|
| 6.x | 6 / 7 / 8 | **v1.x** | Widely installed; v1 model |
| 9.x | 8 / 9 | v1.x transitional | Stable for .NET 8/9 apps |
| **10.x** | **8 / 9 / 10** | **v2.x** | **Current — requires migration** |

The jump from v6 to v10 is significant:

- The internal model migrated from `Microsoft.OpenApi` v1 to v2
- `SwaggerGenOptions` configuration API changed in places
- Swagger UI auth configuration changed (Bearer/ApiKey header setup is different)
- The `dotnet swagger` CLI tool (v10.1.5) has a known issue generating documents on .NET 10 (see [#3844](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3844)) — use `Microsoft.Extensions.ApiDescription.Server` for build-time generation instead

**Key migration gotchas when upgrading from v6 to v10:**

```csharp
// v6 — auth header setup
c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { ... });

// v10 — same API but OpenApiSecurityScheme type is from Microsoft.OpenApi v2 model
// If you have other packages still referencing v1 types, you will get type conflicts
```

#### Known Open Issues (May 2026)

| Issue | Description | Workaround |
|---|---|---|
| [#3844](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3844) | CLI tool fails generating on .NET 10 | Use `Microsoft.Extensions.ApiDescription.Server` |
| [#3882](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3882) | Auth header missing after v6→v10 upgrade | Re-configure `AddSecurityRequirement` with v2 types |
| [#3959](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3959) | 401 returned after upgrade | Auth config changed in v10 |
| [#3857](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3857) | `SwaggerSchema` attributes not applied to `$ref` properties | Use document transformers |
| [#3888](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3888) | Endpoints with `GroupName` missing from document | Remove explicit `GroupName` or use tags |
| [#3804](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3804) | .NET 11 / OpenAPI 3.2 roadmap | Planned, no committed timeline |

---

### NSwag.AspNetCore

**NuGet:** [`NSwag.AspNetCore`](https://www.nuget.org/packages/NSwag.AspNetCore)
**Maintained by:** Rico Suter (@rsuter)
**Current stable:** 14.7.1 (April 2026)
**Total downloads:** 124 million

NSwag predates both Swashbuckle 10 and `Microsoft.AspNetCore.OpenApi`. Its distinguishing features are:

- Broadest framework support: .NET 8/9/10, .NET Standard 2.0, .NET Framework 4.6.2
- Built-in TypeScript and C# client generation (does not require a separate tool)
- NSwagStudio desktop tool for visual code generation

**Key dependency note:** NSwag depends on **Newtonsoft.Json** (`>= 13.0.3`) rather than `System.Text.Json`. This is not a problem on its own, but if your application has moved to `System.Text.Json`-only serialization, NSwag pulls Newtonsoft back in as a dependency.

**Current compatibility:** Works on .NET 10. Slower update cadence than Swashbuckle but still actively maintained.

---

## UI / Reference Renderer Packages

These packages consume the OpenAPI JSON document produced by Layer 1 and render it as a browser UI. They do not generate documents themselves.

### Scalar.AspNetCore

**NuGet:** [`Scalar.AspNetCore`](https://www.nuget.org/packages/Scalar.AspNetCore)
**Current stable:** 2.16.4
**Total downloads:** 26 million+ &nbsp;|&nbsp; growth continues to outpace Swagger UI adoption among new projects
**Dependencies:** None

Scalar is the modern, actively-maintained alternative to Swagger UI. It renders a clean, fast API reference from any OpenAPI v3 document.

```csharp
// Drop-in alongside Microsoft.AspNetCore.OpenApi
app.MapOpenApi();
app.MapScalarApiReference();  // renders at /scalar/v1
```

**Why developers are switching from Swagger UI to Scalar:**

- No jQuery, no legacy CSS — modern component-based UI
- Zero NuGet dependencies
- Built-in dark mode, search, request sandbox
- Works with .NET 8 / 9 / 10
- Supports multiple documents and custom themes

**The recommended UI layer for new .NET 9/10 projects.**

### Swagger UI (via Swashbuckle)

Swashbuckle bundles Swagger UI as `Swashbuckle.AspNetCore.SwaggerUI`. It remains the most widely-deployed OpenAPI UI in the .NET ecosystem due to sheer install base. If you are already on Swashbuckle 10, there is no reason to switch immediately — but Scalar is the better starting point for new projects.

### ReDoc

[`Swashbuckle.AspNetCore.ReDoc`](https://www.nuget.org/packages/Swashbuckle.AspNetCore.ReDoc) renders the Redocly ReDoc UI — clean, three-panel documentation layout. Read-only (no request sandbox). Good for publishing public-facing API reference docs.

---

## Client Code Generation

These tools consume the OpenAPI JSON document from a URL or file and generate typed HTTP clients.

### NSwag CLI

Part of the NSwag toolchain. Generates C# (`HttpClient`-based) and TypeScript clients. Configurable via `nswag.json`. Widely used, well-documented, works with .NET 10 generated specs.

### Microsoft Kiota

**NuGet:** [`Kiota`](https://www.nuget.org/packages/Kiota) — note: the standalone NuGet is a thin MSBuild shim; the main distribution is via `dotnet tool install microsoft.openapi.kiota`

Kiota is Microsoft's modern client generator, designed to produce idiomatic clients for any language (C#, TypeScript, Python, Go, Java, PHP). It reads OpenAPI documents and generates strongly-typed, tree-shakeable client code.

> **Current status:** Kiota is production-ready as a `dotnet tool`. The NuGet package shim on nuget.org (v0.1.0) is effectively unmaintained and has a known vulnerability — do not use it. Install via `dotnet tool install` instead.

```bash
dotnet tool install --global microsoft.openapi.kiota
kiota generate -l CSharp -d ./openapi.json -o ./Client -c ApiClient -n MyApp.Client
```

### openapi-generator (Java/Node)

Language-agnostic generator with the broadest output target list (50+ languages). Not a NuGet package — runs as a JAR or via `npx openapi-generator-cli`. Works against any valid OpenAPI 3.x document.

---

## Compatibility Matrix

### Package versions that work together on .NET 10 (verified June 2026)

| Package | Version | .NET | Microsoft.OpenApi | Notes |
|---|---|---|---|---|
| `Microsoft.AspNetCore.OpenApi` | **10.0.9** | 10 only | `>= 2.0.0` | Microsoft first-party |
| `Microsoft.Extensions.ApiDescription.Server` | **10.0.9** | build-time | none | Companion for build-time gen |
| `Swashbuckle.AspNetCore` | **10.2.1** | 8 / 9 / 10 | `>= 2.7.5` | v6 → v10 is a breaking upgrade |
| `NSwag.AspNetCore` | **14.7.1** | 8 / 9 / 10 | internal | Brings Newtonsoft.Json |
| `Scalar.AspNetCore` | **2.16.4** | 8 / 9 / 10 | none (UI only) | Zero dependencies |
| `Microsoft.OpenApi` | **2.9.0** | net8.0 / netstandard2.0 | — | Safe ecosystem floor for .NET 8/9/10 |
| `Microsoft.OpenApi` | **3.7.0** | net8.0 / netstandard2.0 | — | OAS 3.2; required by `net11.0` builds, optional elsewhere |

### Package versions on .NET 11 preview (preview.5)

| Package | Version | `Microsoft.OpenApi` dependency |
|---|---|---|
| `Microsoft.AspNetCore.OpenApi` | **11.0.0-preview.5.26302.115** | **`>= 3.3.1`** (confirmed — this is the v3 migration) |
| `Microsoft.Extensions.ApiDescription.Server` | **11.0.0-preview.5.26302.115** | n/a (build-time only) |
| `Swashbuckle.AspNetCore` | No `net11.0`-targeted build yet | still `>= 2.7.5` when used on net8/9/10 |

### What you cannot mix

| Combination | Problem |
|---|---|
| Swashbuckle 6.x + `Microsoft.AspNetCore.OpenApi` 10.x | Swashbuckle 6 targets `Microsoft.OpenApi` v1; the ASP.NET Core package requires v2. NuGet resolves to v2, which can break Swashbuckle 6 at runtime. |
| Swashbuckle 6.x + Swashbuckle 10.x | Cannot have both in the same project — different major, different API surface. |
| `Swashbuckle.AspNetCore` + `net11.0` TFM | Swashbuckle has no `net11.0` target and still requires `Microsoft.OpenApi` v2.x; the ASP.NET Core `net11.0` framework reference pulls in v3.x. Do not move a Swashbuckle project to `net11.0` until Swashbuckle ships a v3-compatible release. |
| `Microsoft.OpenApi` v3.x pinned explicitly + `Microsoft.AspNetCore.OpenApi` 10.x (net10.0) | Works today (the dependency is `>= 2.0.0`, not pinned to 2.x), but you are now ahead of what the ASP.NET Core team tests against on net10.0 — treat as experimental, not as the documented floor. |
| Kiota NuGet package (v0.1.0) + anything | Has a high-severity vulnerability and is non-functional. Use the `dotnet tool` instead — still stuck at 0.1.0 on NuGet as of June 2026. |

---

## Known Issues and Gaps (June 2026)

### 1. OpenAPI 3.2 is supported only on the .NET 11 preview track — not yet on GA .NET 10

`Microsoft.OpenApi` v3.x supports OpenAPI 3.2, and as of `Microsoft.AspNetCore.OpenApi` 11.0.0-preview.4/.5 the ASP.NET Core generator can produce 3.2 documents opt-in (`options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_2`), with OAS 3.1 as the new default on `net11.0`. **None of this is available on .NET 10 GA** — `Microsoft.AspNetCore.OpenApi` 10.0.9 still targets `Microsoft.OpenApi >= 2.0.0` and tops out at OAS 3.0 output. Swashbuckle 10.2.1 has no `net11.0` build and is also still on the v2.x/OAS 3.0 floor. If your project targets `net10.0` (as SampleApi does today), you remain on OAS 3.0 until you move to `net11.0`.

### 2. Swashbuckle CLI broken on .NET 10

The `dotnet swagger` tool in Swashbuckle 10.1.5 fails to generate a spec file against .NET 10 apps (issue [#3844](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3844)). **Workaround:** use `Microsoft.Extensions.ApiDescription.Server` for build-time generation — it is the recommended approach for .NET 9/10 regardless.

### 3. Swashbuckle v6 → v10 migration friction

The v6-to-v10 upgrade changes the auth configuration API, breaks `SwaggerSchema` attribute inheritance on `$ref` properties, and changes how endpoints with explicit `GroupName` are discovered. Teams on v6 with customised Swashbuckle setups will need non-trivial migration work.

### 4. nullable handling edge cases in Microsoft.OpenApi v2/v3

Several releases of `Microsoft.OpenApi` 2.x and 3.x have been deprecated due to bugs in how `nullable: true` is preserved when it appears before the `type` keyword in the YAML/JSON source. v2.7.6 and v3.5.5 contain the fix. If you are pinned to an older 2.x or 3.x patch, upgrade.

### 5. No built-in UI in Microsoft.AspNetCore.OpenApi

Unlike Swashbuckle (which bundles Swagger UI) and NSwag (which bundles NSwag Studio / UI), `Microsoft.AspNetCore.OpenApi` only generates the document. You must add a renderer. This is intentional — Microsoft decoupled the concerns — but it surprises developers coming from Swashbuckle.

### 6. Controller-based APIs need extra annotation

With `Microsoft.AspNetCore.OpenApi`, controller actions do not automatically produce rich response schemas unless you annotate with `[Produces]`, `[ProducesResponseType]`, or use `TypedResults` in Minimal APIs. Swashbuckle has historically been more aggressive at inferring response types from controller signatures.

---

## Recommended Combinations

### New .NET 10 project — recommended

```xml
<!-- Document generation -->
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.9" />
<!-- Build-time generation (optional but recommended) -->
<PackageReference Include="Microsoft.Extensions.ApiDescription.Server" Version="10.0.9">
  <PrivateAssets>all</PrivateAssets>
</PackageReference>
<!-- UI renderer -->
<PackageReference Include="Scalar.AspNetCore" Version="2.16.4" />
```

```csharp
builder.Services.AddOpenApi();
var app = builder.Build();
app.MapOpenApi();
app.MapScalarApiReference();
```

---

### Existing .NET 8/9 app — upgrading Swashbuckle

If you are on Swashbuckle 6.x and need .NET 10:

```xml
<!-- Upgrade in place -->
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.1" />
```

Migration checklist:

- Re-review all `SwaggerGenOptions` — the auth definition API changed
- Replace `dotnet swagger` CLI with `Microsoft.Extensions.ApiDescription.Server` for build-time generation
- Test all `SwaggerSchema` attribute usages — inheritance on `$ref` types is broken in some cases
- Remove any direct `Microsoft.OpenApi` v1 package references

---

### Needing client code generation

```bash
# Install Kiota as a global tool
dotnet tool install --global microsoft.openapi.kiota

# Generate a C# client from your running API
kiota generate \
  -l CSharp \
  -d https://localhost:5001/openapi/v1.json \
  -o ./src/Client \
  -c ProductsClient \
  -n MyApp.Client
```

Or use NSwag for C# + TypeScript in a single workflow:

```xml
<PackageReference Include="NSwag.AspNetCore" Version="14.7.1" />
```

---

### Trying .NET 11 preview today

If you want to experiment with OAS 3.1/3.2 output ahead of GA:

```xml
<PropertyGroup>
  <TargetFramework>net11.0</TargetFramework>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="11.0.0-preview.5.26302.115" />
  <PackageReference Include="Scalar.AspNetCore" Version="2.16.4" />
</ItemGroup>
```

```csharp
builder.Services.AddOpenApi(options =>
{
    options.OpenApiVersion = Microsoft.OpenApi.OpenApiSpecVersion.OpenApi3_2; // opt-in; default is 3.1
});
```

Do **not** do this if your stack includes Swashbuckle — it has no `net11.0` build and is still pinned to `Microsoft.OpenApi` v2.x, which will conflict with the v3.x floor that `net11.0` requires. This is a preview SDK; treat it as exploratory, not production.

---

### Legacy .NET Framework 4.x

Use NSwag — it is the only package in this ecosystem with `net462` support:

```xml
<PackageReference Include="NSwag.AspNetCore" Version="14.7.1" />
```

---

## Consuming OpenAPI from a React SPA

React applications that consume `.NET` OpenAPI documents face a distinct set of concerns from the package ecosystem above. The document is just JSON — but the structure varies depending on the generator used.

### What to expect from each generator

| Generator | OpenAPI version | nullable | Schema references | discriminator |
|---|---|---|---|---|
| `Microsoft.AspNetCore.OpenApi` 10.x | 3.0 | `nullable: true` inline | `$ref` | Limited |
| `Microsoft.AspNetCore.OpenApi` 11.x (preview) | **3.1** (default), 3.2 opt-in | `oneOf: [..., { type: 'null' }]` — **not** inline `nullable` | `$ref` | Limited |
| Swashbuckle 10.x | 3.0 | `nullable: true` inline | `$ref` with `allOf` wrapper | Supported |
| NSwag 14.x | 3.0 | `x-nullable` extension + `nullable` | Inline or `$ref` | Supported |

### Parsing tips for React / TypeScript consumers

1. **Dereference `$ref` before rendering schemas.** All three generators use `$ref` for shared types. Your parser must follow `$ref` pointers into `components/schemas` before rendering property tables. A schema that is just `{ "$ref": "#/components/schemas/Product" }` has no `properties` — they live at the referenced path.

2. **Handle `nullable` in both locations.** `Microsoft.AspNetCore.OpenApi` places `nullable: true` directly on the schema object. Some generators wrap nullable types in `oneOf: [{ type: ... }, { type: 'null' }]` (the OAS 3.1 pattern). A robust parser checks both.

3. **`allOf` with a single `$ref` is a typed reference, not a composition.** Swashbuckle often wraps `$ref` schemas in `allOf: [{ "$ref": "..." }]`. Treat a single-element `allOf` containing only a `$ref` as equivalent to a direct `$ref`.

4. **Tags drive grouping — not paths.** Endpoints are grouped in the UI by the `tags` array on each operation, not by URL prefix. An endpoint at `/products/{id}` tagged `["Inventory"]` belongs in the `Inventory` group.

5. **`operationId` is optional but highly useful.** `Microsoft.AspNetCore.OpenApi` generates `operationId` from route names (`.WithName()`). Swashbuckle generates it from controller + action name. NSwag generates it from the operation. Your UI should display and copy `operationId` when present, but degrade gracefully when absent.

6. **`info.contact` and `info.license` are optional.** The `info` block is always present, but `contact` and `license` sub-objects may be absent. Guard all nested property reads.

7. **CORS blocks the spec fetch in dev.** When your React dev server (`localhost:5151`) and .NET API (`localhost:5000`) run on different ports, the fetch of `/openapi/v1.json` is blocked by same-origin policy. Your .NET app must either allow the dev origin via CORS or the SPA must proxy the request through the dev server.

### Recommended parsing approach

```typescript
// Resolve $ref anywhere in the document
function resolveRef(doc: OpenApiDoc, ref: string): OpenApiSchema {
  const path = ref.replace('#/', '').split('/');
  return path.reduce((obj: any, key) => obj[key], doc);
}

// Normalise nullable — handles both OAS 3.0 and 3.1 styles
function isNullable(schema: OpenApiSchema): boolean {
  if (schema.nullable) return true;
  if (schema.oneOf?.some(s => s.type === 'null')) return true;
  return false;
}

// Unwrap single-entry allOf $ref
function unwrapAllOf(schema: OpenApiSchema): OpenApiSchema {
  if (schema.allOf?.length === 1 && schema.allOf[0].$ref) {
    return schema.allOf[0];
  }
  return schema;
}
```

---

## Relevance to API Test Spark

[**API Test Spark**](https://apitest.makeboldspark.com) is a NuGet package that embeds a React SPA into any .NET 10 Minimal API. Its `openApiParser.ts` consumes the OpenAPI document served by whatever generator the host application uses.

**ApiTestSpark works with:**

- `Microsoft.AspNetCore.OpenApi` (recommended — this is what the SampleApi demo uses)
- Swashbuckle.AspNetCore 10.x
- NSwag.AspNetCore 14.x

**ApiTestSpark does not depend on** `Microsoft.AspNetCore.OpenApi`, Swashbuckle, or NSwag. The host application picks the generator; ApiTestSpark reads the output JSON. This design means ApiTestSpark is insulated from the package ecosystem churn described in this document.

**What the SPA parser handles today:**

- `$ref` resolution into `components/schemas`
- `nullable: true` on schema objects
- `allOf` with a single `$ref` (Swashbuckle style)
- Tag-based grouping with `"Namespace: Label"` two-level parsing
- `operationId`, `summary`, `description` (markdown rendered)
- Response codes with `content` schemas
- JSON scaffold from `example / default / enum[0] / type`

**Known parser limitation:** OAS 3.1-style `oneOf: [{ type: ... }, { type: 'null' }]` nullable is not yet normalised. This will matter once `Microsoft.AspNetCore.OpenApi` moves to OAS 3.1 output.

### Recommendation for this repo (June 2026 revisit)

`SampleApi.csproj` currently pins `Microsoft.OpenApi` explicitly at `2.7.6` alongside `Microsoft.AspNetCore.OpenApi` `10.0.9`. Revisiting that decision with the data gathered above:

- **Do not move to `Microsoft.OpenApi` v3.x yet.** `Microsoft.AspNetCore.OpenApi` 10.0.9 (the version SampleApi uses, targeting `net10.0`) still requires `>= 2.0.0` and is only tested by the ASP.NET Core team against the v2.x line. v3 only becomes the *required* floor once a project moves to `net11.0`, which is still preview.
- **Do bump the explicit pin from `2.7.6` to `2.9.0`.** It's the latest v2.x patch, stays within the same major, and there's no reason to sit on an older patch — `Microsoft.AspNetCore.OpenApi`'s own floor (`>= 2.0.0`) already allows it.
- **Re-evaluate this whole document when .NET 11 GAs** (expected ~November 2026). At that point `Microsoft.OpenApi` v3 stops being "the preview-only floor" and becomes "the floor for any project targeting net11.0," and the SPA's `openApiParser.ts` will need the OAS 3.1 `oneOf`-nullable handling noted above before SampleApi could safely retarget to `net11.0`.

**Install ApiTestSpark:**

```bash
dotnet add package ApiTestSpark
```

```csharp
app.MapApiTestSpark();  // harness at /api-test-spark/
```

[NuGet Package](https://www.nuget.org/packages/ApiTestSpark) &nbsp;·&nbsp; [Live Demo](https://apitest.makeboldspark.com) &nbsp;·&nbsp; [GitHub](https://github.com/markhazleton/apitestspark)

---

## Roadmap Watch

| Item | Tracking | Status |
|---|---|---|
| `Microsoft.AspNetCore.OpenApi` → OAS 3.1 default output | .NET 11 preview | **Done in preview** — net11.0 defaults to OAS 3.1; ships GA with .NET 11 (~Nov 2026) |
| `Microsoft.AspNetCore.OpenApi` → `Microsoft.OpenApi` v3 | `.nuspec` for 11.0.0-preview.5 | **Confirmed** — dependency is now `>= 3.3.1` on `net11.0`. No longer speculative. |
| OAS 3.2 generation (opt-in) | `options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_2` | **Done in preview** — HTTP `QUERY` method support included |
| Swashbuckle `net11.0` build / v3 migration | [#3804](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3804) | No timeline — still v2.x-only as of 10.2.1 |
| Swashbuckle CLI `.NET 10` fix | [#3844](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3844) | Unresolved |
| Kiota GA NuGet package (not tool) | [microsoft/kiota](https://github.com/microsoft/kiota) | Still 0.1.0, unchanged |
| `nullable` OAS 3.1 in ApiTestSpark parser | Internal backlog | Planned — now more urgent once `net11.0` defaults to OAS 3.1 |

---

*This document is maintained in the [ApiTestSpark GitHub repository](https://github.com/markhazleton/apitestspark). If you find an error or a package has released a new version, please [open an issue](https://github.com/markhazleton/apitestspark/issues).*
