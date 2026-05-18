---
classification: full-spec
risk_level: medium
target_workflow: specify-full
required_artifacts: spec, plan, tasks
recommended_next_step: plan
required_gates: checklist, analyze, critic
---

# Feature Specification: Section Engine Refactor

**Feature Branch**: `001-section-engine-refactor`
**Created**: 2026-05-18
**Status**: Draft
**Input**: User description: "Refactor the Joke API and JSONPlaceholder sections to use a common engine and a section.json that documents the configuration of each. Create a section engine that reads section.json and renders the section. Make the section engine agnostic to which API is called."

## Rationale Summary

### Core Problem

The application currently models API sections as separate, manually wired feature implementations, which increases duplication in section layout and makes adding new sections slower and more error-prone.

### Decision Summary

Introduce a shared section engine that renders sections from per-section JSON configuration and delegates request execution to a pluggable API action contract. This keeps section rendering consistent while allowing each API integration to remain independent.

### Key Drivers

- Reduce repeated section-specific UI composition and configuration code.
- Preserve existing debugging and request correlation behavior while refactoring structure.
- Improve extensibility so additional API sections can be added with less bespoke wiring.

### Source Inputs

- User request to unify Joke API and JSONPlaceholder rendering through one engine.
- Existing project layering requirements (types/api/hooks/components separation and barrel exports).
- Existing expectation that API behavior and debug visibility remain intact.

### Tradeoffs Considered

- Option A: Keep independent sections and only share small helper utilities. Rejected because it does not remove repeated section composition logic.
- Option B: Hard-code engine behavior for known APIs. Rejected because it would not be API-agnostic.
- Selected: Configuration-driven section engine with API-agnostic execution contract and per-section JSON configuration.

### Architectural Impact

- Adds a section engine abstraction that becomes the canonical path for section rendering.
- Keeps API clients and hooks as dedicated integration points, preserving existing layering boundaries.
- Requires migration of Joke API and JSONPlaceholder section definitions into JSON-backed configuration entries.

### Reviewer Guidance

Focus review on API-agnostic boundaries, configuration completeness, and parity of user-visible behavior compared with current Joke API and JSONPlaceholder flows.

## Clarifications

### Session 2026-05-18

- Q: What should happen when a section.json is missing/invalid or maps to an unknown executor? → A: Render section shell disabled with inline error details and no request execution.
- Q: How should section.json compatibility be handled as the engine evolves? → A: Require schemaVersion and reject unsupported versions with inline section error.
- Q: How should section configuration failures be surfaced in observability/debug data? → A: Record as Configuration-category debug error events plus inline section error.
- Q: What is the migration completeness target for Joke API and JSONPlaceholder custom code? → A: Remove all custom Joke API/JSONPlaceholder source files and replace section definitions with `joke-session.json` and `jsonplaceholder-session.json`.
- Q: How much UI change is acceptable before versus after the refactor? → A: UI should remain fairly constant, with no material layout or interaction changes outside required configuration-error states.

## User Scenarios & Testing

### User Story 1 - Run Existing API Sections Through a Shared Experience (Priority: P1)

As a developer using the test harness, I can open Joke API and JSONPlaceholder sections that are rendered by one shared engine so I get consistent behavior and controls.

**Why this priority**: The core value is successful migration of existing sections without regression.

**Independent Test**: Open each migrated section and execute its primary request path, then verify request/response and error behavior remain available and understandable.

**Acceptance Scenarios**:

1. **Given** the user navigates to Joke API, **When** the section is opened, **Then** the section is rendered by the shared engine using Joke API configuration.
2. **Given** the user navigates to JSONPlaceholder, **When** the section is opened, **Then** the section is rendered by the shared engine using JSONPlaceholder configuration.

---

### User Story 2 - Add or Update Section Configuration Without Rebuilding Shared UI (Priority: P2)

As a maintainer, I can update section metadata and behavior settings in section configuration files so section definition changes are centralized and less repetitive.

**Why this priority**: Reduces maintenance effort and risk when introducing or adjusting sections.

**Independent Test**: Modify a non-breaking configuration property and verify the section reflects the updated configuration without requiring section-specific layout rewrites.

**Acceptance Scenarios**:

1. **Given** a valid configuration update for a section, **When** the app loads that section, **Then** the rendered section reflects the updated configuration.

---

### User Story 3 - Preserve API-Specific Behavior Through an Agnostic Engine Contract (Priority: P3)

As a maintainer, I can map each section to its own request executor while the engine stays unaware of API-specific details.

**Why this priority**: Ensures extensibility and avoids coupling the shared engine to a specific API.

**Independent Test**: Verify each migrated section invokes its intended API action and still returns expected result categories (success, API error, network/configuration error).

**Acceptance Scenarios**:

1. **Given** two sections with different API behaviors, **When** each section executes a request, **Then** each uses its mapped executor without engine-level API branching.

