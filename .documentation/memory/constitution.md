<!--
SYNC IMPACT REPORT
==================
Version change  : (new) → 1.0.0
Method          : Promoted from constitution-draft.md via /devspark.constitution
Date            : 2026-05-18
Source          : /devspark.discover-constitution (8 questions, 45 files analyzed)

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
-->

# API Test Spark Constitution

**Version**: 1.0.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-30

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

All API integrations MUST follow the extend-`ApiClient` + per-call-instantiation + UUID-correlation
pattern. `JokeApiClient` is the canonical reference implementation.

- All API clients MUST extend `ApiClient` from `src/api/client.ts` (MUST)
- API clients MUST be instantiated per-mutation-call, not as singletons (MUST)
- Debug callbacks (`onRequest`, `onResponse`, `onError`) MUST be injected at instantiation
  from the debug store (MUST)
- Every request MUST receive a `uuid v4` for correlation across request → response → error → metrics (MUST)
- All API calls MUST use TanStack Query `useMutation` — no raw `fetch` calls in hooks or components (MUST)
- Performance timing (`performance.now()`) MUST be captured per mutation and submitted
  via `addMetric` to the debug store (MUST)

**Rationale**: Per-call instantiation with injected callbacks ensures every API interaction is
automatically captured in the debug panel without manual instrumentation. UUID correlation makes
request/response/error tracing deterministic.

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
| `useAuthStore` | Auth configuration + audit trail | `api-test-spark-auth-config` | Config only |
| `useDebugStore` | Request/response/error/metrics capture | `api-test-spark-debug` | Enabled flag only |

**Rationale**: Focused stores prevent cross-concern mutation bugs. Action-gating makes state
changes traceable. FIFO limits prevent unbounded memory growth in long debug sessions.

---

## VI. Observability & Logging (MANDATORY)

All observability flows through the debug store and Application Insights. `console.log` is banned.

- `console.log` MUST NOT appear anywhere in `src/` (MUST)
- `console.error` MAY only appear inside `catch` blocks for unrecoverable errors (MUST)
- All API request/response/error/metric data MUST be routed through `useDebugStore` (MUST)
- Application Insights MUST remain opt-in — the connection string defaults to empty,
  disabling telemetry for local development (MUST)
- Error categories MUST use the typed union: `'Network' | 'API' | 'Configuration' | 'Unknown'` (MUST)

**Rationale**: Routing all observability through a single store ensures the debug panel always
reflects the full picture of what the tool is doing. The opt-in App Insights pattern protects
developers from inadvertently leaking debug data to production telemetry.

---

## VII. Testing Stance (ASPIRATIONAL)

This project operates without a test framework by deliberate design.

- Quality gates are lint → typecheck → build only — no test runner is in the CI pipeline (MUST-NOT change without amendment)
- The `package.json` test script intentionally echoes a no-test message — MUST NOT be silently changed (MUST)
- Unit tests SHOULD be added for critical utility functions (e.g., `src/utils/storage.ts`,
  `src/utils/exporters.ts`) as the project matures (SHOULD)
- If a test framework is introduced, it MUST be added via a constitution amendment (MUST)

**Rationale**: The API Test Spark is a lightweight developer tool where rapid iteration and
build-time safety (TypeScript strict + ESLint) provide sufficient quality assurance for the
current scope. Introducing a test framework is a significant complexity trade-off that requires
explicit team agreement.

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
