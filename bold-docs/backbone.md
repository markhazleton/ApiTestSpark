# API Test Spark — Backbone

**Migrated from**: `.documentation/memory/constitution.md` v1.1.3 (ratified 2026-05-18, last amended 2026-07-16)
**Source**: `migrated(constitution.md)`

> All pull requests, AI-assisted code generation, and architectural decisions MUST comply with these principles. Amendments require team discussion and a version bump per the ratification history in `bold-docs/system/decisions/` (see ADR index) — full historical rationale for each principle lives in `.archive/`.

---

### 1. TypeScript Strict Compilation

**Status**: enforced

`tsconfig.app.json` MUST keep `strict: true` plus `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. `npm run verify` (`tsc -b && vite build`) MUST pass before merge. No `@ts-ignore`/`@ts-expect-error` without an explanatory comment.

### 2. Code Quality — ESLint Only, No Prettier

**Status**: enforced

ESLint is the sole style/quality enforcer; Prettier MUST NOT be added. `react-hooks/exhaustive-deps` and `react-refresh/only-export-components` are `error`. `npm run lint` MUST pass with zero errors and runs as part of every production build.

### 3. Feature Structure — Layer Separation & Barrel Exports

**Status**: enforced

Layer order (data flows downward): `src/types/` → `src/api/` → `src/hooks/` → `src/components/` / `src/store/` → `src/utils/`. Every directory under `src/` MUST have an `index.ts` barrel. Components MUST NOT call API clients directly — only the hook layer orchestrates API calls. Lower layers MUST NOT import from higher layers.

New-API checklist: `src/types/*.ts` → `src/api/*Client.ts` (extends `ApiClient`) → `src/hooks/use*.ts` (`useMutation`) → `src/components/*/**Screen.tsx` + barrel → route in `src/App.tsx` → nav card in `SECTIONS` (`src/components/HomeScreen.tsx`).

### 4. API Client Pattern

**Status**: enforced

Two recognised client patterns, both satisfying the same invariants: class-based (extend `ApiClient`) or functional factory (`createRestCaller`). Both: instantiated per-mutation-call (never singleton); debug callbacks (`onRequest`/`onResponse`/`onError`) injected at call-site; every request gets a `uuid v4` for correlation; all calls go through TanStack Query `useMutation` — no raw `fetch`; timing captured via `performance.now()` and submitted to the debug store via `addMetric`.

### 5. State Management — Zustand Store Rules

**Status**: enforced

Each store owns exactly one concern; state mutates only through actions; persisted stores use `persist` middleware with a unique `name` key; the debug store enforces FIFO limits (50 requests/responses/errors, 100 metrics); every new store is added to the `src/store/index.ts` barrel.

Canonical store registry: `useUnifiedConfigStore` (endpoint config, persists), `useAuthStore` (OAuth config + acquired access tokens per Environment, persists both), `useDebugStore` (request/response/error/metrics, persists enabled-flag only), `useHarnessConfigStore` (runtime harness config + discovered OpenAPI endpoints, **not persisted** — always re-fetched from `/api-test-spark/config`), `useRemoteConfigStore` (remote API connection config, persists).

### 6. Observability & Logging

**Status**: enforced

`console.log` MUST NOT appear anywhere in `src/`. `console.error` only inside `catch` blocks for genuinely unrecoverable errors (current operation cannot complete, no fallback exists) — secondary/recoverable failures (audit log write, telemetry flush, optional metadata load) MUST NOT use `console.error`; prefer a silent safe default. All diagnostics route through `useDebugStore.addError()` with a typed `ErrorCategory`: `'Network' | 'API' | 'Configuration' | 'React' | 'Unknown'`. `addError()` auto-forwards to `trackCategorizedError()` in `src/utils/appInsights.ts` — callers MUST NOT call it directly. App Insights is opt-in (no-op when `CONNECTION_STRING` is empty).

### 7. Testing Stance

**Status**: enforced (mixed, per-artifact — see below)

- **React SPA (`src/`)**: no JS/TS test runner in CI by design; `package.json`'s test script intentionally echoes a no-test message; adding a test framework requires an amendment. Unit tests SHOULD be added for critical utilities as the project matures.
- **.NET library (`ApiTestSpark/`)**: MSTest integration tests in `ApiTestSpark.Tests/` are REQUIRED; `dotnet test ApiTestSpark.Tests` is a CI gate; no other .NET test framework without amendment.
- **Combined CI gates (all four MUST pass before merge)**: `npm run lint`, `npm run verify`, `dotnet build ApiTestSpark`, `dotnet test ApiTestSpark.Tests`.

### 8. PII/PHI Data Protection

**Status**: enforced — critical

This tool captures raw API request/response bodies. Real PII/PHI MUST NEVER be entered — synthetic/anonymized data only, in testing and in any store/type/component/log output. AI coding assistants are additionally governed by `.github/copilot-instructions.md`, incorporated by reference.

Synthetic data reference: Name → `Jane Doe`/`Test User`; Email → `user@example.com`; Phone → `(555) 000-0000`; ID/MRN → `MRN-000000`; DOB → `2000-01-01`; Address → `123 Test Street, Anytown, ST 00000`.

---

**Full ratification history, amendment rationale, and sync-impact reports** are preserved verbatim in `.archive/` (migrated `constitution.md`) — see `bold-docs/system/decisions/` for the ADR index covering related architectural choices.
