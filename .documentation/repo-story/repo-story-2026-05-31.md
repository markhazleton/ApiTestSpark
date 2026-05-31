# Repository Story: ApiTestSpark

> Generated 2026-05-31 | Window: 12 months | Scope: full

---

## Executive Summary

ApiTestSpark is a developer productivity tool that embeds a full-featured REST API testing interface directly into any .NET 10 web application — with a single line of code. It ships as a NuGet package (`ApiTestSpark` on nuget.org) that bundles a pre-built React single-page application. When developers call `app.MapApiTestSpark()` in their startup code, the test harness appears at `/api-test-spark/` and automatically discovers their API's endpoints through the OpenAPI standard, enabling interactive testing, response inspection, and documentation generation without any additional configuration.

The project is 13 days old and has already reached a production-ready `v1.0.2` milestone. In that time, 100 commits were authored by a single Lead Architect, averaging roughly 7–8 commits per day — a velocity that reflects focused, intensive solo development rather than gradual accumulation. The commit history tells a clear story of a greenfield project accelerated from initial scaffolding on 2026-05-18 to a published NuGet package, live demo site, and mature governance framework by 2026-05-30.

Three versioned releases have been tagged: `v1.0.0` (strict semver adoption), `v1.0.1` (documentation and dependency polish), and `v1.0.2` (CSP and redirect bug fixes). Each release is accompanied by archived spec documentation, release metrics, and a CHANGELOG entry — signals of deliberate delivery practice for a project still under two weeks old. The live demo at `https://apitest.makeboldspark.com` gives prospective consumers a running reference implementation backed by the `SampleApi` project in this repository.

Governance is unusually mature for a project at this age. A formal project constitution (`v1.1.1`) defines eight mandatory engineering principles — from TypeScript strict compilation to PII/PHI data protection. The constitution has been amended three times in its 13-day life, each time driven by empirical evidence from code audits and codebase analysis rather than top-down prescription. Convention commit adoption sits at 91% (91 of 100 commits), and the most recent audit (2026-05-31) scores constitution compliance at 100% — up from 88% when auditing began three days earlier.

The project represents a genuine dual-artifact architecture: a TypeScript/React frontend, a .NET 10 middleware library, and a .NET demo API that serves both as a functional showcase and as the live NuGet package documentation site. All three artifacts are co-developed in a single repository with shared governance, consistent naming conventions, and cross-artifact integration tests.

---

## Technical Analysis

### Development Velocity

The entire 100-commit history falls within a single calendar month — May 2026 — with the first commit on 2026-05-18 and the most recent on 2026-05-31. This is not a repository that has been growing slowly; it was built in a 13-day sprint.

**Commit type breakdown** (from conventional commit prefixes):

| Type | Count | Share |
|------|-------|-------|
| `feat` | 22 | 22% |
| `fix` | 22 | 22% |
| `docs` | 19 | 19% |
| `refactor` | 11 | 11% |
| `chore` | 10 | 10% |
| `ci/build` | 6 | 6% |
| `tests` | 4 | 4% |
| other | 6 | 6% |

The near-equal split between `feat` (new capability) and `fix` (correction) is characteristic of rapid-iteration development: features are delivered fast and corrected quickly. The high documentation share (19%) is unusual and reflects the project's explicit goal of consumer-grade quality — README, NuGet package page, deployment guide, walkthrough, and OpenAPI ecosystem guide were all written as first-class deliverables.

The single largest commit is `45423ee` ("feat: add WebSpark.ApiTestHarness NuGet package") with 164 files changed, 6,131 additions, and 1,647 deletions — the foundational moment when the React SPA was embedded into the .NET package for the first time.

**Churn interpretation**: The file type distribution shows `.md` files touched 376 times vs `.ts`/`.tsx` touched 192 times combined. This is a high-documentation project where prose and code evolve together. The source churn is healthy — not concentrated in a single hotspot file but distributed across API clients, hooks, components, and infrastructure.

### Contributor Dynamics

The repository has a single contributor: **Lead Architect** (99 of 100 commits attributed; 1 commit likely automated). This is a solo-founder project — bus factor is 1, which is both expected for a greenfield tool and worth noting for future onboarding.

The upside: the architecture is highly coherent. Every decision — from the dual API client pattern to the Zustand store registry to the PII/PHI protection rules — was made by a single mind with a clear vision. The constitution documents these decisions explicitly, reducing the risk that a new contributor would inadvertently violate implicit conventions.

No team growth is visible in the current window. If the project gains traction as a NuGet package, onboarding documentation (README, DEPLOYMENT.md, CLAUDE.md, the constitution) is already in place.

