# Data Model: Remote API List

## Remote API Profile

Represents one configured remote API available in the harness.

| Field | Required | Description | Validation |
| --- | --- | --- | --- |
| `id` | Yes | Stable profile identifier. New profiles receive a new GUID. | Must be non-empty and unique within the collection. |
| `name` | Yes | User-facing display name used in navigation and documentation titles. | Must be non-empty and unique among visible profiles. |
| `description` | No | User-facing description used in API and documentation sections. | Must not contain credential values. |
| `remoteBaseUrl` | No | Base URL used for endpoint calls. | Empty or absolute `http://` / `https://` URL. |
| `remoteOpenApiUrl` | No | OpenAPI document URL fetched through the server proxy. | Empty or absolute `http://` / `https://` URL. |
| `remoteOpenApiApiKeyHeader` | No | Header name for API key auth. | Required only when API key value is provided. |
| `remoteOpenApiApiKeyValue` | No | API key value used for remote spec fetch and API calls. | For server-provided profiles, held server-side and redacted from config responses. For browser-created profiles, stored browser-side only. Never used in display text or generated titles. |
| `remoteOpenApiBearerToken` | No | Bearer token used for remote spec fetch and API calls. | For server-provided profiles, held server-side and redacted from config responses. For browser-created profiles, stored browser-side only. Never used in display text or generated titles. |
| `remoteDefaultHeaders` | No | Default headers for endpoint calls. | Header keys are unique within the profile. |
| `source` | Yes | Indicates whether a profile originated from server defaults or browser creation. | `server` or `browser`. |
| `proxyMode` | Yes | Indicates how the OpenAPI document is fetched. | `server` for server-provided profiles; `browser` for browser-created profiles. |

## Remote API Collection

Represents the effective visible profile list for the current browser.

| Field | Description |
| --- | --- |
| `profiles` | Browser-created profiles and browser overrides for server profiles. |
| `hiddenServerProfileIds` | Stable ids of server-provided profiles hidden by the user. |
| `selectedProfileId` | Optional last selected profile id for navigation and config editing convenience. |
| `version` | Persisted schema version for migration from single-remote storage. |

## Merge Rules

1. Start with all server-provided profiles.
2. Remove server profiles whose ids are present in `hiddenServerProfileIds`.
3. Apply browser profile values over server profiles with the same id.
4. Append browser-created profiles whose ids are not present in the server profile list.
5. Validate that visible names are unique before save.

## Migration Rules

- Existing version 1 single-remote persisted config becomes one browser-created profile.
- Migrated profile id is a new GUID.
- Migrated profile name uses a deterministic fallback label when no name exists.
- Empty prior single-remote config migrates to an empty browser-created profile list.

## State Transitions

```text
Server default visible
  ├── edit -> Browser override by same id
  ├── delete -> Hidden server profile id
  └── reset -> Server default visible

Browser-created visible
  ├── edit -> Browser-created visible with same id
  └── delete -> Removed from browser profile list
```

## Display Rules

- Navigation and generated documentation use `name` and `description`.
- Credentials are never fallback display values.
- Missing or malformed names fall back to deterministic safe display text.

## Proxy Rules

- Server-provided profiles may use the server proxy by stable id.
- Browser-created profiles never use the server proxy and fetch OpenAPI documents directly from the browser.
- Server-provided API key and bearer token values are not included in the config response.
- Browser-created credentials remain browser-local and are never promoted to server-held credentials.
