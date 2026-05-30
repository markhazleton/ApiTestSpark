# Contract: Config Endpoint

**Feature**: `001-nuget-portable-harness` | **Date**: 2026-05-29

## Endpoint

```
GET /api-test-spark/config
```

## Purpose

Returns host app configuration metadata to the SPA on startup. Enables the SPA to discover the host app's OpenAPI document URL, auth scheme, and default headers without any hardcoded values in the embedded bundle.

## Request

No request body. No authentication required. No query parameters.

**Headers** (standard browser request):

```
Accept: application/json
```

## Response

### 200 OK (always)

```json
{
  "baseUrl": "https://localhost:5000",
  "openApiUrl": "/openapi.json",
  "authScheme": "Bearer",
  "defaultHeaders": {
    "X-Tenant-Id": "acme"
  }
}
```

### Response Schema

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `baseUrl` | `string` | No | Host app base URL, always derived from the request `Host` header at response time — not a configurable option |
| `openApiUrl` | `string` | Yes | Relative or absolute URL to the OpenAPI v3 JSON doc; `null` if not configured |
| `authScheme` | `string` | Yes | Auth scheme name: `"Bearer"`, `"ApiKey"`, `"Basic"`, or `null` |
| `defaultHeaders` | `object` | No | Key-value pairs of headers to inject into host API requests; `{}` if none |

### Minimal response (no options configured)

```json
{
  "baseUrl": "https://localhost:5000",
  "openApiUrl": "/openapi.json",
  "authScheme": null,
  "defaultHeaders": {}
}
```

## Security Contract

- This endpoint is **publicly accessible** — no authentication required
- `defaultHeaders` values MUST NOT contain actual tokens, passwords, or secrets
- `authScheme` identifies the scheme name only (e.g. `"Bearer"`) — not a token value
- Actual credentials are entered by the user in the SPA UI and never flow through this endpoint
- Host app authors are responsible for not configuring secrets in `DefaultHeaders`

## SPA Consumption

The SPA fetches this endpoint once on startup via `useHarnessConfig` hook (TanStack Query `useQuery`). The result is stored in `harnessConfigStore`. Subsequent OpenAPI fetch uses `config.openApiUrl`.

**Startup sequence**:

1. SPA mounts → `useHarnessConfig` fires `GET /api-test-spark/config`
2. On success → `harnessConfigStore.setConfig(config)` + `setConfigStatus('ready')`
3. If `config.openApiUrl` is non-null → fetch OpenAPI doc → parse → `setEndpoints(endpoints)`
4. If `config.openApiUrl` is null → `setOpenApiStatus('skipped')` → show built-in examples only
5. On any error → `setConfigStatus('error')` / `setOpenApiStatus('error')` → show error banner + built-in examples

## ILogger Events (.NET)

The config endpoint handler emits the following structured log events:

| Event | Level | Message |
|-------|-------|---------|
| Request received | `Information` | `"ApiTestSpark config requested from {RemoteIp}"` |
| Response sent | `Debug` | `"ApiTestSpark config served: openApiUrl={OpenApiUrl} authScheme={AuthScheme}"` |

## Static Asset Serving Contract

All other requests under `/api-test-spark/` are handled by the embedded static file middleware:

| Path pattern | Behaviour |
|---|---|
| `/api-test-spark/` | Serves `index.html` (SPA entry point) |
| `/api-test-spark/index.html` | Serves `index.html`; Cache-Control: `no-cache` |
| `/api-test-spark/assets/{hash}.js` | Serves hashed asset; Cache-Control: `public, max-age=31536000, immutable` |
| `/api-test-spark/assets/{hash}.css` | Same as above |
| `/api-test-spark/{*unmatched}` | Falls back to `index.html` (client-side routing) |
| `/api-test-spark/config` | Handled by `MapGet` before static middleware |

## Static Asset ILogger Events (.NET)

Every static asset request emits a structured log event via `ILogger` (FR-012c):

| Event        | Level   | Message                                                        |
|:-------------|:--------|:---------------------------------------------------------------|
| Asset served | `Debug` | `"ApiTestSpark static asset served: {Path} ({StatusCode})"` |
| SPA fallback | `Debug` | `"ApiTestSpark SPA fallback: {RequestPath} -> index.html"`  |

## SPA `defaultHeaders` Scope

`defaultHeaders` from the config response are injected into requests the SPA makes **to host app endpoints only** (via `useHostApi`). They are NOT sent on the OpenAPI document fetch or the config endpoint fetch itself.
