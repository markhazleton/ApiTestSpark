# Release Notes — v1.8.0

**Release Date:** 2026-06-21
**Version Bump:** Minor (1.7.0 → 1.8.0)
**Contributors:** Mark Hazleton

---

## Headline

**Auth gate and proxy hardening.** This release adds `RequireAuthenticatedUser` — a single option that gates all harness routes (SPA assets, config, remote-spec, and remote-call) behind authentication. The remote spec proxy receives resource-management hardening, and CI gains a fail-fast frontend validation step.

---

## Added

- **`RequireAuthenticatedUser` option** — when `true`, all routes under `/api-test-spark` require an authenticated ASP.NET Core user. Covers SPA assets, `/api-test-spark/config`, `/api-test-spark/remote-spec`, and `/api-test-spark/remote-call`. Default: `false` (fully backwards-compatible).
- **Server-side correlation token expansion** — `{request-guid}` and `{session-guid}` in `RemoteDefaultHeaders` are now resolved on the server before forwarding proxied remote calls.

## Changed

- **Fail-fast CI frontend gate** — `npm run verify` (lint + typecheck + Vite build) now runs before the .NET build/test/publish steps in all GitHub Actions workflows.
- **Config endpoint CORS cache safety** — `Vary: Origin` is emitted alongside any `Access-Control-Allow-Origin` header to prevent stale cross-origin config responses from being served to wrong origins.

## Fixed

- **Remote spec proxy resource management** — `HttpResponseMessage` is now properly disposed after the proxy reads the response body; `ConfigureAwait(false)` added throughout the async call chain; response body buffered via `ArrayPool<byte>` for efficient allocation.
- **Endpoint list sticky header overlap** — the first namespace group header (`CUSTOMERS` / first group in list) no longer visually overlaps the first endpoint item. Root cause: `sticky top-9` inside the `overflow-y-auto` scroll container displaced the header 36px downward on initial render; corrected to `sticky top-0`.
- **Rendering cleanup** — minor UI rendering fixes across the host API explorer.

---

## Migration Notes

- No breaking changes. Drop-in upgrade from v1.7.0.
- To enable the auth gate: `options.RequireAuthenticatedUser = true` in `MapApiTestSpark(...)`.
- If using `{request-guid}` or `{session-guid}` in `RemoteDefaultHeaders`, these now expand server-side for proxied calls automatically.

---

## Public API Changes

`RequireAuthenticatedUser` added to `ApiTestSparkOptions` (MINOR addition):

```text
ApiTestSpark.ApiTestSparkOptions.RequireAuthenticatedUser.get -> bool
ApiTestSpark.ApiTestSparkOptions.RequireAuthenticatedUser.set -> void
```

`PublicAPI.Shipped.txt` updated to include this member. `PublicAPI.Unshipped.txt` cleared.

---

## Quality Gates

| Gate | Result |
|------|--------|
| `npm run verify` (tsc + vite build) | ✓ Pass |
| `npm run lint` (ESLint, zero errors) | ✓ Pass |
| `dotnet build ApiTestSpark` | ✓ Pass — 0 errors, 0 warnings |
| `dotnet test ApiTestSpark.Tests` | ✓ Pass — 49/49 |
| `markdownlint-cli2` | ✓ Pass — 0 errors |
