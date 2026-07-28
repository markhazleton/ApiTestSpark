# Patches

Running log of Patch-tier work — single What/Why entries, ratified via `/bold-plan`. See `bold-docs/backbone.md` for the tier definitions.

## 2026-07-28 — Double-slash bug in API URL construction

**What**: Added `joinUrl(base, path)` in `src/utils/urlUtils.ts` (re-exported from `src/utils/index.ts`) and replaced ad-hoc `` `${baseUrl}${path}` `` template-literal concatenation with it in `src/api/client.ts` (both `ApiClient.request` and `createRestCaller`), `src/components/api-doc/ApiDocScreen.tsx`, and `src/components/remote-api/RemoteApiDocScreen.tsx`. Validated with a standalone Node script (`scripts/test/validate-joinUrl.ts`, 15 cases, run manually via `node scripts/test/validate-joinUrl.ts` — not wired into `package.json`'s `test` script or CI, per backbone principle 7's no-test-framework rule for the React SPA).

**Why**: A base URL configured with a trailing slash combined with an endpoint path starting with a leading slash (a common shape from OpenAPI-imported paths) produced a doubled `//` in the constructed request URL. `joinUrl` normalizes the seam regardless of which side carries the slash.
