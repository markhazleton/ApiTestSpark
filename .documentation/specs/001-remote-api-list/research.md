# Research: Remote API List

## Decision: Use stable GUID profile ids

**Rationale**: Names are display values and must be editable. Stable GUIDs let browser overrides, hidden server profiles, selected routes, and migrations refer to the same profile after rename.

**Alternatives considered**:

- Match by name: rejected because renaming would create duplicates or lose overrides.
- Match by base URL: rejected because one API may have multiple environments or OpenAPI documents.
- Match by array index: rejected because server defaults can be reordered.

## Decision: Version the existing persisted remote config store

**Rationale**: The current remote configuration already persists under `api-test-spark-remote-config`. A versioned migration can preserve existing single-remote users by creating one profile from the prior fields.

**Alternatives considered**:

- New storage key: rejected because it risks losing existing user configuration unless an additional migration layer is still built.
- Reset all remote config: rejected because it violates the persistence requirement.

## Decision: Browser overrides merge by stable id

**Rationale**: Server defaults are useful shared seeds, but the browser must keep user edits and deletions across reloads. Merging by id allows a server default to be edited locally, hidden locally, or updated from the server when untouched.

**Alternatives considered**:

- Browser replaces full server list: rejected because users would stop receiving new server-provided defaults.
- Server always wins: rejected because browser persistence would feel broken.

## Decision: Hidden server profiles are persisted as ids

**Rationale**: Deleting a server-provided profile must survive reload. A hidden-id set preserves the user's intent while allowing reset to restore server defaults.

**Alternatives considered**:

- Session-only delete: rejected because deleted defaults would reappear immediately after reload.
- Disable delete for server profiles: rejected because users need to manage their visible list.

## Decision: Require unique visible names

**Rationale**: The home screen and generated documentation use names as navigation labels and titles. Unique visible names reduce ambiguity even though GUIDs remain the true identity.

**Alternatives considered**:

- Allow duplicates and append base URL: rejected because it creates noisy labels and can leak operational details into generated docs.
- Allow all duplicates: rejected because generated documentation and navigation become ambiguous.

## Decision: Keep the remote spec proxy profile-aware

**Rationale**: Each server-provided profile may have different OpenAPI URL and credentials. The proxy must fetch the selected server-provided profile's spec by stable id while preserving the existing server-side credential boundary and timeout/error behavior. Browser-created profiles must not be allowed to drive arbitrary server-side fetches.

**Alternatives considered**:

- Fetch remote specs directly in browser: rejected because it loses the CORS and server-side credential advantages.
- Create one proxy endpoint per profile: rejected because profile ids can be passed through the existing endpoint contract.

## Decision: Browser-created profiles fetch OpenAPI directly

**Rationale**: Browser-created profiles are local browser configuration. Allowing them to use the server proxy would let browser input control server-side outbound requests, creating SSRF risk. Direct browser fetch preserves user-managed profiles without crossing that trust boundary.

**Alternatives considered**:

- Browser-created profile proxying with URL validation: rejected because private-network, DNS rebinding, redirects, and local metadata endpoints make the trust boundary materially more complex than this feature needs.
- Server-known profiles only, no browser-created profiles: rejected because it undermines the config-page management requirement.

## Decision: Redact server-provided credentials from config responses

**Rationale**: Multi-profile support would otherwise expose every configured server credential in one config payload. Redacting server-provided credential values keeps credentials server-side for proxy use and reduces blast radius. Browser-created credentials remain browser-local because they are user-managed.

**Alternatives considered**:

- Serialize all credentials as before: rejected because the blast radius grows from one profile to all profiles.
- Remove credential support entirely: rejected because server-provided proxy profiles still need authenticated OpenAPI fetches.
