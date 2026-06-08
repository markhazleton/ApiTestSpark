---
gate: pr-review
status: fail
blocking: true
severity: critical
summary: "PR #3 implements the remote API profile feature, but one mandatory constitution violation and two spec-behavior gaps should be fixed before merge."
---

# Pull Request Review: Remote API profiles

## Review Metadata

- **PR Number**: #3
- **Source Branch**: 001-remote-api-list
- **Target Branch**: main
- **Review Date**: 2026-06-09
- **Reviewed Commit**: b860b82
- **Reviewer**: devspark.pr-review
- **Constitution Version**: 1.1.2

## Revision Log

| Rev | Commit | Date | Critical | High | Medium | Low | CON | Test Command | Result |
|-----|--------|------|----------|------|--------|-----|-----|--------------|--------|
| 1 | b860b82 | 2026-06-09 | 1 | 0 | 2 | 0 | 0 | `npm run verify` | pass |
| 1 | b860b82 | 2026-06-09 | 1 | 0 | 2 | 0 | 0 | `dotnet test ApiTestSpark.Tests` | blocked by sandbox socket bind; escalation unavailable due usage-limit denial |

## PR Summary

- **Author**: @markhazleton
- **Created**: 2026-06-08
- **Status**: OPEN
- **Files Changed**: 34
- **Commits**: 2
- **Lines**: +2416 -569
- **Branch Sync**: PASS - source branch is not behind target
- **Spec Lifecycle**: Full-compliance tier, 50/50 tasks complete

## Executive Summary

- **Constitution Compliance**: FAIL - raw browser fetch was added outside `executeRequest`
- **Spec Compliance**: FAIL - browser override precedence and duplicate-name prevention do not match the accepted requirements
- **Security**: No credential exposure found in the server config/proxy path during review
- **Testing**: `npm run verify` passes; .NET test rerun was attempted but the sandbox blocked vstest socket binding and elevated rerun was unavailable

**Approval Recommendation**: DO NOT APPROVE until C-01 is fixed. M-01 and M-02 are also requirement gaps and should be resolved before merge.

## Action Items

### Immediate Actions

- [ ] **C-01** Replace direct browser OpenAPI `fetch` with a constitution-compliant client path through `executeRequest`.
- [ ] **M-01** Fix visible profile merge precedence so browser-saved profiles override server profiles with the same stable id.
- [ ] **M-02** Prevent duplicate visible profile names from being persisted/activated, not just displayed as an error.

## What's Good

- The server-side proxy is constrained to configured server profile ids and redacts server-held API key and bearer-token values from `/api-test-spark/config`.
- The proxy now rejects redirects, non-JSON content, oversized specs, unknown profile ids, and no-profile ambiguity.
- Documentation and sample content were updated to explain named profiles, descriptions, Program.cs configuration, and browser-managed profiles.
- Integration tests were expanded for multi-profile config, credential redaction, and server-profile spec fetching.

## Findings Detail

### Critical Issues

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| C-01 | Open | Constitution §IV API Client Pattern | `src/hooks/useRemoteOpenApi.ts:34` | Browser-created profiles fetch OpenAPI docs with raw `fetch(...)`. Constitution §IV says raw `fetch` calls outside `executeRequest` MUST NOT be added because they bypass UUID correlation, timing, debug callbacks, and the shared error path. This new branch also skips request/response debug entries for direct browser spec loads. | Keep browser-created profiles as direct browser fetches, but route them through `executeRequest` by adding a small remote OpenAPI caller in `src/api/` or extending `createRemoteOpenApiCaller` to accept a browser profile URL and headers. The hook should call that client rather than `fetch` directly. |

### High Priority Issues

None found.

### Medium Priority Issues

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| M-01 | Open | Spec FR-015 / plan merge rules | `src/store/remoteConfigStore.ts:97` | `getVisibleRemoteProfiles` orders server profiles before browser profiles and de-duplicates by first-seen id. When a browser-saved profile has the same stable id as a server default, the server version wins and the browser override is discarded. The accepted clarification says browser-saved profiles override server defaults with the same id. | Merge server profiles first into a map, then apply browser profiles so matching browser ids replace server defaults. Add deterministic coverage for same-id override behavior. |
| M-02 | Open | Spec FR-007 / FR-008 | `src/components/ConfigScreen.tsx:177` | Duplicate visible names are detected and rendered as an error, but edits are still written immediately to the persisted Zustand store via `remote.updateProfile` at `src/components/ConfigScreen.tsx:339`. Because there is no save gate, a duplicate name is already saved/active while the warning is shown. | Move browser profile edits through local draft state and commit only valid profiles, or reject/roll back `updateProfile` changes that create duplicate visible names. The visible profile list should never persist two active profiles with the same display name. |

### Low Priority Improvements

None found.

## Constitution Alignment Details

| Principle | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| §I TypeScript Strict | Pass | `npm run verify` passes | TypeScript build completed successfully |
| §II ESLint Only, No Prettier | Pass | `npm run verify` passes | ESLint completed successfully |
| §III Layer Separation & Barrel Exports | Pass | Reviewed changed hook/store/component paths | No component-to-API-client layering violation found |
| §IV API Client Pattern | Fail | C-01 | Direct `fetch` was added in `useRemoteOpenApi` |
| §V Zustand Store Rules | Pass with spec caveats | `useRemoteConfigStore` remains a single persisted concern | Merge and validation behavior need requirement fixes |
| §VI Observability & Logging | Fail via C-01 | Direct fetch path bypasses request/response debug callbacks | No `console.log` issue found in reviewed paths |
| §VII Testing Stance | Partial | `npm run verify` pass; .NET rerun blocked by sandbox | Prior PR body reports 33/33 .NET tests, but this review could not independently rerun them |
| §VIII PII/PHI Protection | Pass | Server credential values are redacted from config response | Browser-managed secrets remain browser-local by design |

## Testing Notes

- `npm run verify` passed on the reviewed commit. Vite/Rolldown still prints third-party `INVALID_ANNOTATION` warnings from Application Insights packages, but the command exits successfully.
- `dotnet test ApiTestSpark.Tests` was attempted. It built the SPA and test assembly, then failed when vstest tried to bind its local socket inside the sandbox. A required elevated rerun was requested but rejected by the environment because the session had hit its usage limit, so .NET test results are not independently refreshed in this review artifact.

## Review Scope

Deep-reviewed files:

- `src/hooks/useRemoteOpenApi.ts`
- `src/store/remoteConfigStore.ts`
- `src/components/ConfigScreen.tsx`
- `src/api/remoteOpenApiClient.ts`
- `ApiTestSpark/ApiTestSparkExtensions.cs`
- `ApiTestSpark/ApiTestSparkOptions.cs`
- `ApiTestSpark.Tests/HarnessIntegrationTests.cs`
- `.documentation/specs/001-remote-api-list/spec.md`
- `.documentation/specs/001-remote-api-list/plan.md`
- `.documentation/specs/001-remote-api-list/tasks.md`
- `.documentation/memory/constitution.md`

## Approval Decision

**Recommendation**: DO NOT APPROVE.

**Reasoning**: The implementation is close and much of the server-side work is solid, but C-01 violates a mandatory constitution rule and M-01/M-02 contradict explicit accepted requirements for the remote profile list. Fix those and rerun `npm run verify` plus `dotnet test ApiTestSpark.Tests` before approval.
