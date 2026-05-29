# Critic Gate: Portable NuGet Package for API Test Harness

```yaml
gate: critic
status: warn
blocking: false
severity: warning
summary: "0 showstoppers, 4 critical, 6 high, 3 medium. No constitution violations. Key risks: NuGet embedded resource name mismatch will silently serve 404s, SPA 2s load target is unrealistic over slow connections, no semver/breaking-change discipline for the public C# API, and config endpoint CORS exposure in cross-origin deployments. Conditional proceed — address 3 critical items before first NuGet publish."
```

## Technical Risk Assessment

**Analysis Date:** 2026-05-29
**Scope:** FULL (spec + plan + tasks)
**Detected Archetype:** `library` (NuGet package) + `web-service` (embedded ASP.NET middleware) — dual archetype
**Detected Stack:** TypeScript/React/Vite (SPA) + C#/.NET 9/ASP.NET Core (library)
**Context Mode:** greenfield
**Risk Profile:** internal (developer tooling, inferred — no `risk_profile` in spec frontmatter)
**Risk Posture:** YELLOW

> **Metadata gaps**: spec.md frontmatter has no `archetype`, `risk_profile`, or `change_type` fields. Defaults applied: `library`, `internal`, `greenfield`. Three HIGH findings emitted below.

### Executive Summary

This is a dual-archetype feature: a NuGet library wrapping an embedded React SPA served via ASP.NET Core middleware. The dominant risks are **silent runtime failures** caused by .NET embedded resource naming conventions (a well-known trap for first-time embedded-asset NuGet authors), the **publicly accessible config endpoint** leaking deployment topology in cross-origin scenarios, and **missing semver/API-compatibility discipline** for the C# public surface. No showstoppers found. Four critical issues should be resolved or explicitly acknowledged before the first `dotnet pack` is published.

---

### Findings (source of truth)

