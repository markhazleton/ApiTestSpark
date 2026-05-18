```yaml
gate: critic
status: warn
blocking: false
severity: warning
summary: "6 risks identified (0 critical, 2 high, 3 medium, 1 low). Two high risks require
  design resolution before implementation: executor type safety gap and file naming
  inconsistency. No constitution violations. Safe to proceed with mitigations noted."
```

# Critic Risk Report: Section Engine Refactor

**Branch**: `001-section-engine-refactor` | **Date**: 2026-05-18
**Artifacts reviewed**: spec.md (FR-001–FR-012), plan.md, tasks.md (T001–T017), checklists/requirements.md

**Technology stack**: TypeScript 5.x strict / React 19 / TanStack Query 5 / Zustand 5 /
Tailwind CSS 4 / Vite 6 / `ApiClient` base class (`src/api/client.ts`)

---

## Risk Summary

| ID | Category | Severity | Summary |
|----|----------|----------|---------|
| R01 | Architectural | HIGH | `executorRegistry` is a `Record<string, ComponentType>` — no TypeScript guarantee that every `executorKey` from JSON config has a registry entry; gap detected only at runtime |
| R02 | Spec consistency | HIGH | FR-010 `jsonplaceholder-sesssion.json` has a triple-s typo; clarification uses `joke-session.json` but spec body uses "section configuration" — naming inconsistency is unresolved in the spec |
| R03 | UI parity | MEDIUM | FR-011/FR-012 parity risk: extracting executor body from existing screen (DD-1) removes the outer `min-h-screen bg-gray-50` wrapper that currently wraps the full screen content; layout change possible |
| R04 | Underspecification | MEDIUM | FR-009/FR-010 scope ambiguity — "source implementation files" could include API clients (`jokeApiClient.ts`) and hooks (`useJokeApi.ts`); plan DD-7 asserts retention but spec text is ambiguous |
| R05 | Configuration | MEDIUM | `schemaVersion` is `string` in `SectionDefinition` — TypeScript cannot enforce valid values at import time; only runtime validation possible for JSON modules |
| R06 | Operational | LOW | `useDebugStore().addError` with `category: 'Configuration'` satisfies FR-008a, but the `DebugErrorEntry` type may not have a `category` field — needs verification against existing type definition |

---

## Detailed Findings

### R01 — Executor Registry Type Safety Gap (HIGH)

**Risk**: `executorRegistry: Record<string, React.ComponentType>` uses a `string` key. If a
section JSON config has `executorKey: "joke-api-v2"` and no registry entry exists for that key,
the engine receives `undefined` at runtime and must handle it as a config-resolution failure.
There is no compile-time check that JSON config `executorKey` values match registry entries.

**Failure mode**: A new section JSON config is added with a misspelled `executorKey`. The section
silently renders the disabled error shell rather than failing at build time.

**Mitigation options**:

1. (Preferred) Define a string literal union `type ExecutorKey = 'joke-api' | 'json-placeholder'`
   and type `SectionDefinition.executorKey` as `ExecutorKey`. JSON imports cannot be narrowed
   to a union automatically, but a runtime validation step in the engine can assert membership.
2. The engine's unknown-executor path (FR-007) already handles the runtime case; ensure the
   error message includes the unresolved key value for debuggability.

**Add to T009**: SectionEngine must include the unknown executorKey value in the inline error
message and `addError` context.

---

### R02 — Spec Naming Inconsistency (HIGH)

**Risk**: Three different naming conventions appear in the spec:

- FR-010: `joke-session.json`, `jsonplaceholder-sesssion.json` (triple-s typo)
- Clarification Q4 answer: `joke-session.json`, `jsonplaceholder-sesssion.json`
- Spec body consistently: "section configuration files", "section definitions", "section engine"

The term "session" in the config filenames conflicts with "section" everywhere else.
SC-007 audits for "custom Joke API/JSONPlaceholder section implementation files" using exact
filenames — typo in the spec means SC-007 audit would pass whether the file is named
`jsonplaceholder-session.json` or `jsonplaceholder-sesssion.json`.

**Mitigation**: Plan DD-6 corrects the typo to `jsonplaceholder-session.json`. Spec FR-010
should be updated to `jsonplaceholder-session.json`. Consider whether `joke-section.json` /
`jsonplaceholder-section.json` would be more consistent with the rest of the spec terminology.

