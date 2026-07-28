---
description: "Task list for Remote API List"
participants:
  owner: human
  planner: ai
  implementer: ai
  reviewer: human
  critic: ai
  scribe: ai
---

# Tasks: Remote API List

**Input**: Design documents from `.documentation/specs/001-remote-api-list/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Include .NET integration tests and repository verification gates required by the constitution; no JS test runner is introduced.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Rationale Summary

### Core Problem

API Test Spark currently supports one remote API target, forcing users to overwrite saved remote settings when they work with multiple external APIs.

### Decision Summary

Implement remote API profiles with stable GUID ids, unique visible names, browser persistence migration, server-seeded defaults, redacted server credentials, server-profile-only proxying, and profile-specific explorer/documentation navigation.

### Key Drivers

- Preserve existing persistence behavior.
- Keep `Program.cs` defaults useful for demos and teams.
- Avoid ambiguous navigation and generated docs.
- Keep credentials scoped and out of display text.
- Prevent browser-created profiles from driving arbitrary server-side proxy fetches.

### Reviewer Guidance

Review profile identity, persistence migration, public .NET API compatibility, redacted config/proxy contracts, SSRF boundaries, and whether route/state changes use the selected profile instead of the old single global remote config.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its phase prerequisites are complete
- **[Story]**: User story label for story-phase tasks
- Each task includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare contracts, public API surface, and shared type boundaries.

- [X] T001 Update public remote profile contract notes in `.documentation/specs/001-remote-api-list/contracts/remote-api-profiles.md`
- [X] T002 [P] Review current single-remote tests in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- [X] T003 [P] Review current React remote config flow in `src/store/remoteConfigStore.ts`, `src/hooks/useHarnessConfig.ts`, and `src/components/ConfigScreen.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model, compatibility, migration, and server contract support that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Define `RemoteApiProfile` public .NET model in `ApiTestSpark/ApiTestSparkOptions.cs`
- [X] T005 Extend `ApiTestSparkOptions` with multi-profile defaults while retaining legacy single-remote properties in `ApiTestSpark/ApiTestSparkOptions.cs`
- [X] T006 Update `/api-test-spark/config` serialization to include `remoteApiProfiles` with server-provided credential values redacted in `ApiTestSpark/ApiTestSparkExtensions.cs`
- [X] T007 [P] Add config endpoint integration tests for multiple remote profiles and credential redaction in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- [X] T008 [P] Add config endpoint integration tests for legacy single-remote seeding in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- [X] T009 Update public API tracking for new .NET public types/properties in `ApiTestSpark/PublicAPI.Unshipped.txt`
- [X] T010 Add TypeScript `RemoteApiProfile` and remote collection types in `src/types/host-api.ts`
- [X] T011 Re-export new TypeScript remote profile types from `src/types/index.ts`
- [X] T012 Replace single-remote persisted shape with versioned profile collection shape in `src/store/remoteConfigStore.ts`
- [X] T013 Implement persisted migration from version 1 single-remote fields to one GUID-backed profile with deterministic fallback display labels in `src/store/remoteConfigStore.ts`
- [X] T014 Implement server/default merge selector with hidden server profile ids and pure deterministic validation fixtures for merge precedence in `src/store/remoteConfigStore.ts`
- [X] T015 Update harness config hydration to seed/merge remote profiles from server config in `src/hooks/useHarnessConfig.ts`
- [X] T016 Route remote config failures through debug-store error handling in `src/hooks/useHarnessConfig.ts`
- [X] T017 Update store barrel exports for changed remote config types in `src/store/index.ts`

**Checkpoint**: Server config returns profiles; browser store can migrate, merge, and expose effective visible profiles.

---

## Phase 3: User Story 1 - Browse Multiple Remote APIs (Priority: P1) MVP

**Goal**: Users can see and navigate to explorer/doc entries for each configured remote API using name and description.

**Independent Test**: Load the harness with two configured profiles and verify two explorer entries and two documentation entries appear with correct display text.

### Implementation for User Story 1

