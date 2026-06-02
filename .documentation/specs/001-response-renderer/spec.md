---
classification: full-spec
risk_level: medium
target_workflow: specify-full
required_artifacts: spec, plan, tasks
recommended_next_step: plan
required_gates: checklist, analyze, critic
---

# Feature Specification: Response Renderer Refinements

**Feature Branch**: `001-response-renderer`
**Created**: 2026-06-02
**Status**: Draft

## Product Owner Overview

**What are we building?**
Five small improvements to the response display panel in the API testing tool — all shipping together, zero configuration changes required from any team consuming the tool.

**Why now?**
Developers are copying JSON responses into a text editor, editing a field, and pasting it back just to test a follow-up request. That's friction we can eliminate in one focused sprint. The other three improvements (cURL copy, compact view, field path labels) are low-effort additions that round out the same workflow.

**What does "done" look like?**

| Improvement | Before | After |
|-------------|--------|-------|
| Nested object editing | Fields inside nested objects are read-only | Primitive fields become editable inline; nested arrays of objects render as sortable tables; modified values copy out as valid JSON |
| Copy as cURL | Only available on the outgoing request side | Also available on the response panel — one click to reproduce any call |
| Pretty / Minified toggle | JSON always shown fully expanded; preference resets on every call | Toggle persists for the whole browser session; resets only on page reload |
| JSONPath labels | No indication of a field's path in the object | Every field shows its dot-notation path (e.g., `$.address.city`); click to copy |

**What are we NOT doing?**

- No unlimited-depth editing (nested objects beyond one level stay read-only)
- No saving or sharing responses across sessions
- No changes to how the tool is installed or configured in a .NET project
- No request chaining, response diffing, or saved snapshots (deferred to future specs)

**Risk**: Medium — changes are confined to the display layer. No backend, no database, no new dependencies.

---

## Rationale Summary

### Core Problem

The Response Renderer in the endpoint tester displays nested objects as read-only JSON blobs. A developer who wants to take a nested field from one response and submit it as part of the next request must manually copy, parse, and re-enter that data — interrupting the edit-and-verify loop that the tool exists to support.

Additionally, large JSON payloads have no compact view. Developers working with verbose API responses must scroll through fully expanded JSON to scan for the field they care about.

### Decision Summary

Refine the existing `ResponseView` / `ResponseObjectForm` infrastructure with four targeted improvements: editable forms for nested objects, JSONPath-style key display, a "Copy as cURL" button for received responses, and a pretty-print / minified JSON toggle. No new stores, no .NET changes, no routing additions.

### Key Drivers

- The edit-and-verify loop is broken when nested objects are read-only — the developer must leave the tool to prepare the next request body.
- "Copy as cURL" already exists for the *outgoing* request; the same affordance is absent for the received response, creating an asymmetry that surprises developers.
- Pretty-print-only JSON forces scrolling through large payloads; a minified toggle lets developers scan structure at a glance.

### Source Inputs

- Existing `ResponseObjectForm()` in `src/components/host-api/EndpointTester.tsx` — editable forms for top-level primitives, read-only for nested objects.
- Existing `buildCurl()` in `src/components/DebugPanel.tsx` — request-side cURL builder, no response-side equivalent.
- All JSON rendering uses fixed `JSON.stringify(data, null, 2)` — no toggle exists.

### Tradeoffs Considered

- **Option A — full recursive editor**: Unlimited-depth editable tree for nested objects. Rejected: high complexity, significant UX risk for deeply nested payloads, out of scope for a local developer tool.
- **Option B — one extra level of nesting only (selected)**: Editable forms for immediate children of nested objects (depth-2), read-only beyond that. Delivers the core use case without building a general tree editor.
- **Option C — extract to a shared component first**: Refactor `ResponseView` and `ResponseObjectForm` into `src/components/shared/` before adding features. Deferred: valuable but risks scope creep; refactor can follow in a subsequent spec.

### Architectural Impact

- All changes are confined to `src/components/host-api/EndpointTester.tsx`. `src/components/shared/JsonDisplay.tsx` and all other screens are out of scope for this feature.
- No new stores, no new API clients, no new routes, no changes to `MapApiTestSpark()` or any .NET artifacts.
- The JSONPath key display (`$.id`, `$.address.city`) establishes a naming contract that a future request-chaining spec can reference — this is a foundation, not the chaining feature itself.