### Quality Signals

**TypeScript strict compilation**: All strict mode flags are enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`). Zero `@ts-ignore` or `@ts-expect-error` suppressions found.

**ESLint**: Zero violations. `react-hooks/exhaustive-deps` and `react-refresh/only-export-components` both configured as `error` — hook dependency bugs and improper component exports are compile-time failures.

**Test metrics**: The pre-scan reports 184 test-related files, though this includes `.devspark` framework documentation. The meaningful test artifact is `ApiTestSpark.Tests/HarnessIntegrationTests.cs` — 20 MSTest integration tests covering the full public contract of the .NET middleware (static files, SPA fallback, config endpoint, redirect, CSP headers, environment gating, CORS, options defaults). All 20 pass.

**Conventional commit adoption**: 91% (91/100 commits). The 9 non-conventional commits are early scaffolding entries before the practice was fully established, plus a small number of automated entries.

**Code complexity**: 0 deep-nesting violations, 0 high-complexity functions identified by the pre-scan. Average lines per source file: 99.3. Three files exceed 500 lines (`SampleApi/Home/HomeEndpoints.cs` at 761, `EndpointTester.tsx` at 574, `ApiDocScreen.tsx` at 547) — all are intentionally dense feature files, not complexity hotspots.

### Governance & Process Maturity

**Constitution**: `v1.1.1` — 8 principles, 3 amendments applied in 13 days. Governance artifact count: 6 (constitution, history, 2 approved CAPs, 2 amendment proposals). This is the most mature governance artifact visible in the repository.

**Constitution amendment discipline**: All three amendments (CAP-2026-001, CAP-2026-002, and the 1.1.1 full-repo review) were evidence-based — driven by code audit findings and codebase analysis, not editorial preference. Each CAP documents evidence, affected files, impact assessment, and adoption plan before being applied.

**Merge commit percentage**: 0% — the project operates on a direct-to-main model with no PR-based merge commits visible in the history window. This is appropriate for a solo-developer project where the overhead of pull requests adds friction without the collaboration benefit.

**Tag discipline**: 3 tags in 13 days (`v1.0.0`, `v1.0.1`, `v1.0.2`) — roughly one release every 4 days. Each tag is accompanied by a release archive under `.documentation/releases/` with a `metrics.json` file. This cadence is aggressive but sustainable for a solo developer in active delivery mode.

**No open specs on main**: Zero active specs in `.documentation/specs/` — all released work has been archived. Spec lifecycle is clean.

### Architecture & Technology

**React SPA** (`src/`): TypeScript 6, React 19, Vite 8, Zustand 5, TanStack Query 5, Tailwind CSS 4, React Router DOM 7. Application Insights integration (opt-in via connection string). The SPA follows a strict layered architecture: types → api → hooks → components, with Zustand stores as a lateral layer.

**NuGet library** (`ApiTestSpark/`): .NET 10, ASP.NET Core Minimal API. The React build artifacts are embedded as assembly resources at pack time. A single `MapApiTestSpark()` extension method handles static file serving, SPA fallback routing, config endpoint, security headers, environment gating, and CORS.

**Demo / promo site** (`SampleApi/`): .NET 10 Minimal API with 3 resource groups (Products, Customers, Orders), in-memory caches, fully annotated OpenAPI metadata, and a promotional home page. Serves as both the live demo and the NuGet package marketing site.

**CI**: GitHub Actions — `ci.yml` (build + test on push to main) and `publish-nuget.yml` (pack and publish on version tag). The CI pipeline builds the React SPA first, then `dotnet build`, then `dotnet test`.

**Language distribution** (by file touches): Markdown (376), TypeScript/TSX (192), PowerShell (57), C# (55), JSON (43), YAML/YML (13). The high Markdown count reflects the project's documentation-first philosophy.

---

## Change Patterns

### Top 5 Most-Modified Files

| File | Changes | Interpretation |
|------|---------|----------------|
| `ApiTestSpark/ApiTestSpark.csproj` | 14 | .NET project file — NuGet metadata, embedded resources, and package configuration iterated extensively during packaging and version stabilization |
| `package.json` | 12 | React project manifest — version bumps, script additions, and dependency updates throughout the sprint |
| `src/public/build-info.json` | 11 | Auto-generated build info artifact — every build run updates this file; expected high churn |
| `SampleApi/Program.cs` | 10 | Demo site entry point — endpoint registration, OpenAPI config, and `MapApiTestSpark` options iterated as the demo evolved |
| `src/api/jsonPlaceholderClient.ts` + `jokeApiClient.ts` | 7 + 6 | Demo API clients — refactored during pattern stabilization (from class-based to `createRestCaller` factory) |

### Directory-Level Patterns

- **`src/` (192 TypeScript/TSX touches)**: Active development area — API clients, hooks, components, and stores all saw frequent iteration as features were delivered and refined.
- **`ApiTestSpark/` (55 C# touches)**: Concentrated in `ApiTestSparkExtensions.cs` (middleware) and the `.csproj` — the NuGet library surface stabilized after initial packaging.
- **`.documentation/` (high Markdown touches)**: Specs, constitution, release archives, and audit reports accumulated throughout the sprint. This is the governance layer of the project.
- **`scripts/` (57 PowerShell touches)**: Build automation iterated heavily, especially `pack.ps1` which grew from a simple dotnet pack into a 7-step quality pipeline.

### Refactoring Signals

The `WebSpark.ApiTestHarness.*` entries in the hotspots (5 changes each) reference the earlier package name before it was renamed to `ApiTestSpark`. These are historical — the rename happened early and those paths no longer exist in the working tree. The churn reflects a deliberate rebranding rather than instability.

---

## Milestone Timeline

| Date | Tag | Context |
|------|-----|---------|
| 2026-05-30 | `v1.0.0` | Strict semver adoption. First versioned release after package name stabilized. Commit: `715fd60` — "chore: adopt strict semver" |
| 2026-05-30 | `v1.0.1` | Documentation polish and SourceLink version fix. Commit: `bbad458` — "docs: release v1.0.1". Same-day as v1.0.0 — rapid iteration post-publish. |
| 2026-05-30 | `v1.0.2` | CSP localhost fix and trailing-slash redirect. Commits: `8eb95fc`, `03d7c58`. Fixed blank harness in development and redirect behaviour. |

**Velocity around releases**: All three tags fall on 2026-05-30. The velocity pattern shows concentrated CI fixes and documentation polish immediately after the initial NuGet publish — consistent with "ship fast, fix the paper cuts" solo development.

**Post-v1.0.2 activity** (2026-05-31, today): Constitution amendments, full-repo constitution review, `EnableDemoIntegrations` feature, comprehensive documentation overhaul, type-system hardening, and a full compliance audit — all untagged. This suggests a `v1.0.3` or `v1.1.0` release is pending.

---

## Constitution Alignment

Constitution version: **1.1.1** (Last Amended 2026-05-31)

| Principle | Commit History Evidence | Alignment |
|-----------|------------------------|-----------|
| I. TypeScript Strict | 0 `@ts-ignore` in history; `fix(types)` commits tightening `ErrorCategory` union | ✅ Strong |
| II. ESLint Only | No Prettier-related commits; `lint.ps1` and `fix.ps1` scripts committed early | ✅ Strong |
| III. Layer Separation | Barrel export commits throughout; no component→api direct imports found | ✅ Strong |
| IV. API Client Pattern | `createRestCaller` factory introduced alongside class-based `ApiClient`; constitution updated to recognise both | ✅ Strong |
| V. Zustand Store Rules | `harnessConfigStore` added and added to registry in constitution; FIFO limits unchanged | ✅ Strong |
| VI. Observability | Audit findings OBS1–OBS4 resolved across 3 days; `fix(observability)` commits visible | ✅ Strong (100% after today's fixes) |
| VII. Testing Stance | `ApiTestSpark.Tests` project with 20 passing tests; React SPA no-test-runner preserved | ✅ Strong |
| VIII. PII/PHI | SampleApi uses synthetic data only; no PII fields in any store or type | ✅ Strong |

**Key governance pattern**: The constitution is not a document written once and forgotten. The commit history shows it being amended 3 times in 13 days, each time driven by audit findings (`CAP-2026-001`, `CAP-2026-002`) or full-repo review (`v1.1.1`). The code and the constitution evolve together — this is the intended use of the DevSpark framework.

---

## Developer FAQ

### What does this project do?

ApiTestSpark is a NuGet package that embeds an interactive REST API test harness into any .NET 10 Minimal API application. One call to `app.MapApiTestSpark()` in `Program.cs` mounts a React SPA at `/api-test-spark/` that autodiscovers your OpenAPI v3 endpoints, scaffolds request bodies from examples and schema defaults, executes live HTTP requests, and renders responses as sortable tables or editable forms. It also includes an API Doc Builder that captures live curl snippets and responses, then exports them as markdown — ready for documentation or front-end agent prompts.

### What tech stack does it use?

The React SPA uses TypeScript 6, React 19, Vite 8, Zustand 5 (state management), TanStack Query 5 (mutations), Tailwind CSS 4, and React Router DOM 7. The .NET library uses .NET 10 and ASP.NET Core Minimal API. The demo site (`SampleApi/`) is also .NET 10 Minimal API. Build automation is PowerShell. CI runs on GitHub Actions. Application Insights telemetry is opt-in (connection string defaults to empty).

### Where do I start?

The entry points are `src/App.tsx` (React router root), `ApiTestSpark/ApiTestSparkExtensions.cs` (the .NET middleware that serves the SPA), and `SampleApi/Program.cs` (shows the integration in a real app). The hottest files in the commit history are `ApiTestSpark/ApiTestSpark.csproj` (14 changes) and `package.json` (12 changes) — both are manifest files that reflect the project's dual-artifact nature. Start with `README.md` for the consumer perspective and `CLAUDE.md` for the developer workflow.

### How do I run it locally?

For the React SPA dev server: `.\scripts\build\dev.ps1` (starts Vite on port 5151). For a production React build: `.\scripts\build\build.ps1`. To run the SampleApi demo: `dotnet run --project SampleApi` — then navigate to `https://localhost:{port}/api-test-spark/`. To pack the NuGet package: `.\scripts\build\pack.ps1` (7-step pipeline: audit → lint → React build with `VITE_BASE_PATH=/api-test-spark/` → version read → dotnet build → dotnet pack → size check).

