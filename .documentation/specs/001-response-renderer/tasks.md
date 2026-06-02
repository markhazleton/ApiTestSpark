# Tasks: Response Renderer Refinements

**Input**: Design documents from `.documentation/specs/001-response-renderer/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅

## Rationale Summary

### Core Problem

The EndpointTester response panel renders nested objects as read-only JSON blobs, forces developers to leave the tool to prepare follow-up request bodies, and shows no compact view for large payloads.

### Decision Summary

Five targeted improvements confined to `EndpointTester.tsx` and a new `src/utils/curlBuilder.ts` extraction: editable depth-1 nested objects, Copy-as-cURL in response panel, session-persistent pretty/minified toggle, JSONPath tooltips, and 2-row table truncation with show-all/show-less. No new routes, no new stores, no .NET changes.

### Key Drivers

- Developer edit-and-verify loop interrupted by read-only nested objects
- cURL copy asymmetry between request and response panels
- Large payload verbosity with no compact view

### Reviewer Guidance

Verify: (1) `nestedFields` resets on every new `data` prop; (2) all clipboard catches route to `useDebugStore.addError('Unknown')`; (3) `jsonViewMode` lands in `useHarnessConfigStore` without `persist`; (4) `buildCurl` extracted not duplicated; (5) `npm run verify` and `npm run lint` pass clean.

---

## Phase 1: Setup

**Purpose**: Extract shared utility and extend store before any story work begins.

- [x] T001 Extract `buildCurl` from `src/components/DebugPanel.tsx` into `src/utils/curlBuilder.ts` as a typed pure function `buildCurl({ method, url, headers, body })` and re-export from `src/utils/index.ts`
- [x] T002 Update `src/components/DebugPanel.tsx` to import `buildCurl` from `src/utils/curlBuilder.ts` (removes inline definition, behaviour unchanged); run `npm run verify` immediately after this change before proceeding — brownfield import update, catch signature drift early (critic-004)
- [x] T003 Add `jsonViewMode: 'pretty' | 'minified'` field (default `'pretty'`) and `setJsonViewMode` action to `src/store/harnessConfigStore.ts` — no `persist` middleware
- [x] T004 Run `npm run verify` and `npm run lint` — confirm zero errors before proceeding

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 2: Foundational

**Purpose**: Add `toJsonPath` inline helper and `SortableTable` sub-function inside `EndpointTester.tsx` — both are reused across multiple user stories.

- [x] T005 Add inline pure helper `toJsonPath(parentKey: string | null, fieldKey: string): string` inside `src/components/host-api/EndpointTester.tsx` — produces `$.field`, `$.parent.field`, `$[*].field`
- [x] T006 Extract the existing array-of-objects table rendering block from `ResponseView` into a named inner function `SortableTable` inside `EndpointTester.tsx`, preserving all existing sort behaviour — no behaviour change, sets up reuse for nested arrays (US1-S5)

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 3: User Story 1 — Edit Nested Field and Re-submit (Priority: P1) 🎯 MVP

**Goal**: Depth-1 nested objects render as collapsible editable forms; edited values reconstruct into Copy-as-JSON output.

**Independent Test**: Call any endpoint returning `{ id: 1, address: { city: "Austin" } }`, expand the `address` section, change `city` to "Dallas", click "Copy as JSON", paste — confirm `address.city` is "Dallas" and all other fields are intact.

- [x] T007 [US1] Add `nestedFields: Record<string, Record<string, string>>` to `ResponseObjectForm` in `src/components/host-api/EndpointTester.tsx`; reset via component `key` prop (JSON.stringify(data)) — forces remount on new response per critic-001 fix
- [x] T008 [US1] In `ResponseObjectForm`, replace the existing read-only `JSON.stringify(orig)` span for `isPlainObject(orig)` fields with a `<details>`/`<summary>` collapsible section (closed by default) containing an editable sub-form for each primitive in the nested object
- [x] T009 [US1] Apply `toJsonPath` to each field label in the nested sub-form for tooltip display (title attribute); clicking the label copies the path using the clipboard guard pattern: check `navigator?.clipboard`, route to `useDebugStore.addError('Unknown')` if absent, then `.writeText().catch(addError)` (critic-002: sync TypeError in non-HTTPS if unguarded)
- [x] T010 [US1] Update `copyJson` in `ResponseObjectForm` to merge `nestedFields` into the reconstructed JSON output, preserving original type coercion (number, boolean, string)
- [x] T011 [US1] Handle `null` nested-object fields: render as read-only `null` text, not an editable input; handle circular references via `WeakSet` guard — render `[Circular reference detected]` as static text when detected
- [x] T012 [US1] Handle nested arrays inside `ResponseObjectForm`: flat primitive arrays → read-only JSON block; arrays-of-objects → render via `SortableTable` (reuses T006)
- [x] T013 [US1] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 4: User Story 2 — Copy Response as cURL (Priority: P2)

**Goal**: A "Copy as cURL" button appears in the response panel after a successful call, generating a valid cURL command for the outgoing request.

**Independent Test**: Execute any POST with a JSON body; click "Copy as cURL" in the response panel; paste into terminal — request reproduces exactly.

- [x] T014 [US2] Add `lastRequest` state (type `LastRequest | null`) to `EndpointTester` in `src/components/host-api/EndpointTester.tsx`; capture it in the `useMutation` `onSuccess` callback — NOT in `handleFire` (critic-005: fire-time capture causes cURL/response mismatch on rapid re-fire; success-time capture guarantees they always correspond)
- [x] T015 [US2] Add a "Copy as cURL" button to the response panel section (rendered when `data !== undefined`) that calls `buildCurl(lastRequest)` from `src/utils/curlBuilder.ts`; use clipboard guard pattern (`if (!navigator?.clipboard)` → addError, else `.writeText().catch(addError)`); button absent/disabled when `lastRequest` is null (critic-002)
- [x] T016 [US2] Confirm GET requests produce no `-d` flag; POST/PUT/PATCH with JSON body produce `-H "Content-Type: application/json"` and `-d '<body>'`
- [x] T017 [US2] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 5: User Story 3 — Pretty/Minified Toggle (Priority: P3)

**Goal**: Raw JSON display contexts offer a toggle between 2-space-indented and single-line JSON; preference persists across calls for the browser session.

**Independent Test**: Toggle to minified; make several more API calls; confirm each new response renders minified without re-toggling; refresh page — confirm resets to pretty.

- [x] T018 [US3] Read `jsonViewMode` and `setJsonViewMode` from `useHarnessConfigStore` inside `ResponseView` in `src/components/host-api/EndpointTester.tsx`
- [x] T019 [US3] Add a "Pretty / Minified" toggle button to raw JSON display contexts (fallback `<pre>` block and read-only JSON blocks inside `ResponseObjectForm`) — hidden on sortable table views
- [x] T020 [US3] Apply `JSON.stringify(data, null, 2)` when `jsonViewMode === 'pretty'` and `JSON.stringify(data)` when `'minified'`; Copy-as-JSON in those contexts reflects the active mode
- [x] T021 [US3] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 6: User Story 4 — JSONPath Field Labels (Priority: P3)

**Goal**: Every field in the response form displays its JSONPath address as a tooltip; clicking copies it.

**Independent Test**: Call any endpoint returning a nested object; hover `id` — tooltip shows `$.id`; hover `address → city` — tooltip shows `$.address.city`; click either — clipboard contains the path.

- [x] T022 [P] [US4] Apply `toJsonPath(null, key)` as `title` attribute on all top-level field labels in `ResponseObjectForm` in `src/components/host-api/EndpointTester.tsx`; clicking label uses clipboard guard pattern (critic-002) → copies path or routes to `useDebugStore.addError('Unknown')`
- [x] T023 [P] [US4] Apply `toJsonPath(parentKey, childKey)` as `title` attribute on nested sub-form field labels (depth-1 collapsible section added in T008); same clipboard guard
- [x] T024 [P] [US4] Apply `$.parentKey[*].colKey` JSONPath as `title` attribute on nested sortable table column headers; `$[*].colKey` for top-level array columns; same clipboard guard (A-003 fix: nested array column path format now specified)
- [x] T025 [US4] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 7: User Story 5 — Session-Persistent Toggle Preference (Priority: P3)

**Goal**: Pretty/minified toggle preference set in US3 now persists for the full browser session without re-toggling.

**Note**: US3 (T018) already reads from `useHarnessConfigStore`. This phase verifies the end-to-end session persistence behaviour and confirms the reset-on-reload invariant.

**Independent Test**: Toggle to minified; navigate between endpoints; make multiple calls — each renders minified; refresh — renders pretty.

- [x] T026 [US5] Verify that `ResponseView` reads `jsonViewMode` from store (not local state) — the store value persists across re-renders when new `data` arrives; confirm no local `useState` for this preference exists in `ResponseView`
- [x] T027 [US5] Confirm `useHarnessConfigStore` has no `persist` middleware (Constitution §V) — store resets to `'pretty'` on page reload by design
- [x] T028 [US5] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 8: User Story Row Truncation — 2-Row Default with Show-All/Show-Less

**Goal**: All sortable tables (top-level and nested) show only 2 rows by default with a two-way expand/collapse control.

**Note**: This story was added during spec review (FR-016/SC-007). It applies to both the top-level array renderer and the nested array-of-objects renderer introduced in T012.

**Independent Test**: Call any endpoint returning an array with >2 items; confirm only 2 rows visible; click "Show all N items"; confirm all rows appear and "Show less" appears; click "Show less"; confirm returns to 2 rows.

- [x] T029 [P] [US6] Add `tableExpanded: boolean` local state (default `false`) to the `SortableTable` inner function in `src/components/host-api/EndpointTester.tsx`; when `false` slice rows to first 2; when `true` show all (FR-016)
- [x] T030 [P] [US6] Render "Show all N items" control when `!tableExpanded && rows.length > 2`; render "Show less" when `tableExpanded && rows.length > 2`; clicking toggles `tableExpanded`
- [x] T031 [US6] Confirm `tableExpanded` is local state (not store) so it resets with each new render per FR-016
- [x] T032 [US6] Run `npm run verify` and `npm run lint` — confirm zero errors

**Checkpoint**: Phase complete — 2026-06-02

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T033 [P] Add `toJsonPath` to top-level field labels on existing `ResponseObjectForm` for US4 completeness — verify title attributes render in browser
- [x] T033a [P] Handle `undefined` values gracefully in `ResponseObjectForm` field iteration: treat `undefined` the same as `null` (read-only display, not an editable input); TypeScript strict mode will surface any uncovered cases at compile time (A-007)
- [x] T034 [P] Audit all clipboard call-sites in `EndpointTester.tsx` — confirm every site uses the full guard pattern: `if (!navigator?.clipboard)` → addError (covers non-HTTPS sync TypeError, critic-002), then `.writeText().catch(addError)` (covers permission-denied async failure, FR-011)
- [x] T035 Final `npm run verify` and `npm run lint` — zero errors required before PR
- [x] T036 Manual browser smoke test against `SampleApi` demo covering all 5 stories (critic-003 — no automated regression guard; these steps are the only safety net):
  - **US1**: Call endpoint returning nested object (e.g. `GET /users/{id}`); expand nested section; change a field; click "Copy as JSON"; verify clipboard contains updated nested value and all other fields intact; make a second call; confirm edited values reset
  - **US2**: Execute POST with JSON body; confirm "Copy as cURL" button appears; click it; paste into terminal; verify call reproduces; confirm button absent before first call
  - **US3+US5**: Toggle to minified; navigate to different endpoint; make a call; confirm response renders minified without re-toggling; refresh page; confirm resets to pretty-print
  - **US4**: Hover a top-level field label — confirm `$.field` tooltip; hover a nested field — confirm `$.parent.field` tooltip; click label — confirm clipboard contains path; hover array column header — confirm `$[*].col` or `$.parent[*].col` tooltip
  - **US6**: Call array endpoint with >2 items; confirm 2 rows visible + "Show all N items"; click — confirm all rows + "Show less"; click "Show less" — confirm returns to 2 rows; make new call — confirm resets to 2 rows

**Checkpoint**: Phase complete — 2026-06-02. All tasks including T036 smoke test passed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion
- **Phases 3–8 (User Stories)**: All depend on Phase 2; may proceed sequentially or in priority order
- **Phase 9 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (needs `SortableTable`, `toJsonPath`)
- **US2 (P2)**: Depends on Phase 1 (`buildCurl` extracted); independent of US1
- **US3 (P3)**: Depends on Phase 1 (`jsonViewMode` in store); independent of US1/US2
- **US4 (P3)**: Depends on Phase 2 (`toJsonPath`); T022–T024 parallelisable within phase
- **US5 (P3)**: Depends on US3 (T018 must exist); verification phase only
- **Row truncation**: Depends on Phase 2 (`SortableTable`); independent of US1–US5

### Parallel Opportunities

- T001 and T003 can run in parallel (different files)
- T022, T023, T024 within US4 can run in parallel (different sites in same file; coordinate to avoid conflicts)
- T029 and T030 within row truncation can run in parallel
- T033 and T034 in Polish can run in parallel

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. Complete Phase 3 (US1 — nested editing)
3. **Stop and validate**: edit a nested field, copy JSON, verify output
4. Proceed to US2–US5 + row truncation incrementally

### Full Delivery Order

1. Phase 1 → Phase 2 → US1 → US2 → US3 → US5 (verify) → US4 → Row truncation → Polish

---

## Notes

- No React test framework — verification is `npm run verify` + `npm run lint` + manual browser smoke test
- All new clipboard call-sites must have a `.catch` routing to `useDebugStore.addError('Unknown')`
- `jsonViewMode` must live in store, not local state — failure to do so breaks session persistence
- `nestedFields` must reset on `data` prop change — use `useState` initialiser pattern matching existing `fields`
- `buildCurl` is extracted, not duplicated — `DebugPanel.tsx` import must be updated in T002
