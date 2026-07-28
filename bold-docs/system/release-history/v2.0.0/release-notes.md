# Release Notes — v2.0.0

**Release Date:** 2026-07-16
**Version Bump:** Major (1.8.0 → 2.0.0)
**Contributors:** Mark Hazleton
**Pull Request:** [#7](https://github.com/MarkHazleton/ApiTestSpark/pull/7)

---

## Headline

**OAuth Token Configuration.** Testers no longer have to paste a raw bearer token into a Remote API profile. Configure an OAuth2 `client_credentials` or `password` grant per Environment right in the Config screen, and let opted-in Remote API profiles acquire and attach the token automatically — or, for `Program.cs`-configured profiles, let the **server** acquire and cache the token itself so the client secret never reaches the browser at all.

---

## Added

- **OAuth Token Configuration (browser-side)** — configure a token endpoint, application client credentials, and (optionally) separate test-user credentials per Environment (`localhost`/`test`/`other`) on the Config screen. "Get App Token" and "Get Test User Token" buttons always acquire a fresh token (silent-overwrite guarantee); tokens persist across page reloads per Environment. Remote API profiles opt in via a "Use environment OAuth token" checkbox, which takes precedence over a manually entered static Bearer Token. If a valid token cannot be obtained when firing a request, the request is **blocked** with a distinct error — never sent unauthenticated, never silently falling back to a static token.
- **OAuth Token Configuration (server-side)** — new `RemoteApiProfileOAuth` (`TokenEndpointUrl`, `ClientId`, `ClientSecret`) on `RemoteApiProfile.OAuth`. The server acquires and caches a `client_credentials` token itself and injects `Authorization: Bearer <token>` into the remote-spec proxy fetch and, when `EnableRemoteCallProxy` is enabled, into proxied endpoint calls. The client secret and acquired token are **never** returned to the browser — `/api-test-spark/config` exposes only a `remoteOAuthConfigured: true/false` flag, and the Config screen shows a read-only "configured on server" indicator.
- **Secret redaction in the debug pipeline** — every OAuth token request's `client_secret`/`password` fields are redacted (`***redacted***`) before reaching the debug panel or Application Insights, while the real, unredacted request still reaches the token endpoint (closes a SHOWSTOPPER-severity risk caught during design review, before any code shipped).

## Changed

- `EndpointTester`'s request-firing path now threads an acquired OAuth token through to the real outgoing request (previously a defect caused the token to appear correctly in the UI's cURL preview while the real request was sent unauthenticated — caught and fixed during this release's own live end-to-end verification, before merge).

## Fixed

- See "Changed" above — no user-facing regressions shipped; the defect was caught and fixed within this release cycle.

---

## Migration Notes

- **No breaking changes.** This is a fully additive release — existing `RemoteOpenApiBearerToken`/`RemoteOpenApiApiKeyValue` profiles are unaffected, and no existing `ApiTestSparkOptions` behavior changed.
- To use browser-side OAuth: open the **Config** screen, select an Environment, fill in the OAuth Token Configuration panel, then check **Use environment OAuth token** on any Remote API profile.
- To use server-side OAuth: set `options.RemoteApiProfiles[].OAuth = new RemoteApiProfileOAuth { TokenEndpointUrl = "...", ClientId = "...", ClientSecret = "..." }` in `Program.cs`. Set `EnableRemoteCallProxy = true` for the profile's proxied endpoint calls to actually carry the token.
- Password grant support is provider-dependent — many identity providers (Entra ID, Okta, Auth0, Google) disable the Resource Owner Password Credentials grant by default. Use a dedicated test-only app registration if you need this flow.

---

## Public API Changes

New members on `RemoteApiProfile` and a new `RemoteApiProfileOAuth` class (MAJOR-labeled release, additive surface):

```text
ApiTestSpark.RemoteApiProfile.OAuth.get -> ApiTestSpark.RemoteApiProfileOAuth?
ApiTestSpark.RemoteApiProfile.OAuth.set -> void
ApiTestSpark.RemoteApiProfileOAuth
ApiTestSpark.RemoteApiProfileOAuth.RemoteApiProfileOAuth() -> void
ApiTestSpark.RemoteApiProfileOAuth.ClientId.get -> string!
ApiTestSpark.RemoteApiProfileOAuth.ClientId.set -> void
ApiTestSpark.RemoteApiProfileOAuth.ClientSecret.get -> string!
ApiTestSpark.RemoteApiProfileOAuth.ClientSecret.set -> void
ApiTestSpark.RemoteApiProfileOAuth.TokenEndpointUrl.get -> string!
ApiTestSpark.RemoteApiProfileOAuth.TokenEndpointUrl.set -> void
```

`PublicAPI.Shipped.txt` updated to include these members. `PublicAPI.Unshipped.txt` cleared.

---

## Architecture Decisions

- **ADR-010**: OAuth Token Configuration — Dual Browser/Server Acquisition with Secret Redaction

---

## Quality Gates

| Gate | Result |
|------|--------|
| `npm run verify` (tsc + vite build) | ✓ Pass |
| `npm run lint` (ESLint, zero errors) | ✓ Pass |
| `dotnet build ApiTestSpark` | ✓ Pass — 0 errors, 0 warnings |
| `dotnet test ApiTestSpark.Tests` | ✓ Pass — 53/53 |
| `markdownlint-cli2` | ✓ Pass — 0 errors |
| `pack.ps1` (local dual-artifact pack) | ✓ Pass |

---

## Delivery Process Notes

This feature went through the full spec-driven lifecycle: `/devspark.specify` → `/devspark.clarify` → `/devspark.plan` → `/devspark.tasks` → `/devspark.analyze` + `/devspark.critic` → `/devspark.implement` → `/devspark.create-pr` → `/devspark.pr-review` (5 revisions) → `/devspark.address-pr-review`. Along the way:

- The `critic` gate caught and required a fix for a SHOWSTOPPER-severity secret-leak risk before any code shipped.
- Live end-to-end verification against a local mock OAuth2 provider (required for the final 3 tasks) caught a real defect — an acquired token was never attached to the real outgoing request — that a code-only review would not have surfaced.
- `/devspark.address-pr-review` closed out all 3 non-blocking review findings (missing .NET test coverage, a constitution documentation drift, and an informational note) with enforced commit isolation between code fixes and review-file updates.
- A follow-up `/devspark.pr-review UPDATE` independently re-verified those fixes rather than trusting the commit messages, before final approval.
