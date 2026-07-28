# Repository Story: ApiTestSpark

> Generated 2026-06-06 | Updated 2026-06-09 | Window: full project history | Scope: full | v1.4.0 update

---

## Executive Summary

ApiTestSpark is a developer productivity tool that embeds a polished REST API testing harness directly into any .NET 10 Minimal API application — no separate Postman window, no external tooling, no configuration server. A single `MapApiTestSpark()` call serves a React SPA at `/api-test-spark/`, pre-loaded with the host app's OpenAPI spec, ready to test endpoints from the browser. As a NuGet package, it deploys wherever the host app deploys, making it natural for development, staging, and internal demos without any additional infrastructure.

The project launched on 2026-05-18 and reached v1.4.0 on 2026-06-09, delivering 7 tagged releases across 135 commits. That is not a maintenance pace — it is a purpose-built sprint. The commit history tells the story of a project built with deliberate engineering discipline: conventional commits, 3 spec-driven feature PRs reviewed and merged through a formal constitution-aligned process, and a fully automated CI/CD pipeline that publishes to NuGet.org on every version tag with zero manual steps.

The v1.4.0 milestone, tagged on 2026-06-09, is the most significant release to date. It evolves the v1.3.0 Remote API Explorer into full Remote API Profiles: multiple named remote APIs configured in `Program.cs` or personalized from the browser, profile-specific explorer and documentation routes, server-profile-only spec proxying, redacted server credentials, browser-local profile persistence, and duplicate profile-name validation. The public API now includes the additive `RemoteApiProfile` model and `RemoteApiProfiles` collection, while legacy single-remote options remain supported as a compatibility seed. Integration test coverage is 33 tests.

