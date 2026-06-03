# Release Notes: v1.2.0

## Release Metadata

- **Version**: v1.2.0
- **Release Date**: 2026-06-02
- **Release Window**: 2026-05-31 → 2026-06-02
- **Previous Version**: v1.1.0
- **Commit Range**: `1c0004479f50653075ad4a45ef9f88d335bc34bd..89292f84fee3ea9312e4087c5a080cbaae390abd` (`v1.1.0..HEAD`)
- **Commits**: 9
- **Contributors**: 1
- **Merged PRs**: 1 (PR #1)

## Highlights

v1.2.0 is a focused developer-experience release built around a single theme: closing the edit-and-verify loop in the API response panel. Before this release, developers who received a nested JSON object and wanted to modify one field had to copy the response into a text editor, hand-edit it, and paste it back. That friction is now gone.

The response panel gains five tightly integrated improvements, all confined to `EndpointTester.tsx` with no changes to the .NET library or NuGet package boundary. Nested object fields collapse into editable sub-forms, a "Copy as cURL" button mirrors the existing request-side button, a pretty/minified toggle lets developers scan large payloads without scrolling, JSONPath tooltips label every field for future request chaining, and tables truncate to 2 rows by default to prevent large arrays from dominating the panel.

A shared `buildCurl` utility was extracted as part of this work, establishing a single authoritative cURL format across both the request and response panels.

## New Features

### Response Renderer Refinements

Five targeted improvements to the endpoint tester response panel that close the developer edit-and-verify loop:

**Editable Depth-1 Nested Objects** — Primitive fields inside nested response objects now render as collapsible editable sub-forms. The section is collapsed by default and reveals an editable form on click. Edited values are merged into the "Copy as JSON" output with correct type coercion. Arrays of objects within nested objects render as read-only sortable tables; flat primitive arrays render as read-only JSON blocks. Depth-2+ objects remain read-only JSON to avoid unbounded editor complexity.

**Copy as cURL in Response Panel** — A "Copy as cURL" button appears in the response panel after each successful API call. It generates the same cURL command format used by the existing request-side button, capturing the outgoing request at `onSuccess` time to guarantee the command always corresponds to the response displayed.

**Pretty / Minified JSON Toggle** — Raw JSON display contexts (fallback `<pre>` blocks and read-only JSON spans) now offer a toggle between 2-space-indented (pretty) and single-line (minified) views. The active view is reflected in clipboard output when copying JSON. The toggle is absent on sortable table views.

**Session-Persistent Toggle Preference** — The pretty/minified preference is stored in `useHarnessConfigStore` and persists across all API calls within the same browser session. It resets to pretty-print on page reload, consistent with the session-only, non-persisted design of that store.

**JSONPath Field Tooltips** — Every field in the response form shows its dot-notation JSONPath address (`$.field`, `$.parent.field`, `$[*].col`, `$.parent[*].col`) as a hover/focus tooltip. Clicking the label copies the path to the clipboard. Clipboard failures route silently to `useDebugStore.addError('Unknown')`.

**2-Row Table Truncation** — All sortable tables (top-level and nested arrays of objects) now show only the first 2 rows by default. A "Show all N items" control reveals all remaining rows inline; a "Show less" control collapses back to 2 rows. The expanded state resets with each new API call.

**Spec**: [View archived spec](specs/001-response-renderer/spec.md)

## Bug Fixes

None.

## Breaking Changes

None. All changes are confined to the React SPA display layer. The `.NET` public API surface (`MapApiTestSpark`, `ApiTestSparkOptions`, `ApiTestSparkExtensions`) is unchanged. No NuGet version bump to the C# library is required.

## Deprecations

None.

## Architectural Decisions

- **ADR-005**: Session-only UI preference stored in `useHarnessConfigStore` — no new store, no `persist` middleware — [View](./../decisions/ADR-005.md)
- **ADR-006**: `buildCurl` extracted to `src/utils/curlBuilder.ts` — single authoritative cURL format for both panels — [View](./../decisions/ADR-006.md)
- **ADR-007**: Native `<details>`/`<summary>` for collapsible nested object sections — browser-native, zero JS overhead — [View](./../decisions/ADR-007.md)

## Deferred Features

None — all five user stories in spec `001-response-renderer` were completed in this release. The following items were explicitly deferred to future specs during specification:

- **D-001**: "Use as request body" button (requires cross-component state coordination) → Request chaining spec
- **D-002**: Response diffing → Response comparison spec
- **D-003**: In-session response snapshots → Response comparison spec
- **D-005**: Multi-screen rendering (requires shared component extraction) → Renderer extraction spec

## Upgrade Guide

No upgrade steps required. v1.2.0 is a pure UI enhancement release — all improvements appear automatically in the response panel. No changes to `Program.cs`, `ApiTestSparkOptions`, or any .NET code are needed.

## Metrics

| Metric | Value |
|--------|-------|
| Features Delivered | 1 (spec 001-response-renderer, 5 user stories) |
| Bugs Fixed | 0 |
| PRs Merged | 1 |
| ADRs Created | 3 |
| Contributors | 1 |
| Commits | 9 |

---

*Release documentation generated by /devspark.release v1.0*