### Reviewer Guidance

Focus on: (1) that nested object edits reconstruct valid JSON when "Copy as JSON" is used, (2) that the "Copy as cURL" in the response panel correctly captures the outgoing request (not the response body), (3) that the pretty/minified toggle does not lose data.

---

## User Scenarios & Testing

### User Story 1 — Edit a Nested Field and Re-submit (Priority: P1)

A developer calls a `GET /users/{id}` endpoint and receives a response containing a nested `address` object. They want to change `address.city` and immediately POST that modified object to a different endpoint — without leaving the tool or writing any JSON by hand.

**Why this priority**: This is the core edit-and-verify loop improvement. Without it, the developer must manually copy the JSON, edit it in a text editor, and paste it back. Solving this first delivers the highest per-effort value.

**Independent Test**: Can be fully tested by calling any endpoint that returns an object with a nested object field, editing a primitive inside that nested object, then clicking "Copy as JSON" and verifying the clipboard contains the modified JSON with the nested value correctly updated.

**Acceptance Scenarios**:

1. **Given** a response object containing a nested object field (e.g., `address: { city: "Austin" }`), **When** the developer clicks to expand the nested object's collapsible section (collapsed by default), **Then** each primitive field within the nested object is rendered as an editable input (text, number, or boolean select).
2. **Given** a nested object field is edited (e.g., `city` changed to "Dallas"), **When** the developer clicks "Copy as JSON", **Then** the clipboard contains valid JSON with the updated nested value and all other fields intact.
3. **Given** a response object whose nested field is itself an object (depth-3), **When** the developer views the response form, **Then** the depth-3 nested object is rendered as read-only JSON (not an editable form) — depth limit is two levels.
4. **Given** a nested flat array field (e.g., `tags: ["a", "b"]`), **When** the developer views the response form, **Then** the array field is rendered as read-only JSON.
5. **Given** a nested array-of-objects field (e.g., `items: [{ sku: "A1", qty: 3 }]`), **When** the developer views the response form, **Then** the array is rendered as a read-only sortable table — identical to how a top-level array response is displayed.
6. **Given** a sortable table (top-level or nested) with more than 2 rows, **When** the developer views the response, **Then** only the first 2 rows are visible and a "Show all N items" control is present; clicking it reveals all rows inline and replaces the control with "Show less".
7. **Given** a table is fully expanded via "Show all N items", **When** the developer clicks "Show less", **Then** the table collapses back to 2 rows.

---

### User Story 2 — Copy a Response as cURL (Priority: P2)

A developer receives a response from the endpoint tester and wants to reproduce or share the exact call that produced it — as a cURL command they can paste into a terminal or share with a colleague.

**Why this priority**: The request-side "Copy as cURL" already exists; adding the symmetric response-side button closes a UX gap without introducing new complexity. Rated P2 because the existing debug panel already provides partial access to this data.

**Independent Test**: Can be fully tested by executing any API call in the endpoint tester, clicking the new "Copy as cURL" button in the response panel, and pasting the result into a terminal to confirm the call reproduces.

**Acceptance Scenarios**:

1. **Given** a completed API call with a visible response, **When** the developer clicks "Copy as cURL" in the response panel, **Then** the clipboard contains a valid cURL command reconstructing the outgoing request (method, URL, headers, body) that produced this response.
2. **Given** a GET request with no body, **When** the developer copies as cURL, **Then** the generated command contains no `-d` or `--data` flag.
3. **Given** a POST request with a JSON body, **When** the developer copies as cURL, **Then** the generated command includes `-H "Content-Type: application/json"` and `-d '<body>'`.
4. **Given** no API call has been made yet (empty response panel), **When** the developer views the response panel, **Then** the "Copy as cURL" button is absent or disabled.

---

### User Story 3 — Toggle Pretty Print / Minified JSON (Priority: P3)

A developer working with a verbose API response wants to quickly scan the raw structure without scrolling through hundreds of lines of indented JSON. They toggle to a minified view to see the full payload compactly, then toggle back to pretty-print when they find the field they need.

