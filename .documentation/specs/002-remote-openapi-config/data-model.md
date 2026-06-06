# Data Model: Remote OpenAPI Configuration

**Feature**: `002-remote-openapi-config` | **Date**: 2026-06-05

## Entities & Field Changes

### `ApiConfigSet` (extended) — `src/types/state.ts`

Per-environment config slice stored in `useUnifiedConfigStore`. Four new optional fields:

| Field | Type | Nullable | Description |
|---|---|---|---|
| `remoteOpenApiUrl` | `string` | yes | Full URL to remote OpenAPI JSON document |
| `remoteOpenApiApiKeyHeader` | `string` | yes | HTTP header name for API key (e.g. `X-Api-Key`) |
| `remoteOpenApiApiKeyValue` | `string` | yes | API key value — sensitive, never logged |
| `remoteOpenApiBearerToken` | `string` | yes | Bearer token value — sensitive, never logged |

All four default to `undefined`. A field being `undefined` means "not configured" — the harness falls back to local OpenAPI discovery.

### `HarnessConfig` (extended) — `src/types/host-api.ts`

Returned by `GET /api-test-spark/config`. Four new optional fields mirroring `ApiTestSparkOptions`:

| Field | Type | Nullable | Description |
|---|---|---|---|
| `remoteOpenApiUrl` | `string \| null` | yes | Pre-configured remote URL from `Program.cs` |
| `remoteOpenApiApiKeyHeader` | `string \| null` | yes | Pre-configured API key header name |
| `remoteOpenApiApiKeyValue` | `string \| null` | yes | Pre-configured API key value |
| `remoteOpenApiBearerToken` | `string \| null` | yes | Pre-configured Bearer token |

### `ApiTestSparkOptions` (extended) — `ApiTestSpark/ApiTestSparkOptions.cs`

Four new public properties (SEMVER: MINOR — additive, backward-compatible):

| Property | Type | Default | Description |
|---|---|---|---|
| `RemoteOpenApiUrl` | `string?` | `null` | Remote OpenAPI JSON URL |
| `RemoteOpenApiApiKeyHeader` | `string?` | `null` | API key header name |
| `RemoteOpenApiApiKeyValue` | `string?` | `null` | API key value |
| `RemoteOpenApiBearerToken` | `string?` | `null` | Bearer token |

### Seed Priority Rule

On React app boot, after `HarnessConfig` is loaded:

```
For each field in [remoteOpenApiUrl, remoteOpenApiApiKeyHeader, remoteOpenApiApiKeyValue, remoteOpenApiBearerToken]:
  harness_value = HarnessConfig[field]           // from Program.cs
  persisted_value = store.getSectionConfig(env)[field]  // from localStorage

  if (harness_value != null && persisted_value == null):
    store.action(env, harness_value)             // seed once
  // else: persisted value wins, harness value ignored
```

## State Transitions

```
Remote OpenAPI Source State:
  NOT_CONFIGURED  ─── user enters URL ──→  CONFIGURED_UI
  NOT_CONFIGURED  ─── Program.cs seed ──→  CONFIGURED_SEEDED (editable, treated same as UI)
  CONFIGURED_*    ─── user clears URL ──→  NOT_CONFIGURED (all credential fields also cleared)

Endpoint Discovery State (per session):
  LOCAL   ─── remote URL set + fetch succeeds ──→  REMOTE
  REMOTE  ─── fetch fails ──────────────────────→  REMOTE (retain last, log error)
  REMOTE  ─── user clears URL ──────────────────→  LOCAL
  LOCAL   ─── no remote URL set ───────────────→  LOCAL (unchanged)
```

## Invariants

1. `remoteOpenApiApiKeyValue` and `remoteOpenApiBearerToken` MUST NOT appear in any `ErrorResponse`, debug store entry, App Insights payload, or log message.
2. Credential fields are masked in the UI (`type="password"`).
3. When `remoteOpenApiUrl` is cleared, all four fields are cleared together atomically via a single store action.
4. The proxy endpoint (`/api-test-spark/remote-spec`) reads credentials from `ApiTestSparkOptions` at request time — it does NOT accept credentials as request parameters.