```yaml
findings:
  - finding_id: critic-001
    category: deployment_rollback
    archetype_applicable: true
    location: plan.md#R-001 + tasks.md#T003
    description: ".NET EmbeddedFileProvider requires the manifest resource name to match exactly '<AssemblyName>.<namespace-path>.<filename>'. The plan shows 'WebSpark.ApiTestHarness.build' as the namespace prefix, but .csproj EmbeddedResource paths use backslashes on Windows and dots map to directory separators. Any mismatch (e.g., 'WebSpark.ApiTestHarness.build.assets.index-abc123.js' vs actual manifest name) silently produces 404 for every asset. There is no task to verify the resource name prefix at build time."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Add a smoke-test task: after `dotnet build`, enumerate embedded resources via `assembly.GetManifestResourceNames()` and assert the expected prefix exists. Document the exact expected prefix in T003. Consider a unit test or post-build script that fails loudly if the prefix is wrong."
    execution_mode: manual
    status: open
    outcome: ""

  - finding_id: critic-002
    category: trust_boundaries
    archetype_applicable: true
    location: spec.md#FR-003 + contracts/config-endpoint.md
    description: "The config endpoint at /api-test-harness/config is publicly accessible with no auth and returns the host app's OpenAPI URL, auth scheme name, and all default header names and values. In cross-origin deployments (host API on api.example.com, harness served on a different origin), any third-party page can call this endpoint and harvest deployment topology: which endpoints exist, which auth scheme is in use, and which tenant/correlation headers the app expects. While no credentials are returned, this metadata aids targeted attacks. There is no CORS restriction, no environment-gate enforcement at the HTTP level, and no Content-Security-Policy on the SPA HTML."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Add CORS restrictions to the config endpoint (same-origin only, or restrict to known allowed origins via HarnessOptions). Add a Content-Security-Policy header to the SPA HTML response. Consider adding a note in the quickstart that this endpoint should never be reachable from the public internet — document in DEPLOYMENT.md that the harness should be gated behind network-level access controls in non-development environments."
    execution_mode: manual
    status: open
    outcome: ""

  - finding_id: critic-003
    category: api_compatibility
    archetype_applicable: true
    location: plan.md#Technical-Context + tasks.md
    description: "The .NET package exposes a public C# API surface (MapApiTestHarness, ApiTestHarnessOptions, ApiTestHarnessExtensions) with no semver discipline, no documented breaking-change policy, no CI check for public surface drift, and no deprecation strategy. The first version published to NuGet establishes a contract. Any future rename of HarnessOptions properties, method signature changes, or namespace changes will be silently breaking for consumers. No task validates the public surface against a snapshot."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Before publishing v1, document which symbols are public API vs internal. Add a `PublicApiAnalyzer` or `Microsoft.CodeAnalysis.PublicApiAnalyzers` reference to the .csproj to snapshot and diff the public surface in CI. Declare a semver policy in the package README: patch = bugfix, minor = additive, major = breaking."
    execution_mode: selective
    status: open
    outcome: ""

  - finding_id: critic-004
    category: scale_bottlenecks
    archetype_applicable: true
    location: spec.md#SC-002 + spec.md#SC-006
    description: "SC-002 requires all endpoints from an OpenAPI document to appear in the UI 'within 2 seconds of the page loading on a local development machine.' The SPA startup sequence is: (1) load HTML, (2) load JS/CSS bundles, (3) fetch /api-test-harness/config, (4) fetch the OpenAPI document, (5) parse and render. Steps 1-3 require the .NET app to be warm. On a cold .NET app startup, this easily exceeds 2 seconds even locally. Over a VPN or remote dev environment it will regularly fail. SC-006 sets a 2MB package size budget but the plan's custom parser adds JS bundle size; the React+Zustand+TanStack vendor bundle is already ~234KB; the SPA screen chunks and App Insights add more — 2MB total for the .nupkg (which includes compressed assets) is achievable but tight."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Reword SC-002 to 'within 2 seconds of the SPA being interactive (DOMContentLoaded), excluding .NET cold-start time.' Add a task to measure the JS bundle size for the embedded build specifically (VITE_BASE_PATH=/api-test-harness/) and confirm it stays under the 2MB total package budget. Consider lazy-loading the OpenAPI parser so the UI renders immediately with a loading state."
    execution_mode: selective
    status: open
    outcome: ""

  - finding_id: critic-005
    category: error_handling_resilience
    archetype_applicable: true
    location: spec.md#FR-008 + tasks.md#T013
    description: "The SPA fetches the config endpoint and OpenAPI document on startup with no timeout specified. In a slow or unresponsive environment (cold .NET start, VPN latency, misconfigured proxy), the useHarnessConfig query will hang indefinitely showing a spinner. TanStack Query's default staleTime is 0 and retry is 3 — meaning a failed OpenAPI fetch will retry 3 times before showing an error, adding significant delay. No task specifies timeout values or retry strategy for these startup fetches."
    base_severity: high
    effective_severity: high
    recommended_action: "Add explicit timeout (e.g., 5s) and retry: 1 to the useHarnessConfig useQuery options. Add a note in T013 specifying these values. The config fetch should fail fast — it is blocking the UI from rendering the endpoint list."
    execution_mode: auto
    status: open
    outcome: ""

  - finding_id: critic-006
    category: dependency_supply_chain
    archetype_applicable: true
    location: plan.md#Technical-Context
    description: "The .NET package has a framework reference to Microsoft.AspNetCore.App but no explicit NuGet package version pins for the React SPA dependencies embedded inside it. The SPA build artifacts are baked into the NuGet package at pack time, so the supply chain risk is at npm-build time, not at consumer install time. However, there is no task to run `npm audit` or check for known vulnerabilities in the embedded SPA's dependencies before packing. A consumer who installs the NuGet package has no visibility into the vulnerability status of the embedded JS."
    base_severity: high
    effective_severity: high
    recommended_action: "Add a task in Phase 6: run `npm audit --audit-level=high` as part of pack.ps1 and fail the pack if high/critical vulnerabilities are found. Document in the package README which npm dependency versions are bundled. Consider adding a SBOM (Software Bill of Materials) generation step."
    execution_mode: auto
    status: open
    outcome: ""

  - finding_id: critic-007
    category: observability
    archetype_applicable: true
    location: tasks.md#T023 + spec.md#FR-012
    description: "FR-012 requires ILogger.LogDebug for every static asset request. On a typical SPA load, this produces 10-20 log entries per page load (index.html + JS chunks + CSS). At Debug level this is fine for development, but if a consumer sets their minimum log level to Debug in production (common in .NET apps with appsettings.Development.json inherited), the harness will flood the log with asset requests. There is no guidance on the recommended log level configuration or a way to suppress asset logging."
    base_severity: high
    effective_severity: high
    recommended_action: "Use ILogger<ApiTestHarnessMiddleware> with a dedicated category name so consumers can filter harness logs independently via 'Logging:LogLevel:WebSpark.ApiTestHarness': 'Warning' in appsettings. Document this in the quickstart. Consider making asset-level logging opt-in via HarnessOptions.EnableVerboseLogging rather than always-on."
    execution_mode: selective
    status: open
    outcome: ""

  - finding_id: critic-008
    category: testing_strategy
    archetype_applicable: true
    location: plan.md#Testing + tasks.md
    description: "The validation strategy for the NuGet package is entirely manual: 'install in dotnet new webapi and check.' There is no automated test that verifies (1) the embedded resource names are correct, (2) the config endpoint returns the correct JSON shape, (3) the SPA HTML is served with correct Content-Type and Cache-Control, or (4) the SPA fallback serves index.html for unknown paths. This is a library with a public contract — silent regressions are invisible without at least a minimal integration test."
    base_severity: high
    effective_severity: high
    recommended_action: "Add a minimal .NET xUnit or NUnit integration test project (WebSpark.ApiTestHarness.Tests) using WebApplicationFactory or TestServer: verify config endpoint shape, verify /api-test-harness/ returns 200 with text/html, verify /api-test-harness/assets/nonexistent returns index.html (SPA fallback), verify /api-test-harness/config returns 200 with correct JSON keys. This is a one-time setup that protects all future changes."
    execution_mode: manual
    status: open
    outcome: ""

  - finding_id: critic-009
    category: documentation
    archetype_applicable: true
    location: tasks.md#T037
    description: "T037 updates DEPLOYMENT.md but there is no task to create a README or package description for the NuGet package itself. NuGet packages are expected to have a README.md shown on nuget.org, a <Description> in the .csproj, a <PackageReleaseNotes> field, and a link to the source repository. Without this, the package will appear incomplete and consumers will not know what environment restrictions apply (e.g., Development-only, no production use)."
    base_severity: high
    effective_severity: high
    recommended_action: "Add a task in Phase 6: create WebSpark.ApiTestHarness/README.md with install instructions, quickstart code, environment restrictions, and the VITE_BASE_PATH note. Add <PackageReadmeFile>, <Description>, <RepositoryUrl>, and <PackageTags> to the .csproj. Reference the NuGet packaging best practices guide."
    execution_mode: auto
    status: open
    outcome: ""

  - finding_id: critic-010
    category: secrets_handling
    archetype_applicable: true
    location: spec.md#FR-006 + data-model.md#HarnessOptions
    description: "HarnessOptions.DefaultHeaders allows the host app to register arbitrary header key-value pairs. The spec and constitution both state these must not contain secrets, but there is no runtime enforcement. A developer could accidentally register DefaultHeaders['Authorization'] = 'Bearer my-actual-token' and it would be served verbatim by the config endpoint to any browser that calls /api-test-harness/config. The warning is documentation-only."
    base_severity: high
    effective_severity: high
    recommended_action: "Add a startup-time validation in MapApiTestHarness(): if any DefaultHeaders key is 'Authorization', 'Cookie', 'X-Api-Key', or similar sensitive header names, log a WARNING (not an exception, since the developer may have a legitimate reason) via ILogger. Consider adding a HarnessOptions.Validate() method that throws if the headers contain obviously sensitive patterns (e.g., values matching 'Bearer [A-Za-z0-9._-]{20,}')."
    execution_mode: selective
    status: open
    outcome: ""

  - finding_id: critic-011
    category: deployment_rollback
    archetype_applicable: true
    location: tasks.md (no task)
    description: "There is no NuGet package versioning strategy defined. The .csproj will need a <Version> element. The plan shows the React SPA uses npm version (currently 1.0.296) but there is no defined relationship between npm version, .NET assembly version, and NuGet package version. A consumer who installs v1.0.0 and then updates to v1.0.1 has no changelog, no release notes, and no way to know if the embedded SPA changed, the .NET API changed, or both."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Define a versioning strategy in pack.ps1: read the npm package version from package.json and use it as the NuGet package version (e.g., 1.0.296 → 1.0.296). Add a task to generate <PackageReleaseNotes> from git log between tags. Document in DEPLOYMENT.md that both npm and NuGet versions are kept in sync."
    execution_mode: manual
    status: open
    outcome: ""

  - finding_id: critic-012
    category: documentation
    archetype_applicable: true
    location: spec.md (frontmatter)
    description: "spec.md frontmatter is missing archetype, risk_profile, and change_type fields. These are required by the critic workflow to apply correct severity scaling and archetype-appropriate checklists automatically."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Add to spec.md frontmatter: archetype: library, risk_profile: internal, change_type: greenfield."
    execution_mode: auto
    status: open
    outcome: ""

  - finding_id: critic-013
    category: error_handling_resilience
    archetype_applicable: true
    location: spec.md#Edge-Cases + tasks.md#T023
    description: "The SPA fallback (all unmatched paths under /api-test-harness/ → index.html) will also match /api-test-harness/favicon.ico, /api-test-harness/robots.txt, and any other static file the browser requests by convention. If the embedded build does not include these files, they will silently return index.html with a 200 status, causing confusing browser behavior (favicon will display as HTML, robots.txt will be invalid). The current build/ directory does not include robots.txt."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Add a 404 response for requests to /api-test-harness/ paths that don't match known SPA routes (e.g., file extensions other than .html). Alternatively, serve a proper 404 for unknown file-extension requests and only fall through to index.html for extensionless paths (standard SPA fallback pattern). Add robots.txt to src/public/ to suppress crawling."
    execution_mode: selective
    status: open
    outcome: ""
```

