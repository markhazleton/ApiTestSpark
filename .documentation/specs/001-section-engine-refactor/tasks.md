# Task List: Section Engine Refactor

**Branch**: `001-section-engine-refactor` | **Date**: 2026-05-18
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)
**Task count**: 19 tasks across 6 phases

---

## Phase 1 — Types

### T001 — Add `SectionDefinition` and Related Types

**Effort**: S
**Dependencies**: None
**Files**: `src/types/section.ts` (NEW)

Create `src/types/section.ts` with:

- `SectionDefinition` interface:
  ```typescript
  interface SectionDefinition {
    schemaVersion: string;        // accepted: '1.0'
    id: string;                   // kebab-case machine identifier
    displayName: string;          // human-readable label
    description: string;          // short prose for hero subtitle
    icon: string;                 // emoji or icon identifier for hero title
    theme: string;                // semantic theme name resolved by SECTION_THEME_MAP in engine
    externalDocs: { url: string; description: string }; // OpenAPI externalDocs pattern
    notice?: string;              // optional secondary hero disclaimer text
    adapter: string;              // maps to adapterRegistry key (was executorKey)
  }
  ```
- `SectionRuntimeState` type: `'idle' | 'loading' | 'success' | 'error' | 'config-error'`
- `AdapterKey` type: `'joke-api' | 'json-placeholder'` — string literal union of registered adapter keys (used for runtime membership validation in SectionEngine; `adapter` field stays `string` since JSON imports resolve to `string`, not a narrowable literal)

**Acceptance**:

- [ ] All fields typed; no `any`
- [ ] `SectionDefinition`, `SectionRuntimeState`, and `AdapterKey` exported from the file
- [ ] `notice` is typed as `string | undefined` (optional)
- [ ] `SectionDefinition.schemaVersion` validation is documented as runtime-only: JSON imports resolve to `string`; no compile-time enforcement is possible

---

### T002 — Update `src/types/index.ts` Barrel

**Effort**: XS
**Dependencies**: T001
**Files**: `src/types/index.ts` (UPDATE)

Add `export * from './section';` to the types barrel.

**Acceptance**:

- [ ] `SectionDefinition` and `SectionRuntimeState` importable via `'../types'`

---

## Phase 2 — Configuration Files

### T003 — Create `joke-session.json`

**Effort**: XS
**Dependencies**: T001
**Files**: `src/config/joke-session.json` (NEW)

Create the JokeAPI section configuration:

```json
{
  "$schema": "./section.schema.json",
  "schemaVersion": "1.0",
  "id": "joke-api",
  "displayName": "JokeAPI Tester",
  "description": "Sample integration using JokeAPI v2. No API key required.",
  "icon": "\ud83d\ude02",
  "theme": "amber",
  "externalDocs": {
    "url": "https://jokeapi.dev",
    "description": "JokeAPI v2 Documentation"
  },
  "adapter": "joke-api"
}
```

**Acceptance**:

- [ ] File is valid JSON
- [ ] `schemaVersion` is `"1.0"`
- [ ] `$schema` points to `./section.schema.json`
- [ ] `adapter` value matches the registry key used in T007
- [ ] No Tailwind class strings in file

---

### T004 — Create `jsonplaceholder-session.json`

**Effort**: XS
**Dependencies**: T001
**Files**: `src/config/jsonplaceholder-session.json` (NEW)

Create the JSONPlaceholder section configuration:

```json
{
  "$schema": "./section.schema.json",
  "schemaVersion": "1.0",
  "id": "json-placeholder",
  "displayName": "JSONPlaceholder Tester",
  "description": "Full CRUD demo using JSONPlaceholder. No API key required.",
  "icon": "\ud83d\udce6",
  "theme": "indigo",
  "externalDocs": {
    "url": "https://jsonplaceholder.typicode.com",
    "description": "JSONPlaceholder API"
  },
  "notice": "All data is synthetic \u2014 write operations are simulated and not persisted server-side.",
  "adapter": "json-placeholder"
}
```

**Acceptance**:

- [ ] File is valid JSON
- [ ] `schemaVersion` is `"1.0"`
- [ ] `$schema` points to `./section.schema.json`
- [ ] `adapter` value matches the registry key used in T008
- [ ] `notice` field present (used by engine to render optional disclaimer in hero)
- [ ] No Tailwind class strings in file

---

## Phase 3 — Executor Components

### T005 — Create JokeAPI Executor Component

**Effort**: M
**Dependencies**: T001
**Files**: `src/executors/jokeApiExecutor.tsx` (NEW)

Extract the section body from `src/components/joke-api/JokeApiScreen.tsx` into a standalone
executor component `JokeApiExecutor`. The executor component is the section content below
the hero/header div (health check card, filter controls, fetch button, results area). The
hero/header is removed from this component since the engine renders it from config.

**Acceptance**:

