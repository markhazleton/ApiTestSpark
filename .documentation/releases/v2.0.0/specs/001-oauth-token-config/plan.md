# Implementation Plan: OAuth Token Configuration for API Authentication

**Branch**: `001-oauth-token-config` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/.documentation/specs/001-oauth-token-config/spec.md`

**Note**: This template is filled in by the `/devspark.plan` command. See `.documentation/templates/commands/plan.md` for the execution workflow.

## Summary

Activate the existing but dormant per-Environment `authStore` OAuth scaffolding into a real
`client_credentials` + `password` grant token-acquisition feature. Token requests are executed
through a small, additive extension to the shared `executeRequest` client layer (adds a
`contentType: 'form'` option for `application/x-www-form-urlencoded` bodies), invoked from a new
`useOAuthToken` hook via TanStack Query `useMutation`. The `authStore` is corrected to hold only
configuration + token **state** (no direct `fetch`), with the token cache re-keyed per Environment
and, per clarification, persisted across page refresh. A single boolean flag
(`RemoteApiProfile.remoteUseOAuthToken`) lets a Remote API profile opt in to the environment's
OAuth-derived token in place of its existing static Bearer Token field; profiles that don't opt in
are entirely unaffected.

## Technical Context

**Language/Version**: TypeScript 6.0 (strict mode), React 19
**Primary Dependencies**: Zustand 5 (`persist` middleware), TanStack Query 5 (`useMutation`), Vite 8, React Router DOM 7
**Storage**: Browser `localStorage` via Zustand `persist`, existing key `api-test-spark-auth-config` (auth config + token cache) and `api-test-spark-remote-config` (profile opt-in flag) — no new storage keys
**Testing**: N/A — React SPA has no JS/TS test runner by constitutional design (Principle VII); manual verification per [quickstart.md](./quickstart.md)
**Target Platform**: Browser SPA, embedded in a host ASP.NET Core app via the `ApiTestSpark` NuGet package (no .NET code changes in this feature)
**Project Type**: Single project — feature addition within the existing React SPA (`src/`)
**Performance Goals**: No new performance targets; a token request is a single network round trip gated by the existing 20s timeout (FR-017) — no throughput/latency target beyond "doesn't block the UI thread"
**Constraints**: Zero raw `fetch` outside `executeRequest` (Constitution IV); zero behavior change for Remote API profiles that don't opt in (FR-011, SC-004); token acquisition timeout ~15-30s (FR-017)
**Scale/Scope**: 3 Environments × 1 OAuth config + 1 cached token each; arbitrary number of Remote API profiles, each with one new boolean flag

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
*Constitution version: 1.1.2 — see `.documentation/memory/constitution.md`*

| # | Gate | Status |
|---|------|--------|
| I | `npm run verify` (tsc -b + vite build) MUST pass — zero TypeScript errors | ☑ PASS — new types are additive; renamed dormant fields (`username`→`testUsername` etc.) have no other consumers |
| II | `npm run lint` MUST pass — zero ESLint errors (react-hooks/exhaustive-deps enforced) | ☑ PASS — no new lint-risk patterns introduced |
| III | New feature follows: types → api client → hook → component + barrel exports at every directory | ☑ PASS — see Project Structure below; every new file re-exported from its directory's `index.ts` |
| IV | API client extends `ApiClient`/`createRestCaller`, instantiated per-call, UUID-correlated, debug callbacks injected | ☑ PASS (after correction) — **initial design in session discussion called for the Zustand store to call `fetch` directly for token acquisition, which would have violated this gate.** Corrected during planning (research.md R1/R2): token acquisition is a `src/api/oauthTokenClient.ts` function built on the existing `executeRequest`, invoked only from a `useOAuthToken` hook via `useMutation`. The store performs no I/O. |
| V | Zustand stores: one concern each, mutate via actions only, FIFO buffer limits respected | ☑ PASS — reuses the existing single-concern `useAuthStore` (already in the canonical registry); no new store. Token cache re-keying per Environment and persisting it (research.md R3) is a deliberate, clarification-driven change to what that one store persists, not a new concern. |
| VI | No `console.log` in `src/`; all request/response/error routed through `useDebugStore` | ☑ PASS — token fetch failures route through `useDebugStore.addError` with `'Network'`/`'API'` categories, matching FR-012 |
| VIII | No PII/PHI in any test data, type, store, log, or App Insights payload | ☑ PASS — fields are test-tool client secrets / test-user credentials, not real personal data; quickstart.md carries an explicit synthetic-credential reminder |

*Gate VII (testing stance) is aspirational and not a blocking gate.*

**Post-Phase-1 re-check**: All gates remain PASS after data-model.md/quickstart.md design — no new
violations were introduced by the entity design (see data-model.md). No `## Constitution Waivers`
section is required.

## Project Structure

### Documentation (this feature)

