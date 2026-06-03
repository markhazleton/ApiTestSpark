```yaml
gate: analyze
status: pass
blocking: false
severity: info
summary: "7 findings all resolved 2026-06-02. No constitution violations. 100% requirement coverage. Ready for implementation."
```

## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| A-001 | Underspecification | HIGH | plan.md § Phase 1, tasks.md T014 | `lastRequest` state shape used in T014/T015 is not typed in data-model.md — implementer must infer the interface | Add `LastRequest` interface to data-model.md: `{ method, url, headers: Record<string,string>, body?: unknown }` |
| A-002 | Underspecification | HIGH | plan.md § Phase 0 "buildCurl extraction", tasks.md T014–T015 | URL construction for cURL (how `endpoint.path + resolved pathParams + queryParams` becomes a full URL) is not described — implementer may produce incorrect cURL for parameterised routes | Add a sentence to plan.md Phase 0 Decision describing URL resolution: substitute path params, append query string |
| A-003 | Underspecification | HIGH | spec.md US4, tasks.md T024 | JSONPath for cells inside nested arrays-of-objects (e.g. `$.items[0].sku` vs `$.items[*].sku`) is unspecified — `toJsonPath` helper will need to handle this case but spec only defines `$[*].id` for top-level arrays | Clarify in spec edge cases or plan: nested array column headers use `$.parentKey[*].colKey` |
| A-004 | Coverage Gap | MEDIUM | tasks.md row-truncation phase | Row truncation story (T029–T032) is not labelled with a [USn] tag — it was added post-US-numbering and has no story label, making it harder to trace back to FR-016/SC-007 | Label T029–T032 as [US6] or add a `## User Story 6` section header; update FR-016/SC-007 references |
| A-005 | Inconsistency | MEDIUM | plan.md rendering table vs tasks.md | `NestedObjectForm` referenced in plan's rendering contract table does not appear in tasks — tasks call it "nested sub-form". Causes ambiguity about whether it is a named function or inline JSX | Standardise to one name throughout — recommend "nested sub-form" (inline JSX, no separate named function needed) |
| A-006 | Inconsistency | MEDIUM | plan.md vs data-model.md | `SortableTable` called "sub-function" in plan and "inner function" in data-model — same concept, two labels | Standardise to "inner function `SortableTable`" in both files |
| A-007 | Underspecification | LOW | spec.md Edge Cases | `undefined` / missing fields (D-007 deferred) are not addressed in any FR or task — TypeScript strict mode will surface this during implementation | No action required now (deferred by design); note in tasks.md Polish phase to handle `undefined` gracefully if encountered |

---

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|----------------|-----------|----------|-------|
| FR-001 editable-depth-0-1-objects | ✅ | T007, T008 | |
| FR-002 depth-2-readonly | ✅ | T008 | Handled by not recursing |
| FR-003 nested-array-rendering | ✅ | T012 | |
| FR-004 copy-json-with-edits | ✅ | T010 | |
| FR-005 copy-as-curl-button | ✅ | T015 | |
| FR-006 curl-includes-method-url-headers-body | ✅ | T016 | |
| FR-007 pretty-minified-toggle | ✅ | T019 | |
| FR-008 copy-reflects-active-view | ✅ | T020 | |
| FR-009 jsonpath-tooltip | ✅ | T022, T023, T024 | |
| FR-010 click-jsonpath-copies | ✅ | T022, T023, T024 | |
| FR-011 clipboard-failures-to-debug-store | ✅ | T009, T015, T022–T024, T034 | |
| FR-012 nested-collapsible-default-closed | ✅ | T008 | |
| FR-013 edits-reset-on-new-response | ✅ | T007 | |
| FR-014 circular-reference-inline-text | ✅ | T011 | |
| FR-015 toggle-persists-session | ✅ | T018, T026, T027 | |
| FR-016 table-2-row-default-show-all | ✅ | T029, T030, T031 | Story label gap (A-004) |
| SC-001 nested-edit-under-10s | ✅ | T007–T013 | Manual browser test T036 |
| SC-002 curl-copy-one-click | ✅ | T014–T016 | |
| SC-003 toggle-no-data-loss | ✅ | T019–T021 | |
| SC-004 jsonpath-one-click | ✅ | T022–T025 | |
| SC-005 zero-dotnet-changes | ✅ | All tasks — no .NET files touched | |
| SC-006 preference-persists | ✅ | T026–T028 | |
| SC-007 2-row-default | ✅ | T029–T032 | Story label gap (A-004) |

---

## Constitution Alignment Issues

None. All 8 principles checked:

