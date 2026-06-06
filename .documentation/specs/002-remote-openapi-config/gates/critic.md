# Critic Gate: 002-remote-openapi-config

**Feature**: Remote OpenAPI Configuration
**Branch**: `002-remote-openapi-config`
**Date**: 2026-06-05
**Resolved**: 2026-06-06
**Critic version**: 1.0
**Risk level**: HIGH — credential handling + .NET public API change

---

```yaml
gate: critic
status: pass
blocking: false
severity: warning
summary: "All 3 blocking findings resolved in artifacts. 5 non-blocking findings resolved or documented. Implementation may proceed."
```

---

## Executive Summary

All three blocking risks (SSRF, localStorage migration, SPA middleware pass-through) have been resolved in the spec, plan, tasks, and research artifacts. Five non-blocking findings were also addressed. The artifact set is implementation-ready.

---

## Findings Resolution Summary

| ID | Title | Severity | Status | Resolution |
|----|-------|----------|--------|------------|
| CRIT-01 | SSRF: proxy makes unrestricted outbound HTTP | Blocking | ✅ Resolved | T010 updated with `http://`/`https://` scheme validation before any outbound call; `400` returned for other schemes; T023 extended to cover `file://` scheme test; spec Constraints updated; research.md new section added |
| CRIT-02 | Credentials in localStorage plain text; migration version not bumped | Blocking | ✅ Resolved | New task T013a: bump Zustand persist version + non-destructive migration; research.md new section "Credential Storage in localStorage"; spec Constraints explicit acceptance; plan.md Complexity Tracking entry |
| CRIT-03 | SPA middleware pass-through not updated for `/remote-spec` | Blocking | ✅ Resolved | T010 updated to include SPA middleware pass-through exemption for `/api-test-spark/remote-spec`; T026a added: integration test verifying `application/json` response (not `text/html`) |
| WARN-01 | Seeding integration point unspecified; TanStack Query v5 `onSuccess` trap | Non-blocking | ✅ Resolved | T019 now explicitly specifies: seeding MUST occur inside `queryFn` immediately after `setConfig(config)`; `onSuccess` prohibition documented; Notes section updated |
| WARN-02 | `HttpClient` lifetime and `IHttpClientFactory` unspecified | Non-blocking | ✅ Resolved | T009 updated to specify `IHttpClientFactory` via `services.AddHttpClient()` with 10-second timeout; `new HttpClient()` per-request explicitly prohibited; inline comment requirement added |
| WARN-03 | Remote 200 OK with non-JSON body causes misleading React error | Non-blocking | ✅ Resolved | T010 updated with `Content-Type` check: non-JSON `2xx` responses return `502` with `"Remote server returned non-JSON content."`; T024 extended to cover this case |
| WARN-04 | No proxy timeout; 100s default hangs endpoint discovery | Non-blocking | ✅ Resolved | T009 specifies 10-second `HttpClient` timeout; T024 extended with timeout test case (slow-response mock → 502) |
| WARN-05 | URL field `onChange` does not clear credentials; atomicity invariant violated | Non-blocking | ✅ Resolved | T016 updated: URL field `onChange` calls `clearRemoteOpenApiConfig(env)` when value becomes empty; T013 updated: `setRemoteOpenApiUrl` enforces atomicity when URL is set to `undefined`/`''`; Notes section updated |

---

## Detailed Resolutions

### CRIT-01 — SSRF (RESOLVED)

**Root cause**: No URL scheme validation before outbound `HttpClient` call.

**Resolution in artifacts**:

- `tasks.md T010`: added SSRF guard bullet — validate `http://`/`https://` scheme, return `400` with safe message for other schemes; inline comment requirement noting SSRF prevention rationale
- `tasks.md T023`: extended from "not configured → 400" to also cover "file:// scheme → 400"; verify response body contains no URL value
- `spec.md Constraints`: new bullet: `RemoteOpenApiUrl` MUST begin with `http://` or `https://`
- `research.md`: new section "SSRF Prevention on Proxy Endpoint"

