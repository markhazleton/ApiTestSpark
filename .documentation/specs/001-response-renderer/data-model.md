# Data Model: Response Renderer Refinements

**Feature**: 001-response-renderer | **Date**: 2026-06-02

No new domain types are introduced. All additions are component-local state or a minor extension to an existing store.

---

## Store Extension: `useHarnessConfigStore`

**File**: `src/store/harnessConfigStore.ts`

Add one field and one action to the existing store interface:

| Field / Action | Type | Default | Purpose |
|---------------|------|---------|---------|
| `jsonViewMode` | `'pretty' \| 'minified'` | `'pretty'` | Session-persistent toggle preference for JSON display |
| `setJsonViewMode` | `(mode: 'pretty' \| 'minified') => void` | — | Action-gated setter (Constitution §V) |

**Constraint**: MUST NOT add `persist` middleware. Store remains session-only per Constitution §V and existing mandate in `harnessConfigStore.ts`.

---

## Component-Local State: `ResponseObjectForm`

| State variable | Type | Purpose |
|---------------|------|---------|
| `fields` | `Record<string, string>` | Existing — tracks edited primitive values at depth-0 |
| `nestedFields` | `Record<string, Record<string, string>>` | New — tracks edited primitive values inside depth-1 nested objects, keyed by parent field name |
| `copied` | `boolean` | Existing — "Copied!" flash state for Copy as JSON |

`nestedFields` resets whenever the `data` prop changes (FR-013), matching the existing `fields` reset behaviour via `useState` initialiser.

---

## Component-Local State: Table renderer (inline in `ResponseView`)

| State variable | Type | Per-instance? | Purpose |
|---------------|------|--------------|---------|
| `tableExpanded` | `boolean` | Yes — one per table rendered | Show-all / show-less toggle; `false` by default; resets on each new render (FR-016) |

---

## Utility: `curlBuilder.ts`

**File**: `src/utils/curlBuilder.ts` (extracted from `DebugPanel.tsx`)

```ts
interface CurlArgs {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

function buildCurl(args: CurlArgs): string
```

Pure function — no React, no stores (Constitution §III). Re-exported from `src/utils/index.ts`.

---

## JSONPath Utility (inline helper)

No separate file needed. A pure helper function `toJsonPath(parentKey: string | null, fieldKey: string): string` will be defined inline within `EndpointTester.tsx` alongside `ResponseObjectForm`. It produces dot-notation paths (`$.id`, `$.address.city`, `$[*].id`) and has no external dependencies.
