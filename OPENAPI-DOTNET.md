# Current State of OpenAPI in .NET

> **Last updated:** May 2026 — covers .NET 10 GA, .NET 11 preview, and the current NuGet package landscape.

This document explains the OpenAPI package ecosystem for ASP.NET Core: which packages do what, which versions are compatible, which combinations work today, and what is not yet fully supported. It is written for .NET developers choosing or upgrading OpenAPI tooling, and for React SPA developers who consume the JSON output of that tooling.

---

## Table of Contents

1. [The Three-Layer Model](#the-three-layer-model)
2. [The Core Dependency: Microsoft.OpenApi](#the-core-dependency-microsoftopenapi)
3. [Document Generation Packages](#document-generation-packages)
4. [UI / Reference Renderer Packages](#ui--reference-renderer-packages)
5. [Client Code Generation](#client-code-generation)
6. [Compatibility Matrix](#compatibility-matrix)
7. [Known Issues and Gaps (May 2026)](#known-issues-and-gaps-may-2026)
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
| **v2.x** | 2.7.6 | OAS 3.0 / 3.1 | Complete model rewrite | **Active — ecosystem floor** |
| **v3.x** | 3.5.5 | OAS 3.0 / 3.1 / **3.2** | OAS 3.2 support added | Active — not yet widely consumed |

### The v1 → v2 Breaking Change

The v2 release was a **complete object model rewrite**. Type names changed, the reader/writer APIs changed, and any package that exposed `Microsoft.OpenApi` types in its public API had to ship its own new major version. This cascaded across the entire ecosystem:

- Swashbuckle had to ship v10 (from v6)
- NSwag shipped v14
- `Microsoft.AspNetCore.OpenApi` was re-authored to target v2 from .NET 9 onwards

**Symptom:** If you have any package in your solution that still references `Microsoft.OpenApi` v1, and another that requires v2, NuGet will escalate to v2 but the v1-targeting package may break at runtime with `TypeLoadException` or missing type errors.

### The v2 → v3 Change

v3 adds support for OpenAPI 3.2 and fixes several `nullable` serialization edge cases. The `Microsoft.AspNetCore.OpenApi` package still requires `>= 2.0.0` — it does not yet consume v3. No widely-used package requires v3 yet. If you add a direct reference to v3 today, it may conflict with packages expecting v2.

**Current safe floor:** `Microsoft.OpenApi` **2.x** — all major packages are tested against it.

---

## Document Generation Packages

### Microsoft.AspNetCore.OpenApi

**NuGet:** [`Microsoft.AspNetCore.OpenApi`](https://www.nuget.org/packages/Microsoft.AspNetCore.OpenApi)
**Maintained by:** Microsoft / ASP.NET Core team
**Current stable:** 10.0.8 &nbsp;|&nbsp; **Preview:** 11.0.0-preview.4

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

**Version alignment — always match your .NET SDK version:**

| .NET Version | Package Version |
|---|---|
| .NET 10 | `10.0.*` |
| .NET 9 | `9.0.*` |
| .NET 8 | Not available — use Swashbuckle or NSwag |

---

### Microsoft.Extensions.ApiDescription.Server

**NuGet:** [`Microsoft.Extensions.ApiDescription.Server`](https://www.nuget.org/packages/Microsoft.Extensions.ApiDescription.Server)
**Current stable:** 10.0.8

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
**Current stable:** 10.2.0 (released May 30, 2026)
**Total downloads:** 1.1 billion

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
**Current stable:** 2.14.14 (May 2026)
**Total downloads:** 26 million &nbsp;|&nbsp; **Daily average:** 417K (fastest growth in space)
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

### Package versions that work together on .NET 10 (May 2026)

| Package | Version | .NET | Microsoft.OpenApi | Notes |
|---|---|---|---|---|
| `Microsoft.AspNetCore.OpenApi` | **10.0.8** | 10 only | `>= 2.0.0` | Microsoft first-party |
| `Microsoft.Extensions.ApiDescription.Server` | **10.0.8** | build-time | none | Companion for build-time gen |
| `Swashbuckle.AspNetCore` | **10.2.0** | 8 / 9 / 10 | v2.x | v6 → v10 is a breaking upgrade |
| `NSwag.AspNetCore` | **14.7.1** | 8 / 9 / 10 | internal | Brings Newtonsoft.Json |
| `Scalar.AspNetCore` | **2.14.14** | 8 / 9 / 10 | none (UI only) | Zero dependencies |
| `Microsoft.OpenApi` | **2.7.6** | net8.0 / netstandard2.0 | — | Safe ecosystem floor |
| `Microsoft.OpenApi` | **3.5.5** | net8.0 / netstandard2.0 | — | OAS 3.2; not yet widely consumed |

### What you cannot mix

| Combination | Problem |
|---|---|
| Swashbuckle 6.x + `Microsoft.AspNetCore.OpenApi` 10.x | Swashbuckle 6 targets `Microsoft.OpenApi` v1; the ASP.NET Core package requires v2. NuGet resolves to v2, which can break Swashbuckle 6 at runtime. |
| Swashbuckle 6.x + Swashbuckle 10.x | Cannot have both in the same project — different major, different API surface. |
| `Microsoft.OpenApi` v3.x + `Microsoft.AspNetCore.OpenApi` 10.x | `Microsoft.AspNetCore.OpenApi` requires `>= 2.0.0`; NuGet will use v3 (satisfies `>= 2`), but the v3 model may have subtle differences not yet tested by the ASP.NET Core team. |
| Kiota NuGet package (v0.1.0) + anything | Has a high-severity vulnerability and is non-functional. Use the `dotnet tool` instead. |

---

## Known Issues and Gaps (May 2026)

### 1. OpenAPI 3.2 is not yet supported by the main stack

`Microsoft.OpenApi` v3.x supports OpenAPI 3.2, but `Microsoft.AspNetCore.OpenApi` still targets `>= 2.0.0`. Neither Swashbuckle 10 nor the ASP.NET Core generator produces 3.2 documents. OpenAPI 3.2 adds the `$vocabulary` keyword, better schema composition, and clarifies `nullable` semantics. Until `Microsoft.AspNetCore.OpenApi` moves to require v3, the ecosystem remains on OAS 3.0/3.1.

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
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.8" />
<!-- Build-time generation (optional but recommended) -->
<PackageReference Include="Microsoft.Extensions.ApiDescription.Server" Version="10.0.8">
  <PrivateAssets>all</PrivateAssets>
</PackageReference>
<!-- UI renderer -->
<PackageReference Include="Scalar.AspNetCore" Version="2.14.14" />
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
<PackageReference Include="Swashbuckle.AspNetCore" Version="10.2.0" />
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

| Item | Tracking | Expected |
|---|---|---|
| `Microsoft.AspNetCore.OpenApi` → OAS 3.1 output | .NET 11 preview | .NET 11 (late 2026) |
| `Microsoft.AspNetCore.OpenApi` → `Microsoft.OpenApi` v3 | Not announced | Unknown |
| Swashbuckle OAS 3.2 / .NET 11 | [#3804](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3804) | No timeline |
| Swashbuckle CLI `.NET 10` fix | [#3844](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/3844) | Unresolved |
| Kiota GA NuGet package (not tool) | [microsoft/kiota](https://github.com/microsoft/kiota) | Unknown |
| `nullable` OAS 3.1 in ApiTestSpark parser | Internal backlog | Planned |

---

*This document is maintained in the [ApiTestSpark GitHub repository](https://github.com/markhazleton/apitestspark). If you find an error or a package has released a new version, please [open an issue](https://github.com/markhazleton/apitestspark/issues).*