### Edge Cases

- Section configuration file is missing or unreadable for a registered section.
- Section configuration exists but is invalid or incomplete.
- Section configuration is syntactically valid but uses an unsupported schemaVersion.
- A section is configured but has no resolvable API executor mapping.
- A migrated section request fails and must still show failure details consistent with existing behavior.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST provide one shared section engine that renders section experiences from section configuration input.
- **FR-002**: The system MUST define section configuration in JSON files that document section identity, display metadata (including icon, theme, external docs link, and optional notice), and an adapter key that maps to the section's API executor.
- **FR-002a**: Each section configuration file MUST include a `schemaVersion` field, and the engine MUST validate it before rendering actionable controls.
- **FR-003**: The system MUST migrate both Joke API and JSONPlaceholder sections to the shared section engine.
- **FR-004**: The section engine MUST remain API-agnostic and MUST NOT contain API-specific conditional logic tied to Joke API or JSONPlaceholder.
- **FR-005**: The system MUST resolve API execution through an external mapping/contract so each section can call its corresponding API behavior without changing the engine.
- **FR-006**: The system MUST preserve existing user-visible request lifecycle outcomes for migrated sections, including successful responses and error outcomes.
- **FR-007**: The system MUST render the affected section shell in a disabled state with inline configuration error details, and MUST block request execution, when section configuration is missing, invalid, or references an unknown executor.
- **FR-007a**: The system MUST treat unsupported `schemaVersion` values as configuration-resolution failures and apply the same disabled inline-error behavior.
- **FR-008**: The system MUST keep current observability outcomes for migrated sections so request/response/error tracking remains available to users.
- **FR-008a**: The system MUST emit configuration-resolution failures as `Configuration` category debug error events while also showing inline section error details.
- **FR-009**: The completed migration MUST remove custom Joke API and JSONPlaceholder source implementation files from the codebase. API client files and hook files in `src/api/` and `src/hooks/` are retained as part of the authoritative API layer.
- **FR-010**: Section behavior for these two integrations MUST be defined via `joke-session.json` and `jsonplaceholder-session.json`, with no section-specific implementation files remaining for Joke API or JSONPlaceholder flows.
- **FR-011**: The migration MUST preserve existing section layout, control placement, labels, and primary interaction flow so the before/after UI remains materially the same for normal operation.
- **FR-012**: Any UI differences introduced by this refactor MUST be limited to required configuration-error handling states and must not alter normal successful request workflows.

### Key Entities

- **Section Definition**: A configuration record that identifies a section, includes a schemaVersion, and defines presentation metadata (`displayName`, `description`, `icon`, `theme`, `externalDocs`, optional `notice`) plus an `adapter` key for execution mapping.
- **Section Engine**: The shared renderer/orchestrator that consumes section definitions and produces section UI behavior.
- **Adapter Registry**: A registry (formerly "Section Executor Mapping") that maps section `adapter` keys to API-specific request action components.
- **Section Runtime State**: The current request lifecycle state for a rendered section, including idle, loading, success, and error outcomes.

### Assumptions

- Existing API clients and hooks remain authoritative for API request behavior.
- The current debug panel and request tracking model remain part of expected section behavior.
- The initial migration scope is limited to Joke API and JSONPlaceholder.

### Scope Boundaries

- In scope: creating and integrating the shared section engine, section JSON configuration model, and migration of Joke API plus JSONPlaceholder.
- In scope: removing custom Joke API and JSONPlaceholder source files and replacing them with session JSON-driven definitions.
- Out of scope: redesigning debug-store architecture, changing API provider contracts beyond what is needed for engine integration, or adding new third API sections.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Both Joke API and JSONPlaceholder sections are rendered through the shared section engine with no loss of primary user workflows.
- **SC-002**: A maintainer can update section presentation metadata for a migrated section in one configuration file and observe the update on next run without editing section-specific renderer code.
- **SC-003**: For migrated sections, at least 95% of request attempts complete with visible lifecycle feedback (loading, success, or error) matching current user expectations.
- **SC-004**: Migrated sections continue to surface error outcomes clearly enough that a user can identify whether a failure is request-related or configuration-related in one interaction attempt.
- **SC-005**: For 100% of configuration-resolution failures in migrated sections, users see a disabled section state with inline configuration error details and no executable request action.
- **SC-006**: For 100% of configuration-resolution failures in migrated sections, one `Configuration` category debug error event is recorded and visible with the corresponding section error state.
- **SC-007**: Repository review confirms 0 remaining custom Joke API/JSONPlaceholder section implementation files, and both flows are driven by `joke-session.json` and `jsonplaceholder-session.json`.
- **SC-008**: For normal (non-error) section operation, a before/after UI parity review confirms no material changes to layout structure, control ordering, or primary user interaction steps for Joke API and JSONPlaceholder flows.
