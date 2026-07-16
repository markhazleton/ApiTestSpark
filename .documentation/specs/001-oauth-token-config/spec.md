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

# Feature Specification: OAuth Token Configuration for API Authentication

**Feature Branch**: `001-oauth-token-config`
**Created**: 2026-07-16
**Status**: Draft <!-- Valid: Draft | In Progress | Complete -->
**Input**: User description: "Allow users to configure OAuth token acquisition (client_credentials and password grant) per environment so API calls needing a bearer token can auto-fetch and attach it, instead of requiring a manually pasted static token."

## Rationale Summary

### Core Problem

Testers exercising APIs that require a bearer token currently have no in-tool way to obtain one. They must acquire a token through some external process and paste the raw string into a Remote API profile's static Bearer Token field. That token has no defined origin, is not refreshed when it expires, and there is no way to test both a machine-identity flow (client credentials) and a user-identity flow (password grant) against the same API.

### Decision Summary

Introduce a per-Environment OAuth configuration (token endpoint, application client credentials, optional separate user-flow client credentials, and test user credentials) with explicit actions to acquire a token via either grant type. Remote API profiles gain an opt-in flag to consume the resulting token automatically instead of requiring a manually pasted static token; profiles that do not opt in are unaffected.

### Key Drivers

- Manually copying tokens is error-prone and breaks the moment a token expires mid-session.
- Testers need to validate both service-to-service (client_credentials) and user-context (password grant) authorization paths against the same target API.
- The feature must stay scoped to a developer/testing tool and must not silently change behavior for existing static-token workflows.

### Source Inputs

- User-provided draft OAuth configuration shape discussed during planning (2026-07-16).
- Existing dormant OAuth configuration/token scaffolding already present in the codebase, never wired into any screen or request flow.
- Existing Remote API profile and static Bearer Token pattern already in production use.

### Tradeoffs Considered

- Option A — separate OAuth credentials stored per Remote API Profile: rejected; duplicates the same credentials across every profile that points at the same authorization server and is harder to keep in sync.
- Option B — server-side (.NET package) seeded OAuth secrets, never touching the browser: rejected for this iteration; deferred as a future enhancement so this feature can ship as a browser-only capability consistent with how the static Bearer Token / API key fields already work.
- Selected — a single OAuth configuration per Environment (matching the existing Environment-scoped configuration pattern), with a lightweight per-profile opt-in flag rather than duplicated credentials.

### Architectural Impact

- Activates existing but currently unused OAuth configuration/token state; no new persisted-config surface area beyond what already exists in dormant form.
- Zero behavior change for Remote API profiles that do not opt in — the existing static Bearer Token workflow continues to work exactly as it does today.
- Introduces additional credential fields (client secret, test user password) held client-side, extending the same accepted-risk posture this tool already applies to API keys and static bearer tokens.

### Reviewer Guidance

Focus review on: (1) correctness of token acquisition, caching, and expiration handling per Environment, (2) confirmation that opting out (no OAuth configured, or opt-in flag off) produces zero behavior change versus today, and (3) that credential storage risk is explicitly documented rather than silently introduced.

## Clarifications

### Session 2026-07-16

- Q: When an OAuth opt-in profile fires a request but no valid token can be obtained (incomplete config or failed acquisition), what should happen? → A: Block the request entirely and show a clear error (no call sent).
- Q: Should an acquired access token survive a browser page refresh, or is it acceptable for it to be lost on refresh? → A: Persisted (e.g., localStorage) - survives a page refresh within the same browser.
- Q: If a valid token already exists and the user clicks Get App Token / Get Test User Token again, what should happen? → A: Silently overwrite the existing token with the newly acquired one.
- Q: Should token acquisition requests enforce an explicit timeout, or rely on default browser/fetch behavior? → A: Enforce an explicit timeout (~15-30s) and report a timeout error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and acquire an application-level token (Priority: P1)

As a tester, I want to configure a token endpoint URL and application client credentials for an environment, and request an access token using those credentials, so that I can call a bearer-token-protected API without manually obtaining a token through some external process.

**Why this priority**: This is the minimum capability needed to remove manual token copy/paste for the most common OAuth flow (service-to-service / client_credentials).

**Independent Test**: Can be fully tested by entering a token endpoint, client ID, and client secret for an environment, clicking "Get App Token," and confirming a valid, non-expired access token is now available for that environment — independent of any Remote API profile changes.

**Acceptance Scenarios**:

1. **Given** an environment with no OAuth configuration, **When** the user enters a token endpoint URL, client ID, and client secret and requests an application token, **Then** the system acquires and displays a valid access token with its expiration.
2. **Given** a previously acquired, still-valid access token for an environment, **When** the user views the OAuth configuration for that environment, **Then** the system shows the token as valid along with its expiration, without requiring a new request.