---

### Critical

| ID | Category | Location | Risk | Likely Impact | Action |
| --- | --- | --- | --- | --- | --- |
| critic-001 | deployment_rollback | plan.md#R-001, tasks.md#T003 | EmbeddedFileProvider resource name mismatch produces silent 404s for all SPA assets | Entire embedded SPA unreachable; harness appears broken at first install | Add build-time resource name verification task |
| critic-002 | trust_boundaries | spec.md#FR-003, contracts/ | Config endpoint publicly accessible with no CORS restriction; leaks deployment topology to any origin | Metadata harvesting in cross-origin deployments; aids targeted attacks | Add same-origin CORS restriction + CSP on SPA HTML |
| critic-003 | api_compatibility | plan.md#Technical-Context | No semver discipline or public API surface snapshot for the C# NuGet API | Silent breaking changes for consumers on minor updates | Add PublicApiAnalyzer + declare semver policy before v1 publish |
| critic-004 | scale_bottlenecks | spec.md#SC-002 | SC-002's 2s target includes .NET cold-start time; unachievable on first request | SC-002 fails on every cold start; may be misreported as a bug | Reword SC-002 to exclude cold-start; add bundle size measurement task |

---

### High

| ID | Category | Location | Issue | Impact | Suggestion |
| --- | --- | --- | --- | --- | --- |
| critic-005 | error_handling_resilience | tasks.md#T013 | No timeout on config/OpenAPI startup fetches; TanStack retry:3 default adds 3x delay on failure | Harness spinner hangs for 30+ seconds on slow network before showing error | Set timeout:5000 and retry:1 on useHarnessConfig useQuery |
| critic-006 | dependency_supply_chain | plan.md#Technical-Context | No npm audit step before dotnet pack; JS vulnerabilities invisible to NuGet consumers | Consumer installs NuGet package containing vulnerable JS with no visibility | Add npm audit --audit-level=high to pack.ps1 |
| critic-007 | observability | tasks.md#T023 | ILogger.LogDebug per-asset floods logs if consumer sets Debug level globally | Log noise makes production debugging harder; may be misread as performance issues | Use dedicated ILogger category; make asset logging opt-in via HarnessOptions |
| critic-008 | testing_strategy | plan.md#Testing | Entirely manual validation — no automated test verifies resource names, endpoint contract, or SPA fallback | Silent regressions on future updates; resource name bugs ship undetected | Add minimal .NET integration test project with WebApplicationFactory |
| critic-009 | documentation | tasks.md#T037 | No NuGet package README, Description, or release notes defined | Package appears abandoned/incomplete on nuget.org; consumers unsure of constraints | Add NuGet metadata task: README.md, csproj fields, PackageReleaseNotes |
| critic-010 | secrets_handling | spec.md#FR-006 | DefaultHeaders accepts arbitrary headers with no runtime validation; Authorization header could be registered and served via config endpoint | Accidental credential exposure via config endpoint to any browser | Add startup WARNING log if sensitive header names detected in DefaultHeaders |

