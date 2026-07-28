---
description: "Task list template for feature implementation"
---

# Tasks: OAuth Token Configuration for API Authentication

**Input**: Design documents from `/.documentation/specs/001-oauth-token-config/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present — see check-prerequisites output)

**Tests**: Not included — the React SPA has no JS/TS test runner by constitutional design
(Principle VII); verification is manual per quickstart.md (Polish phase task T029). No changes to
`ApiTestSpark.Tests/` (.NET) are needed since this feature makes no `.NET` code changes.

**Organization**: Tasks are grouped by user story (US1–US4, matching spec.md priorities P1/P1/P2/P3)
to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact, relative to repository root

## Path Conventions

Single project (existing React SPA) — all paths under `src/`. No `backend/`/`frontend/` split, no
new top-level project (see plan.md Structure Decision).

---

## Phase 1: Setup

**Purpose**: Confirm environment readiness — no new dependencies or scaffolding required (existing
Zustand 5 / TanStack Query 5 / Vite 8 stack already covers this feature).

- [X] T001 Confirm branch `001-oauth-token-config` is checked out and confirm no new npm packages
      are required (Zustand `persist`, TanStack Query `useMutation` already installed);
      no file changes in this task.

**Checkpoint**: Setup complete — 2026-07-16.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared token-acquisition plumbing that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Extend `ApiRequestConfig`/`executeRequest` in `src/api/client.ts` with an opt-in
      `contentType: 'json' | 'form'` field (default `'json'`, no change to existing callers); when
      `'form'`, serialize `body` as `application/x-www-form-urlencoded` via `URLSearchParams`
      instead of `JSON.stringify`. Add a ~20s timeout that fires independently of, and in addition
      to, any caller-supplied `AbortSignal` — compose both via `AbortSignal.any([callerSignal,
      timeoutSignal])` (or an equivalent manual listener bridge if the runtime target lacks
      `AbortSignal.any`), and ensure the resulting error message distinguishes "timed out" from
      "cancelled" from "caller-aborted" so callers can tell which occurred.
      (research.md R1, R5; gates/critic.md critic-002)
- [X] T003 [P] Update `src/types/state.ts`: rename `AuthConfigSet.username`/`password` →
      `testUsername`/`testPassword`; add `userClientId?`, `userClientSecret?`, `description?`;
      change token state to `tokens: Record<Environment, AccessTokenState>` (fields: `accessToken`,
      `tokenType`, `expiresAt`, `acquiredVia`, `isAuthenticated` — drop `refreshToken`/`userName`/
      `givenName`/`surname`/`email`/`roles`); update `AuthStoreState` method signatures to be
      environment-scoped (`setToken(environment, response)`, `clearToken(environment)`,
      `isTokenValid(environment)`, `isTokenExpired(environment)`, `getAccessToken(environment)`).
      (data-model.md OAuthConfig / AccessTokenState)
- [X] T004 [P] Update `src/types/host-api.ts`: add `remoteUseOAuthToken?: boolean` to
      `RemoteApiProfile`. (data-model.md RemoteApiProfile)
- [X] T005 Create `src/api/oauthTokenClient.ts`: functional factory that builds the
      `client_credentials` request body (`grant_type`, `client_id`, `client_secret`) and the
      `password` request body (`grant_type=password`, `client_id` = `userClientId ?? clientId`,
      `client_secret` = `userClientSecret ?? clientSecret` when present, `username`, `password`),
      and calls `executeRequest` with `contentType: 'form'` against `config.baseUrl`.
      (depends on: T002) (research.md R4)
- [X] T006 Update `src/api/index.ts` barrel to re-export `oauthTokenClient`. (depends on: T005)
- [X] T007 Rewrite `src/store/authStore.ts`: config CRUD keeps existing shape aside from renamed
      fields (T003); re-key token cache per Environment; add `tokens` to the `persist` `partialize`
      (reversing the prior "session-only" comment per FR-015); remove any direct `fetch` from the
      store; keep `updateAuthConfig`/`getAuthConfig` synchronous; token actions become
      `setToken(environment, tokenResponse)`, `clearToken(environment)`, `isTokenValid(environment)`,
      `isTokenExpired(environment)`, `getAccessToken(environment)` — all pure state, no I/O.
      (depends on: T003) (research.md R2, R3)
- [X] T008 Update `src/store/remoteConfigStore.ts` `normalizeRemoteProfile` to default
      `remoteUseOAuthToken: profile.remoteUseOAuthToken ?? false`. (depends on: T004)
- [X] T009 Create `src/hooks/useOAuthToken.ts`: `useMutation` wrapping `oauthTokenClient` with debug
      callbacks injected from `useDebugStore` (per-call instantiation, UUID correlation, per
      Constitution IV). Expose TWO distinct entry points — do not blur them:
      (a) `ensureOAuthToken(environment, grantType)`, used only by automatic pre-fire callers (US3),
      which returns the cached token immediately if `isTokenValid(environment)`, otherwise calls the
      mutation; and (b) `acquireOAuthToken(environment, grantType)`, used only by the explicit
      "Get App Token"/"Get Test User Token" UI buttons (US1/US2), which ALWAYS calls the mutation
      regardless of any existing valid token (guarantees FR-016's silent-overwrite requirement — see
      gates/analyze.md A1). Both entry points: on success call
      `useAuthStore.getState().setToken(environment, response)`; on failure route through
      `useDebugStore.addError` with `'Network'`/`'API'` category (FR-012).
      (depends on: T005, T007) (research.md R2; gates/analyze.md A1)
- [X] T010 Redact secret values before debug capture (SHOWSTOPPER fix — gates/critic.md critic-001):
      in `src/hooks/useOAuthToken.ts` (or as a small helper in `src/api/oauthTokenClient.ts` used by
      both), build a SEPARATE, redacted copy of the request body (replace `client_secret`,
      `user_client_secret`/effective secret, and `password` values with a fixed marker such as
      `"***redacted***"`) and pass ONLY that redacted copy to the `onRequest`/`onError` debug
      callbacks; the real, unredacted body must still be sent to the actual `fetch` call inside
      `executeRequest`. This applies to every token-endpoint request (`client_credentials` and
      `password` grants) with no exceptions. (depends on: T005, T009)
- [X] T011 Update `src/hooks/index.ts` barrel to re-export `useOAuthToken`. (depends on: T009, T010)

**Checkpoint**: Phase complete — 2026-07-16.

**Checkpoint**: Shared token-acquisition plumbing (types, client, store, hook) is complete,
constitution-compliant (Gate IV — no raw `fetch` outside `executeRequest`), and does not leak
secrets into the debug panel or telemetry (T010). User story UI work can now begin.

---

## Phase 3: User Story 1 - Configure and acquire an application-level token (Priority: P1) 🎯 MVP

**Goal**: A tester can configure a token endpoint + application client credentials for an
Environment and acquire a `client_credentials` access token from the Config screen.

**Independent Test**: Enter a token endpoint URL, Client ID, and Client Secret; click "Get App
Token"; confirm a valid, non-expired token with expiration is shown — independent of any Remote
API profile changes.

### Implementation for User Story 1

- [X] T012 [US1] Create `src/components/harness-config/OAuthConfigPanel.tsx`: form fields for
      Token Endpoint URL (`baseUrl`), Client ID, Client Secret (masked, consistent with existing
      masked-credential convention in `RemoteOpenApiConfig.tsx`), and Description; a
      "Get App Token" button that ALWAYS calls `useOAuthToken().acquireOAuthToken(env,
      'client_credentials')` (never `ensureOAuthToken` — see T009/gates/analyze.md A1) so a click
      always fetches fresh per FR-016; a token status badge showing none/valid-until/expired; a
      "Clear Token" button. (FR-001, FR-004, FR-006, FR-013)
- [X] T013 [US1] Update `src/components/harness-config/index.ts` barrel to re-export
      `OAuthConfigPanel`. (depends on: T012)
- [X] T014 [US1] Mount `<OAuthConfigPanel />` in
      `src/components/ConfigScreen.tsx` alongside the existing per-environment sections.
      (depends on: T012, T013) <!-- Implementation Note: OAuthConfigPanel manages its own
      localhost/test/other environment tabs internally rather than taking an `env` prop, since
      ConfigScreen has no existing environment switcher of its own — see plan.md Implementation Notes. -->
- [X] T015 [US1] Wire the "Get App Token" button's loading/error states in `OAuthConfigPanel.tsx`
      so acquisition failures (timeout, non-2xx) surface a clear inline message sourced from the
      same error routed to `useDebugStore.addError` (no separate/duplicate error channel).
      (depends on: T012) (FR-012)

**Checkpoint**: User Story 1 is fully functional and independently testable — a tester can acquire
and view an application-level token without touching any Remote API profile, and the debug panel
never shows the plaintext client secret (verify against T010).

**Checkpoint**: Phase complete — 2026-07-16. ✅ Complete

---

## Phase 4: User Story 2 - Configure and acquire a test-user token (Priority: P1)

**Goal**: A tester can configure test user credentials (and, if needed, a separate user-facing
client identity) and acquire a `password`-grant access token.

**Independent Test**: Enter Test Username/Password (and optionally User Client ID/Secret); click
"Get Test User Token"; confirm a valid access token is acquired.

### Implementation for User Story 2

- [X] T016 [US2] Extend `OAuthConfigPanel.tsx` (from US1) with Test Username, Test Password
      (masked), User Client ID, and User Client Secret (masked) fields, plus a
      "Get Test User Token" button that ALWAYS calls `acquireOAuthToken(env, 'password')` (same
      always-fetch guarantee as T012 — never `ensureOAuthToken`). (depends on: T012)
      (FR-002, FR-003, FR-005)
- [X] T017 [US2] Verify/finalize the password-grant fallback logic in
      `src/api/oauthTokenClient.ts` (`userClientId ?? clientId`, `userClientSecret ?? clientSecret`)
      against a real or mock provider that requires a distinct password-grant client identity.
      (depends on: T005) (FR-002)
      <!-- Verified 2026-07-16 against a local mock OAuth2 provider (client_credentials +
      password grants, form-urlencoded token endpoint): (a) fallback path confirmed — with no
      User Client ID/Secret set, the password grant correctly sent client_id=<Client ID>; (b)
      override path confirmed — with an explicit User Client ID set, the password grant correctly
      sent that value instead. Both requests captured in the debug panel with client_secret/
      password redacted (critic-001). -->
- [X] T018 [US2] Confirm both `acquireOAuthToken` calls (T012's and T016's) silently overwrite any
      existing valid token for the environment regardless of which grant button was clicked
      (FR-016), and that `acquiredVia` is recorded correctly for each grant type.
      (depends on: T009, T010, T016)

**Checkpoint**: User Stories 1 AND 2 both work independently — both grant types can be exercised
from the Config screen, and clicking either button always replaces any existing token (FR-016
verified, not just assumed). Phase complete 2026-07-16 — T017's live-provider verification
completed against a local mock OAuth2 provider (see T017 note).

---

## Phase 5: User Story 3 - Remote API profile automatically uses the configured token (Priority: P2)

**Goal**: A Remote API profile can opt in to using the environment's OAuth-derived token instead of
its manually entered static Bearer Token.

**Independent Test**: Enable the OAuth opt-in on a profile; fire a request from the Endpoint
Explorer; confirm the request's `Authorization` header is sourced from the environment's OAuth
token, not the static field.

### Implementation for User Story 3

- [X] T019 [US3] Add a "Use environment OAuth token" checkbox bound to `remoteUseOAuthToken`;
      visually de-emphasize/disable the static Bearer Token field when checked. (depends on: T004,
      T008) (FR-007, FR-011) <!-- Implementation Note: added to `BrowserProfileEditor` inside
      `src/components/ConfigScreen.tsx`, NOT `RemoteOpenApiConfig.tsx` as originally planned —
      discovered during implementation that RemoteOpenApiConfig.tsx is unused/dead code (never
      rendered anywhere in the app); the actual per-profile RemoteApiProfile editing UI is
      ConfigScreen.tsx's BrowserProfileEditor. See plan.md Implementation Notes. -->
- [X] T020 [US3] Update `handleFire` in `src/components/host-api/EndpointTester.tsx`: when
      `remoteProfile?.remoteUseOAuthToken` is true, `await ensureOAuthToken(environment,
      'client_credentials')` (the short-circuit-on-valid variant from T009 — appropriate here,
      unlike the Config-screen buttons) before building `requestHeaders`; use the OAuth token as
      `Authorization: Bearer <token>` in preference to `remoteOpenApiBearerToken`; if no valid token
      is obtainable, block the request entirely and set a validation error (reusing the existing
      `setValidationError` pattern) instead of calling `mutate` — never send unauthenticated, never
      silently fall back to the static field. While the token acquisition is in flight, show a
      loading indicator and, on failure, present a message that explicitly names the failed token
      acquisition rather than reusing generic "required field" phrasing — distinct from instant
      validation errors like a missing path parameter (gates/critic.md critic-003). (depends on:
      T009, T019) (FR-008, FR-010, FR-011, FR-014)
- [X] T021 [US3] Update `captureConfig.headers` in
      `src/components/remote-api/RemoteApiDocScreen.tsx`: when `remoteUseOAuthToken` is true, use
      the cached token via `isTokenValid`/`getAccessToken` if valid, otherwise emit a
      `{OAUTH_ACCESS_TOKEN}` placeholder in generated docs/curl — do not trigger a token fetch as a
      side effect of viewing the Doc Builder. (depends on: T009, T019)

**Checkpoint**: Phase complete — 2026-07-16. ✅ Complete. User Stories 1–3 all work independently;
Endpoint Explorer and Doc Builder both honor the opt-in flag with the correct precedence over the
static Bearer Token field, and Environment-switching never leaks a token across environments
(FR-010).

---

## Phase 6: User Story 4 - Inspect and clear the current token (Priority: P3)

**Goal**: A tester can see whether the current OAuth token is valid/expired and clear it.

**Independent Test**: Acquire a token, observe its validity/expiration, click "Clear Token", confirm
status reflects "no token" afterward and a subsequent opted-in request is blocked per FR-014.

### Implementation for User Story 4

- [X] T022 [US4] Ensure `OAuthConfigPanel.tsx`'s token status badge (built in US1/T012) reactively
      reflects valid/expired/none as time passes (e.g., re-derive on render/interval), showing a
      human-readable expiration timestamp. (depends on: T012) (FR-006)
- [X] T023 [US4] Wire the "Clear Token" button to `useAuthStore.getState().clearToken(environment)`
      and confirm — via manual test against T020 — that the very next fire attempt from an
      opted-in profile is blocked with the FR-014 error rather than silently proceeding. Also
      verify FR-009 specifically: acquire a `password`-grant token, clear/expire it, then fire an
      opted-in request and confirm the system blocks per FR-014 rather than silently re-running the
      password grant with the stored test credentials (gates/analyze.md A2).
      (depends on: T012, T020)
      <!-- Verified 2026-07-16 end-to-end against a local mock OAuth2 provider + a mock protected
      API: (1) Clear Token → next opted-in fire re-acquires automatically via ensureOAuthToken,
      which is hardcoded to client_credentials (T020) — the password grant is structurally never
      auto-re-run, confirming FR-009/A2 by construction; (2) forced a genuine acquisition failure
      (invalid client secret) and confirmed the fire was BLOCKED with "Unable to acquire an OAuth
      access token...Request was not sent." and zero requests reached the protected endpoint
      (FR-014). CRITICAL BUG FOUND AND FIXED during this verification: the real outgoing request
      (via useHostApi.ts's mutationFn) never received the acquired OAuth token at all — only the
      EndpointTester's UI-only cURL/headers preview object included it, so a successful token
      acquisition still resulted in an unauthenticated real request (401) despite the debug-panel
      preview appearing correct. Fixed by adding `oauthToken` to `HostApiRequest` and passing it
      from `EndpointTester.tsx`'s `mutate()` call through to the real `Authorization` header in
      `useHostApi.ts` (OAuth token takes precedence over a static Bearer Token, matching existing
      precedence rules). Re-verified end-to-end after the fix: real request correctly carried
      `Authorization: Bearer <token>` and the mock protected API returned 200. -->

**Checkpoint**: All four user stories are code-complete and live-verified end-to-end against a
local mock OAuth2 provider, including a real defect found and fixed during T023's verification
(see note above). No open items remain in this phase.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Constitution compliance verification and final manual validation.

- [X] T024 [P] Run `npm run verify` (`tsc -b` + `vite build`) — MUST pass with zero TypeScript
      errors (Constitution I). <!-- Verified 2026-07-16: tsc -b + vite build clean. -->
- [X] T025 [P] Run `npm run lint` — MUST pass with zero ESLint errors, including
      `react-hooks/exhaustive-deps` (Constitution II). <!-- Verified 2026-07-16 as part of `npm run
      verify` (lint runs before vite build) — zero errors. -->
- [X] T026 Confirm every new/modified `src/` directory (`api/`, `hooks/`, `store/`,
      `components/harness-config/`) still has an `index.ts` barrel re-exporting the new/changed
      public surface (Constitution III). <!-- Verified: api/index.ts, hooks/index.ts,
      harness-config/index.ts, components/index.ts all updated. -->
- [X] T027 [P] Grep `src/` for `fetch(` occurrences outside `src/api/client.ts`'s `executeRequest`
      to confirm no raw `fetch` calls were introduced (Constitution IV). <!-- Verified: only
      pre-existing fetch() calls remain (build-info/version checks, spec fetch) — none added by
      this feature; oauthTokenClient.ts uses executeRequest exclusively. -->
- [X] T028 Spot-check that `useDebugStore` FIFO buffer limits (50/50/50/100) and the existing
      canonical store registry remain unaffected by the `authStore`/`remoteConfigStore` changes
      (Constitution V). <!-- Verified: debugStore.ts untouched by this feature. -->
- [X] T029 Manually execute all 10 steps of `quickstart.md` end-to-end against a real or mock
      OAuth2 token endpoint, using only synthetic test credentials (Constitution VIII reminder
      already documented in quickstart.md) — including the new steps verifying no secret is visible
      in the debug panel (critic-001) and that an expired password-grant token is never silently
      resubmitted (FR-009/A2).
      <!-- Verified 2026-07-16 via a local Node mock OAuth2 token endpoint + mock protected API,
      driven live through a real running dev server and browser (steps 1-10 of quickstart.md):
      (1) dev server started; (2-3) client_credentials token acquired, status showed "Valid
      until..."; (4) password grant acquired both via Client ID fallback and via an explicit User
      Client ID override; (5) token status confirmed to survive a full page reload (persisted);
      (6) a browser Remote API profile with "Use environment OAuth token" enabled successfully
      attached the OAuth-acquired token to a live request against a protected mock endpoint
      (confirmed via the endpoint's own echoed Authorization header, not just the UI preview —
      this is what surfaced the real bug described in T023's note); (7) the token-acquisition
      request's client_secret/password were confirmed redacted (`***redacted***`) in the debug
      panel; (8) Clear Token + re-fire confirmed FR-014 blocking with a forced acquisition
      failure; (9) confirmed the auto pre-fire path never re-runs the password grant (hardcoded to
      client_credentials in EndpointTester); (10) confirmed per-Environment token isolation —
      switching the OAuthConfigPanel's environment tab shows independent token state per
      environment, consistent with FR-010. -->
- [X] T030 [P] Re-validate `.documentation/specs/001-oauth-token-config/checklists/requirements.md`
      still passes if any FR wording changed during implementation (expected: no changes needed).
      <!-- Verified: no FR wording changed; checklist remains 19/19 pass. -->

**Checkpoint**: Phase complete — 2026-07-16. All 30/30 tasks complete. `npm run verify` and
`dotnet test ApiTestSpark.Tests` (49/49) both re-verified passing after the T023-discovered
`useHostApi`/`EndpointTester` OAuth-token-wiring fix.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational phase completion.
  - US1 and US2 both build directly on `OAuthConfigPanel.tsx` (US2 extends the component US1
    creates) — implement US1 first, then US2 additively in the same file.
  - US3 depends on the hook (`useOAuthToken`) from Foundational and the `remoteUseOAuthToken` flag
    from Foundational, but not on US1/US2 UI — it can be built in parallel with US1/US2 by a
    different contributor, though it is more naturally validated after US1 exists (need a way to
    get a token first).
  - US4 depends on US1's `OAuthConfigPanel.tsx` (status badge, Clear Token button) and US3's
    `EndpointTester.tsx` change (to verify the blocking behavior end-to-end).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories.
- **User Story 2 (P1)**: Extends the component created in US1 — implement after US1's `T012`.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2); independently testable once a
  token exists (from US1), but its own code changes don't depend on US1/US2 UI.
- **User Story 4 (P3)**: Depends on UI surfaces built in US1 (status badge, Clear Token) and US3
  (blocking behavior to verify against).

### Within Each User Story

- Store/type/client plumbing (Foundational) before any UI component.
- Component creation before wiring/mounting.
- Story complete and checkpoint-verified before moving to the next priority.

### Parallel Opportunities

- T002, T003, T004 (Foundational, different files) can run in parallel.
- T024, T025, T027, T030 (Polish, independent checks) can run in parallel.
- US3's T019–T021 can be developed in parallel with US1/US2's component work once Foundational is
  complete, since they touch different files (`RemoteOpenApiConfig.tsx`, `EndpointTester.tsx`,
  `RemoteApiDocScreen.tsx` vs. `OAuthConfigPanel.tsx`).

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational tasks together:
Task: "Extend executeRequest with contentType:'form' option in src/api/client.ts"
Task: "Update AuthConfigSet/AuthStoreState/AccessTokenState shapes in src/types/state.ts"
Task: "Add remoteUseOAuthToken to RemoteApiProfile in src/types/host-api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories, including the T010 secret
   redaction fix, which MUST NOT be deferred past this phase).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Acquire and view an application-level token independently of any Remote
   API profile, and confirm the debug panel does not show the plaintext client secret.
5. Continue to US2 (password grant) and US3 (profile opt-in + request wiring) — US3 is the story
   that actually removes the manual copy/paste burden this feature exists to solve, so it should
   not be deferred long after the MVP checkpoint.
6. Finish with US4 (inspect/clear) and Phase 7 Polish.