- §I (TypeScript strict): `npm run verify` mandated at T004, T013, T017, T021, T025, T028, T032, T035
- §II (ESLint): `npm run lint` mandated at same checkpoints
- §III (layer separation): `buildCurl` correctly in `src/utils/`; no layer violations planned
- §IV (API client pattern): N/A — no new API clients
- §V (Zustand rules): `jsonViewMode` in `useHarnessConfigStore` without persist — confirmed in T027
- §VI (observability): FR-011 + T034 polish sweep cover all clipboard catch-paths
- §VII (testing stance): No new test framework introduced
- §VIII (PII/PHI): No new data capture paths

---

## Unmapped Tasks

None — all 36 tasks map to at least one FR, SC, or constitution gate.

---

## Metrics

- **Total Requirements**: 23 (FR-001–FR-016 + SC-001–SC-007)
- **Total Tasks**: 36 (T001–T036)
- **Coverage**: 100% (all requirements have ≥1 task)
- **Ambiguity Count**: 1 (A-003 JSONPath for nested array cells)
- **Duplication Count**: 0
- **Critical Issues**: 0
- **High Issues**: 3 (A-001, A-002, A-003)
- **Medium Issues**: 2 (A-004, A-005, A-006)
- **Low Issues**: 1 (A-007)

---

## Next Actions

No critical issues — implementation may proceed. Recommended pre-implementation fixes:

1. **A-001** (HIGH): Add `LastRequest` interface to `data-model.md` before T014
2. **A-002** (HIGH): Add URL-resolution note to `plan.md` before T015
3. **A-003** (HIGH): Decide `$.parentKey[*].colKey` vs `$.parentKey[0].colKey` for nested array column JSONPath — add one sentence to spec edge cases or plan

Items A-004 through A-007 may be addressed during implementation without blocking.

```yaml
findings:
  - finding_id: analyze-A-001
    severity: high
    description: "lastRequest state shape used in T014/T015 is not typed in data-model.md — implementer must infer the interface from context."
    recommended_action: "Add LastRequest interface { method, url, headers: Record<string,string>, body?: unknown } to data-model.md"
    execution_mode: auto
    status: resolved
    outcome: "LastRequest interface added to data-model.md with full field documentation and URL construction note."
  - finding_id: analyze-A-002
    severity: high
    description: "URL construction for the cURL command (resolving path params, appending query string) is not described in plan.md — implementer may produce incorrect URLs for parameterised routes."
    recommended_action: "Add a note to plan.md Phase 0 buildCurl decision describing URL resolution: substitute {param} placeholders, append ?key=val query string."
    execution_mode: auto
    status: resolved
    outcome: "URL construction steps added to plan.md buildCurl decision section; also documented in LastRequest interface in data-model.md."
  - finding_id: analyze-A-003
    severity: high
    description: "JSONPath for cells inside nested arrays-of-objects is unspecified. Spec defines $[*].id for top-level arrays but does not address $.items[*].sku for nested array columns."
    recommended_action: "Add one sentence to spec Edge Cases or plan.md: nested array column headers use $.parentKey[*].colKey format."
    execution_mode: selective
    status: resolved
    outcome: "Format rules table added to data-model.md toJsonPath section; spec Key Entities updated with all four path formats; T024 updated to use $.parentKey[*].colKey for nested array columns."
  - finding_id: analyze-A-004
    severity: medium
    description: "Row truncation tasks T029–T032 have no [USn] story label — traceability to FR-016/SC-007 is implicit only."
    recommended_action: "Label T029–T032 as [US6] or add a ## User Story 6 phase header with FR-016/SC-007 references."
    execution_mode: auto
    status: resolved
    outcome: "T029–T032 labelled [US6] in tasks.md."
  - finding_id: analyze-A-005
    severity: medium
    description: "NestedObjectForm referenced in plan.md rendering table but tasks use 'nested sub-form' — ambiguous whether this is a named function or inline JSX."
    recommended_action: "Standardise to 'nested sub-form (inline JSX)' in plan.md rendering table."
    execution_mode: auto
    status: resolved
    outcome: "plan.md rendering table updated to 'inline JSX nested sub-form inside a <details> element'; NestedObjectForm name removed."
  - finding_id: analyze-A-006
    severity: medium
    description: "SortableTable called 'sub-function' in plan.md and 'inner function' in data-model.md — same concept, two labels."
    recommended_action: "Standardise to 'inner function SortableTable' in both files."
    execution_mode: auto
    status: resolved
    outcome: "plan.md updated to 'inner function SortableTable'; data-model.md section heading updated to match."
  - finding_id: analyze-A-007
    severity: low
    description: "undefined/missing field handling (D-007) not addressed in any FR or task — TypeScript strict mode will surface this at implementation time."
    recommended_action: "Add a note to tasks.md Polish phase to handle undefined values gracefully in ResponseObjectForm."
    execution_mode: auto
    status: resolved
    outcome: "T033a added to Polish phase: treat undefined same as null (read-only display); TypeScript strict mode will catch any gaps at compile time."
```