### How do I run the tests?

The React SPA has no test runner — this is deliberate per the project constitution (§VII). The test script in `package.json` echoes a message confirming this. The .NET library has 20 MSTest integration tests: `dotnet test ApiTestSpark.Tests`. All 20 pass. You can also run `.\scripts\test\test.ps1` which runs both (React no-op + dotnet test). The CI pipeline runs `dotnet test ApiTestSpark.Tests` on every push to main.

### What is the branching/PR workflow?

The project operates on a direct-to-main model — 0% merge commit rate in the full 100-commit history. The Lead Architect commits directly to `main`. CI validates every push via GitHub Actions (`ci.yml`). NuGet publishing is triggered by version tags via `publish-nuget.yml`. There is no PR review workflow currently, which is appropriate for a solo-developer project.

### Who do I ask when I'm stuck?

There is one contributor: the Lead Architect (99 of 100 commits). For questions about the NuGet package consumer experience, the primary resource is `README.md` and `NUGET-PACKAGE-WALKTHROUGH.md`. For development workflow questions, `CLAUDE.md` is the definitive reference. For architectural decisions, the project constitution at `.documentation/memory/constitution.md` (v1.1.1) documents every non-negotiable principle with rationale.

### What areas of the code change most often?

The top three hotspots are `ApiTestSpark/ApiTestSpark.csproj` (14 changes — NuGet metadata and embedded resource configuration), `package.json` (12 changes — version and script evolution), and `SampleApi/Program.cs` (10 changes — demo site endpoint registration). In the React SPA, `src/App.tsx`, `src/components/HomeScreen.tsx`, and `src/components/host-api/HostApiScreen.tsx` each saw 6 changes — these are the integration points where routing, navigation, and OpenAPI display evolve together. The `.documentation/memory/constitution.md` itself appears in the hotspots with 4 changes, reflecting active governance.