---

### Missing Critical Tasks

- **Testing**: No automated .NET integration tests for the NuGet package middleware (resource serving, config endpoint JSON shape, SPA fallback, Cache-Control headers). Constitution VII permits no test framework for the React SPA, but the .NET library is a separate project with no such constraint — adding a test project is feasible and strongly recommended.
- **Security**: No CORS configuration task for the config endpoint. No CSP header task for the SPA HTML response. No npm audit step in pack.ps1.
- **Operations**: No NuGet package versioning strategy task (version sync between package.json and .csproj). No NuGet package README/metadata task.
- **Documentation**: No changelog or release notes workflow.

---

### Questionable Assumptions

1. **"EmbeddedFileProvider namespace prefix will be `WebSpark.ApiTestHarness.build`"** → Failure mode: On Windows, backslash path separators in `<EmbeddedResource Include="build\**">` produce manifest names with dots replacing separators. The actual name depends on the root namespace and the path. If the root namespace differs from the assembly name, the prefix breaks. Verify with `GetManifestResourceNames()` before shipping.

2. **"The SPA will be under 2MB total"** → Failure mode: The current standalone build (without App Insights) already has vendor-react (~178KB gzip), vendor-state (~15KB), index (~80KB), plus screen chunks. With App Insights vendor (~41KB) and the new host-api screen bundle, the total uncompressed JS will be ~450-500KB. NuGet embeds these as resources (not compressed). The `.nupkg` uses zip compression, so 2MB for the package is achievable — but the embedded resources in the DLL will be larger (~1.5-2MB uncompressed). This is fine for correctness but worth measuring explicitly.

