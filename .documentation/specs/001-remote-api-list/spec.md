---
classification: full-spec
risk_level: medium
target_workflow: specify-full
required_artifacts: spec, plan, tasks
recommended_next_step: plan
required_gates: checklist, analyze, critic
participants:
  owner: human
  planner: ai
  implementer: ai
  reviewer: human
  critic: ai
  scribe: ai
---

# Feature Specification: Remote API List

**Feature Branch**: `001-remote-api-list`
**Created**: 2026-06-09
**Status**: Draft
**Input**: User description: "refactor remote to allow for a list of remote APIs to be configured, turn the single remote api into a list of remote apis, keep the persistence working the same way, configured in program.cs but with a config page that lets you manage the list of remotes, add name and description that is used in the display the api and documentation sections for each configured remote API"

## Rationale Summary

### Core Problem

API Test Spark currently treats the remote API experience as a single configured target. Developers who need to test or document more than one external API must repeatedly overwrite the same remote settings, which makes comparisons, demos, and multi-service workflows awkward.

### Decision Summary

Allow the harness to manage a list of configured remote APIs. Each remote API has a name, description, endpoint base, OpenAPI document source, credentials, and default headers. Server-provided defaults seed the list, while browser-managed configuration continues to override or extend those defaults using the same persistence expectation users already rely on. Server-side remote spec proxying is limited to server-provided profiles so browser-created profiles cannot drive arbitrary server-side URL fetches.

### Key Drivers

- Developers need to switch between multiple remote APIs without re-entering connection details.
- Existing single-remote persistence behavior must remain familiar and durable after the data shape changes.
- Home, explorer, and documentation views need human-readable names and descriptions instead of relying on URLs as display labels.
- Server-provided configuration remains the shared baseline for sample apps and team defaults.

### Source Inputs

- User request on 2026-06-09 to refactor single remote API configuration into a configurable list.
- Existing remote API behavior stores browser overrides and seeds from server-provided startup values.
- API Test Spark Constitution v1.1.2: strict TypeScript, layered structure, focused persisted stores, debug-store observability, and no accidental exposure of sensitive data.
- Gate review resolution: server-provided profiles keep proxy credentials server-side and browser-created profiles do not use the server-side remote spec proxy.

### Tradeoffs Considered

- Keep a single remote target and add manual switching: rejected because it still forces users to overwrite saved values.
- Add multiple targets but display only URLs: rejected because URLs are poor labels for user navigation and generated documentation.
- Selected: named remote API profiles with descriptions, preserving server-seeded defaults and browser persistence semantics.
- Selected security boundary: server-side proxy by server profile id only; browser-created profiles fetch their OpenAPI document directly from the browser and must satisfy the remote API's CORS policy.

### Architectural Impact

- The remote API domain changes from one active configuration to a collection of remote API profiles with a selected or navigated target.
- Existing saved single-remote users should retain their configured remote as one item in the new collection where feasible.
- API and documentation navigation must render one explorer and one documentation entry per configured remote API, using each profile's name and description.
- Server-provided remote API credentials are not serialized to the browser config payload; the proxy resolves them server-side by profile id.

### Reviewer Guidance

Reviewers should focus on data migration from the current single-remote shape, credential handling, configuration precedence between server defaults and browser values, and whether every remote profile is clearly identifiable in the user interface.

### Assumptions

- "Keep the persistence working the same way" means browser-stored values continue to override server-provided defaults and survive page reloads.
- "Configured in Program.cs" means the host application's startup configuration can define multiple remote API defaults for all harness users.
- Existing remote API credentials and headers remain scoped to the remote API they belong to.
- Browser-created remote API profiles are local browser configuration. They can drive direct browser requests, but they cannot cause the server proxy to fetch arbitrary URLs.
- No prior context was skipped during spec drafting.

### Out of Scope

- Importing remote API profiles from files or URLs outside the existing configuration flow.
- Sharing browser-managed remote API profiles across users, devices, or browsers.
- Role-based access control for who can create, edit, or delete remote profiles inside the harness.
- Supporting non-OpenAPI remote discovery formats.

## Clarifications

### Session 2026-06-09

- Q: How should browser-saved remote profiles reconcile with server-provided defaults when both exist? → A: Each remote API profile has a stable id; new profiles receive a new GUID, and browser-saved profiles override server defaults with the same id.
- Q: What should happen when a user deletes a server-provided remote API profile? → A: Deleting a server-provided profile hides that profile id in browser storage until the user resets remote configuration.
- Q: Should duplicate remote API profile names be allowed? → A: Profile names must be unique within the visible remote API list; duplicates cannot be saved.
- Q: How should the remote OpenAPI proxy handle browser-created profiles safely? → A: The server proxy accepts server-provided profile ids only; browser-created profiles fetch OpenAPI documents directly from the browser.
- Q: How should multi-profile credentials be exposed in the config endpoint? → A: Server-provided profile secrets are redacted from `/api-test-spark/config` and used only server-side by the proxy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Multiple Remote APIs (Priority: P1)