---

### User Story 2 - Configure and acquire a test-user token (Priority: P1)

As a tester, I want to configure test user credentials (and, if the API requires it, a separate user-facing client ID/secret) and request an access token on behalf of that user, so that I can test endpoints that depend on a specific authenticated user's identity or role.

**Why this priority**: Many APIs behave differently depending on the authenticated user (roles, ownership checks); this is equally critical to testing coverage as the application-level flow.

**Independent Test**: Can be fully tested by entering test username/password (and optional user client ID/secret) for an environment, clicking "Get Test User Token," and confirming a valid access token tied to that user is now available.

**Acceptance Scenarios**:

1. **Given** an environment with a configured token endpoint and test user credentials, **When** the user requests a test-user token, **Then** the system acquires and displays a valid access token.
2. **Given** an API that requires a different client identity for user-context requests, **When** the user provides an optional user client ID/secret distinct from the application client ID/secret, **Then** the system uses the user-specific client identity when acquiring the test-user token.
3. **Given** no user client ID/secret has been provided, **When** the user requests a test-user token, **Then** the system falls back to the application client ID/secret for that request.

---

### User Story 3 - Remote API profile automatically uses the configured token (Priority: P2)

As a tester, I want a Remote API profile to automatically use my environment's configured OAuth token instead of a manually pasted static token, so that I don't have to copy a new token into the profile every time the old one expires.

**Why this priority**: This is what actually removes the manual-copy-paste burden day to day, but it depends on User Stories 1/2 already being available.

**Independent Test**: Can be fully tested by enabling the OAuth opt-in on a Remote API profile, firing a request from that profile, and confirming the request is sent with a valid `Authorization: Bearer` header sourced from the environment's OAuth token rather than any manually entered static token.

**Acceptance Scenarios**:

1. **Given** a Remote API profile with the OAuth opt-in enabled and a valid cached environment token, **When** the user fires a request from that profile, **Then** the request includes the environment's OAuth token as the bearer credential.
2. **Given** a Remote API profile with the OAuth opt-in enabled and no valid cached token (expired or never fetched), **When** the user fires a request, **Then** the system automatically attempts to acquire a new application-level token before sending the request.
3. **Given** a Remote API profile with the OAuth opt-in disabled, **When** the user fires a request, **Then** behavior is unchanged from today — the profile's manually entered static Bearer Token (if any) is used.

---

### User Story 4 - Inspect and clear the current token (Priority: P3)

As a tester, I want to see whether my current OAuth token is valid or expired and be able to clear it, so that I can control token freshness before firing an important test call.

**Why this priority**: A convenience/troubleshooting capability that supports the primary flows but is not required for the core value to be delivered.

**Independent Test**: Can be fully tested by acquiring a token, observing its validity/expiration status, clicking "Clear Token," and confirming the token status reflects "no token" afterward.

**Acceptance Scenarios**:

1. **Given** a valid, unexpired access token exists for an environment, **When** the user views the OAuth configuration screen, **Then** the system shows the token as valid along with a human-readable expiration.
2. **Given** an access token has expired, **When** the user views the OAuth configuration screen, **Then** the system shows the token as expired rather than valid.
3. **Given** any token state, **When** the user clicks "Clear Token," **Then** the cached token is removed and subsequent requests behave as if n The request MUST be blocked with a clear error rather than sent unauthenticated or silently falling back (see FR-014).o token had ever been acquired.

### Edge Cases