```text
.documentation/specs/001-oauth-token-config/
├── plan.md              # This file (/devspark.plan command output)
├── research.md          # Phase 0 output (/devspark.plan command)
├── data-model.md        # Phase 1 output (/devspark.plan command)
├── quickstart.md        # Phase 1 output (/devspark.plan command)
├── checklists/
│   └── requirements.md  # /devspark.specify output
└── tasks.md              # Phase 2 output (/devspark.tasks command - NOT created by /devspark.plan)
```

No `contracts/` directory — this feature exposes no new external interface (no new .NET
endpoint, no new public NuGet API); it is entirely an internal SPA capability (see spec Out of
Scope and quickstart.md).

### Source Code (repository root)

```text
src/
├── types/
│   ├── state.ts                          # MODIFY: AuthConfigSet, AuthStoreState, AccessTokenState fields
│   └── host-api.ts                       # MODIFY: RemoteApiProfile.remoteUseOAuthToken
├── api/
│   ├── client.ts                         # MODIFY: add contentType:'form' option to executeRequest/ApiRequestConfig
│   ├── oauthTokenClient.ts               # NEW: builds grant-type request bodies, calls executeRequest
│   └── index.ts                          # MODIFY: barrel re-export
├── hooks/
│   ├── useOAuthToken.ts                  # NEW: useMutation wrapper + ensureOAuthToken() orchestration
│   └── index.ts                          # MODIFY: barrel re-export
├── store/
│   ├── authStore.ts                      # MODIFY: per-Environment token cache, persisted, no direct fetch
│   ├── remoteConfigStore.ts              # MODIFY: normalizeRemoteProfile defaults remoteUseOAuthToken
│   └── index.ts                          # (no change — already exports useAuthStore)
├── components/
│   ├── harness-config/
│   │   ├── OAuthConfigPanel.tsx          # NEW: global per-Environment OAuth config + Get Token actions
│   │   ├── RemoteOpenApiConfig.tsx       # MODIFY: opt-in checkbox
│   │   └── index.ts                     # MODIFY: barrel re-export
│   ├── ConfigScreen.tsx                  # MODIFY: mount OAuthConfigPanel
│   ├── host-api/
│   │   └── EndpointTester.tsx            # MODIFY: await ensureOAuthToken before firing when opted in
│   └── remote-api/
│       └── RemoteApiDocScreen.tsx        # MODIFY: use cached token or placeholder in generated curl
```

**Structure Decision**: Single-project React SPA structure (existing `src/` layer order from
Constitution III: types → api → hooks → components/store). No backend/frontend split, no new
top-level project — this is an addition to the existing feature set within the current repository
layout.

## Complexity Tracking

*No unresolved Constitution violations. The one identified risk (raw `fetch` inside the store,
Gate IV) was resolved during planning via research.md R1/R2 rather than justified as a deviation —
no waiver needed.*

## Implementation Notes

*Discovered during `/devspark.implement` (2026-07-16) — deviations from the original plan, per the
implement workflow's rule to record rather than silently diverge.*