- [X] T018 [US1] Update `HomeScreen` remote section builder to render one section or grouped entries per visible remote profile in `src/components/HomeScreen.tsx`
- [X] T019 [US1] Add route parameters for remote API explorer and documentation profile ids in `src/App.tsx`
- [X] T020 [US1] Resolve selected remote profile from route id in `src/components/remote-api/RemoteApiScreen.tsx`
- [X] T021 [US1] Resolve selected remote profile from route id in `src/components/remote-api/RemoteApiDocScreen.tsx`
- [X] T022 [US1] Update remote OpenAPI fetching so server-provided profiles use `/api-test-spark/remote-spec` by profile id and browser-created profiles fetch directly from the browser in `src/hooks/useRemoteOpenApi.ts`
- [X] T023 [US1] Update remote endpoint calls to use the selected profile's base URL, credentials, and headers in `src/hooks/useHostApi.ts`
- [X] T024 [US1] Ensure generated remote documentation title/description use profile name, description, and safe fallback display labels in `src/components/remote-api/RemoteApiDocScreen.tsx`
- [X] T025 [US1] Prevent credential values from appearing in remote display labels, fallback labels, or generated documentation text in `src/components/HomeScreen.tsx` and `src/components/remote-api/RemoteApiDocScreen.tsx`

**Checkpoint**: User Story 1 is independently usable with server-seeded profiles.

---

## Phase 4: User Story 2 - Manage Remote API Profiles (Priority: P2)

**Goal**: Users can add, edit, delete, save, hide, and reset remote profiles from the configuration page.

**Independent Test**: Add three browser profiles, reload, edit one name, delete one server profile, reset config, and verify persistence behavior.

### Implementation for User Story 2

- [X] T026 [US2] Replace single remote form state with editable remote profile list state in `src/components/ConfigScreen.tsx`
- [X] T027 [US2] Add profile add action that creates a new GUID-backed profile in `src/components/ConfigScreen.tsx`
- [X] T028 [US2] Add profile edit controls for name, description, URLs, auth fields, and headers in `src/components/ConfigScreen.tsx`
- [X] T029 [US2] Add duplicate visible-name validation, deterministic validation fixtures, and clear validation messaging in `src/components/ConfigScreen.tsx`
- [X] T030 [US2] Add delete behavior for browser-created profiles in `src/components/ConfigScreen.tsx`
- [X] T031 [US2] Add delete behavior for server-provided profiles by persisting hidden server profile ids in `src/components/ConfigScreen.tsx`
- [X] T032 [US2] Add reset remote configuration behavior that clears overrides, browser profiles, and hidden ids in `src/components/ConfigScreen.tsx`
- [X] T033 [US2] Update server-configured values panel to display all server-provided profiles safely in `src/components/ConfigScreen.tsx`
- [X] T034 [US2] Preserve header editor behavior for each profile in `src/components/ConfigScreen.tsx`
- [X] T035 [US2] Route recoverable storage/configuration failures through `useDebugStore.addError()` from `src/components/ConfigScreen.tsx` or related hook helpers

**Checkpoint**: User Story 2 is independently usable from the configuration page.

---

## Phase 5: User Story 3 - Seed Shared Remote APIs from Host Configuration (Priority: P3)

**Goal**: Host maintainers can define multiple default remote APIs in startup configuration.

**Independent Test**: Configure multiple remote profiles in SampleApi, load a clean browser, and verify profiles appear before any browser edits.

### Tests for User Story 3

- [X] T036 [P] [US3] Add integration test for multiple `Program.cs` remote profiles in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- [X] T037 [P] [US3] Add integration test proving server-provided remote profile credential values are redacted from `/api-test-spark/config` in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- [X] T038 [P] [US3] Add remote spec proxy tests for server-provided profile id resolution and rejection of unknown/browser-created profile ids in `ApiTestSpark.Tests/HarnessIntegrationTests.cs`

### Implementation for User Story 3