3. **"OpenAPI document fetch will be fast"** → Failure mode: Large host apps with hundreds of endpoints produce OpenAPI documents of 100KB–1MB. The SPA fetches this on every page load with no caching. With the custom parser (no third-party library), a 500KB OpenAPI doc will take measurable JS parse time. Add a `staleTime: Infinity` to the OpenAPI query so it's only fetched once per session.

4. **"US2 is a validation-only phase"** → Failure mode: If T014 (useHostApi) is incomplete or has bugs, US2's single validation task (T025) will fail and there is no remediation task. The dependency is correct in direction but the single-task phase has no fallback.

5. **"No test framework needed for .NET code"** → Failure mode: Constitution VII explicitly applies only to the React SPA quality gates. The .NET library (`WebSpark.ApiTestHarness.csproj`) is a separate project with no stated testing constraint. Shipping a NuGet library without at least a smoke-test harness is a significant operational risk for library maintenance.

---

### Dependency Risk Assessment

| Dependency | Concern | Alternative |
| --- | --- | --- |
| `Microsoft.AspNetCore.EmbeddedFileProviders` (via App framework ref) | Embedded resource naming conventions are non-obvious; documented in ASP.NET Core docs but easy to get wrong | Validate with `GetManifestResourceNames()` at build time |
| `EmbeddedResource Include="build\**"` path glob | Build order dependency: npm build must complete before dotnet build embeds files; no task enforces this sequence explicitly | Add a .csproj `<Target BeforeTargets="Build">` that checks the `build/` directory exists and fails if empty |
| React 19 + TanStack Query 5 | Both are relatively recent major versions; TanStack Query 5 has breaking changes from v4; ensure useQuery/useMutation API matches v5 patterns in useHarnessConfig | Locked in package.json already — low risk |
| `uuid` v14 | Major version bump from widely-used v4/v9; verify the import path (`import { v4 as uuidv4 } from 'uuid'`) still works in v14 | Check package.json — already in use so this is pre-validated |
| Custom OpenAPI v3 parser (`openApiParser.ts`) | Hand-rolled parsers accumulate edge cases: `$ref` resolution, `allOf`/`oneOf` schemas, empty `paths` object, missing `info` field | Scope to only the fields needed; return empty array on any parse error; never throw |