1. **`OAuthConfigPanel` manages its own Environment tabs, not an `env` prop (T014).** The plan
   assumed `<OAuthConfigPanel env={currentEnvironment} />` mounted alongside an existing
   environment switcher. In practice, `ConfigScreen.tsx` (where the panel needed to live, next to
   Remote API profile management) has no environment switcher of its own — that pattern
   (`SectionConfigPanel`'s `activeEnv` tabs) belongs to the per-API-section config screens
   (JokeAPI/JSONPlaceholder), not the remote-profiles screen. `OAuthConfigPanel` therefore owns a
   small internal `localhost | test | other` tab selector, matching `SectionConfigPanel`'s existing
   UX convention rather than introducing a prop dependency ConfigScreen can't satisfy.

2. **The opt-in checkbox (T019) lives in `ConfigScreen.tsx`'s `BrowserProfileEditor`, not
   `src/components/harness-config/RemoteOpenApiConfig.tsx` as originally planned.** Investigation
   during implementation found `RemoteOpenApiConfig.tsx` is dead code — exported from
   `harness-config/index.ts` and `components/index.ts` but never rendered anywhere in the app (no
   `<RemoteOpenApiConfig` usage exists). It edits a parallel, unused `harnessconfig` section of
   `useUnifiedConfigStore`, not the `RemoteApiProfile` entities that actually back the Remote API
   Explorer and Doc Builder. The real, active per-profile editing UI is `ConfigScreen.tsx`'s
   `BrowserProfileEditor` component (backed by `useRemoteConfigStore`/`RemoteApiProfile`), which is
   where the "Use environment OAuth token" checkbox was added instead, alongside the existing
   static Bearer Token field it takes precedence over. `RemoteOpenApiConfig.tsx` was left
   unmodified — it remains dead code outside this feature's scope to remove.

3. **Manual verification (T017, T023, T029) — completed 2026-07-16 via a local mock OAuth2
   provider.** A minimal Node HTTP server (form-urlencoded `/token` endpoint supporting both
   `client_credentials` and `password` grants, plus a bearer-token-protected `/protected` resource
   and its OpenAPI document) was stood up locally and driven through a real running dev server and
   browser session. All three tasks passed after one real defect was found and fixed — see note 5
   below.

4. **Added capability beyond original scope: server-side (`Program.cs`) OAuth configuration for
   `RemoteApiProfile` (2026-07-16, post-implementation).** The original spec explicitly listed
   "Seeding OAuth secrets on the server side via the .NET package options" as Out of Scope. After
   evaluating the feature, the user requested this capability be added, following the same
   "server holds the secret, browser only sees a `*Configured: true` flag" pattern already used
   for `RemoteOpenApiBearerToken`/`RemoteOpenApiApiKeyValue`. Implemented as:
   - `ApiTestSpark/ApiTestSparkOptions.cs`: new `RemoteApiProfileOAuth` class (`TokenEndpointUrl`,
     `ClientId`, `ClientSecret`) and `RemoteApiProfile.OAuth` property. Public API surface change
     recorded in `PublicAPI.Unshipped.txt` (requires a `SEMVER: MINOR` label on the PR per
     Constitution/NuGet package conventions).
   - `ApiTestSpark/ApiTestSparkExtensions.cs`: a static, in-memory, per-profile token cache
     (`ConcurrentDictionary`, 30s expiry buffer, same convention as the browser-side cache) acquires
     a `client_credentials` token via `SharedHttpClient`/`options.TestHttpClient` and injects
     `Authorization: Bearer <token>` when (a) fetching the remote OpenAPI document and (b) proxying
     calls through `/api-test-spark/remote-call`. **The client secret and the acquired token never
     reach the browser** — this only works for actual API calls when `EnableRemoteCallProxy` is
     enabled for the profile, matching the existing behavior of `RemoteOpenApiBearerToken` (a
     server-held secret that isn't sent to the browser is only usable by the server's own proxy
     path, not by direct browser-initiated calls).
   - `/api-test-spark/config` now returns `remoteOAuthConfigured: true/false` per profile (boolean
     only, never the endpoint URL/client id/secret).
   - Browser: `RemoteApiProfile.remoteOAuthConfigured` (read-only) added to `host-api.ts`;
     `ConfigScreen.tsx`'s `ServerProfileRow` shows an "oauth: configured on server
     (client_credentials)" indicator. No editable fields are shown for server-configured OAuth —
     `ServerProfileRow` was already read-only by construction (only `BrowserProfileEditor` has
     editable fields, and server profiles never render through that component), so "hide from UI"
     required no additional hiding logic beyond adding the indicator.
   - Scope: `client_credentials` grant only (password grant was not requested for the server-side
     path, since Program.cs-configured profiles represent a fixed application identity, not a
     rotating test user).
   - `dotnet build ApiTestSpark` and `dotnet test ApiTestSpark.Tests` (49/49) both pass; `npm run
     verify` passes.

5. **CRITICAL defect found and fixed during T023's live end-to-end verification (2026-07-16): the
   OAuth-acquired token was never attached to the real outgoing request.** `EndpointTester.tsx`
   correctly acquired the token (`ensureOAuthToken`) and built a `requestHeaders` object containing
   `Authorization: Bearer <token>` — but that object was used only to populate the UI's
   `pendingRequest`/cURL-preview state, which is captured *after* `mutate()` succeeds. The actual
   network call is built entirely inside `useHostApi.ts`'s `mutationFn`, which received
   `remoteProfile` but never the acquired `oauthToken`, and had no OAuth-aware header logic at
   all — it only ever applied `remoteProfile.remoteOpenApiBearerToken` (the static field). The
   practical effect: a profile with "Use environment OAuth token" enabled would successfully
   acquire a token, show a plausible-looking cURL/headers preview in the debug panel, and still
   send the real request with no `Authorization` header at all (confirmed via a live 401 against
   the mock protected API before the fix, and a live 200 with the token correctly echoed back by
   the mock API after the fix). This could only be caught by an actual live request — a purely
   code-level review of `EndpointTester.tsx` in isolation looks correct, because the bug is in what
   `mutate()` is (and isn't) given, not in the header-construction logic itself.
   - **Fix**: added `oauthToken?: string | null` to `HostApiRequest` (`src/hooks/useHostApi.ts`);
     `mutationFn` now sets `Authorization: Bearer <req.oauthToken>` when
     `remoteProfile.remoteUseOAuthToken && req.oauthToken`, falling back to
     `remoteProfile.remoteOpenApiBearerToken` otherwise — preserving the existing OAuth-over-static
     precedence rule. `EndpointTester.tsx`'s `mutate(...)` call now passes `oauthToken` through.
   - Re-verified live after the fix: `npm run verify` clean; live request against the mock
     protected API returned 200 with the correct `Authorization` header confirmed by the API's own
     response body.
