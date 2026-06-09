---
gate: pr-review
status: fail
blocking: true
severity: error
summary: "PR #3 resolved the prior critical client-pattern issue and profile precedence gap, but duplicate-name persistence still violates the spec and the browser spec caller now risks CORS preflight failures."
---

# Pull Request Review: Remote API profiles

## Review Metadata

- **PR Number**: #3
- **Source Branch**: 001-remote-api-list
- **Target Branch**: main
- **Review Date**: 2026-06-09
- **Reviewed Commit**: 904533e
- **Reviewer**: devspark.pr-review
- **Constitution Version**: 1.1.2
- **Trust Tier**: full-compliance

## Revision Log

| Rev | Commit | Date | Critical | High | Medium | Low | CON | Test Command | Result |
|-----|--------|------|----------|------|--------|-----|-----|--------------|--------|
| 1 | b860b82 | 2026-06-09 | 1 | 0 | 2 | 0 | 0 | `npm run verify` | pass |
| 1 | b860b82 | 2026-06-09 | 1 | 0 | 2 | 0 | 0 | `dotnet test ApiTestSpark.Tests` | blocked by sandbox socket bind; escalation unavailable |
| 2 | 904533e | 2026-06-09 | 0 | 0 | 2 | 0 | 0 | `npm run verify` | pass |
| 2 | 904533e | 2026-06-09 | 0 | 0 | 2 | 0 | 0 | `dotnet test ApiTestSpark.Tests` | pass 33/33 |

## PR Summary

- **Author**: @markhazleton
- **Created**: 2026-06-08
- **Status**: OPEN
- **Files Changed**: 36
- **Commits**: 4
- **Lines**: +2741 -606
- **Branch Sync**: PASS - source branch is not behind target
- **Spec Lifecycle**: Full-compliance tier, 50/50 tasks complete; requirements checklist 19/19 complete

## Executive Summary

- **Constitution Compliance**: PASS for reviewed mandatory principles. Prior C-01 raw-fetch violation is resolved.
- **Spec Compliance**: PARTIAL. Browser override precedence is fixed, but duplicate visible names can still be persisted.
- **Functional Risk**: Browser OpenAPI spec loading now uses the shared client, but inherits its default `Content-Type: application/json` header on GET, which can trigger CORS preflight against public spec URLs.
- **Testing**: `npm run verify` passes; `dotnet test ApiTestSpark.Tests` passes 33/33.

**Approval Recommendation**: DO NOT APPROVE until M-02 is fixed. M-03 should also be addressed before merge because it can break browser-created remote profile spec discovery.

## Action Items

### Immediate Actions

- [ ] **M-02** Prevent duplicate visible profile names from being persisted/activated, not just displayed as an error.
- [ ] **M-03** Keep browser OpenAPI spec GETs on the shared `executeRequest` path without forcing default JSON headers that can trigger CORS preflight.

### Resolved Since Rev 1

- [x] **C-01** Browser OpenAPI spec loading no longer uses raw `fetch`.
- [x] **M-01** Browser profiles now override server profiles with the same stable id.

## What's Good

- Server-configured profiles can now be customized into browser-local overrides while preserving the Program.cs baseline.
- Hidden Program.cs profiles are removed from the active visible list and can be restored from a collapsed hidden section.
- The server-side proxy remains constrained to configured server profile ids and redacts server-held API key and bearer-token values from `/api-test-spark/config`.
- SampleApi and embedded harness navigation were simplified for smaller viewports, and embedded CSS now emits no-cache headers for local/package testing.

## Findings Detail

### Critical Issues

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| C-01 | Resolved | Constitution §IV API Client Pattern | `src/hooks/useRemoteOpenApi.ts:23` | Rev 1 found raw browser `fetch(...)` for browser-created OpenAPI specs. The hook now calls `createBrowserRemoteOpenApiCaller`, which composes `createRestCaller` and therefore flows through `executeRequest`. | No further action for the constitution violation. See M-03 for the functional side effect introduced by this fix. |

### High Priority Issues

None found.

