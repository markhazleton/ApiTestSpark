# Pull Request Review: feat: Remote OpenAPI configuration — explorer, proxy, config UI (SEMVER: MINOR)

## Review Metadata

- **PR Number**: #2
- **Source Branch**: 002-remote-openapi-config
- **Target Branch**: main
- **Review Date**: 2026-06-06 14:35:00 UTC
- **Last Updated**: 2026-06-06 15:00:00 UTC
- **Reviewed Commit**: 686e576
- **Reviewer**: devspark.pr-review
- **Constitution Version**: 1.1.2

## Revision Log

| Rev | Commit | Date | Critical | High | Medium | Low | CON | Test Command | Result |
|-----|--------|------|----------|------|--------|-----|-----|--------------|--------|
| 1 | 75156e5 | 2026-06-06 | 0 | 0 | 1 | 2 | 1 | `dotnet test ApiTestSpark.Tests` | pass 30/30 |
| 2 | 686e576 | 2026-06-06 | 0 | 0 | 0 | 0 | 0 | `dotnet test ApiTestSpark.Tests` | pass 30/30 |

## PR Summary

- **Author**: @markhazleton
- **Created**: 2026-06-06
- **Status**: OPEN
- **Files Changed**: 44
- **Commits**: 3
- **Lines**: +3645 −200

## Stats

| Metric | Value |
|--------|-------|
| Files changed | 44 |
| Lines added | +3645 |
| Lines removed | −200 |
| Net lines | +3445 |
| Commit snapshot | `75156e5` |

## Executive Summary

- ✅ **Constitution Compliance**: PASS (8/8 principles checked)
- 📋 **Spec Lifecycle**: Complete
- 📝 **Task Completion**: 34/34 tasks complete
- 🔒 **Security**: 0 issues found
- 📊 **Code Quality**: 3 recommendations (1 medium, 2 low)
- 🧪 **Testing**: PASS — 30/30 .NET integration tests; React SPA opted-out per constitution §VII
- 📝 **Documentation**: PASS — HowToUseScreen and AboutScreen fully updated
- 🏛️ **Constitution Improvements**: 1 CON finding

**Overall Assessment**: A well-structured, constitution-compliant feature addition. All four quality gates pass, credentials are correctly guarded from error messages and browser traffic, and the spec lifecycle is complete. Three minor suggestions and one constitution improvement opportunity noted — none blocking.

**Approval Recommendation**: ✅ APPROVE

## Action Items

### Immediate Actions (Blocking — must resolve before merge)

None found.

### Recommended Improvements

- [x] **M-01** `src/store/remoteConfigStore.ts` — `useRemoteConfigStore` not in constitution's store registry — *Fixed in 686e576: added row to §V registry, bumped constitution to v1.1.2*
- [x] **L-01** `src/components/remote-api/RemoteApiScreen.tsx:25` — ESLint suppression comment on `react-hooks/exhaustive-deps` — *Fixed in 686e576: comment now names the exact reason (fetchRemoteSpec identity changes on every render)*
- [x] **L-02** `ApiTestSpark/ApiTestSparkExtensions.cs:117` — `harnessBuiltAt` falls back to `DateTime.UtcNow` in single-file publish scenarios — *Fixed in 686e576: TODO comment added at fallback site with fix path*

### Constitution Improvements (Non-blocking — feed into `/devspark.evolve-constitution`)

- [x] **CON-01** — Store registry in §V does not include `useRemoteConfigStore` — *Fixed in 686e576: `useRemoteConfigStore` row added to constitution §V registry*

---

## What's Good

- **Credential safety is thorough**: API key and bearer token never appear in 502 error bodies, debug store entries, or observable network traffic. The server-side proxy design and SSRF guard are exactly right for this threat model.
- **Browser-wins seed priority is clean**: `useHarnessConfig` seeds only empty fields from `Program.cs`, then merges browser values on top before writing to `harnessConfigStore`. The invariant is clear and tested.
- **`resolveHeaderTokens` is a pure utility**: No React, no stores — correctly placed in `src/utils/` per §III layer rules. Token expansion at request-send time (not at store-write time) is the correct design.
- **`KeyInput` focus-loss fix is idiomatic**: Using a fully-uncontrolled local state with `onBlur` commit avoids the `key=` remount trap cleanly without needing a `useEffect`.
- **Integration test coverage is comprehensive**: 9 new tests covering the proxy's 400/502 error paths, content-type guard, credential non-exposure, SSRF guard, and SPA middleware pass-through — all high-value scenarios.

---

## Findings Detail

### Critical Issues (Blocking)

None found.

### High Priority Issues

None found.