### CRIT-02 — Credentials in localStorage + Migration Version (RESOLVED)

**Root cause**: (a) No design decision recorded for plain-text credential storage; (b) No task to bump Zustand persist version, risking silent config wipe on migration.

**Resolution in artifacts**:

- `tasks.md T013a` (new task): bump Zustand persist `version`; write non-destructive migration preserving existing fields, defaulting new fields to `undefined`; `createDefaultConfig()` explicitly prohibited as migration handler
- `tasks.md Notes`: added note that T013a must precede T013
- `spec.md Constraints`: new bullet explicitly acknowledging plain-text localStorage storage as deliberate and acceptable for local dev tool
- `research.md`: new section "Credential Storage in localStorage (plain text)"
- `plan.md Complexity Tracking`: new row documenting the decision and reference to research.md

### CRIT-03 — SPA Middleware Pass-Through (RESOLVED)

**Root cause**: Existing SPA pass-through only exempts `/api-test-spark/config`; `/api-test-spark/remote-spec` would be intercepted and served `index.html`.

**Resolution in artifacts**:

- `tasks.md T010`: first bullet now explicitly requires adding `/api-test-spark/remote-spec` to SPA middleware exempt paths
- `tasks.md T026a` (new task): integration test verifying `GET /api-test-spark/remote-spec` returns `application/json` (not `text/html`)
- `plan.md Complexity Tracking`: new row documenting the issue and resolution

### WARN-01 — TanStack Query v5 `onSuccess` Trap (RESOLVED)

- `tasks.md T019`: rewritten to specify exact integration point (`queryFn` in `useHarnessConfig.ts`), prohibition on `onSuccess`, and the timing-window risk of `useEffect`
- `tasks.md Notes`: added TanStack Query v5 constraint note

### WARN-02 — `HttpClient` Lifetime (RESOLVED)

- `tasks.md T009`: rewritten to specify `IHttpClientFactory` + 10-second timeout; `new HttpClient()` per-request explicitly prohibited; first-harness-DI-service note added

### WARN-03 — Non-JSON `2xx` Response (RESOLVED)

- `tasks.md T010`: added `Content-Type` check bullet; non-JSON `2xx` returns `502` with safe message
- `tasks.md T024`: extended with case (b) — mock returns `200 text/html` → proxy returns `502`

### WARN-04 — No Proxy Timeout (RESOLVED)

- `tasks.md T009`: 10-second timeout specified on `IHttpClientFactory` named client
- `tasks.md T024`: extended with case (c) — slow-response mock > timeout → proxy returns `502`

### WARN-05 — URL Field `onChange` Atomicity (RESOLVED)

- `tasks.md T016`: URL `onChange` now calls `clearRemoteOpenApiConfig(env)` when value becomes empty, not `setRemoteOpenApiUrl(env, '')`
- `tasks.md T013`: `setRemoteOpenApiUrl` required to clear credential fields when URL is `undefined`/`''`
- `tasks.md Notes`: atomicity invariant note updated

---

## Missing Test Coverage — Final Status

| Gap | Original severity | Status |
|-----|----------|--------|
| `file://` scheme → 400 | Blocking (CRIT-01) | ✅ Added to T023 |
| `/remote-spec` returns `application/json` not `text/html` | Blocking (CRIT-03) | ✅ T026a added |
| Remote `200 text/html` → proxy `502` | Recommended (WARN-03) | ✅ Added to T024(b) |
| Proxy timeout → `502` | Recommended (WARN-04) | ✅ Added to T024(c) |
| `ApiTestSparkOptions` new property defaults are `null` | Low | ✅ Added to T022 |

---

## Metrics (post-resolution)

- Showstoppers: 0
- Blocking findings resolved: 3 / 3
- Non-blocking findings resolved: 5 / 5
- New tasks added: T013a, T026a (plus extensions to T009, T010, T016, T019, T022, T023, T024)
- Outstanding risks: 0

**VERDICT: PROCEED**