As a developer using the harness, I want the home screen to show each configured remote API by name and description so I can choose the right external API to test or document without interpreting raw URLs.

**Why this priority**: This is the core value of the feature. Multiple configurations are only useful if users can clearly discover and choose between them.

**Independent Test**: Can be tested by loading the harness with two configured remote APIs and confirming that each remote appears with its own API explorer and documentation entry using the configured name and description.

**Acceptance Scenarios**:

1. **Given** two remote APIs are configured, **When** the user opens the home screen, **Then** each remote API is displayed with its configured name and description.
2. **Given** a remote API has both an explorer and documentation experience, **When** the user views the remote API entries, **Then** the API and documentation sections clearly identify which remote API each entry belongs to.
3. **Given** a remote API is missing an optional description, **When** it is displayed, **Then** the harness still shows a usable name and does not use credentials or hidden configuration as fallback display text.

---

### User Story 2 - Manage Remote API Profiles (Priority: P2)

As a developer, I want a configuration page where I can add, edit, delete, and save multiple remote API profiles so I can manage the remote APIs I use from the browser without rebuilding the host app.

**Why this priority**: Browser-side management preserves the existing workflow where local configuration changes take precedence and can be adjusted quickly.

**Independent Test**: Can be tested by adding a new remote API profile, saving it, reloading the harness, and confirming the profile remains available with all non-secret and credential fields preserved according to existing persistence behavior.

**Acceptance Scenarios**:

1. **Given** the user is on the configuration page, **When** they add a remote API profile with a name, description, base URL, OpenAPI URL, credentials, and headers, **Then** the profile can be saved and used by the remote API experiences.
2. **Given** a saved remote API profile exists, **When** the user edits its name or description, **Then** the updated display text appears anywhere that remote API is listed.
3. **Given** a saved remote API profile exists, **When** the user deletes it, **Then** it no longer appears in API or documentation navigation after save.
4. **Given** the browser has saved remote API profiles, **When** the user reloads the harness, **Then** the saved profiles remain available.
5. **Given** a browser-created remote API profile uses an OpenAPI URL, **When** the remote API does not allow browser-side access, **Then** the harness reports a clear configuration error instead of routing the request through the server proxy.

---

### User Story 3 - Seed Shared Remote APIs from Host Configuration (Priority: P3)

As a host application maintainer, I want to define multiple remote API defaults in startup configuration so teams and demos open with useful remote APIs already available.

**Why this priority**: Shared defaults are important for sample apps and team consistency, but users can still create value with browser-managed profiles first.

**Independent Test**: Can be tested by configuring multiple server-provided remote API defaults, opening the harness in a clean browser, and confirming the remote API list is pre-populated.

**Acceptance Scenarios**:

1. **Given** the host application provides multiple remote API defaults, **When** the harness loads with no browser overrides, **Then** all server-provided remote APIs are available in the configuration and navigation experiences.
2. **Given** the browser already has saved remote API profiles, **When** server-provided defaults are also available, **Then** browser-managed values continue to take precedence without losing the server defaults unexpectedly.
3. **Given** a server-provided remote API is updated by the host application, **When** a user has not overridden that profile in the browser, **Then** the updated server-provided profile is reflected after the harness reloads.

### Edge Cases