### Medium Priority Suggestions

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| M-01 | ✅ Resolved | State Management §V | `src/store/remoteConfigStore.ts:1` | `useRemoteConfigStore` is used broadly (11+ files) but is absent from the canonical store registry in the constitution. The registry is the authoritative list of persisted stores; a missing entry creates a governance gap — future contributors won't know the store exists or its key. | Add `useRemoteConfigStore` to the registry table in §V of the constitution via `/devspark.evolve-constitution`. See CON-01. |

### Low Priority Improvements

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| L-01 | ✅ Resolved | Code Quality §II | `src/components/remote-api/RemoteApiScreen.tsx:25` | `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the exhaustive-deps rule. §II requires zero ESLint errors and treats `react-hooks/exhaustive-deps` as a blocking error. The suppression is intentional (only re-fetch when URL changes, not when `fetchRemoteSpec` identity changes on each render) and the comment explains why, but it should be confirmed the alternative — wrapping `fetchRemoteSpec` in `useCallback` in the hook — was considered and rejected. | Confirm the suppression is the simpler correct choice vs. `useCallback`. If so, add a one-line comment naming the specific reason (e.g. `// fetchRemoteSpec changes identity on every render; URL is the correct dependency`). |
| L-02 | ✅ Resolved | Observability §VI | `ApiTestSpark/ApiTestSparkExtensions.cs:117` | `harnessBuiltAt` falls back to `DateTime.UtcNow` when `assembly.Location` is empty (single-file publish / trimming). In that scenario every config response returns the current wall-clock time, making the build date field meaningless and misleading on the About page. | Consider embedding the build date as a compile-time constant (e.g. via `<AssemblyMetadata>` MSBuild property) so it's accurate even in single-file publish. This is an edge case for a dev tool, but worth a TODO comment at the fallback site. |

### Constitution Improvements

| ID | Status | Section | Observation | Suggested Amendment |
|----|--------|---------|-------------|---------------------|
| CON-01 | ✅ Resolved | §V — Canonical store registry | `useRemoteConfigStore` (`api-test-spark-remote-config`, persisted) was introduced in this PR and is now a first-class persisted store used across the application, but the constitution's registry table does not include it. The registry is meant to be the authoritative list of all stores. | Add a row to the §V registry table: `useRemoteConfigStore \| Remote API connection config (URL, credentials, headers) \| api-test-spark-remote-config \| Full config` |

---

## Constitution Alignment Details

| Principle | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| §I TypeScript Strict | ✅ Pass | `npm run verify` passes | Zero TS errors across all 44 changed files |
| §II ESLint Only, No Prettier | ✅ Pass | `npm run lint` passes | One `eslint-disable` comment (L-01); justified but worth confirming |
| §III Layer Separation & Barrel Exports | ✅ Pass | All new directories have `index.ts` barrels | `src/components/remote-api/`, `src/components/harness-config/`, new store/api/hook all re-exported correctly |
| §IV API Client Pattern | ✅ Pass | `remoteOpenApiClient.ts` uses `createRestCaller` (Pattern B) | UUID correlation, debug callbacks, timing — all invariants satisfied |
| §V Zustand Store Rules | ✅ Pass | `remoteConfigStore.ts` — focused, action-gated, persisted with unique key | Registry updated in 686e576 (constitution v1.1.2) |
| §VI Observability & Logging | ✅ Pass | No `console.log` in `src/`; errors routed to `addError()` with correct categories | `useRemoteOpenApi` uses `'Configuration'` category; `useHostApi` uses `'API'` |
| §VII Testing Stance | ✅ Pass | React SPA: no test framework (opted-out per constitution); .NET: 30/30 pass | 9 new integration tests cover all new proxy behaviour |
| §VIII PII/PHI Protection | ✅ Pass | `SampleApi/Program.cs` uses placeholder values only; no real credentials in any file | `temp-dummy-key-for-sample-api` is clearly synthetic |

---

## Security Checklist

- [x] No hardcoded secrets or credentials — `SampleApi/Program.cs` uses placeholder values; no real keys committed
- [x] Input validation present where needed — SSRF guard on `RemoteOpenApiUrl` (scheme check); URL format validation in `ConfigScreen`
- [x] Authentication/authorization checks appropriate — credentials flow server-side for spec proxy; direct calls include auth headers per `remoteConfigStore`
- [x] No SQL injection vulnerabilities — N/A (no database)
- [x] No XSS vulnerabilities — all output is through React's escaped rendering; no `dangerouslySetInnerHTML` in changed files
- [x] Dependencies reviewed for vulnerabilities — no new npm or NuGet dependencies added in this PR

---

## Testing Coverage

**Status**: ADEQUATE

**.NET**: 30 integration tests pass (9 added in this PR). Coverage includes:

