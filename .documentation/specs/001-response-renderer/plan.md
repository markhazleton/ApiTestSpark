# Implementation Plan: Response Renderer Refinements

**Branch**: `001-response-renderer` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

## Summary

Five targeted improvements to `EndpointTester.tsx` that enhance the developer edit-and-verify loop: editable depth-1 nested object forms, "Copy as cURL" in the response panel, a session-persistent pretty/minified JSON toggle, JSONPath tooltips on field labels, and a 2-row table truncation with show-all/show-less toggle. All changes are confined to a single file. No new stores, no new routes, no .NET changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict)
**Primary Dependencies**: React 19, Zustand 5, Tailwind CSS 4
**Storage**: `useHarnessConfigStore` (session-only, non-persisted) — extended to hold `jsonViewMode: 'pretty' | 'minified'`
**Testing**: No React test framework (Constitution §VII) — verification via `npm run verify` (tsc -b + vite build) and manual browser testing
**Target Platform**: Browser SPA embedded in .NET Minimal API
**Project Type**: Browser SPA (desktop-app archetype — Electron-less, but browser-rendered dev tool)
**Performance Goals**: N/A — local developer tool; no throughput or latency targets
**Constraints**: All changes in `src/components/host-api/EndpointTester.tsx` only. `useHarnessConfigStore` may gain a UI preference field but MUST NOT be wrapped in `persist` middleware (Constitution §V).
**Scale/Scope**: Single file modification; 5 user stories; ~14 FRs

## Constitution Check

*GATE: Must pass before implementation. Re-check after all tasks complete.*
*Constitution version: 1.1.1 — see `.documentation/memory/constitution.md`*

| # | Gate | Status | Notes |
|---|------|--------|-------|
| I | `npm run verify` (tsc -b + vite build) MUST pass — zero TypeScript errors | ✅ PASS | Existing build passes; all new state must be fully typed |
| II | `npm run lint` MUST pass — zero ESLint errors (`react-hooks/exhaustive-deps` enforced) | ✅ PASS | All new `useState`/`useCallback` hooks must list correct deps |
| III | Layer separation + barrel exports | ✅ PASS | No new layers needed; this feature modifies one existing component |
| IV | API client pattern — per-call, UUID, debug callbacks | ✅ N/A | No new API clients introduced |
| V | Zustand — one concern, action-gated, FIFO limits, no new `persist` on `useHarnessConfigStore` | ✅ PASS | `jsonViewMode` added to `useHarnessConfigStore` as a UI preference — session-only, no persist |
| VI | No `console.log`; clipboard failures → `useDebugStore.addError('Unknown')` | ✅ PASS | FR-011 mandates this; all copy helpers must catch and route |
| VIII | No PII/PHI in any store, type, log, or test data | ✅ PASS | Feature only displays existing response data; no new capture paths |

*Gate VII (testing stance) is aspirational — no React test framework will be added.*

## Project Structure

### Documentation (this feature)

```text
.documentation/specs/001-response-renderer/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← /devspark.tasks output
```

### Source Code (affected files only)

```text
src/
├── components/
│   └── host-api/
│       └── EndpointTester.tsx   ← ALL changes confined here
└── store/
    └── harnessConfigStore.ts    ← Add jsonViewMode preference field
```

No new files in `src/`. No changes to `src/api/`, `src/hooks/`, `src/types/`, or any other component.

---

## Phase 0: Research

### Decision: Where to store the pretty/minified toggle preference

**Decision**: Add `jsonViewMode: 'pretty' | 'minified'` and `setJsonViewMode` action to `useHarnessConfigStore`.

**Rationale**: `useHarnessConfigStore` is already the canonical store for session-only UI state (Constitution §V registry). It is not persisted (`persist` middleware absent by constitution mandate). Adding a UI view preference here requires no new store, no new barrel export change, and no persistence concern.

**Alternatives considered**:

- Local `useState` inside `ResponseView`: rejected — preference would reset on every response render since `ResponseView` is recreated with each new `data` prop.
- New `useResponsePrefsStore`: rejected — one concern per store (§V), but this preference is not a separate concern from harness configuration; it is a rendering mode preference appropriate to the harness session.

### Decision: How to implement "Copy as cURL" in response panel

**Decision**: Extract the existing `buildCurl` logic from `DebugPanel.tsx` (currently inline there) into a shared utility function, then call it from `EndpointTester.tsx` response panel.

**Rationale**: `DebugPanel.tsx` already builds cURL from `{ method, url, headers, body }`. The response panel has access to the same data from the mutation result. Reusing the function avoids duplicating cURL construction logic.

**URL construction (A-002 fix)**: The `url` field passed to `buildCurl` is constructed in `EndpointTester.tsx` as follows:

