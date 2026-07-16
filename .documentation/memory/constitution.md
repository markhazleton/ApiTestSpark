<!--
SYNC IMPACT REPORT
==================
Version change  : (new) → 1.0.0
Method          : Promoted from constitution-draft.md via /devspark.constitution
Date            : 2026-05-18
Source          : /devspark.discover-constitution (8 questions, 45 files analyzed)

Version change  : 1.0.0 → 1.1.0
Method          : /devspark.evolve-constitution + /devspark.constitution
Date            : 2026-05-31
Source          : audit 2026-05-28 (CAP-2026-001) + codebase analysis (CAP-2026-002)

Version change  : 1.1.0 → 1.1.1
Method          : /devspark.constitution (full-repo review)
Date            : 2026-05-31

Version change  : 1.1.1 → 1.1.2
Method          : /devspark.address-pr-review (PR #2 CON-01)
Date            : 2026-06-06
Source          : full-repo review covering React SPA + .NET NuGet library + SampleApi demo site
Changes         :
  §IV  — Added createRestCaller as a constitutionally recognised client pattern alongside
         class-based ApiClient extension. Both satisfy the same invariants.
  §V   — Added useHarnessConfigStore to canonical store registry (non-persisted, session-only).
  §VI  — Expanded ErrorCategory union to include 'React' (for ErrorBoundary-layer errors).
         Clarified the App Insights integration relationship with the debug store.
         Fixed code: ErrorRecord.category now typed as ErrorCategory (was string).

Added sections  :
  I.   TypeScript Strict Compilation (MANDATORY)
  II.  Code Quality — ESLint Only, No Prettier (MANDATORY)
  III. Feature Structure — Layer Separation & Barrel Exports (MANDATORY)
  IV.  API Client Pattern (MANDATORY)
  V.   State Management — Zustand Store Rules (MANDATORY)
  VI.  Observability & Logging (MANDATORY)
  VII. Testing Stance (ASPIRATIONAL)
  VIII.PII/PHI Data Protection (MANDATORY — CRITICAL)

Removed sections: none (first constitution)

Templates updated:
  ✅ .documentation/templates/plan-template.md — Constitution Check gates populated
  ✅ .documentation/memory/constitution.md     — this file (new)
  ⚠  .documentation/templates/spec-template.md — no changes required; user stories
     and acceptance scenarios are constitution-agnostic
  ⚠  .documentation/templates/tasks-template.md — no changes required; task
     structure is feature-driven; constitution gates enforced at plan level

Deferred items  : none

Version change  : 1.1.2 → 1.1.3
Method          : /devspark.address-pr-review (PR #7 CON-01)
Date            : 2026-07-16
Source          : pr-review of PR #7 (001-oauth-token-config) — registry-table drift found
                  during Rev 2/Rev 3 review of the OAuth Token Configuration feature
Changes         :
  §V   — Corrected the `useAuthStore` row in the canonical store registry: "Persists" was
         documented as "Config only", but the shipped implementation (per FR-015 of the OAuth
         Token Configuration feature) persists both config and acquired access tokens per
         Environment. The code was correct and intentional; this amendment brings the
         constitution's documentation in line with it.
-->

# API Test Spark Constitution

**Version**: 1.1.3 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-07-16

> This constitution defines the non-negotiable engineering principles for the API Test Spark project.
> All pull requests, AI-assisted code generation, and architectural decisions MUST comply with these principles.
> Amendments require team discussion and a version bump per the governance policy below.

---

## I. TypeScript Strict Compilation (MANDATORY)

All TypeScript source code MUST compile with full strict mode and zero errors before any code is merged.

- TypeScript `strict: true` MUST be enabled in `tsconfig.app.json` (MUST)
- Additional flags `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`,
  `noFallthroughCasesInSwitch`, and `noUncheckedSideEffectImports` MUST remain enabled (MUST)
- `npm run verify` (`tsc -b && vite build`) MUST pass before merge (MUST)
- TypeScript errors MUST NOT be suppressed with `@ts-ignore` or `@ts-expect-error`
  without a comment explaining the specific reason (MUST)

**Rationale**: TypeScript strict mode is the primary safety net for a project with no test runner.
Every type error caught at compile time is a runtime bug prevented.

---

## II. Code Quality — ESLint Only, No Prettier (MANDATORY)

ESLint is the sole code quality and style enforcement tool. Prettier is explicitly excluded.

- ESLint MUST pass with zero errors before merge (MUST)
- `react-hooks/exhaustive-deps` is configured as `error` — hook dependency violations are blocking (MUST)
- `react-refresh/only-export-components` is configured as `error` — components MUST export cleanly (MUST)
- Prettier MUST NOT be added to this project (MUST)
- `npm run lint` runs automatically as part of every production build (MUST)

**Rationale**: A single enforcer (ESLint) avoids formatter conflicts and keeps the toolchain simple.
The decision to exclude Prettier is deliberate — do not reverse it without a constitution amendment.

---

## III. Feature Structure — Layer Separation & Barrel Exports (MANDATORY)

Every feature follows a strict layered structure with barrel exports at every directory boundary.

**Layer order** (data flows downward; components consume upward):

```
src/types/       ← domain types only — no logic, no imports from other layers
src/api/         ← HTTP clients extending ApiClient — no React
src/hooks/       ← TanStack Query mutations + orchestration — no raw fetch
src/components/  ← React components + feature subdirectories
src/store/       ← Zustand stores — one concern per store
src/utils/       ← pure utility functions — no React, no stores
```

- Every directory under `src/` MUST have an `index.ts` barrel re-exporting its public surface (MUST)
- Feature subdirectories (e.g., `src/components/my-api/`) MUST include their own `index.ts` barrel (MUST)
- Components MUST NOT call API clients directly — all API calls go through the hook layer (MUST)
- The hook layer owns API orchestration; the component layer consumes hooks only (MUST)
- Cross-layer imports MUST follow the order above — lower layers MUST NOT import from higher layers (MUST)

**New API integration checklist** — all steps required for every new API:

1. `src/types/my-api.ts` + re-export from `src/types/index.ts`
2. `src/api/myApiClient.ts` extending `ApiClient` + re-export from `src/api/index.ts`
3. `src/hooks/useMyApi.ts` with `useMutation` + re-export from `src/hooks/index.ts`
4. `src/components/my-api/MyApiScreen.tsx` + `index.ts` barrel + re-export from `src/components/index.ts`
5. Route added in `src/App.tsx`
6. Navigation card added to `SECTIONS` in `src/components/HomeScreen.tsx`

**Rationale**: Layer separation makes the codebase predictable and navigable. Barrel exports
define clear public contracts between layers and prevent deep import path coupling.

---

## IV. API Client Pattern (MANDATORY)

All API integrations MUST use one of the two constitutionally recognised client patterns.
Both satisfy the same invariants: per-call scope, UUID correlation, debug callbacks, and timing.

**Pattern A — class-based (extend `ApiClient`)**: Use when the client needs constructor-level
config, custom header logic, or cancellation support. `JokeApiClient` and `HostApiClient` are
the canonical reference implementations.

**Pattern B — functional factory (`createRestCaller`)**: Use when no extra constructor logic
is needed — the factory returns a typed caller with `get/post/put/patch/delete` methods.
All requests flow through `executeRequest`, which provides identical UUID, timing, and callback
behaviour to Pattern A.

Both patterns share these invariants:

- API clients MUST be instantiated per-mutation-call, not as singletons (MUST)
- Debug callbacks (`onRequest`, `onResponse`, `onError`) MUST be injected at call-site
  from the debug store (MUST)
- Every request MUST receive a `uuid v4` for correlation across request → response → error → metrics (MUST)
- All API calls MUST use TanStack Query `useMutation` — no raw `fetch` calls in hooks or components (MUST)
- Performance timing (`performance.now()`) MUST be captured per mutation and submitted
  via `addMetric` to the debug store (MUST)
- Raw `fetch` calls outside of `executeRequest` MUST NOT be added — they bypass UUID, timing,
  and debug capture (MUST)

**Rationale**: Per-call instantiation with injected callbacks ensures every API interaction is
automatically captured in the debug panel without manual instrumentation. UUID correlation makes
request/response/error tracing deterministic. Recognising both patterns removes ambiguity between
`JokeApiClient` (class) and the functional clients that use `createRestCaller`. *(Amended: 1.1.1)*

---

## V. State Management — Zustand Store Rules (MANDATORY)

Zustand stores are focused, action-gated, and buffer-bounded.

- Each store MUST own exactly one concern — no stores that span multiple domains (MUST)
- State MUST only be mutated through store actions — direct state assignment is forbidden (MUST)
- Stores that persist MUST use Zustand `persist` middleware with an explicit, unique `name` key (MUST)
- The debug store MUST enforce FIFO buffer limits: 50 requests, 50 responses, 50 errors, 100 metrics (MUST)
- New stores MUST be added to the `src/store/index.ts` barrel (MUST)

**Canonical store registry**:

| Store | Concern | Storage Key | Persists |
|-------|---------|-------------|---------|
| `useUnifiedConfigStore` | API endpoint config per environment | `api-test-spark-config` | Full config |
| `useAuthStore` | OAuth token configuration + acquired access tokens, per Environment | `api-test-spark-auth-config` | Config + access tokens |
| `useDebugStore` | Request/response/error/metrics capture | `api-test-spark-debug` | Enabled flag only |
| `useHarnessConfigStore` | Runtime harness config + discovered OpenAPI endpoints | *(none — session only)* | No |
| `useRemoteConfigStore` | Remote API connection config (URL, credentials, default headers) | `api-test-spark-remote-config` | Full config |

`useAuthStore` persists both the OAuth config (token endpoint, client credentials, test-user
credentials) and the acquired access tokens, keyed per Environment. Tokens are cached across
browser reloads so testers do not need to re-authenticate on every page load (FR-015). The store
performs no network I/O itself — token acquisition is orchestrated by `useOAuthToken`
(Constitution III/IV). *(Corrected: 1.1.3 — was previously documented as "Config only")*

`useHarnessConfigStore` is **not persisted** — its config is always re-fetched from
`/api-test-spark/config` on app load. It holds the `HarnessConfig` from the .NET layer,
parsed `ApiInfo`, and the `DiscoveredEndpoint[]` list. It MUST NOT be wrapped in `persist`
middleware. *(Added: 1.1.1)*

**Rationale**: Focused stores prevent cross-concern mutation bugs. Action-gating makes state
changes traceable. FIFO limits prevent unbounded memory growth in long debug sessions.

---

## VI. Observability & Logging (MANDATORY)

All observability flows through the debug store and Application Insights. `console.log` is banned.

- `console.log` MUST NOT appear anywhere in `src/` (MUST)
- `console.error` MAY only appear inside `catch` blocks for **unrecoverable** errors (MUST)
- All diagnostic output from `src/` — API calls, storage failures, configuration warnings,
  version mismatches, and component-level errors — MUST be routed through `useDebugStore.addError()`
  using the appropriate error category (MUST)
- Application Insights MUST remain opt-in — the connection string defaults to empty,
  disabling telemetry for local development (MUST)
- Error categories MUST use the typed union: `'Network' | 'API' | 'Configuration' | 'React' | 'Unknown'` (MUST)
  - `'Network'` — fetch failed before a response was received
  - `'API'` — server returned a non-2xx status
  - `'Configuration'` — harness config or OpenAPI document could not be loaded
  - `'React'` — unhandled render error caught by `ErrorBoundary`
  - `'Unknown'` — all other uncategorised errors

**App Insights integration**: `useDebugStore.addError()` automatically forwards every error to
`trackCategorizedError()` in `src/utils/appInsights.ts`. Callers MUST NOT call
`trackCategorizedError` directly — route through `addError` so the debug panel and App Insights
stay in sync. App Insights is a no-op when `CONNECTION_STRING` is empty (local development). *(Added: 1.1.1)*

**Defining "unrecoverable"**: An error is unrecoverable only when the current operation cannot
complete and there is no meaningful fallback — e.g., a fatal render error in `ErrorBoundary` or
a network error where no retry is possible. Secondary operation failures (audit log write,
telemetry flush, optional metadata load) are **recoverable** — `console.error` MUST NOT be used
for them. For truly non-critical failures where no user action is needed, silently returning
`null` or a safe default is preferred over debug-store noise.

**Rationale**: Routing all observability through a single store ensures the debug panel always
reflects the full picture of what the tool is doing. The opt-in App Insights pattern protects
developers from inadvertently leaking debug data to production telemetry. Clarifying
"unrecoverable" and expanding the routing scope to all of `src/` closes the gap that produced
audit findings OBS1–OBS3 and QUAL1 (2026-05-28). *(Amended: CAP-2026-001, 2026-05-31)*

---

## VII. Testing Stance (MIXED — see per-artifact rules below)

The React SPA and the .NET library have different, deliberate testing stances. Both are non-negotiable.

### React SPA (`src/`) — No test framework by design

- No JavaScript/TypeScript test runner is in the CI pipeline — MUST NOT be added without amendment (MUST)
- The `package.json` test script intentionally echoes a no-test message — MUST NOT be silently changed (MUST)
- Unit tests SHOULD be added for critical React utility functions (e.g., `src/utils/storage.ts`,
  `src/utils/openApiParser.ts`) as the project matures (SHOULD)
- If a JavaScript/TypeScript test framework is introduced, it MUST be added via a constitution amendment (MUST)

**Rationale (React SPA)**: API Test Spark is a lightweight developer tool where rapid iteration and
build-time safety (TypeScript strict + ESLint) provide sufficient quality assurance. Introducing a
JS/TS test framework is a significant complexity trade-off requiring explicit team agreement.

### .NET Library (`ApiTestSpark/`) — MSTest integration tests required

- The .NET library MUST maintain a passing integration test suite in `ApiTestSpark.Tests/` (MUST)
- `dotnet test ApiTestSpark.Tests` MUST pass as a CI quality gate (MUST)
- New public behaviour added to `ApiTestSparkExtensions` or `ApiTestSparkOptions` SHOULD have
  corresponding integration test coverage (SHOULD)
- MSTest is the mandated framework for the .NET layer — no other .NET test framework may be added
  without amendment (MUST)

**Rationale (.NET library)**: The NuGet package ships compiled code to consumers who cannot inspect
it at runtime. Integration tests using `UseTestServer` provide the only automated safety net for
middleware behaviour, config serialisation, HTTP routing, and security headers.

### Combined CI quality gates (all four MUST pass before merge)

1. `npm run lint` — zero ESLint errors *(React SPA)*
2. `npm run verify` — `tsc -b` + `vite build` with zero errors *(React SPA)*
3. `dotnet build ApiTestSpark` — zero C# errors *(.NET library)*
4. `dotnet test ApiTestSpark.Tests` — all integration tests pass *(.NET library)*

*(Amended: CAP-2026-002, 2026-05-31 — corrects factual inaccuracy; .NET test suite existed but was not constitutionally recognised)*

---

## VIII. PII/PHI Data Protection (MANDATORY — CRITICAL)

This tool captures raw API request/response bodies. Real PII or PHI MUST NEVER be entered.

- Real PII/PHI MUST NOT be used when testing APIs with this tool (MUST — CRITICAL)
- All API testing MUST use synthetic/anonymized data only (MUST — CRITICAL)
- No PII/PHI fields MAY be added to any store, type, component, or log output (MUST)
- AI coding assistants working on this project are governed by the absolute PII/PHI protection
  rules in `.github/copilot-instructions.md` — those rules are incorporated by reference (MUST)

**Synthetic data reference**:

| Data Type | Acceptable Synthetic Value |
|-----------|---------------------------|
| Name | `Jane Doe`, `Test User`, `SAMPLE_PATIENT` |
| Email | `user@example.com`, `test@test.invalid` |
| Phone | `(555) 000-0000` |
| ID / MRN | `MRN-000000`, `ID-000000` |
| DOB | `2000-01-01` |
| Address | `123 Test Street, Anytown, ST 00000` |

**Rationale**: The debug store captures raw request and response bodies. Any real patient or
personal data entered would be visible in the debug panel and potentially forwarded to App
Insights. This risk is not acceptable for a tool that may be used in clinical contexts.

---

## Governance

**Amendment procedure**:

- Amendments are proposed via PR with a description of the change and rationale
- Amendments to MUST principles require explicit team discussion before merge
- The `devspark.evolve-constitution` command SHOULD be run after major PR review findings
  to surface potential amendments

**Versioning policy**:

- **MAJOR** (X.0.0): Backward-incompatible principle removal or redefinition
- **MINOR** (X.Y.0): New principle or section added; material expansion of existing guidance
- **PATCH** (X.Y.Z): Clarifications, wording improvements, typo fixes

**Compliance review**: The `devspark.site-audit` command can validate current codebase compliance
at any time. SHOULD be run before major releases.

**Ratification history**:

| Version | Date | Summary |
|---------|------|---------|
| 1.0.0 | 2026-05-18 | Initial constitution — 8 principles discovered from 45-file codebase analysis |
| 1.1.0 | 2026-05-31 | CAP-2026-001: Clarified Principle VI — defined "unrecoverable", expanded routing scope to all of `src/`. CAP-2026-002: Updated Principle VII — split into per-artifact stances; formally recognised .NET MSTest suite as a MUST quality gate |
| 1.1.1 | 2026-05-31 | Full-repo review: §IV recognised `createRestCaller` as second valid client pattern; §V added `useHarnessConfigStore` to store registry; §VI expanded `ErrorCategory` union to include `'React'`, added App Insights integration guidance. Code fix: `ErrorRecord.category` typed as `ErrorCategory` (was `string`). |
| 1.1.2 | 2026-06-06 | §V — Added `useRemoteConfigStore` to canonical store registry (PR #2 CON-01, addressed via `/devspark.address-pr-review`). |
| 1.1.3 | 2026-07-16 | §V — Corrected `useAuthStore`'s "Persists" column from "Config only" to "Config + access tokens", matching the shipped OAuth Token Configuration feature (FR-015) (PR #7 CON-01, addressed via `/devspark.address-pr-review`). |
