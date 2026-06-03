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

**critic-001 fix**: `useState` initialiser only runs on mount — it will NOT re-run when `data` changes. Both `fields` and `nestedFields` MUST be reset via `useEffect` with `data` as a dependency:

```ts
useEffect(() => {
  setFields(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])));
  setNestedFields({});
}, [data]);
```

Do NOT rely on the `useState(() => ...)` initialiser for reset behaviour across re-renders.

---

## Component-Local State: `SortableTable` inner function (inside `ResponseView`)

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

**critic-002 fix**: Every call-site that invokes `navigator.clipboard.writeText()` MUST guard with `if (!navigator?.clipboard)` before the async call. In non-HTTPS contexts `navigator.clipboard` is `undefined`; accessing `.writeText` on it throws a synchronous `TypeError` that a `.catch()` handler never intercepts. The guard pattern:

```ts
if (!navigator?.clipboard) {
  addError({ category: 'Unknown', message: 'Clipboard unavailable', source: 'copy' });
  return;
}
navigator.clipboard.writeText(text).catch(() =>
  addError({ category: 'Unknown', message: 'Copy failed', source: 'copy' })
);
```

---

## Interface: `LastRequest`

**Location**: defined inline in `src/components/host-api/EndpointTester.tsx` (component-local, not in `src/types/`)

```ts
interface LastRequest {
  method: string;       // e.g. "GET", "POST"
  url: string;          // fully resolved URL with path params substituted and query string appended
  headers: Record<string, string>;  // all headers sent, including Authorization if present
  body?: unknown;       // parsed request body (undefined for GET/DELETE/HEAD)
}
```

Captured in the `useMutation` `onSuccess` callback, not in `handleFire` (critic-005). The `url` field is constructed by substituting `{param}` placeholders in `endpoint.path` with resolved `pathParams` values, then appending `queryParams` as a `?key=value` query string (A-002 fix).

---

## JSONPath Utility (inline helper)

No separate file needed. A pure helper function `toJsonPath(parentKey: string | null, fieldKey: string, inArray?: boolean): string` will be defined inline within `EndpointTester.tsx`. Path format rules (A-003 fix):

| Context | Call | Output |
|---------|------|--------|
| Top-level object field | `toJsonPath(null, 'id')` | `$.id` |
| Depth-1 nested object field | `toJsonPath('address', 'city')` | `$.address.city` |
| Top-level array column header | `toJsonPath(null, 'id', true)` | `$[*].id` |
| Nested array-of-objects column header | `toJsonPath('items', 'sku', true)` | `$.items[*].sku` |
