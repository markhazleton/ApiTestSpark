# Phase 0 Research: OAuth Token Configuration for API Authentication

**Feature**: `001-oauth-token-config` | **Date**: 2026-07-16

## R1 — Token request body format vs. shared `executeRequest` client layer

**Decision**: Extend `ApiRequestConfig`/`executeRequest` (`src/api/client.ts`) with an opt-in
`contentType: 'json' | 'form'` field (default `'json'`, preserving all existing callers). When
`'form'`, the request body is sent as `application/x-www-form-urlencoded` (via `URLSearchParams`)
instead of `JSON.stringify`. Response parsing is unchanged (OAuth token endpoints return JSON).

**Rationale**: OAuth2 token endpoints (RFC 6749 §4.3/§4.4, and the ASP.NET Identity-style
`/token` endpoint implied by the existing dormant `AuthTokenResponse` shape with `.issued`/`as:client_id`
fields) require `application/x-www-form-urlencoded` bodies, not JSON. `executeRequest` today always
`JSON.stringify`s the body — sending a token request through it unmodified would produce a body the
token endpoint cannot parse. Constitution Principle IV requires ALL API calls to flow through
`executeRequest` (no raw `fetch` outside it) — the correct compliant fix is a small, additive
extension to the shared layer, not a bypass.

**Alternatives considered**:

- Raw `fetch()` call directly inside the token-acquisition code path — rejected, violates
  Constitution IV ("Raw fetch calls outside of executeRequest MUST NOT be added").
- Always JSON-encode and hope the token endpoint accepts it — rejected, not RFC-compliant and will
  fail against real OAuth servers (including the ASP.NET Identity default provider this project's
  own dormant types were clearly modeled on).
- Selected: additive `contentType` option on the existing shared client, preserving UUID
  correlation, timing, and debug callbacks for every grant-type request exactly like every other
  API call in this tool.

## R2 — Where token acquisition I/O lives (layer placement)

**Decision**: Token acquisition (the actual HTTP call) is implemented as a small API-layer function
(`src/api/oauthTokenClient.ts`, functional factory using `executeRequest` directly with
`contentType: 'form'`) invoked from a new hook (`src/hooks/useOAuthToken.ts`) via TanStack Query
`useMutation`. The Zustand `authStore` is restricted to configuration CRUD and token **state**
(cache, validity, expiry) — it MUST NOT perform `fetch` itself.

**Rationale**: The dormant `authStore.ts` scaffolding this feature builds on already contains a
comment describing an (unimplemented) intent to do token I/O inside the store — that pattern would
violate Constitution III (hooks own API orchestration, stores own state) and Constitution IV (all
API calls via `executeRequest`, driven through `useMutation`). Correcting this before implementation
avoids baking a constitution violation into the first real usage of this store.

**Alternatives considered**:

- `fetchToken` as an async Zustand action calling `fetch` directly — rejected (violates III & IV).
- Selected: hook-owned mutation, store-owned state only.

## R3 — Persisting the access token (clarification FR-015 vs. dormant code's original intent)

**Decision**: Extend the existing `authStore` Zustand `persist` `partialize` to include the token
cache (keyed per Environment) in addition to config, using the same existing storage key
(`api-test-spark-auth-config`) — no new store, no new storage key.

**Rationale**: The dormant scaffolding intentionally excluded token state from persistence
("Token state is session-only (not persisted)"). Spec clarification (FR-015) explicitly reverses
this: the token must survive a page refresh. This is a deliberate, spec-driven change to the
persisted shape, applied to the single existing `useAuthStore`/`api-test-spark-auth-config` entry
in the canonical store registry (Constitution V) — it does not introduce a new store or violate the
"one concern per store" rule (config + its own token cache remain one auth concern).

**Alternatives considered**:

- New dedicated non-persisted store for tokens only — rejected; adds a second store for the same
  single concern (auth) and contradicts the explicit clarification to persist the token.

## R4 — Grant-type request shapes

**Decision**:

- `client_credentials`: `grant_type=client_credentials&client_id={clientId}&client_secret={clientSecret}`
- `password`: `grant_type=password&client_id={userClientId ?? clientId}&client_secret={userClientSecret ?? clientSecret}` (client_secret omitted if both are empty) `&username={testUsername}&password={testPassword}`

**Rationale**: Directly implements FR-001–FR-003 and the user-provided draft config shape
(`user_client_id`/`user_client_secret` as optional overrides, falling back to the application
client identity). Matches standard OAuth2 grant parameter names so this works against generic
OAuth2/OIDC token endpoints, not just one vendor.

**Alternatives considered**: None — grant parameter names are dictated by RFC 6749 and are not a
design choice.

## R5 — Timeout enforcement (FR-017)

**Decision**: Wrap the token-acquisition `fetch` (inside `executeRequest`, via `AbortController` +
`setTimeout`) with a ~20 second timeout, surfaced as a distinct `'Network'`-category error message
("Token request timed out") distinguishable from a generic network failure in the debug panel.

**Rationale**: `executeRequest` already accepts an `AbortSignal` — reusing that mechanism (rather
than inventing a new cancellation path) keeps the timeout implementation inside the existing,
constitutionally-recognized request pipeline.

**Alternatives considered**: Rely on browser default (no explicit cap) — rejected per clarification
answer (explicit timeout requested).

## Summary

All Technical Context unknowns are resolved. No NEEDS CLARIFICATION markers remain. Proceeding to
Phase 1 design.