**Why this priority**: Improves readability for large payloads but does not change any workflow — the developer can already read the JSON, just less conveniently. Rated P3.

**Independent Test**: Can be fully tested by calling an endpoint that returns a large JSON object, toggling the minified view, confirming the payload is identical but without indentation, then toggling back to confirm the pretty-printed view is restored.

**Acceptance Scenarios**:

1. **Given** a JSON response is displayed in pretty-print format (default), **When** the developer clicks the "Minify" toggle, **Then** the JSON is rendered on a single line without whitespace between tokens.
2. **Given** the response is in minified view, **When** the developer clicks the "Pretty" toggle, **Then** the JSON is rendered with standard 2-space indentation.
3. **Given** the developer switches between views, **When** they copy the JSON (via "Copy as JSON"), **Then** the clipboard reflects whichever view is currently active.
4. **Given** an array response displayed as a sortable table, **When** the developer views the response, **Then** the pretty/minified toggle is not shown (toggle applies only to raw JSON display contexts, not table views).

---

### User Story 4 — Identify Fields by JSONPath (Priority: P3)

A developer inspects a response and wants to reference a specific nested field (e.g., `$.address.city`) in a subsequent request. They see a JSONPath-style label next to each field in the response form, making it easy to identify and copy the exact path without manually tracing the object hierarchy.

**Why this priority**: Foundation for future request chaining, but delivers standalone value as a readability improvement. Rated P3 because it is informational only — no behavior changes, no data modifications.

**Independent Test**: Can be fully tested by calling any endpoint returning a nested object and confirming that each visible field in the response form displays its JSONPath address (e.g., top-level `id` shows `$.id`, nested `address.city` shows `$.address.city`).

**Acceptance Scenarios**:

1. **Given** a response object is rendered in the editable form view, **When** the developer hovers or focuses a top-level field label (e.g., `id`), **Then** a tooltip displays its JSONPath address (e.g., `$.id`).
2. **Given** a response object has an expanded nested object (e.g., `address`), **When** the developer hovers or focuses a child field label (e.g., `city`), **Then** a tooltip displays the full JSONPath address (e.g., `$.address.city`).
3. **Given** a response is displayed as a sortable table (array), **When** the developer hovers or focuses a column header, **Then** a tooltip displays the JSONPath for that field relative to a row (e.g., `$[*].id`).
4. **Given** a JSONPath tooltip is visible, **When** the developer clicks the field label, **Then** the JSONPath string is copied to the clipboard.

---

### User Story 5 — Persist Pretty/Minified Preference Within Session (Priority: P3)

A developer who prefers minified JSON view has to toggle it on every call. Once they set their preference it should hold for the rest of the session without requiring repeated interaction.

**Why this priority**: Small ergonomic win that piggybacks directly on the toggle introduced in User Story 3. Storing the preference in the existing session-only `useHarnessConfigStore` requires no new store and no persistence changes.

**Independent Test**: Can be fully tested by toggling to minified view, making several additional API calls, and confirming each new response renders in minified view without re-toggling.

**Acceptance Scenarios**:

1. **Given** the developer has toggled to minified view, **When** a new API call completes and the response panel updates, **Then** the new response is rendered in minified view without requiring the developer to re-toggle.
2. **Given** the developer has toggled to pretty-print view, **When** they navigate to a different endpoint and make a call, **Then** the response renders in pretty-print view.
3. **Given** the app is reloaded (page refresh), **When** the developer makes an API call, **Then** the toggle resets to the default pretty-print view — the preference is session-only, not persisted across page loads.

---

### Edge Cases

- What happens when a nested object field has a `null` value? The field should render as a read-only "null" display, not an empty editable input.
- What happens when a response contains circular references? The renderer must not crash; the affected subtree renders as read-only text `[Circular reference detected]` with no debug store entry.
- What happens when the JSON payload is a primitive (string, number, boolean) at the root? The pretty/minified toggle should still work; the editable form and cURL copy should handle gracefully.
- What happens when the response body is empty (204 No Content)? "Copy as cURL" should generate the correct command; the pretty/minified toggle should not appear.
- What happens when a nested object contains more than 20 fields? The editable form should render all fields without truncation.
- What happens when an attribute of a response object is an array of objects (e.g., `items: [{ sku: "A1", qty: 3 }]`)? The nested array of objects MUST be rendered as a read-only sortable table (same as top-level array rendering), not as a raw JSON blob. The pretty/minified toggle does not apply to table views.
- What happens when a sortable table (top-level or nested) has many rows? Only the first 2 rows are shown by default; remaining rows are hidden behind a "Show all N items" disclosure. This prevents large arrays from dominating the response panel.