1. Start with `config.baseUrl + endpoint.path` (e.g. `https://localhost:5001/users/{id}`)
2. Substitute each `{param}` placeholder with the resolved value from `pathParams` (e.g. `{id}` → `42`)
3. Append non-empty `queryParams` as a `?key=value&key2=value2` query string
4. Result: `https://localhost:5001/users/42?verbose=true`

This construction happens in `handleFire` / `onSuccess` capture point, not inside `buildCurl` — the utility receives an already-resolved URL string.

**Alternatives considered**:

- Inline a new `buildCurl` in `EndpointTester.tsx`: rejected — duplicates logic; any future change to cURL format would need updating in two places.
- Pass a cURL callback prop down: rejected — over-engineering for what is a pure function call.

### Decision: How to detect circular references

**Decision**: Use a `seen: WeakSet<object>` during recursive object traversal in `ResponseObjectForm`. When a nested object is encountered, check `seen.has(obj)` before rendering. If circular, render `[Circular reference detected]` as static text.

**Rationale**: `WeakSet` is the standard JS circular-reference detection pattern. It requires no library and adds zero bundle weight. TypeScript strict mode is satisfied because `WeakSet<object>` accepts any object ref.

### Decision: JSONPath tooltip implementation

**Decision**: Use the HTML `title` attribute on field label elements for tooltip display. Clicking the label triggers `navigator.clipboard.writeText(jsonPath)`.

**Rationale**: The `title` attribute provides a browser-native tooltip with zero additional dependencies. It is accessible (screen readers announce title on focus). The existing `ParamField` component already uses `title` attributes for constraint display — this is consistent.

**Alternatives considered**:

- Custom tooltip component: rejected — adds complexity and a potential new dependency for a developer tool where native browser tooltips are sufficient.
- Persistent label text: rejected — spec (US4, FR-009) explicitly chose tooltip to avoid visual clutter.

### Decision: Nested object collapsible widget

**Decision**: Use a native HTML `<details>`/`<summary>` element. This matches the `LazyDetails` pattern already used in `DebugPanelUtils.tsx`.

**Rationale**: Zero JS, zero library, accessible by default, browser-native. The existing codebase already uses this pattern. Collapsed by default via absence of the `open` attribute (FR-012).

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](data-model.md).

Key state additions to `EndpointTester.tsx`:

| State | Type | Location | Purpose |
|-------|------|----------|---------|
| `jsonViewMode` | `'pretty' \| 'minified'` | `useHarnessConfigStore` | Session-persistent toggle preference |
| `tableExpanded` | `boolean` | local `useState` in table renderer | Show-all/show-less per table instance; resets per render |
| `nestedFields` | `Record<string, Record<string, string>>` | local `useState` in `ResponseObjectForm` | Tracks edited values for depth-1 nested objects; reset via `useEffect([data])` — NOT useState initialiser (critic-001) |
| `lastRequest` | `LastRequest \| null` | local `useState` in `EndpointTester` | Captured in mutation `onSuccess` callback — NOT in `handleFire` (critic-005: fire-time capture causes cURL/response mismatch on rapid re-fire) |

No new TypeScript types needed in `src/types/` — all additions are component-local state. `LastRequest` interface defined in `data-model.md`.

### Interface Contracts

This feature introduces no new public API surface, no new routes, and no changes to the NuGet package boundary. No contracts artifacts are needed.

### Rendering Rule Implementation Contract

The spec's rendering rules table maps to these implementation decisions:

| Response shape | Renderer | Implementation |
|----------------|----------|----------------|
| Object (root or depth-1 child) | Editable form | Existing `ResponseObjectForm` extended; depth-1 nested objects rendered via inline JSX nested sub-form inside a `<details>` element (A-005: no separate named component) |
| Object (depth-2+) | Read-only JSON block | `JSON.stringify(v)` in a `<span>` — existing pattern preserved |
| Array of objects (any depth) | Read-only sortable table | Existing table renderer extracted to inner function `SortableTable` (A-006: consistent name); reused for nested arrays |
| Array of primitives (any depth) | Read-only JSON block | `JSON.stringify(v)` |
| Scalar at root | Read-only `<pre>` | Existing fallback preserved |

### buildCurl extraction

`buildCurl` currently lives inline in `DebugPanel.tsx`. It will be moved to `src/utils/curlBuilder.ts` and re-exported from `src/utils/index.ts`. `DebugPanel.tsx` will import from the utility. `EndpointTester.tsx` will import it too.

**Constitution §III check**: `src/utils/` is the correct layer for pure utility functions (no React, no stores). This move satisfies the layer contract.

---

## Complexity Tracking

No constitution violations. No waivers required.