### Medium Priority Issues

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| M-01 | Resolved | Spec FR-015 / plan merge rules | `src/store/remoteConfigStore.ts:98` | Rev 1 found server profiles winning over browser profiles with the same id. `getVisibleRemoteProfiles` now seeds a map with visible server profiles and then applies browser profiles, so matching browser ids replace server defaults while preserving order. | Add deterministic coverage when a JS test harness exists; behavior is now correct by inspection. |
| M-02 | Still Present | Spec FR-007 / FR-008 | `src/components/ConfigScreen.tsx:420` | Duplicate visible names are still detected only as UI state. Every edit calls `remote.updateProfile(profile.id, patch)` immediately, so a duplicate name is already persisted and active while the warning from `duplicateName` is shown. This still contradicts FR-008: "System MUST prevent saving a remote API profile when its name duplicates another visible profile's name." | Reject/roll back updates that create duplicate visible names, or move browser-profile editing to local draft state with an explicit commit/save that is disabled while duplicate names exist. |
| M-03 | Open | Remote profile usability / API client side effect | `src/api/remoteOpenApiClient.ts:32` | The Rev 2 fix for C-01 uses `createRestCaller` for browser-created OpenAPI specs. That caller always adds `Content-Type: application/json` at `src/api/client.ts:260`, even for GET requests with no body. A public OpenAPI URL that permits a simple CORS GET may reject the resulting preflight, causing browser-created remote profiles to fail loading specs despite having a valid URL. | Keep the call on `executeRequest`, but avoid unconditional JSON headers for GET spec loads. Options: add a `defaultHeaders`/`includeJsonContentType` flag to `createRestCaller`, or call `executeRequest` directly from a small API helper with only the profile-provided headers. |

### Low Priority Improvements

None found.

## Constitution Alignment Details

| Principle | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| §I TypeScript Strict | Pass | `npm run verify` passes | TypeScript build completed successfully |
| §II ESLint Only, No Prettier | Pass | `npm run verify` passes | ESLint completed successfully |
| §III Layer Separation & Barrel Exports | Pass | Reviewed changed hook/store/component paths | No component-to-API-client layering violation found |
| §IV API Client Pattern | Pass | `useRemoteOpenApi` now uses `createRemoteOpenApiCaller` / `createBrowserRemoteOpenApiCaller` | Prior raw-fetch violation resolved |
| §V Zustand Store Rules | Pass with spec caveat | `useRemoteConfigStore` remains focused and persisted under one key | Duplicate-name enforcement still needs behavior fix |
| §VI Observability & Logging | Pass | Browser spec calls now flow through debug callbacks via `executeRequest` | No `console.log` issue found in reviewed paths |
| §VII Testing Stance | Pass | `npm run verify`; `dotnet test ApiTestSpark.Tests` 33/33 | React remains no-test-framework per constitution |
| §VIII PII/PHI Protection | Pass | Server credential values are redacted from config response | Browser-managed secrets remain browser-local by design |

## Testing Notes

- `npm run verify` passed on commit `904533e`.
- `dotnet test ApiTestSpark.Tests` passed: 33 passed, 0 failed.
- Vite/Rolldown still prints third-party `INVALID_ANNOTATION` warnings from Application Insights packages, but both build commands exit successfully.

## Review Scope

Deep-reviewed files:

- `src/hooks/useRemoteOpenApi.ts`
- `src/api/remoteOpenApiClient.ts`
- `src/api/client.ts`
- `src/store/remoteConfigStore.ts`
- `src/components/ConfigScreen.tsx`
- `src/hooks/useHostApi.ts`
- `ApiTestSpark/ApiTestSparkExtensions.cs`
- `SampleApi/Home/HomeEndpoints.cs`
- `.documentation/specs/001-remote-api-list/spec.md`
- `.documentation/specs/001-remote-api-list/tasks.md`
- `.documentation/memory/constitution.md`

Co-mingling check:

- PASS. Review artifact commit `bbb3f88` is separate from production-code commits `b860b82` and `904533e`.

## Approval Decision

**Recommendation**: DO NOT APPROVE YET.

**Reasoning**: The critical constitution issue is resolved and the profile precedence fix is sound. The remaining duplicate-name behavior still violates an explicit MUST requirement, and the revised browser OpenAPI client can break public spec URL loading via unnecessary CORS preflight. Fix those two medium findings, then rerun `npm run verify` and `dotnet test ApiTestSpark.Tests`.
