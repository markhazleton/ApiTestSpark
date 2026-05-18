# Implementation Plan: Section Engine Refactor

**Branch**: `001-section-engine-refactor` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.documentation/specs/001-section-engine-refactor/spec.md`

## Summary

Introduce a shared section engine that renders both the JokeAPI and JSONPlaceholder sections
from per-section JSON configuration files. The engine is API-agnostic: each section registers a
content component (executor) that encapsulates API-specific parameter controls and request logic.
The engine provides the section shell (header, config-error handling, debug event emission) while
the executor provides the section body (controls, state, results display).

After migration, all custom per-section component source files for JokeAPI and JSONPlaceholder
are removed and replaced by `joke-session.json` and `jsonplaceholder-session.json` configuration
files backed by executor registrations. Existing API clients and hooks are preserved as the
authoritative API layer.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 19
**Primary Dependencies**: Vite 6, Zustand 5, TanStack Query 5, Tailwind CSS 4, React Router DOM 7
**Storage**: No new stores; `useDebugStore` used for config error event emission; `useUnifiedConfigStore` unchanged
**Testing**: No test runner — quality gates are `npm run lint` + `npm run verify` (tsc -b + vite build)
**Target Platform**: Browser SPA (Azure Static Web App)
**Performance Goals**: No performance delta expected; engine adds one config validation step at section mount
**Constraints**: TypeScript strict zero-error; ESLint zero-error; UI parity before/after (FR-011/FR-012); no new external dependencies
**Scale/Scope**: ~12 new source files; 4 files deleted; 3 files updated; 2 sections migrated

## Constitution Check

*Constitution version: 1.0.0 — see `.documentation/memory/constitution.md`*

| # | Gate | Status |
|---|------|--------|
| I | `npm run verify` (tsc -b + vite build) MUST pass — zero TypeScript errors | ☑ PASS — enforced at Phase 6 quality gate |
| II | `npm run lint` MUST pass — zero ESLint errors | ☑ PASS — enforced at Phase 6 quality gate |
| III | New feature follows: types → executors → component + barrel exports at every directory | ☑ PASS — see Project Structure below; all barrels listed explicitly |
| IV | API clients unchanged; existing per-call instantiation and debug callbacks preserved | ☑ PASS — executors delegate to existing hooks; no client changes |
| V | No new Zustand stores; FIFO buffer limits unaffected | ☑ PASS — engine uses existing `useDebugStore.addError` only |
| VI | No `console.log` in `src/`; config failures route through `addError` with `category: 'Configuration'` | ☑ PASS — FR-008a explicitly routes config errors through debug store |
| VIII | No PII/PHI in any configuration, type, store, or payload | ☑ PASS — section config contains only display metadata; no sensitive fields |

## Design Decisions

### DD-1: Executor Contract — Full Section Content Component

Each executor provides one React component that renders its complete section content (controls,
state, results). The engine renders the section shell (header derived from config, config-error
overlay) and mounts the executor's content component via the registry.

**Why**: Preserves existing screen component code almost entirely. Splitting header from body
requires extracting only the hero div into config-driven rendering; all other JSX stays in the
executor component. This minimizes UI regression risk and satisfies FR-011/FR-012 parity
requirements without re-implementing form schema machinery.

**Alternative considered**: Engine renders generic parameter form defined in JSON config.
Rejected — JokeAPI filter UI (multi-select flags, category dropdowns) and JSONPlaceholder CRUD
forms cannot be expressed as generic JSON form schemas without a separate form engine that is
out of scope.

### DD-2: Section Configuration Files in `src/config/`

Section JSON files live in `src/config/`. They are imported as static JSON modules at bundle
time (Vite resolves JSON imports natively). No runtime `fetch()` is needed; schema validation
errors are detectable at section mount rather than at an async load boundary.

Schema shape (aligned with OpenAPI `info` object, W3C Web App Manifest, and VS Code extension
manifest conventions):

```json
{
  "$schema": "./section.schema.json",
  "schemaVersion": "1.0",
  "id": "string",
  "displayName": "string",
  "description": "string",
  "icon": "string",
  "theme": "string",
  "externalDocs": { "url": "string", "description": "string" },
  "notice": "string (optional)",
  "adapter": "string"
}
```

Field rationale vs. original draft:

| Original | Revised | Reason |
|----------|---------|--------|
| `heroGradient: "from-yellow-400 to-orange-400"` | `theme: "amber"` | Tailwind class strings in config is a coupling smell — config declares intent; app code owns the CSS mapping via `SECTION_THEME_MAP` (see DD-8) |
| `executorKey` | `adapter` | Drops redundant "Key" suffix; "adapter" is established plugin-pattern vocabulary |
| *(absent)* | `icon` | Emoji currently hardcoded in screen `<h1>` JSX; belongs in config |
| *(absent)* | `externalDocs` | OpenAPI 3.x `externalDocs` pattern `{ url, description }`; URL/link currently hardcoded in screen anchor JSX |
| *(absent)* | `notice` (optional) | Secondary disclaimer text currently hardcoded only in JSONPlaceholder screen; optional so JokeAPI config omits it |

### DD-3: Schema Version Strategy

`schemaVersion: "1.0"` is the initial accepted version. The engine accepts exactly `"1.0"` and
renders the disabled error shell for any other value, satisfying FR-002a and FR-007a.
Using `"1.0"` rather than bare `"1"` aligns with OpenAPI (`"3.1.0"`), npm (`"1.0.0"`), and
other standard formats that use dotted version strings.

### DD-4: Adapter Registry

A static map in `src/executors/registry.ts`:
`adapterRegistry: Record<string, React.ComponentType>` keyed by `adapter` string.
Registration is compile-time; any section config referencing an unknown `adapter` value produces
a runtime config-resolution failure rendered as the disabled shell.

> Note: renamed from `executorRegistry`/`executorKey` to `adapterRegistry`/`adapter` to align
> with established plugin-pattern vocabulary (see DD-2 field rationale).

### DD-5: Configuration Error Debug Events

When the engine detects a configuration failure (missing required field, unsupported
schemaVersion, unknown `adapter` value), it calls `useDebugStore().addError` with
`category: 'Configuration'` and includes `sectionId` in the `context` object. This satisfies
FR-008a alongside the inline section error display required by FR-007.

### DD-8: Theme Registry — Semantic Names to Tailwind Classes

The `theme` field in section config uses a semantic name (e.g., `"amber"`, `"indigo"`).
The engine resolves it to Tailwind classes via a `SECTION_THEME_MAP` constant defined inside
`SectionEngine.tsx`:

```typescript
const SECTION_THEME_MAP: Record<string, { gradient: string; textMuted: string; codeBg: string }> = {
  amber:  { gradient: 'from-yellow-400 to-orange-400', textMuted: 'text-yellow-100', codeBg: 'bg-yellow-500/40' },
  indigo: { gradient: 'from-indigo-500 to-purple-600', textMuted: 'text-indigo-100', codeBg: 'bg-indigo-400/40' },
};
```

If `config.theme` is not a key in the map, the engine falls back to a neutral default and does
**not** treat it as a config-resolution failure (theme is cosmetic; a missing theme is not a
broken section). Tailwind class strings stay exclusively in TypeScript source — never in JSON.
New themes require only a new entry in `SECTION_THEME_MAP`, not changes to any config file.

### DD-6: File Naming — `joke-session.json` / `jsonplaceholder-session.json`

Using the clarification answer naming (`joke-session.json`, `jsonplaceholder-session.json`).
The triple-s typo in FR-010 (`jsonplaceholder-sesssion.json`) is a specification error;
corrected to `jsonplaceholder-session.json`. Critic gate flags the inconsistency between
the "session.json" file names and "section configuration" terminology used throughout the spec.

### DD-7: Scope of File Deletion (FR-009/FR-010)

FR-009 says "remove custom Joke API and JSONPlaceholder source implementation files." Scope of
deletion: only `src/components/joke-api/` and `src/components/json-placeholder/` directories.
API client files (`src/api/jokeApiClient.ts`, `src/api/jsonPlaceholderClient.ts`) and hook files
(`src/hooks/useJokeApi.ts`, `src/hooks/useJsonPlaceholder.ts`) are retained as authoritative API
layer artifacts. The executor components replace the screen components only.

## Project Structure

### New Files

```
src/
  config/
    joke-session.json             # Section config for JokeAPI (DD-2, FR-002)
    jsonplaceholder-session.json  # Section config for JSONPlaceholder (DD-2, FR-002)
  types/
    section.ts                   # SectionDefinition, SectionRuntimeState types (FR-002)
  executors/
    registry.ts                  # executorRegistry Record<string, React.ComponentType>
    jokeApiExecutor.tsx          # JokeAPI section body content component
    jsonPlaceholderExecutor.tsx  # JSONPlaceholder section body content component
    index.ts                     # Barrel export
  components/
    section-engine/
      SectionEngine.tsx          # Engine: validates config, resolves executor, renders shell
      index.ts                   # Barrel export
```

### Modified Files

```
src/
  types/index.ts       # Re-export from section.ts
  components/index.ts  # Add SectionEngine; remove joke-api + json-placeholder exports
  App.tsx              # Replace route components with <SectionEngine config={...} />
  components/
    HomeScreen.tsx     # Update nav card labels if driven by config (review in T012)
```

### Deleted Files

```
src/components/joke-api/JokeApiScreen.tsx   # Replaced by jokeApiExecutor.tsx
src/components/joke-api/index.ts            # Barrel removed
src/components/json-placeholder/JsonPlaceholderScreen.tsx  # Replaced by jsonPlaceholderExecutor.tsx
src/components/json-placeholder/index.ts   # Barrel removed
```

## Complexity Tracking

- New file count: 10 files (within single-feature scope)
- Deleted file count: 4 files
- Updated file count: 4 files
- No new external dependencies
- No new Zustand stores
- No new routes (existing routes `/joke-api` and `/json-placeholder` preserved)