**Recommend**: Update spec FR-010 to correct the typo before `/devspark.implement`.

---

### R03 — UI Parity Risk on Header Extraction (MEDIUM)

**Risk**: The plan (DD-1) extracts the executor body from the existing screen component by
removing the hero/header div. The outer `<div className="min-h-screen bg-gray-50">` wrapper
in `JokeApiScreen.tsx` currently wraps the full screen. If this wrapper stays in the executor
component, the engine would double-wrap it. If it moves to the engine shell template, the
wrapping must be exactly reproduced.

**Failure mode**: Subtle scroll or spacing differences that violate FR-011/FR-012 parity.

**Mitigation**: During T005/T006, explicitly decide wrapper div ownership:

- Option A: Executor component retains the outer wrapper; engine shell has no outer wrapper (just the hero div).
- Option B: Engine shell provides the `min-h-screen bg-gray-50` wrapper and the hero; executor provides only inner content.

Add wrapper ownership decision to T009 task notes.

---

### R04 — Deletion Scope Ambiguity (MEDIUM)

**Risk**: FR-009 says "remove custom Joke API and JSONPlaceholder source implementation files."
If a reviewer interprets "implementation files" broadly to include `jokeApiClient.ts` and
`useJokeApi.ts`, plan DD-7 (retain API/hook layer) would fail the acceptance check.

**Failure mode**: SC-007 audit disagreement about what counts as a "section implementation file."

**Mitigation**: DD-7 in plan.md explicitly defines scope as `src/components/joke-api/` and
`src/components/json-placeholder/` directories only. Recommend adding one line to FR-009 in
spec.md: "API client files and hook files in `src/api/` and `src/hooks/` are retained."

---

### R05 — `schemaVersion` Type Cannot Be Enforced at Compile Time (MEDIUM)

**Risk**: `SectionDefinition.schemaVersion: string` cannot be narrowed to `'1'` by TypeScript
when the value comes from a JSON import. The engine must perform the validation at runtime.

**Failure mode**: No compile-time failure. The engine's runtime check (FR-002a) is the only
guard. If the runtime check has a bug, unsupported versions render with wrong behavior.

**Mitigation**: This is acceptable given the design constraints. Ensure the engine validation
path is covered by the constitution check (T016 build) and the error path test in the acceptance
scenario for T009. Document the runtime-only nature in T001 task notes.

---

### R06 — `DebugErrorEntry.category` Field Verification (LOW)

**Risk**: FR-008a requires emitting `category: 'Configuration'` debug error events. The existing
`DebugErrorEntry` type (in `src/types/api.ts` or similar) may define `category` as a specific
union type. If `'Configuration'` is not a valid member, T009 would produce a TypeScript error.

**Mitigation**: Before writing T009, verify the `category` field type in the existing
`DebugErrorEntry` or `DebugError` type. Add `'Configuration'` to the union if missing, or use
the closest matching existing value.

---

## Constitution Compliance

| Gate | Assessment |
|------|------------|
| I TypeScript strict | R05 (schemaVersion type) is the main risk; caught by T016 if wrong |
| II ESLint | Executor components must satisfy `react-hooks/exhaustive-deps`; verify in T017 |
| III Layer-cake + barrels | All new directories have barrel exports listed in T008/T010/T013 |
| IV API client pattern | Existing clients unchanged; executors delegate to existing hooks |
| V Zustand store rules | No new stores; `addError` is a read-from-store action |
| VI No console.log | Must verify executor components post-extraction |
| VIII No PII/PHI | Section config contains only display metadata; confirmed safe |

**No constitution violations.**

---

## Overall Assessment

No showstoppers. R01 and R02 require resolution before implementation begins (type safety design
and spec typo fix). R03–R05 are design notes for the implementer. R06 is a quick verification step.

**Recommended actions before `/devspark.implement`**:

1. Fix R02: Correct `jsonplaceholder-sesssion.json` typo in spec FR-010
2. Resolve R01: Add `ExecutorKey` union type and document unknown-key error behavior in T009
3. Resolve R03: Add wrapper ownership decision to T005/T006/T009
4. Verify R06: Check `DebugErrorEntry.category` field before writing T009
5. Clarify R04: Add one-line scope note to spec FR-009
