# Critic Gate: Portable NuGet Package for API Test Spark

```yaml
gate: critic
status: pass
blocking: false
severity: info
summary: "26 findings total across two runs — all resolved. Second run (2026-05-29): 4 critical (CSP App Insights, CORS dev gap, npm audit false-positive, PublicAPI ordering), 7 high, 4 medium. Resolved via: T003b (PublicAPI files in Phase 1), T004 (warn-not-fail audit + version strip), T010 (parser error handling), T013 (root-level hook note), T023 (CorsOrigins + URI validation), T024 (connect-src App Insights), T038 (CorsOrigins docs), T039 (Constitution VII exemption), data-model.md + spec.md (CorsOrigins property). PROCEED."
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
    description: "EmbeddedFileProvider resource name mismatch silently produces 404s for all SPA assets."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Verified via GetManifestResourceNames() at startup; throw InvalidOperationException if prefix missing."
    execution_mode: manual
    status: resolved
    outcome: "T003 updated: explicit <RootNamespace> set; T023 updated: startup assertion on resource name prefix."

  - finding_id: critic-002
    category: trust_boundaries
    archetype_applicable: true
    location: spec.md#FR-003 + contracts/config-endpoint.md
    description: "Config endpoint publicly accessible with no CORS or CSP; leaks deployment topology cross-origin."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Same-origin CORS on config endpoint; CSP on SPA HTML."
    execution_mode: manual
    status: resolved
    outcome: "T023 updated: CORS same-origin policy on config endpoint. T024 updated: CSP header on index.html. spec.md FR-003 updated. T036 updated: DEPLOYMENT.md to note network-level access controls."

  - finding_id: critic-003
    category: api_compatibility
    archetype_applicable: true
    location: plan.md#Technical-Context + tasks.md
    description: "No semver discipline or public API surface snapshot for the C# NuGet public API."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Add PublicApiAnalyzer + declare semver policy in README before v1 publish."
    execution_mode: selective
    status: resolved
    outcome: "T003 updated: PublicApiAnalyzer added to .csproj. T042 added: PublicAPI.Shipped.txt/Unshipped.txt snapshot task. T038 added: NuGet README with semver policy."

  - finding_id: critic-004
    category: scale_bottlenecks
    archetype_applicable: true
    location: spec.md#SC-002 + spec.md#SC-006
    description: "SC-002 2s target includes .NET cold-start; unachievable on first request. Bundle size tight."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Reword SC-002 to exclude cold-start; add bundle size measurement task."
    execution_mode: selective
    status: resolved
    outcome: "SC-002 reworded in spec.md to exclude cold-start, measure from DOMContentLoaded on warm app. T040 added: embedded bundle size measurement task."

  - finding_id: critic-005
    category: error_handling_resilience
    archetype_applicable: true
    location: spec.md#FR-008 + tasks.md#T013
    description: "No timeout on config/OpenAPI startup fetches; TanStack retry:3 default causes 30s+ hang on failure."
    base_severity: high
    effective_severity: high
    recommended_action: "Set timeout:5000 and retry:1 on useHarnessConfig useQuery; staleTime:Infinity to prevent re-fetching."
    execution_mode: auto
    status: resolved
    outcome: "T013 updated: retry:1, staleTime:Infinity, 5s AbortController timeout on both config and OpenAPI fetches."

  - finding_id: critic-006
    category: dependency_supply_chain
    archetype_applicable: true
    location: plan.md#Technical-Context
    description: "No npm audit step before dotnet pack; JS vulnerabilities invisible to NuGet consumers."
    base_severity: high
    effective_severity: high
    recommended_action: "Run npm audit --audit-level=high in pack.ps1; fail on high/critical."
    execution_mode: auto
    status: resolved
    outcome: "T004 updated: npm audit --audit-level=high runs before npm build in pack.ps1; aborts on failure."

  - finding_id: critic-007
    category: observability
    archetype_applicable: true
    location: tasks.md#T024 + spec.md#FR-012
    description: "Per-asset ILogger.LogDebug floods logs if consumer sets Debug globally; no way to filter."
    base_severity: high
    effective_severity: high
    recommended_action: "Use ILogger<ApiTestSparkMiddleware> category; make asset logging opt-in via EnableVerboseLogging."
    execution_mode: selective
    status: resolved
    outcome: "T009 updated: EnableVerboseLogging property added to ApiTestSparkOptions. T024 updated: asset logging only when EnableVerboseLogging=true using ILogger<ApiTestSparkMiddleware>. data-model.md updated."

  - finding_id: critic-008
    category: testing_strategy
    archetype_applicable: true
    location: plan.md#Testing + tasks.md
    description: "Entirely manual validation; no automated test for resource names, endpoint contract, or SPA fallback."
    base_severity: high
    effective_severity: high
    recommended_action: "Add minimal .NET xUnit integration test project with WebApplicationFactory."
    execution_mode: manual
    status: resolved
    outcome: "T039 added: ApiTestSpark.Tests xUnit project with 5 integration test cases covering resource names, config endpoint shape, SPA serving, SPA fallback, and 404 for unknown file extensions."

  - finding_id: critic-009
    category: documentation
    archetype_applicable: true
    location: tasks.md#T037
    description: "No NuGet package README, Description, or release notes; package appears incomplete on nuget.org."
    base_severity: high
    effective_severity: high
    recommended_action: "Create ApiTestSpark/README.md; add csproj metadata fields."
    execution_mode: auto
    status: resolved
    outcome: "T003 updated: csproj metadata fields added (<PackageReadmeFile>, <Description>, <RepositoryUrl>, <PackageTags>). T038 added: NuGet README creation task."

  - finding_id: critic-010
    category: secrets_handling
    archetype_applicable: true
    location: spec.md#FR-006 + data-model.md#HarnessOptions
    description: "DefaultHeaders accepts Authorization etc with no runtime validation; could accidentally expose tokens via config endpoint."
    base_severity: high
    effective_severity: high
    recommended_action: "Log WARNING at startup if sensitive header names detected in DefaultHeaders."
    execution_mode: selective
    status: resolved
    outcome: "T023 updated: startup ILogger.LogWarning emitted if DefaultHeaders contains Authorization, Cookie, X-Api-Key, or X-Auth-Token (case-insensitive)."

  - finding_id: critic-011
    category: deployment_rollback
    archetype_applicable: true
    location: tasks.md (no task)
    description: "No NuGet versioning strategy; npm version and NuGet version out of sync."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Read npm version from package.json; pass as /p:Version= to dotnet pack."
    execution_mode: manual
    status: resolved
    outcome: "T004 updated: pack.ps1 reads version from package.json and passes /p:Version= to dotnet pack."

  - finding_id: critic-012
    category: documentation
    archetype_applicable: true
    location: spec.md (frontmatter)
    description: "spec.md missing archetype, risk_profile, change_type frontmatter fields."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Add archetype: library, risk_profile: internal, change_type: greenfield to frontmatter."
    execution_mode: auto
    status: resolved
    outcome: "spec.md frontmatter updated with all three fields."

  - finding_id: critic-013
    category: error_handling_resilience
    archetype_applicable: true
    location: spec.md#Edge-Cases + tasks.md#T024
    description: "SPA fallback serves index.html for favicon.ico, robots.txt etc; silent 200 with HTML body."
    base_severity: medium
    effective_severity: medium
    recommended_action: "Return 404 for file-extension requests not found in embedded resources; add robots.txt."
    execution_mode: selective
    status: resolved
    outcome: "T024 updated: 404 returned for requests with file extensions not matched in embedded resources. T041 added: robots.txt added to src/public/."
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

1. **"EmbeddedFileProvider namespace prefix will be `ApiTestSpark.build`"** → Failure mode: On Windows, backslash path separators in `<EmbeddedResource Include="build\**">` produce manifest names with dots replacing separators. The actual name depends on the root namespace and the path. If the root namespace differs from the assembly name, the prefix breaks. Verify with `GetManifestResourceNames()` before shipping.

2. **"The SPA will be under 2MB total"** → Failure mode: The current standalone build (without App Insights) already has vendor-react (~178KB gzip), vendor-state (~15KB), index (~80KB), plus screen chunks. With App Insights vendor (~41KB) and the new host-api screen bundle, the total uncompressed JS will be ~450-500KB. NuGet embeds these as resources (not compressed). The `.nupkg` uses zip compression, so 2MB for the package is achievable — but the embedded resources in the DLL will be larger (~1.5-2MB uncompressed). This is fine for correctness but worth measuring explicitly.

3. **"OpenAPI document fetch will be fast"** → Failure mode: Large host apps with hundreds of endpoints produce OpenAPI documents of 100KB–1MB. The SPA fetches this on every page load with no caching. With the custom parser (no third-party library), a 500KB OpenAPI doc will take measurable JS parse time. Add a `staleTime: Infinity` to the OpenAPI query so it's only fetched once per session.

4. **"US2 is a validation-only phase"** → Failure mode: If T014 (useHostApi) is incomplete or has bugs, US2's single validation task (T025) will fail and there is no remediation task. The dependency is correct in direction but the single-task phase has no fallback.

5. **"No test framework needed for .NET code"** → Failure mode: Constitution VII explicitly applies only to the React SPA quality gates. The .NET library (`ApiTestSpark.csproj`) is a separate project with no stated testing constraint. Shipping a NuGet library without at least a smoke-test harness is a significant operational risk for library maintenance.

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
- Use `ILogger<ApiTestSparkMiddleware>` for independent log filtering; consider opt-in verbose asset logging (critic-007)
- Add startup WARNING if `DefaultHeaders` contains `Authorization` or similar sensitive header names (critic-010)
- Add NuGet package README and metadata task to Phase 6 (critic-009)
- Define NuGet version sync strategy in `pack.ps1` (critic-011)
- Add `staleTime: Infinity` to the OpenAPI document query to prevent per-page-load re-fetching
- Add `archetype: library`, `risk_profile: internal`, `change_type: greenfield` to spec.md frontmatter (critic-012)