- [ ] Component renders health check, filter controls, fetch button, and results
- [ ] No hardcoded header/hero div (engine provides the header from config)
- [ ] Outer `min-h-screen bg-gray-50` wrapper excluded — engine shell owns the page wrapper; executor provides only inner content
- [ ] No `console.log`; all observability via `useDebugStore`
- [ ] TypeScript strict — zero errors

---

### T006 — Create JSONPlaceholder Executor Component

**Effort**: M
**Dependencies**: T001
**Files**: `src/executors/jsonPlaceholderExecutor.tsx` (NEW)

Extract the section body from `src/components/json-placeholder/JsonPlaceholderScreen.tsx`
into a standalone executor component `JsonPlaceholderExecutor`. Same header extraction
approach as T005.

**Acceptance**:

- [ ] Component renders resource selector, ID input, CRUD controls, and results
- [ ] No hardcoded header/hero div
- [ ] Outer `min-h-screen bg-gray-50` wrapper excluded — engine shell owns the page wrapper; executor provides only inner content
- [ ] No `console.log`; all observability via `useDebugStore`
- [ ] TypeScript strict — zero errors

---

### T007 — Create Adapter Registry

**Effort**: S
**Dependencies**: T005, T006
**Files**: `src/executors/registry.ts` (NEW)

Create the static adapter registry:

```typescript
import type React from 'react';
import { JokeApiExecutor } from './jokeApiExecutor';
import { JsonPlaceholderExecutor } from './jsonPlaceholderExecutor';

export const adapterRegistry: Record<string, React.ComponentType> = {
  'joke-api': JokeApiExecutor,
  'json-placeholder': JsonPlaceholderExecutor,
};
```

**Acceptance**:

- [ ] All `adapter` values from T003/T004 have a corresponding registry entry
- [ ] No `any`; `React.ComponentType` typed entries
- [ ] Export named `adapterRegistry` (not `executorRegistry`)

---

### T008 — Create Executor Barrel

**Effort**: XS
**Dependencies**: T007
**Files**: `src/executors/index.ts` (NEW)

```typescript
export { adapterRegistry } from './registry';
export { JokeApiExecutor } from './jokeApiExecutor';
export { JsonPlaceholderExecutor } from './jsonPlaceholderExecutor';
```

---

## Phase 4 — Section Engine Component

### T009 — Create `SectionEngine.tsx`

**Effort**: M
**Dependencies**: T001, T007
**Files**: `src/components/section-engine/SectionEngine.tsx` (NEW)

Implement the section engine component:

```typescript
interface SectionEngineProps {
  config: SectionDefinition;
}
```

Behavior:

1. On mount, validate `config.schemaVersion === '1.0'` (FR-002a, FR-007a)
2. Look up `adapterRegistry[config.adapter]` (FR-005)
3. If validation fails or adapter not found:
   - Call `useDebugStore().addError({ category: 'Configuration', message: ..., context: { sectionId: config.id } })` (FR-008a)
   - Render disabled section shell with inline error message (FR-007)
4. If valid: render section shell with hero from config and mount adapter component (FR-001, FR-004)

Shell structure:

- Outer page wrapper: `<div className="min-h-screen bg-gray-50">` (engine-owned; executors do NOT include this wrapper — see T005/T006)
- Hero div: resolve `config.theme` via `SECTION_THEME_MAP` for gradient CSS classes (see plan DD-8); render `config.icon` + `config.displayName` in `<h1>`, `config.description` in subtitle, `config.externalDocs` as an anchor link, and `config.notice` (if present) as a secondary paragraph
- Content area: adapter component or error state

`SECTION_THEME_MAP` defined inside `SectionEngine.tsx`:
```typescript
const SECTION_THEME_MAP: Record<string, { gradient: string; textMuted: string; codeBg: string }> = {
  amber:  { gradient: 'from-yellow-400 to-orange-400', textMuted: 'text-yellow-100', codeBg: 'bg-yellow-500/40' },
  indigo: { gradient: 'from-indigo-500 to-purple-600', textMuted: 'text-indigo-100', codeBg: 'bg-indigo-400/40' },
};
const DEFAULT_THEME = { gradient: 'from-gray-400 to-gray-600', textMuted: 'text-gray-100', codeBg: 'bg-gray-500/40' };
```

**Acceptance**:

- [ ] Renders hero header using config fields (not hardcoded values)
- [ ] `config.icon` displayed in `<h1>` before `config.displayName`
- [ ] `config.externalDocs.url` rendered as anchor with `config.externalDocs.description` as link text
- [ ] `config.notice` rendered as secondary paragraph when present; omitted when absent
- [ ] `config.theme` resolved via `SECTION_THEME_MAP`; unknown theme falls back to default (not a config error)
- [ ] No Tailwind class strings outside `SECTION_THEME_MAP` constant
- [ ] Invalid/missing schemaVersion → disabled shell with inline error + `addError` with `category: 'Configuration'`
- [ ] Unknown `adapter` → disabled shell with inline error message that includes the unresolved adapter value + `addError` with `category: 'Configuration'` and `context: { sectionId: config.id, unknownAdapter: config.adapter }`
- [ ] Valid config → adapter component mounted and functional
- [ ] Engine contains zero API-specific conditional logic (FR-004)
- [ ] No `console.log`
- [ ] TypeScript strict — zero errors