---

## Clarifications

### Session 2026-06-02

- Q: Where do clipboard/copy failures route? → A: Route through `useDebugStore.addError()` with category `'Unknown'`, silently — no toast or visible UI feedback.
- Q: How is a nested object section revealed in the response form? → A: Collapsible disclosure widget — collapsed by default, expands on click.
- Q: Do nested object edits persist across re-submissions? → A: No — edits reset with each new response; the form always reflects the latest response body.
- Q: How should circular references be surfaced in the response form? → A: Inline indicator — render `[Circular reference detected]` as read-only text in place of the affected subtree; no debug store entry.
- Q: Should copy buttons be disabled when clipboard API is unavailable? → A: No — buttons always render; clipboard failures are handled silently via `useDebugStore.addError()`; no upfront availability check.
- Q: What renders when a nested attribute is an array of objects (e.g., `items: [{sku, qty}]`)? → A: Read-only sortable table, same as top-level array rendering. Flat primitive arrays remain read-only JSON.
- Q: Should the pretty/minified toggle preference persist across calls within a session? → A: Yes — preference persists for the browser session via `useHarnessConfigStore`; resets to pretty-print on page reload.
- Q: Does the "Show all N items" expanded state persist within the session? → A: No — resets per response; each new API call starts with tables collapsed to 2 rows.
- Q: Can the developer re-collapse a table after expanding it? → A: Yes — two-way toggle: "Show all N items" expands; "Show less" collapses back to 2 rows.
- Q: Is there a row cap when "Show all" is activated? → A: No — all rows render; no cap, no pagination, no truncation notice.
- Q: Which screens do the new rendering rules apply to? → A: EndpointTester only — all five improvements are scoped to `src/components/host-api/EndpointTester.tsx`; other screens are unaffected.
- Q: How is the JSONPath address displayed per field? → A: Tooltip on hover/focus — not a visible label; click to copy.

---

## Requirements

### Functional Requirements

- **FR-001**: The response form MUST apply the same rendering rule at every level — an object at root or as a depth-1 child of another object MUST render as an editable form (primitive fields only: text, number, or boolean select).
- **FR-002**: Objects at depth-2 or deeper MUST render as a read-only JSON block — the editable form does not recurse beyond one level of nesting.
- **FR-003**: The response form MUST render nested array fields as follows: arrays of objects MUST render as a read-only sortable table (same behaviour as top-level array responses); flat arrays (primitives only) MUST render as read-only JSON. Arrays are never editable.
- **FR-004**: The "Copy as JSON" action MUST reconstruct the full response object, incorporating any edits made to nested object fields at depth-1.
- **FR-005**: A "Copy as cURL" button MUST appear in the response panel after a successful API call, generating a cURL command that reproduces the outgoing request.
- **FR-006**: The cURL command MUST include the HTTP method, full URL, all request headers, and the request body (if present).
- **FR-007**: JSON display contexts (raw JSON blocks, fallback pre blocks) MUST offer a pretty-print / minified toggle.
- **FR-008**: The active view (pretty or minified) MUST be reflected when the developer copies the JSON via any copy action in that context.
- **FR-009**: Each field in the response form MUST display its JSONPath address as a tooltip revealed on hover or focus — not as a persistent visible label.
- **FR-010**: Clicking a JSONPath label MUST copy that path string to the clipboard.
- **FR-011**: All clipboard write failures (Copy as JSON, Copy as cURL, Copy JSONPath) MUST be routed through `useDebugStore.addError()` with category `'Unknown'` — no visible UI feedback on failure.
- **FR-012**: Nested object fields in the response form MUST be rendered inside a collapsible disclosure widget that is collapsed by default and expands on user interaction.
- **FR-013**: Edited nested object field values MUST reset to the latest response body when a new API call completes — edits are not persisted across requests.
- **FR-014**: When a circular reference is detected in a response object, the affected subtree MUST render as read-only text `[Circular reference detected]` — no crash, no debug store entry.
- **FR-015**: The pretty-print / minified toggle preference MUST persist for the duration of the browser session — new responses MUST render using the last-set preference without requiring the developer to re-toggle. The preference MUST reset to pretty-print on page reload.
- **FR-016**: Sortable tables (top-level and nested) MUST show only the first 2 rows by default. When more rows exist, a "Show all N items" control MUST be displayed; activating it reveals all remaining rows inline. A "Show less" control MUST then appear to collapse back to 2 rows. The expanded state MUST reset with each new API call — it is not session-persistent.