### Are there coding standards I must follow?

Yes — strictly enforced by tooling and documented in the constitution (`v1.1.1`). The non-negotiable gates: (1) `npm run verify` must pass — TypeScript strict mode, zero errors; (2) `npm run lint` must pass — ESLint zero errors, no Prettier; (3) `dotnet build ApiTestSpark` must pass — zero C# errors; (4) `dotnet test ApiTestSpark.Tests` must pass — 20/20 integration tests. Conventional commit format is the project norm (91% adoption). No `console.log` anywhere in `src/` — all observability routes through `useDebugStore`. No `@ts-ignore` without a comment. See `CLAUDE.md` for the complete developer reference.

### What version is currently released?

The latest NuGet release is `v1.0.2`, tagged on 2026-05-30. It is live at [nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark). The release fixed a blank harness in Development environments (CSP localhost connections) and a missing trailing-slash redirect at `/api-test-spark`. Post-release work on 2026-05-31 (constitution amendments, `EnableDemoIntegrations` feature, type hardening, compliance audit) is untagged on `main` and represents candidate content for `v1.0.3` or `v1.1.0`.

---

*Generated by /devspark.repo-story | DevSpark v2.4.0*
*Constitution-driven repository narrative for ApiTestSpark*
*Next story recommended: 2026-06-07*
