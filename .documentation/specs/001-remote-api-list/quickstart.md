# Quickstart: Remote API List

## Scenario 1: Server Seeds Multiple Remote APIs

1. Configure two remote API profiles in the host application's startup configuration.
2. Start the sample app.
3. Open `/api-test-spark/`.
4. Confirm the home screen shows one API explorer entry and one documentation entry for each remote profile.
5. Confirm each entry uses the configured profile name and description.

## Scenario 2: Browser Adds And Persists A Profile

1. Open the configuration page.
2. Add a new remote API profile with a unique name, description, base URL, OpenAPI URL, and headers.
3. Save the profile.
4. Reload the harness.
5. Confirm the profile remains visible and can be opened from API and documentation navigation.
6. Confirm the browser-created profile does not call `/api-test-spark/remote-spec` and instead fetches its OpenAPI document directly from the browser.

## Scenario 3: Rename Without Duplicating

1. Edit an existing profile name.
2. Save the profile.
3. Reload the harness.
4. Confirm the profile keeps the same effective configuration and no duplicate profile appears.

## Scenario 4: Duplicate Names Are Blocked

1. Add or edit a visible profile so its name matches another visible profile.
2. Attempt to save.
3. Confirm the save is blocked with a clear validation message.

## Scenario 5: Delete Server Default And Reset

1. Start with at least one server-provided remote profile.
2. Delete that profile from the configuration page.
3. Reload the harness.
4. Confirm the deleted server profile stays hidden.
5. Reset remote configuration.
6. Reload the harness.
7. Confirm the server-provided profile reappears.

## Scenario 6: Legacy Single Remote Migration

1. Begin with browser storage using the previous single-remote shape.
2. Load the updated harness.
3. Confirm the existing remote configuration appears as one profile with a safe display name and a new stable GUID.

## Scenario 7: Server Credential Redaction

1. Configure a server-provided remote API profile with an API key or bearer token.
2. Request `/api-test-spark/config`.
3. Confirm the response includes the profile metadata but does not include the credential value.
4. Open the server-provided profile's remote documentation.
5. Confirm the proxy can fetch the OpenAPI document by profile id.

## Scenario 8: Browser Profile Proxy Rejection

1. Create a browser-managed profile with a valid OpenAPI URL.
2. Open the profile's remote documentation.
3. Confirm the browser fetches the OpenAPI URL directly.
4. Confirm no server-side proxy request is made for the browser-created profile.
