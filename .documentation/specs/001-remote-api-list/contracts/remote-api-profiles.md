# Contract: Remote API Profiles

## Server Configuration Contract

Host applications can configure zero or more remote API profiles as server-provided defaults.

Required behavior:

- Each server-provided profile has a stable `id`.
- Each profile includes a `name` and optional `description`.
- Legacy single-remote configuration fields seed one profile when the new profile list is empty.
- Credentials and headers remain scoped to their profile.
- Server-provided OpenAPI credential values remain server-side and are not serialized in the browser config payload.

## `/api-test-spark/config` Response Contract

The config response includes the effective server defaults needed by the SPA:

```json
{
  "baseUrl": "https://localhost:5001",
  "openApiUrl": "/openapi/v1.json",
  "remoteApiProfiles": [
    {
      "id": "8c6231b6-b55c-4c39-a6d6-0b897a45f148",
      "name": "JSONPlaceholder",
      "description": "Demo API for posts, users, and comments.",
      "remoteBaseUrl": "https://jsonplaceholder.typicode.com",
      "remoteOpenApiUrl": "https://example.com/openapi.json",
      "remoteOpenApiApiKeyHeader": null,
      "remoteOpenApiApiKeyConfigured": false,
      "remoteOpenApiBearerTokenConfigured": false,
      "proxyMode": "server",
      "remoteDefaultHeaders": {
        "correlationId": "{request-guid}"
      }
    }
  ]
}
```

Compatibility behavior:

- Existing single-remote response fields may remain during the transition.
- New SPA code consumes `remoteApiProfiles` when present.
- Empty `remoteApiProfiles` means no remote API entries are shown.
- Server-provided profile credential values are redacted; boolean metadata may indicate whether a credential is configured.
- Browser-created profile credentials remain browser-local and are stored only in the browser persisted store.

## `/api-test-spark/remote-spec` Request Contract

The remote spec proxy fetches the OpenAPI document for server-provided profiles only.

Expected behavior:

- Request identifies the selected server-provided profile by stable id.
- Proxy rejects unknown, hidden, browser-created, or browser-edited profile ids.
- Proxy uses only the server-held OpenAPI URL and credentials for that server-provided profile.
- Proxy rejects non-HTTP schemes before outbound calls and retains the existing timeout behavior.
- Proxy returns sanitized errors that do not include credential values.
- Proxy never accepts a browser-submitted OpenAPI URL or credential bundle.

## Browser-Created Profile OpenAPI Fetch Contract

Browser-created profiles fetch their OpenAPI documents directly from the browser.

Expected behavior:

- The browser uses the profile's browser-local OpenAPI URL and browser-local credentials.
- The server proxy is not used for browser-created profiles.
- If the remote server blocks browser-side access, the harness surfaces a clear configuration/CORS error.
- Browser-created profile credentials are already visible to the browser and are not promoted to server-held credentials.

## SPA Persistence Contract

The browser-persisted remote config store contains:

- Browser-created profiles.
- Browser overrides keyed by stable profile id.
- Hidden server profile ids.
- Selected profile id.
- Store schema version.
- Browser-local credentials for browser-created profiles and browser overrides.

Reset behavior:

- Clears browser-created profiles.
- Clears browser overrides.
- Clears hidden server profile ids.
- Restores visible server defaults from the config endpoint on reload.