- Config endpoint serialises all new remote fields correctly
- Config endpoint returns null for unset remote fields
- `ApiTestSparkOptions` default values for all new properties
- Proxy returns 400 when `RemoteOpenApiUrl` not configured
- Proxy returns 400 for `file://` scheme (SSRF guard)
- Proxy returns 200 with proxied JSON body on mock 200 response
- Proxy returns 502 on mock non-2xx response (body contains no credentials or URL)
- Proxy returns 502 on mock `text/html` content-type (content-type guard)
- Proxy returns 502 on network timeout (safe message)
- Proxy route returns `application/json` (not `text/html`) — SPA middleware pass-through guard

**React SPA**: No test framework per §VII. TypeScript strict mode and ESLint provide compile-time safety net.

---

## Test Inventory

| File | main | Branch | Delta | Justification |
|------|------|--------|-------|---------------|
| `ApiTestSpark.Tests/HarnessIntegrationTests.cs` | 21 | 30 | +9 | New proxy endpoint + config field tests |
| **Total** | 21 | 30 | +9 | |

No tests removed.

---

## Documentation Status

**Status**: ADEQUATE

- `HowToUseScreen.tsx` — fully rewritten with remote API config walkthrough, field reference table, token syntax documentation, and proxy architecture explanation
- `AboutScreen.tsx` — rewritten with architecture panels, current config status, and browser storage information
- `ApiTestSparkOptions.cs` — all new properties have XML doc comments including trust-boundary warnings
- `PublicAPI.Shipped.txt` — updated for SEMVER: MINOR public API change

---

## Changed Files Summary

| File | Tier | Changes | Type | Findings |
|------|------|---------|------|---------|
| `ApiTestSpark/ApiTestSparkExtensions.cs` | P0 | +110 -3 | Modified | L-02 |
| `src/hooks/useHarnessConfig.ts` | P0 | +35 -3 | Modified | None |
| `src/hooks/useHostApi.ts` | P0 | +15 -10 | Modified | None |
| `src/store/remoteConfigStore.ts` | P0 | +39 -0 | Added | M-01, CON-01 |
| `ApiTestSpark/ApiTestSparkOptions.cs` | P1 | +75 -0 | Modified | None |
| `src/api/remoteOpenApiClient.ts` | P1 | +9 -0 | Added | None |
| `src/hooks/useRemoteOpenApi.ts` | P1 | +29 -0 | Added | None |
| `src/utils/session.ts` | P1 | +45 -0 | Modified | None |
| `src/components/ConfigScreen.tsx` | P1 | +360 -0 | Added | None |
| `src/components/remote-api/RemoteApiScreen.tsx` | P1 | +105 -0 | Added | L-01 |
| `src/components/remote-api/RemoteApiDocScreen.tsx` | P1 | +430 -0 | Added | None |
| `ApiTestSpark.Tests/HarnessIntegrationTests.cs` | P2 | +200 -0 | Modified | None |
| `ApiTestSpark/PublicAPI.Shipped.txt` | P2 | +8 -0 | Modified | None |
| `SampleApi/Program.cs` | P2 | +6 -1 | Modified | None |
| `.documentation/specs/002-remote-openapi-config/` | P3 | +1800 -0 | Added | None |
| All other `src/components/` files | P2/P3 | Various | Modified | None |

---

## Behavioral Changes

| Change | Before | After | Intentional? | Risk |
|--------|--------|-------|-------------|------|
| `useHostApi` header source | Reads `remoteDefaultHeaders` from `harnessConfigStore` (startup snapshot) | Reads from `useRemoteConfigStore` (live) | Yes — fixes stale-config bug | Low — same values on first load; Config-page saves now take effect immediately |
| Config endpoint response shape | 11 fields | 17 fields (+ 6 remote fields + `harnessVersion` + `harnessBuiltAt`) | Yes — SEMVER: MINOR | Consumers parsing the full response object must handle new fields (additive, non-breaking) |
| `AboutScreen` build info source | `fetch('/build-info.json')` (broken in NuGet embed) | `harnessConfig.harnessVersion` / `harnessConfig.harnessBuiltAt` | Yes — bug fix | None — same info, correct source |

---

## Approval Decision

**Recommendation**: ✅ APPROVE

**Reasoning**: No critical or high-priority findings. All four mandatory quality gates pass. The security-sensitive areas (credential non-exposure, SSRF guard, browser-wins seed priority) are correctly implemented and covered by integration tests. The three suggestions (M-01, L-01, L-02) are non-blocking improvements and CON-01 should be addressed via `/devspark.evolve-constitution` after merge.

**Estimated Rework Time**: N/A — no rework required before merge.

---

*Review generated by devspark.pr-review v1.2*
*Constitution-driven code review for API Test Spark*
*To re-review after fixes: `/devspark.pr-review #2 re-review`*
*When addressing these findings, run `/devspark.address-pr-review 2`. The review file must be committed on its own — separate from any code fixes.*