The live demo at [apitest.makeboldspark.com](https://apitest.makeboldspark.com) demonstrates all features end-to-end, including the Remote API Explorer configured against JSONPlaceholder as a publicly accessible target. The NuGet package is published at [nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark).

---

## Technical Analysis

### Development Velocity

The project produced 135 commits through the v1.4.0 release. Activity was front-loaded: 102 commits in May (the foundation and core tooling sprint) followed by focused June work covering three feature PRs, the v1.3.0 and v1.4.0 releases, documentation overhaul, release workflow refinements, and SampleApi deployment packaging.

The three largest single-commit changesets in the project, by lines touched, tell the architectural story cleanly:

| Commit | Purpose | Files | Lines |
|--------|---------|-------|-------|
| `45423ee` | Establish NuGet harness (spec 001) | 164 | 7,778 |
| `dd5b7c7` | Merge PR #2 — Remote OpenAPI config | 46 | 4,085 |
| `89292f8` | Merge PR #1 — Response renderer | 16 | 1,970 |

The decreasing scale of each PR reflects maturation: the foundation required 164 files; subsequent features built cleanly on top with 46 and 16 files respectively. Churn ratio is low — each feature adds net new capability rather than reworking existing code, which indicates stable foundational architecture.

### Contributor Dynamics

All 124 commits are from a single contributor (Lead Architect). Bus factor is 1, which is expected and appropriate for a project at this stage — it was built as a personal tool with a clear authorship identity. The formal spec-review-PR workflow used for both feature branches (PR #1 and PR #2) creates a governance paper trail that would allow a second contributor to onboard and operate within the same process immediately.

### Quality Signals

**Test coverage**: The .NET integration suite now has 33 tests. It grew from 21 (v1.1.0 baseline) to 30 (v1.3.0) for the remote spec proxy's error-path matrix, then to 33 in v1.4.0 for multi-profile configuration, credential redaction, server-profile-only proxy resolution, and duplicate-name validation support. The React SPA has no test framework by explicit constitutional decision (§VII) — TypeScript strict mode and ESLint serve as the compile-time safety net.

**Conventional commits**: 108 of 124 commits (87%) use conventional commit format. The commit prefix distribution across the full history:

| Type | Count | Signal |
|------|-------|--------|
| `feat` | 28 | Feature delivery dominant |
| `fix` | 27 | Active defect-correction cycle |
| `docs` | 25 | Documentation treated as first-class |
| `refactor` | 12 | Ongoing code quality investment |
| `chore` | 12 | Tooling and dependency hygiene |
| `ci/build` | 6 | CI pipeline investment |
| `tests` | 4 | Explicit test commits (beyond feat/fix) |

The near-parity of `feat` and `fix` commits is healthy for a product in its first three weeks — it means bugs found during development are addressed promptly rather than deferred.

### Governance & Process Maturity

The project operates a formal spec-driven development lifecycle:

- Features are specified in `.documentation/specs/` before implementation begins
- Each spec produces a plan, tasks, and research document
- Implementation follows the spec; completed work is PR-reviewed against the constitution
- PRs are reviewed with a structured finding system (Critical/High/Medium/Low/CON)
- Findings are addressed in fix commits; review files record resolution evidence
- Merged specs are archived to `.documentation/releases/v{N}/` at release time

Both feature PRs went through this full cycle. PR #2 (Remote OpenAPI config) was reviewed at two revisions: Rev 1 identified 1 medium, 2 low, and 1 constitution finding; Rev 2 confirmed all 4 resolved with 0 remaining. The constitution itself has been amended 6 times since ratification, evolving from v1.0.0 to v1.1.2 as the codebase grew and new patterns emerged.

**Tag discipline**: 7 tags through 2026-06-09 — v1.0.0, v1.0.1, v1.0.2, v1.1.0, v1.2.0, v1.3.0, v1.4.0 — demonstrates clean semver practice. Patch releases (v1.0.1, v1.0.2) were used for bug fixes and the CSP localhost fix. Minor releases (v1.1.0, v1.2.0, v1.3.0, v1.4.0) corresponded to spec-driven feature deliveries.

### Architecture & Technology

ApiTestSpark is a dual-artifact repository: a React SPA and a .NET NuGet package built from the same codebase in a single repository.

**React SPA** (`src/`): TypeScript 5.x with strict mode, React 19, Vite 8, Tailwind CSS 4, Zustand 5 (with `persist`), TanStack Query 5, React Router DOM 7. The SPA is a developer tool embedded in a server — it communicates with its host via a `/api-test-spark/config` endpoint that the .NET library registers. The `useHarnessConfig` hook seeds the SPA's state from the server's `ApiTestSparkOptions` on startup, then merges browser-side overrides on top.

**NuGet library** (`ApiTestSpark/`): .NET 10 / ASP.NET Core Minimal API. A single `MapApiTestSpark()` extension method registers: the SPA file server, the config endpoint, the remote spec proxy, and the OpenAPI redirect. The embedded React build is included as a content item in the `.csproj`. The library has 30 integration tests (`ApiTestSpark.Tests/`) using `WebApplicationFactory<T>` to test the full ASP.NET Core middleware pipeline.

**CI/CD**: GitHub Actions (`publish-nuget.yml`) publishes to NuGet.org automatically on `v*.*.*` tag push — full quality gate (build, test, vulnerability audit, pack) with no manual steps. Source Link is enabled for debuggable NuGet packages.

The file-type distribution across all 124 commits confirms the dual-artifact nature: `.md` (449 file-touches) leads because documentation is first-class; `.ts`/`.tsx` (228 combined) covers the React layer; `.cs` (66) covers the .NET layer; `.ps1` (57) covers the DevSpark workflow tooling.

---

## Change Patterns

The top 5 most-modified files by commit count:

| File | Changes | Interpretation |
|------|---------|----------------|
| `package.json` | 17 | Version bumps, dependency updates — expected coordination point |
| `ApiTestSpark/ApiTestSpark.csproj` | 16 | Version bumps, NuGet metadata — mirrors package.json as dual-artifact |
| `SampleApi/Program.cs` | 13 | Demo site configuration evolves with every new feature option |
| `src/public/build-info.json` | 11 | Build metadata — touched by every Vite build |
| `README.md` | 10 | Living documentation — updated 10 times in 19 days |

**Key pattern**: `package.json` and `ApiTestSpark.csproj` touch counts are nearly identical (17 vs 16). This is the dual-artifact sync signal — when one moves, the other follows. The personalized `devspark.release` prompt was created specifically to enforce this invariant on every release.

**`SampleApi/Program.cs`** at 13 touches reflects that the demo site is the primary integration point for every new `ApiTestSparkOptions` property. It serves both as functional demo and as the first real-world caller of the library's public API.

**Directory-level patterns**: The `src/` directory dominates with TypeScript/TSX changes; `ApiTestSpark/` is the stable .NET core with focused, deliberate changes; `.documentation/` accumulates the spec and governance artifacts that make the workflow reproducible.

**Hotspot worth watching**: `src/public/build-info.json` at 11 changes is build-generated and should not require manual edits. If it starts accumulating human changes, it signals a process drift.

---

## Milestone Timeline

| Date | Tag | Description | PR | Commits |
|------|-----|-------------|-----|---------|
| 2026-05-18 | — | Initial commit — project configuration | — | ~1 |
| 2026-05-30 | `v1.0.0` | Adopt strict semver; NuGet harness live on nuget.org | — | ~75 |
| 2026-05-30 | `v1.0.1` | Fix localhost CSP connections; fix trailing-slash redirect | — | 2 |
| 2026-05-30 | `v1.0.2` | SourceLink upgrade, release archive for v1.0.2 | — | 2 |
| 2026-05-31 | `v1.1.0` | `EnableDemoIntegrations` option; OpenAPI best practices; constitution v1.1.0 | — | ~8 |
| 2026-06-03 | `v1.2.0` | Response renderer: editable objects, cURL copy, JSON toggle, JSONPath tooltips | PR #1 | 10 |
| 2026-06-06 | `v1.3.0` | Remote API Explorer, server-side spec proxy, SSRF guard, header token expansion | PR #2 | 9 |

**Velocity pattern around releases**: The v1.2.0 and v1.3.0 PRs both show a concentrated burst of activity on a single day (June 2 and June 6 respectively), followed by the release commit. This reflects the spec-driven model: design happens ahead of time in `.documentation/specs/`, so implementation is a focused execution against a known plan rather than exploratory coding.

---

## Constitution Alignment

**Constitution version**: 1.1.2 | **Amendments**: 6 since ratification

The constitution defines 8 mandatory principles. Mapping commit evidence to each:

| Principle | Evidence from history | Alignment |
|-----------|----------------------|-----------|
| §I TypeScript Strict | Every PR gate includes `npm run verify` (tsc -b + vite); zero TS errors across all 44 files in PR #2 | Strong |
| §II ESLint Only, No Prettier | `npm run lint` in every PR gate; 108 conventional commits signal discipline | Strong |
| §III Layer Separation & Barrel Exports | PR reviews explicitly check barrel exports; new `src/components/remote-api/` and `src/components/harness-config/` directories both created with `index.ts` barrels | Strong |
| §IV API Client Pattern | `remoteOpenApiClient.ts` (PR #2) uses `createRestCaller` — the constitutionally recognized Pattern B; UUID correlation on every call | Strong |
| §V Zustand Store Rules | `useRemoteConfigStore` added in PR #2; constitution §V registry amended in fix commit `686e576` to include it | Strong — self-correcting |
| §VI Observability & Logging | No `console.log` in `src/` across all 124 commits; errors routed to `addError()` with typed `ErrorCategory` | Strong |
| §VII Testing Stance | React: no test framework (opted-out per §VII); .NET: 30/30 integration tests | Compliant |
| §VIII PII/PHI Protection | Credential values never appear in error bodies, debug store entries, or test data; SSRF guard blocks non-HTTP schemes | Strong |

The constitution has grown organically with the codebase — 6 amendments in 19 days is not instability, it is active governance. Each amendment added precision: Pattern B API clients (§IV), `useHarnessConfigStore` registry entry (§V), `React` ErrorCategory (§VI), `useRemoteConfigStore` registry entry (§V again in v1.1.2). The constitution is doing its job as a living document.

**One gap worth noting**: The constitution does not yet have a section on SampleApi deployment separation from NuGet publishing. This gap surfaced during the v1.3.0 release and was addressed in the personalized `devspark.release` prompt. A future `§IX: Demo Site & Deployment Separation` amendment would close it formally.

---

## Developer FAQ

### What does this project do?

ApiTestSpark is a .NET NuGet package that embeds a React-based REST API testing harness into any .NET 10 Minimal API application. One `MapApiTestSpark()` call in `Program.cs` serves a complete API explorer at `/api-test-spark/`, pre-configured with the host app's OpenAPI spec. As of v1.4.0, it also includes Remote API Profiles: multiple named remote APIs with profile-specific explorer and documentation routes, server-held credential redaction, and browser-personalized profile management. The live demo runs at [apitest.makeboldspark.com](https://apitest.makeboldspark.com).

### What tech stack does it use?

The React SPA uses TypeScript 5.x (strict mode), React 19, Vite 8, Tailwind CSS 4, Zustand 5, TanStack Query 5, and React Router DOM 7. The .NET library targets .NET 10 / ASP.NET Core Minimal API with no external runtime dependencies beyond the framework. DevSpark workflow tooling is PowerShell 7+. CI/CD runs on GitHub Actions with Ubuntu runners.

### Where do I start?

For the React SPA: [src/App.tsx](../../src/App.tsx) defines all routes; [src/components/HomeScreen.tsx](../../src/components/HomeScreen.tsx) lists every section with its nav card. For the .NET library: [ApiTestSpark/ApiTestSparkExtensions.cs](../../ApiTestSpark/ApiTestSparkExtensions.cs) is where `MapApiTestSpark()` registers all endpoints — it is the entry point for understanding how the SPA is served and configured. For the demo: [SampleApi/Program.cs](../../SampleApi/Program.cs) shows a complete working integration with the v1.4.0 remote profile options.

### How do I run it locally?

```powershell
# React SPA dev server (hot reload at http://localhost:5173)
.\scripts\build\dev.ps1

# .NET demo site (SampleApi) — in a separate terminal
dotnet run --project SampleApi

# Or the full production build
.\scripts\build\build.ps1
```

The dev server proxies `/api-test-spark/` to `localhost:5000` by default, so you can run the SPA against any local .NET host.

### How do I run the tests?

```powershell
# .NET integration tests (30 tests, WebApplicationFactory-based)
dotnet test ApiTestSpark.Tests

# TypeScript type check + Vite build (compile-time correctness gate)
npm run verify

# ESLint
npm run lint
```

There is no React test framework — this is a constitutional decision (§VII). TypeScript strict mode and ESLint are the SPA's compile-time safety net.

### What is the branching/PR workflow?

All features start with a spec in `.documentation/specs/` (created via `/devspark.specify`). Implementation happens on a feature branch named after the spec number (e.g., `002-remote-openapi-config`). PRs are reviewed with `/devspark.pr-review` against the constitution. Findings are addressed in fix commits; the review file records resolution. PRs merge to `main`. Tagging `v*.*.*` on main triggers the CI/CD pipeline that publishes to NuGet.org automatically — no manual push steps.

### Who do I ask when I'm stuck?

The Lead Architect (Mark Hazleton) is responsible for all 124 commits. The GitHub repo is at [github.com/markhazleton/ApiTestSpark](https://github.com/markhazleton/ApiTestSpark). For package-level questions, the NuGet page at [nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark) includes release notes per version.

### What areas of the code change most often?

The top hotspots by commit count: `package.json` (17) and `ApiTestSpark/ApiTestSpark.csproj` (16) — always in sync for version bumps; `SampleApi/Program.cs` (13) — the first integration point for every new option; `src/components/host-api/EndpointTester.tsx` (8) — the core API-call component at the heart of the user experience; `CHANGELOG.md` (8) — updated at every release. The `src/` and `ApiTestSpark/` directories together account for the bulk of meaningful code changes.

### Are there coding standards I must follow?

Yes — the constitution at [.documentation/memory/constitution.md](../../.documentation/memory/constitution.md) defines 8 mandatory principles enforced by CI and code review. The critical ones for day-to-day work: TypeScript strict mode with zero errors (`npm run verify`); ESLint with zero errors (`npm run lint`); no `console.log` in `src/` — use `useDebugStore.addError()` with a typed `ErrorCategory`; all new API clients must extend `ApiClient` or use `createRestCaller` with a UUID correlation ID per call; all new Zustand stores must be registered in the §V store registry table in the constitution. Conventional commits are strongly encouraged (87% adoption rate).

### What version is currently released?

**v1.4.0**, tagged on 2026-06-09. It adds Remote API Profiles: multiple named remote APIs configured in `Program.cs` or personalized in the browser Config page, profile-specific explorer and documentation routes, server-profile-only spec proxying, redacted server credentials in `/api-test-spark/config`, browser-local profile persistence, and duplicate profile-name validation. The NuGet package is live at [nuget.org/packages/ApiTestSpark/1.4.0](https://www.nuget.org/packages/ApiTestSpark/1.4.0). The demo site at [apitest.makeboldspark.com](https://apitest.makeboldspark.com) is documented for v1.4.0 content and remote profile management.

---

*Generated by /devspark.repo-story | DevSpark — Adaptive System Life Cycle Development*
*Evidence drawn from 135 commits, 7 tagged releases, 3 merged PRs, and constitution v1.1.2*
