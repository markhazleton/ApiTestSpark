# Contract: GET /api-test-spark/remote-spec

**Type**: HTTP endpoint (new) | **Owner**: `ApiTestSparkExtensions.cs`

## Purpose

Server-side proxy that fetches the configured remote OpenAPI JSON document and returns it to the React SPA. Eliminates CORS issues and keeps credentials off the browser network tab.

## Request

```
GET /api-test-spark/remote-spec
```

No query parameters. No request body. No auth headers required from caller.

## Behaviour

1. Read `RemoteOpenApiUrl` from `ApiTestSparkOptions`. If null/empty → `400`.
2. Build outbound HTTP request to `RemoteOpenApiUrl`:
   - If `RemoteOpenApiApiKeyHeader` + `RemoteOpenApiApiKeyValue` are set: add `{header}: {value}` to outbound request headers.
   - If `RemoteOpenApiBearerToken` is set: add `Authorization: Bearer {token}` to outbound request headers.
   - If both are set: add both (API key header takes precedence on header name conflicts, bearer added separately).
3. Execute outbound fetch (server-side `HttpClient`).
4. On success (2xx): stream response body to caller as `application/json`.
5. On non-2xx or network error: return `502` with a safe error message — credentials MUST NOT appear in the message.

## Responses

| Status | When | Body |
|---|---|---|
| `200 OK` | Remote fetch succeeded | Raw OpenAPI JSON from remote server |
| `400 Bad Request` | `RemoteOpenApiUrl` not configured | `{ "error": "RemoteOpenApiUrl is not configured." }` |
| `502 Bad Gateway` | Remote fetch failed (non-2xx or network error) | `{ "error": "Failed to fetch remote OpenAPI document." }` |

## Headers (response)

Same as all other harness endpoints:

- `Cache-Control: no-cache`
- CSP headers inherited from harness middleware
- No `Access-Control-Allow-Origin` beyond what the harness already sets

## Security Notes

- Credentials are read from `ApiTestSparkOptions` at request time — never from the request itself.
- Error responses MUST NOT include credential values, the remote URL, or any detail that would help an attacker probe the remote server.
- This endpoint carries the same open trust model as all `/api-test-spark/*` routes. It MUST NOT be exposed to the public internet.
