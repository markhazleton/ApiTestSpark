# Phase 1 Data Model: OAuth Token Configuration for API Authentication

**Feature**: `001-oauth-token-config` | **Date**: 2026-07-16

## Entities

### OAuthConfig (extends existing dormant `AuthConfigSet`, `src/types/state.ts`)

Per-Environment configuration. One instance per `Environment` (`localhost` | `test` | `other`),
held in `AuthEnvironmentConfigs`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `baseUrl` | `string` | yes (for "complete" status) | Token endpoint URL. Must be `http(s)://…`. |
| `clientId` | `string` | yes (for "complete" status) | Application client ID (client_credentials + password fallback). |
| `clientSecret` | `string` | yes (for "complete" status) | Application client secret. Masked in UI. |
| `userClientId` | `string?` | no | Overrides `clientId` for password grant only. |
| `userClientSecret` | `string?` | no | Overrides `clientSecret` for password grant only. Masked in UI. |
| `testUsername` | `string?` | required to acquire a password-grant token | Resource-owner username. |
| `testPassword` | `string?` | required to acquire a password-grant token | Resource-owner password. Masked in UI. |
| `description` | `string?` | no | Free-text note. |
| `lastUpdatedAt` | `number` | derived | Epoch ms, set on every update. |
| `status` | `'complete' \| 'incomplete'` | derived | `'complete'` when `baseUrl` + `clientId` + `clientSecret` are all set (client_credentials capable). Password-grant capability is evaluated independently at click-time (`testUsername` + `testPassword` present) — see FR-003 acceptance criteria. |

Renames from current dormant shape: `username` → `testUsername`, `password` → `testPassword`
(clarity only — no behavior change, store is currently unused elsewhere in the app).

### AccessTokenState (extends existing dormant `AuthTokenState`, `src/types/state.ts`)

**Per-Environment** cache (breaking change from current single global `token` object — see
research.md R3). Held as `tokens: Record<Environment, AccessTokenState>` inside `AuthStoreState`.

| Field | Type | Notes |
|---|---|---|
| `accessToken` | `string \| null` | The bearer token value. |
| `tokenType` | `string \| null` | Usually `"Bearer"`. |
| `expiresAt` | `number \| null` | Epoch ms. `isTokenValid()` applies a 30s buffer before this. |
| `acquiredVia` | `'client_credentials' \| 'password' \| null` | Records which grant produced the cached token (drives FR-009's "no silent password-grant resubmission" rule). |
| `isAuthenticated` | `boolean` | `true` once a token has been successfully acquired. |

Removed from the current dormant shape: `refreshToken`, `userName`, `givenName`, `surname`,
`email`, `roles` — these were ASP.NET-Identity-specific fields assumed present on every OAuth
provider; per FR/Assumptions, only `access_token`/`token_type`/`expires_in` are guaranteed by a
generic OAuth2 token response, and this feature does not implement refresh-token reacquisition
(Out of Scope). If a provider returns these fields they are ignored, not required.

**State transitions**: `none` → (acquire success) → `valid` → (time passes past `expiresAt - 30s`)
→ `expired` → (acquire success, any grant) → `valid` (FR-016 overwrite) → (Clear Token) → `none`.

### RemoteApiProfile (existing entity, extended — `src/types/host-api.ts`)

| Field | Type | Notes |
|---|---|---|
| `remoteUseOAuthToken` | `boolean?` | New. Defaults to `false`/undefined. When `true`, requests from this profile use the active Environment's `AccessTokenState` (FR-007, FR-011) instead of `remoteOpenApiBearerToken`. |

No other fields change. `remoteOpenApiBearerToken` remains present and fully functional as the
fallback path when this flag is off.

## Validation Rules (from Functional Requirements)

- `OAuthConfig.status` = `'complete'` requires `baseUrl` matching `/^https?:\/\/.+/` AND
  non-empty `clientId` AND non-empty `clientSecret` (FR-001, mirrors existing
  `validateAuthConfigStatus` pattern already in the dormant store).
- Acquiring a **password**-grant token additionally requires non-empty `testUsername` and
  `testPassword` at click-time (FR-003); `userClientId`/`userClientSecret` are optional and fall
  back to `clientId`/`clientSecret` (FR-002).
- `AccessTokenState` is considered valid only when `accessToken` is non-null AND
  `Date.now() < expiresAt - 30_000` (existing 30s buffer convention, reused unchanged).
- A profile with `remoteUseOAuthToken: true` MUST NOT fire a request when no valid token is
  obtainable — block + surface error (FR-014), never send unauthenticated, never silently fall
  back to `remoteOpenApiBearerToken` (this is a deliberate, explicit precedence rule, not a
  fallback chain).

## Relationships

```
Environment (1) ── (1) OAuthConfig
Environment (1) ── (1) AccessTokenState
RemoteApiProfile (n) ── (0..1, via remoteUseOAuthToken flag) ── Environment's AccessTokenState
```

No new persisted stores. `OAuthConfig` + `AccessTokenState` both live inside the existing
`useAuthStore` (`api-test-spark-auth-config` storage key, already in the canonical store registry
— Constitution V). `RemoteApiProfile.remoteUseOAuthToken` lives inside the existing
`useRemoteConfigStore` (`api-test-spark-remote-config`).