---

### Estimated Technical Debt at Launch

- **Code debt**: Hand-rolled OpenAPI parser will accumulate edge-case fixes for the lifetime of the package. No `$ref` resolution means complex schemas show as `unknown`. Acceptable for v1 but plan for incremental improvement.
- **Operational debt**: Manual validation only. Every future change to the .NET middleware requires a full manual install-and-test cycle. Estimated cost: 15-30 minutes per change.
- **Documentation debt**: No changelog, no NuGet metadata, no per-release notes. Consumers will not know what changed between versions.
- **Testing debt**: No automated regression coverage for the NuGet middleware contract. Each release risks silent breakage of embedded resource serving.
- **Security debt**: Config endpoint CORS and CSP gaps left open. Low risk for internal developer tooling but will require rework if the package is ever published publicly.

---

### Metrics

- Showstoppers: **0**
- Critical (effective): **4** (critic-001, critic-002, critic-003, critic-004)
- High (effective): **6** (critic-005 through critic-010)
- Medium (effective): **3** (critic-011, critic-012, critic-013)
- Findings by category: deployment_rollback (2), trust_boundaries (1), api_compatibility (1), scale_bottlenecks (1), error_handling_resilience (2), dependency_supply_chain (1), observability (1), testing_strategy (1), documentation (2), secrets_handling (1)
- Missing operational tasks: 4 (integration tests, CORS/CSP, npm audit, NuGet metadata)

---

**VERDICT:** CONDITIONAL

**Required Actions Before First NuGet Publish:**

1. **critic-001** — Add build-time embedded resource name verification to T003/T023. This is a silent failure that will make the package appear broken at first install.
2. **critic-002** — Add same-origin CORS restriction and CSP header to the config endpoint and SPA HTML. Document network-level access control requirements.
3. **critic-003** — Add `Microsoft.CodeAnalysis.PublicApiAnalyzers` and declare a semver policy before the first `dotnet pack`.
4. **critic-008** — Add a minimal .NET integration test project. The .NET library is not subject to Constitution VII's no-test-framework rule.

**Recommended Risk Mitigations:**

- Add `npm audit --audit-level=high` to `pack.ps1` (critic-006)
- Set `timeout: 5000, retry: 1` on `useHarnessConfig` `useQuery` (critic-005)
- Use `ILogger<ApiTestHarnessMiddleware>` for independent log filtering; consider opt-in verbose asset logging (critic-007)
- Add startup WARNING if `DefaultHeaders` contains `Authorization` or similar sensitive header names (critic-010)
- Add NuGet package README and metadata task to Phase 6 (critic-009)
- Define NuGet version sync strategy in `pack.ps1` (critic-011)
- Add `staleTime: Infinity` to the OpenAPI document query to prevent per-page-load re-fetching
- Add `archetype: library`, `risk_profile: internal`, `change_type: greenfield` to spec.md frontmatter (critic-012)