- [X] T039 [US3] Update remote spec proxy to resolve only server-provided profile ids and use only server-held OpenAPI URL and credentials in `ApiTestSpark/ApiTestSparkExtensions.cs`
- [X] T040 [US3] Reject browser-created or browser-submitted OpenAPI URLs in the server proxy and preserve SSRF scheme validation, timeout behavior, redirect/body-size safeguards, and sanitized proxy errors in `ApiTestSpark/ApiTestSparkExtensions.cs`
- [X] T041 [US3] Update sample app to configure at least two remote profiles in `SampleApi/Program.cs`
- [X] T042 [US3] Update package README remote API configuration examples and legacy single-remote compatibility/deprecation notes in `ApiTestSpark/README.md`
- [X] T043 [US3] Update root README remote API configuration examples and additive public API compatibility notes in `README.md`
- [X] T044 [US3] Update in-app remote configuration docs in `src/components/HowToUseScreen.tsx`

**Checkpoint**: User Story 3 is independently usable by host maintainers, with server-held credentials redacted from config payloads and proxy access limited to server-provided profile ids.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, compatibility, and documentation cleanup across stories.

- [X] T045 [P] Verify all changed `src/` directories preserve barrel exports in `src/types/index.ts`, `src/store/index.ts`, `src/hooks/index.ts`, and `src/components/index.ts`
- [X] T046 [P] Verify no `console.log` appears in changed `src/` files
- [X] T047 [P] Run `dotnet test ApiTestSpark.Tests`
- [X] T048 [P] Run `npm run verify`
- [X] T049 Run quickstart scenarios plus deterministic migration/merge/fallback-label validation from `.documentation/specs/001-remote-api-list/quickstart.md`
- [X] T050 Update `.documentation/specs/001-remote-api-list/tasks.md` task completion checkboxes during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1; blocks all user stories.
- **US1 MVP**: Depends on Phase 2.
- **US2**: Depends on Phase 2; can proceed in parallel with US1 after shared profile selectors exist.
- **US3**: Depends on Phase 2; can proceed in parallel with US1/US2 for .NET and docs work.
- **Polish**: Depends on implemented desired stories.

### User Story Dependencies

- **US1**: MVP; demonstrates visible multi-profile navigation and profile-specific usage.
- **US2**: Adds browser management; depends on foundational store shape but not on US3.
- **US3**: Adds host maintainer seeding and proxy coverage; depends on foundational server profile contract.

### Parallel Opportunities

- T002 and T003 can run in parallel.
- T007 and T008 can run in parallel after T004-T006.
- T018/T019 can begin before T020-T025.
- T036-T038 can run in parallel after foundational .NET profile contract work.
- T045-T048 can run in parallel during final validation.

---

## Parallel Example: User Story 3

```text
Task: "Add integration test for multiple Program.cs remote profiles in ApiTestSpark.Tests/HarnessIntegrationTests.cs"
Task: "Add integration test that remote profile credential fields serialize only under profile config fields in ApiTestSpark.Tests/HarnessIntegrationTests.cs"
Task: "Add remote spec proxy test for selected profile credentials and URL in ApiTestSpark.Tests/HarnessIntegrationTests.cs"
```

---

## Gate Acknowledgements

Gate findings were reviewed after initial task generation and resolved through artifact revisions before implementation:

- Gate: critic
- Concern: Browser-created profiles could drive arbitrary server-side OpenAPI fetches.
- Resolution: Server proxy is limited to server-provided profile ids; browser-created profiles fetch OpenAPI documents directly from the browser.
- Recorded By: Codex
- Date: 2026-06-09

- Gate: critic
- Concern: Multi-profile config serialization could expose all server-provided profile secrets.
- Resolution: `/api-test-spark/config` redacts server-provided API key values and bearer tokens; proxy uses server-held credentials by profile id.
- Recorded By: Codex
- Date: 2026-06-09

- Gate: analyze
- Concern: Fallback labels, proxy request model, and post-gate acknowledgement needed explicit artifact coverage.
- Resolution: Tasks now cover deterministic fallback labels, a single proxy request model, and this gate acknowledgement.
- Recorded By: Codex
- Date: 2026-06-09

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational profile contract, merge, and migration work.
3. Complete Phase 3 user-facing multi-profile navigation and selected-profile remote usage.
4. Validate with two server-configured profiles and run focused build checks.

### Incremental Delivery

1. Deliver US1 for visible multi-remote browsing.
2. Deliver US2 for browser profile management and persistence behavior.
3. Deliver US3 for host maintainer defaults, proxy behavior, and documentation.
4. Run all Polish validation tasks before implementation is considered complete.