- What happens when the configured token endpoint is unreachable or times out?
- What happens when the token endpoint returns a non-success response (e.g., invalid client secret, unsupported grant type)?
- What happens when a profile has the OAuth opt-in enabled but the environment's OAuth configuration is incomplete (e.g., missing client secret)?
- How does the system handle a token that expires in the middle of a testing session — does the very next request recover automatically, and does that differ between the application-level and test-user flows?
- What happens when the user switches the active environment — does a token acquired for one environment ever get applied to a request against a different environment?
- What happens when a profile has both a manually entered static Bearer Token and the OAuth opt-in enabled at the same time — which one is used?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to configure, per Environment, a token endpoint URL, an application Client ID, and an application Client Secret.
- **FR-002**: System MUST allow users to optionally configure a separate User Client ID and User Client Secret, used only for the password grant, defaulting to the application Client ID/Secret when not provided.
- **FR-003**: System MUST allow users to configure a Test Username, a Test Password, and an optional free-text Description as part of the per-Environment OAuth configuration.
- **FR-004**: System MUST provide an explicit user action that acquires an access token using the client_credentials grant with the configured application credentials.
- **FR-005**: System MUST provide a separate, explicit user action that acquires an access token using the password grant with the configured test user credentials.
- **FR-006**: System MUST display, for the active environment, whether a currently cached access token exists, whether it is valid or expired, and its expiration time; and MUST provide an action to clear it.
- **FR-007**: System MUST allow a Remote API profile to opt in to using the active environment's OAuth-derived token instead of its manually entered static Bearer Token.
- **FR-008**: When a profile has the OAuth opt-in enabled and fires a request without a currently valid cached token, system MUST automatically attempt to acquire a new token using the client_credentials grant before sending the request.
- **FR-009**: System MUST NOT automatically resubmit password-grant (test user) credentials on token expiry — reacquiring a password-grant token always requires an explicit user action.
- **FR-010**: System MUST scope cached access tokens per Environment, such that switching the active environment never applies a token acquired under a different environment to a request.
- **FR-011**: When a profile has the OAuth opt-in enabled, system MUST use the OAuth-derived token in preference to any manually entered static Bearer Token on that profile; when the opt-in is disabled, the static Bearer Token continues to work exactly as it does today.
- **FR-012**: System MUST surface token acquisition failures (unreachable endpoint, non-success response) using the same categorized error/debug reporting mechanism already used for other API request failures in this tool, rather than failing silently.
- **FR-013**: System MUST mask the Client Secret, User Client Secret, and Test Password fields in the user interface, consistent with how other credential fields are already masked in this tool.
- **FR-014**: When a profile has the OAuth opt-in enabled and no valid token can be obtained before firing (configuration incomplete or acquisition failed), system MUST block the request entirely and present a clear error — it MUST NOT send the request unauthenticated and MUST NOT silently fall back to the profile's static Bearer Token field.
- **FR-015**: System MUST persist the most recently acquired access token per Environment across a browser page refresh/reload, so users are not required to re-acquire a token every time the page reloads.
- **FR-016**: When a user requests a new token (application or test-user grant) while a valid token already exists for that environment, system MUST silently replace the existing token with the newly acquired one, without requiring confirmation.
- **FR-017**: System MUST apply an explicit timeout (approximately 15-30 seconds) to token acquisition requests and MUST report a distinct timeout error if the token endpoint does not respond within that window.

### Key Entities

- **OAuth Configuration**: A per-Environment configuration containing the token endpoint URL, application client ID/secret, optional user client ID/secret, test username/password, and an optional description.
- **Access Token**: A per-Environment record of the most recently acquired bearer token, its expiration, and whether it is currently valid, persisted across page refreshes within the same browser.
- **Remote API Profile** *(existing entity, extended)*: Gains a single opt-in flag indicating whether requests from this profile should use the environment's OAuth-derived token instead of the profile's manually entered static Bearer Token.

### Assumptions

- Token endpoints used for testing return a standard OAuth2 token response containing at minimum an access token, a token type, and an expiration; any additional identity-provider-specific fields are optional and not required for this feature to function.
- This is a developer/testing tool; storing client secrets, test user passwords, and the acquired access token itself client-side (persisted across refreshes) is an accepted risk, consistent with how API keys and static bearer tokens are already handled in this tool today.
- No server-side (.NET NuGet package) changes are included in this feature; the OAuth configuration is entirely a browser-side (SPA) capability in this iteration.
- Reacquiring an expired token uses the original grant flow; refresh-token-based reacquisition is not required for this iteration.

### Out of Scope

- Seeding OAuth secrets on the server side via the .NET package options so they never reach the browser (deferred to a future enhancement).
- OAuth grant types other than client_credentials and password (e.g., authorization_code, device_code).
- Automatic token renewal using a refresh_token.
- Separate OAuth credentials per Remote API Profile — this feature is Environment-scoped, with a profile-level opt-in flag only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can configure application-level OAuth settings and successfully obtain an access token for a client_credentials-compatible API in under 1 minute without leaving the configuration screen.
- **SC-002**: A user can configure and obtain a test-user (password grant) token in under 1 minute.
- **SC-003**: Once configured and acquired, 100% of requests fired from an opted-in profile include a valid, non-expired bearer token with no manual copy/paste required.
- **SC-004**: Profiles that do not opt in to OAuth show zero behavior change compared to today's static Bearer Token workflow.
- **SC-005**: When token acquisition fails, the user sees a clear, categorized error message in the same error surface used for other request failures — no unhandled or silent failures.
- **SC-006**: Switching the active environment never results in a token acquired under a different environment being applied to a request, verifiable by inspecting the request headers shown for a fired call.
