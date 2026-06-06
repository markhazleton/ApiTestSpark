# Contract: GET /api-test-spark/config (delta)

**Type**: Existing endpoint — additive change only | **Owner**: `ApiTestSparkExtensions.cs`

## Change Summary

Four new optional fields added to the JSON response body. All other fields and behaviour are unchanged. This is a backward-compatible (SEMVER: MINOR) change.

## New Fields

```jsonc
{
  // ... existing fields unchanged ...
  "remoteOpenApiUrl": "https://partner.example.com/openapi.json",  // null if not set
  "remoteOpenApiApiKeyHeader": "X-Api-Key",                         // null if not set
  "remoteOpenApiApiKeyValue": "abc123",                              // null if not set
  "remoteOpenApiBearerToken": "eyJ..."                              // null if not set
}
```

## Trust Boundary

These fields include credential values (`remoteOpenApiApiKeyValue`, `remoteOpenApiBearerToken`). This is intentional and acceptable because:

1. `/api-test-spark/config` is served only to the embedded SPA on the same host.
2. The harness is a local developer tool — it MUST NOT be deployed to a public-facing server.
3. This matches the existing pattern where `authScheme` and `defaultHeaders` are already exposed.

This trust assumption MUST be documented in the README and in XML doc comments on `ApiTestSparkOptions`.