### Rendering Rules (consistent across all levels)

The same shape always produces the same renderer, whether encountered at the top level or nested inside another object:

| Response shape | Renderer | Editable |
|----------------|----------|----------|
| Object (root or depth-1 child of another object) | Editable form — primitive fields only | Yes |
| Object (depth-2 or deeper) | Read-only JSON block | No |
| Array of objects (any depth) | Read-only sortable table | No |
| Array of primitives (any depth) | Read-only JSON block | No |
| Scalar at root (string, number, boolean) | Read-only pre block | No |

### Key Entities

- **ResponseObjectForm**: The editable form inside `EndpointTester.tsx` that renders object fields. This feature extends it to apply the same editable-form rendering to depth-1 nested objects, producing consistent behaviour at every level.
- **JSONPath address**: A dot-notation string starting with `$` that uniquely identifies a field within a response object (e.g., `$.address.city`). Display and copy only — no JSONPath query engine is introduced.
- **cURL command**: A shell-executable string that reproduces the outgoing HTTP request. Matches the format already used by `buildCurl()` in `DebugPanel.tsx`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A developer can take a nested primitive field from a GET response, modify it, and produce a valid JSON copy in under 10 seconds without leaving the tool.
- **SC-002**: A developer can obtain a "Copy as cURL" command for any completed API call in one click, from the response panel.
- **SC-003**: A developer can switch between pretty-print and minified JSON views without any data loss or visual glitch.
- **SC-004**: Every field visible in the response form displays a JSONPath address that a developer can copy in one click.
- **SC-005**: All five improvements are delivered with zero changes to the .NET library, NuGet package workflow, or startup configuration.
- **SC-006**: A developer who toggles to minified view does not need to re-toggle it for any subsequent API call within the same browser session.
- **SC-007**: A response array with more than 2 items renders without overwhelming the panel — only 2 rows are visible by default, with a single interaction to reveal the rest.

---

## Deferred Items

The following were identified during spec review and intentionally excluded from this feature. Each is a candidate for a future spec.

| # | Item | Why deferred | Suggested future spec |
|---|------|-------------|----------------------|
| D-001 | **"Use as request body" button** — one-click to send a (possibly edited) response directly into another endpoint's request body | Requires cross-component state coordination beyond the renderer; natural follow-on to this work | Request chaining spec |
| D-002 | **Response diffing** — call the same endpoint twice and highlight what changed | Requires snapshot storage and a diff algorithm; valuable for mutation API testing | Response comparison spec |
| D-003 | **In-session response snapshots** — pin a response for manual side-by-side comparison within the session | Requires UI layout changes beyond the renderer scope | Response comparison spec |
| D-004 | **Type inference badge** — display inferred field type (`str`, `num`, `bool`) next to each editable input | Low impact; can be added as a minor enhancement to the editable form without its own spec | Minor enhancement to this feature |
| D-005 | **Multi-screen rendering** — apply rendering rules to all API screens (Joke, JsonPlaceholder, etc.), not just EndpointTester | Explicitly out of scope for this feature; requires extracting `ResponseView` to `src/components/shared/` first | Renderer extraction / shared component spec |
| D-006 | **Nested table sort state isolation** — define whether two nested array-of-objects tables on the same response share sort state or are independent | Low impact now that tables default to 2 rows; deferred until real usage confirms it matters | Minor amendment to this spec or inline task decision |
| D-007 | **Undefined / missing field handling** — explicit rendering rule for fields absent from the response but present in a known schema | No schema awareness exists yet in the tool | OpenAPI schema integration spec |