---

### T010 — Create Section Engine Barrel

**Effort**: XS
**Dependencies**: T009
**Files**: `src/components/section-engine/index.ts` (NEW)

```typescript
export { SectionEngine } from './SectionEngine';
```

---

## Phase 5 — Migration

### T011 — Update `src/App.tsx` Routes

**Effort**: S
**Dependencies**: T003, T004, T009, T010
**Files**: `src/App.tsx` (UPDATE)

Replace `<JokeApiScreen />` and `<JsonPlaceholderScreen />` route components with
`<SectionEngine config={jokeSessionConfig} />` and `<SectionEngine config={jsonPlaceholderConfig} />`.
Import the JSON config files and the `SectionEngine` component.

**Acceptance**:

- [ ] `/joke-api` route renders `<SectionEngine>` with `joke-session.json` config
- [ ] `/json-placeholder` route renders `<SectionEngine>` with `jsonplaceholder-session.json` config
- [ ] No remaining imports of `JokeApiScreen` or `JsonPlaceholderScreen` in `App.tsx`

---

### T012 — Review and Update `src/components/HomeScreen.tsx`

**Effort**: S
**Dependencies**: T003, T004
**Files**: `src/components/HomeScreen.tsx` (UPDATE if needed)

Update the `SECTIONS` array in `HomeScreen.tsx` to align nav card labels with the `displayName`
values from `joke-session.json` and `jsonplaceholder-session.json`. No structural changes to
the SECTIONS array or card layout.

**Acceptance**:

- [ ] Nav card labels match `joke-session.json` `displayName` and `jsonplaceholder-session.json` `displayName`
- [ ] No change to card layout, order, or routing paths

---

### T013 — Update `src/components/index.ts` Barrel

**Effort**: XS
**Dependencies**: T010, T011
**Files**: `src/components/index.ts` (UPDATE)

- Add `export * from './section-engine';`
- Remove `export * from './joke-api';`
- Remove `export * from './json-placeholder';`

**Acceptance**:

- [ ] `SectionEngine` importable via `'../components'`
- [ ] No compile errors from removed exports

---

## Phase 6 — Source File Cleanup

### T014 — Delete `src/components/joke-api/` Directory

**Effort**: XS
**Dependencies**: T005, T011, T013
**Files**: `src/components/joke-api/JokeApiScreen.tsx` (DELETE), `src/components/joke-api/index.ts` (DELETE)

Remove the entire `joke-api/` component directory. Verify zero remaining imports in the codebase.

**Acceptance**:

- [ ] `src/components/joke-api/` directory does not exist
- [ ] `grep -r "JokeApiScreen"` returns zero matches in `src/`

---

### T015 — Delete `src/components/json-placeholder/` Directory

**Effort**: XS
**Dependencies**: T006, T011, T013
**Files**: `src/components/json-placeholder/JsonPlaceholderScreen.tsx` (DELETE), `src/components/json-placeholder/index.ts` (DELETE)

Remove the entire `json-placeholder/` component directory. Verify zero remaining imports.

**Acceptance**:

- [ ] `src/components/json-placeholder/` directory does not exist
- [ ] `grep -r "JsonPlaceholderScreen"` returns zero matches in `src/`

---

## Phase 7 — Quality Gates

### T016 — Verify TypeScript and Build

**Effort**: XS
**Dependencies**: T001–T015
**Files**: none (verification only)

Run `npm run verify` (tsc -b + vite build). Zero errors required.

**Acceptance**:

- [ ] `npm run verify` exits 0 with zero TypeScript errors
- [ ] Build output in `build/` updated

---

### T017 — Verify Lint

**Effort**: XS
**Dependencies**: T001–T015
**Files**: none (verification only)

Run `npm run lint`. Zero errors required.

**Acceptance**:

- [ ] `npm run lint` exits 0 with zero ESLint errors
- [ ] `react-hooks/exhaustive-deps` compliant in executor components and SectionEngine

---

## Dependency Graph

```
T001 → T002
T001 → T003 → T007
T001 → T004 → T007
T001 → T005 → T007
T001 → T006 → T007
T007 → T008
T001 + T007 → T009 → T010
T003 + T004 + T009 + T010 → T011
T003 + T004 → T012
T010 + T011 → T013
T005 + T011 + T013 → T014
T006 + T011 + T013 → T015
T001–T015 → T016
T001–T015 → T017
```

## Task Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| 1 — Types | T001–T002 | 2 |
| 2 — Config | T003–T004 | 2 |
| 3 — Executors | T005–T008 | 4 |
| 4 — Section Engine | T009–T010 | 2 |
| 5 — Migration | T011–T013 | 3 |
| 6 — Cleanup | T014–T015 | 2 |
| 7 — Quality Gates | T016–T017 | 2 |
| **Total** | | **17** |