- A user has an existing single-remote saved configuration from a prior version.
- Two remote APIs have the same display name.
- A remote API has a valid base URL but a missing or invalid OpenAPI document URL.
- A remote API has an OpenAPI document URL but no base URL for endpoint calls.
- A remote API contains sensitive credential values and must not reveal them in display labels, generated documentation titles, or navigation descriptions.
- A server-provided profile contains credentials that must not be serialized in the config response.
- A browser-created profile points at an OpenAPI document that blocks browser-side CORS requests.
- A browser-created profile points at a private-network or localhost URL that must not be fetched by the server proxy.
- The user deletes the currently selected or currently viewed remote API.
- Server defaults and browser-saved profiles refer to the same remote API with different display text or headers.
- A server-provided remote API profile has been hidden in browser storage and the host application still provides it on reload.
- The configured remote API list is empty.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a collection of remote API profiles instead of only one remote API configuration.
- **FR-002**: Each remote API profile MUST have a stable identifier.
- **FR-003**: Each new remote API profile MUST receive a new GUID as its stable identifier.
- **FR-004**: Each remote API profile MUST include a user-facing name.
- **FR-005**: Each remote API profile MUST support a user-facing description.
- **FR-006**: Each remote API profile MUST retain the existing remote connection fields: endpoint base, OpenAPI document source, API key header, API key value, bearer token, and default request headers.
- **FR-007**: System MUST require unique names within the visible remote API list.
- **FR-008**: System MUST prevent saving a remote API profile when its name duplicates another visible profile's name.
- **FR-009**: Users MUST be able to add a remote API profile from the configuration page.
- **FR-010**: Users MUST be able to edit an existing remote API profile from the configuration page.
- **FR-011**: Users MUST be able to delete an existing remote API profile from the configuration page.
- **FR-012**: System MUST persist browser-managed remote API profiles with the same reload-surviving behavior users have for the current single remote configuration.
- **FR-013**: System MUST preserve or migrate an existing single-remote browser configuration into the new remote API list when feasible.
- **FR-014**: System MUST allow the host application to provide multiple server-side default remote API profiles.
- **FR-015**: System MUST keep the existing precedence expectation that browser-managed remote configuration overrides server-provided defaults with the same stable identifier.
- **FR-016**: System MUST display each configured remote API in the API navigation experience using that profile's name and description.
- **FR-017**: System MUST display each configured remote API in the documentation navigation experience using that profile's name and description.
- **FR-018**: System MUST ensure remote API credentials are not used as display text or exposed in generated navigation labels.
- **FR-019**: System MUST validate remote API profile inputs enough to prevent unusable URL values from being saved as active profiles.
- **FR-020**: Users MUST be able to delete server-provided remote API profiles from their browser-managed list.
- **FR-021**: System MUST persist a browser-side hidden marker when a user deletes a server-provided remote API profile.
- **FR-022**: System MUST restore hidden server-provided profiles when the user resets remote configuration.
- **FR-023**: System MUST support an empty remote API list without blocking host API exploration or host API documentation.
- **FR-024**: System MUST keep each remote API profile's headers and credentials scoped to that profile.
- **FR-025**: System MUST provide a deterministic fallback display label when a profile's name is missing due to migrated or malformed saved data.
- **FR-026**: System MUST NOT serialize server-provided API key values or bearer tokens in the `/api-test-spark/config` response.
- **FR-027**: System MUST allow the remote spec proxy to fetch OpenAPI documents only for server-provided profiles identified by stable id.
- **FR-028**: System MUST NOT allow browser-created profiles or browser-edited URLs to cause server-side remote spec proxy fetches.
- **FR-029**: System MUST fetch browser-created profile OpenAPI documents directly from the browser and surface clear errors when browser-side access is blocked.

### Key Entities *(include if feature involves data)*

- **Remote API Profile**: A configured remote service available to the harness. Key attributes include stable id, name, description, endpoint base, OpenAPI document source, authentication settings, and default request headers. New profiles receive a new GUID as their stable id.
- **Remote API Collection**: The set of remote API profiles available to the current user, combining server-provided defaults and browser-managed values according to the established precedence rules.
- **Remote API Display Entry**: The navigation-facing representation of a remote API profile in API explorer and documentation experiences, using only safe user-facing metadata.
- **Proxy-Capable Server Profile**: A server-provided remote API profile whose OpenAPI document can be fetched by the server proxy using server-held credentials.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A clean browser session with two server-configured remote APIs shows two distinct remote API explorer entries and two distinct remote documentation entries.
- **SC-002**: A user can add, save, reload, and reopen at least three browser-managed remote API profiles without losing profile names, descriptions, URLs, credentials, or headers.
- **SC-003**: An existing single-remote browser configuration remains available as one remote API profile after the feature is introduced.
- **SC-004**: Deleting one remote API profile does not remove or alter any other saved remote API profile.
- **SC-005**: No remote API display entry, page title, or generated documentation title includes API key values, bearer tokens, or hidden credential fields.
- **SC-006**: Host API exploration and documentation remain usable when zero remote API profiles are configured.
- **SC-007**: Renaming a remote API profile does not create a duplicate profile or disconnect it from its saved browser-managed values.
- **SC-008**: A deleted server-provided remote API profile remains hidden after reload and reappears only after remote configuration is reset.
- **SC-009**: Attempting to save two visible remote API profiles with the same name is blocked with a clear validation message.
- **SC-010**: `/api-test-spark/config` includes no server-provided API key values or bearer token values.
- **SC-011**: A browser-created profile cannot trigger a server-side remote spec proxy request, even when it contains a valid OpenAPI URL.
- **SC-012**: A server-provided profile can fetch its OpenAPI document through the proxy by stable id without exposing its credential value in the browser config payload.
