```yaml
gate: pr-review
status: pass
blocking: false
severity: info
summary: "Re-review after the T017/T023/T029 completion commit (f597851), which also fixed a CRITICAL live-testing-discovered defect (OAuth token computed but never attached to the real outgoing request in useHostApi.ts/EndpointTester.tsx). Spec Lifecycle blockers C-01 (spec not Complete) and C-02 (incomplete tasks) are now RESOLVED — spec.md Status is Complete and 30/30 tasks are checked. H-01 (missing Gate Acknowledgements) is RESOLVED AS NO-LONGER-APPLICABLE since the WIP state it existed to document no longer exists. No new Critical/High findings. M-01/L-01/CON-01 (non-blocking) carry forward unchanged. APPROVE."
```

# Pull Request Review: feat(001-oauth-token-config): implement OAuth token configuration for API authentication (SEMVER: MINOR)

## Review Metadata

- **PR Number**: #7
- **Source Branch**: `001-oauth-token-config`
- **Target Branch**: `main`
- **Review Date**: 2026-07-16 19:05:00 UTC
- **Last Updated**: 2026-07-17 00:05:00 UTC
- **Reviewed Commit**: `f597851`
- **Reviewer**: devspark.pr-review
- **Constitution Version**: 1.1.2

## Revision Log

| Rev | Commit | Date | Critical | High | Medium | Low | CON | Test Command | Result |
|-----|--------|------|----------|------|--------|-----|-----|--------------|--------|
| 1 | `4f37b34` | 2026-07-16 | 2 | 1 | 0 | 0 | 0 | N/A (docs-only, no test files changed) | skipped |
| 2 | `4884e8f` | 2026-07-16 | 2 | 1 | 1 | 1 | 1 | `npm run verify` + `dotnet test ApiTestSpark.Tests` | pass (49/49 .NET, verify clean) |
| 3 | `f597851` | 2026-07-16 | 0 | 0 | 1 | 1 | 1 | `npm run verify` + `dotnet test ApiTestSpark.Tests` | pass (49/49 .NET, verify clean) |

*Note: the `get-pr-context.ps1` team override at `.documentation/scripts/powershell/` still returns stale/unrelated data (a 2016 PR from a different repository/branch) — the stock `.devspark/scripts/powershell/get-pr-context.ps1` is also still blocked by a false-negative `gh auth status` (keyring token invalid, but `gh pr view`/`gh pr edit` work via a different auth path). Both bypassed again; context gathered directly via `gh pr view --json ...` and `git diff`/`git rev-list`/`git log`.*

## PR Summary

- **Author**: @markhazleton
- **Created**: 2026-07-16T18:55:00Z
- **Status**: OPEN (ready for review, not draft)
- **Files Changed**: 6 since Rev 2 (38 total across the PR)
- **Commits**: 2 since Rev 2 (`b294196` review-file-only, `f597851` fix + docs) — 7 total
- **Lines (this revision)**: +210 −103

## Stats

| Metric | Value |
|--------|-------|
| Files changed (Rev 2 → Rev 3) | 6 |
| Lines added | +210 |
| Lines removed | −103 |
| Net lines | +107 |
| Commit snapshot | `f597851` |

*Collected via `git diff --numstat 4884e8f..f597851`. Dominated by `tasks.md`/`plan.md`/`spec.md` documentation of the completed verification; the code delta itself is 2 lines (`useHostApi.ts` +8/−1, `EndpointTester.tsx` +1/−1).*

## Trust-Tier Classification

**full-compliance** — `spec.md`, `plan.md`, and `tasks.md` are all present and now fully complete. Standard review depth applied; no trust-tier-01 finding emitted.

## Branch Sync Check

`git rev-list --count HEAD..origin/main` = 0 (not behind). `git rev-list --count origin/main..HEAD` = 7 (ahead). **Branch is in sync with `main`** — review may proceed per the hard rule.

## Executive Summary

- ✅ **Constitution Compliance**: PASS on all applicable code principles (7/8 evaluated with code evidence; 1 — Testing Stance §.NET — partial, see M-01, unchanged from Rev 2)
- 📋 **Spec Lifecycle**: **Complete** (was In Progress in Rev 2 — RESOLVED)
- 📝 **Task Completion**: **30/30 tasks complete** (was 27/30 in Rev 2 — RESOLVED)
- 🔒 **Security**: 0 issues found — the fix itself (see below) is a positive security/correctness improvement, not a new risk
- 📊 **Code Quality**: 1 Low finding carried forward (L-01, informational); the fix is minimal, correct, and precedence-preserving
- 🧪 **Testing**: PASS — `npm run verify` clean; `dotnet test ApiTestSpark.Tests` 49/49 pass; M-01 (missing new .NET tests for the server-side OAuth surface) carries forward unchanged
- 📝 **Documentation**: ADEQUATE — `tasks.md`/`plan.md`/`spec.md` all updated with detailed, dated verification evidence for T017/T023/T029
- 🏛️ **Constitution Improvements**: 1 CON finding carried forward (CON-01, unchanged)

**Overall Assessment**: This revision closes out the feature. The commit fixes a genuinely CRITICAL, live-testing-only-discoverable defect: `EndpointTester.tsx` computed the OAuth-acquired token correctly and displayed a plausible `Authorization` header in its UI-only cURL/headers preview, but the real network request — built inside `useHostApi.ts`'s `mutationFn` — never received the token at all, so an opted-in profile would silently send unauthenticated requests while the debug panel showed what looked like a correct, authenticated call. The fix is minimal (one new optional field threaded through two files), preserves the existing OAuth-over-static-token precedence rule, and was verified by the author against a live mock OAuth2 provider (401 before, 200 after) — this is exactly the kind of defect that a spec/plan/tasks/code-review process is designed to catch late rather than never, and the fact that it was caught during T023's own live-verification task (rather than shipped) is a strong positive signal for this delivery. Both mandatory spec-lifecycle blockers from Rev 1/Rev 2 are now resolved: `spec.md` Status is `Complete` and all 30 tasks are checked. H-01 (missing `## Gate Acknowledgements` section) is resolved as no-longer-applicable — that finding existed only to document an intentional, temporary WIP state (3 open tasks pending a live provider), and that state no longer exists; there is nothing left to acknowledge.

**Approval Recommendation**: ✅ APPROVE
*All Critical and High findings from Rev 1/Rev 2 are resolved. Remaining findings (M-01, L-01, CON-01) are Medium/Low/Constitution-Improvement severity — non-blocking by this workflow's own report format rules — and are appropriate as tracked fast-follow items, not merge blockers.*

## Action Items

*All findings ordered by severity.*

### Immediate Actions (Blocking — must resolve before merge)

None found. Both prior Critical findings (C-01, C-02) and the prior High finding (H-01) are resolved — see Findings Detail below.

### Recommended Improvements

- [ ] **M-01** `ApiTestSpark/ApiTestSparkExtensions.cs`, `ApiTestSpark/ApiTestSparkOptions.cs` — *(carried, unchanged)* New public API surface (`RemoteApiProfileOAuth`, `RemoteApiProfile.OAuth`) still has no integration test coverage in `ApiTestSpark.Tests/HarnessIntegrationTests.cs` (49 tests, unchanged by this revision's diff).
  - **Recommendation**: Add integration test(s) covering `remoteOAuthConfigured` exposure and proxy token injection/failure paths before or shortly after this merges.
- [ ] **L-01** `ApiTestSpark/ApiTestSparkExtensions.cs:50` — *(carried, unchanged)* `OAuthTokenCache` keyed only by `profile.Id`, process-wide static. Informational only.

### Constitution Improvements (Non-blocking — feed into `/devspark.evolve-constitution`)

- [ ] **CON-01** — *(carried, unchanged)* §V's canonical store registry table still lists `useAuthStore`'s "Persists" column as "Config only"; the shipped implementation persists config + access tokens (FR-015). Suggested amendment unchanged from Rev 2.

## What's Good

- **A real, user-impacting defect was caught before merge, not after.** The author's own T023 live-verification task surfaced that a successfully-acquired OAuth token never reached the real network request — a defect invisible to static code review of `EndpointTester.tsx` in isolation, since the bug lived in what `useHostApi.ts`'s `mutationFn` was (and wasn't) given, not in the header-construction logic itself. This is precisely the value a "must verify live, not just read the code" task is meant to deliver.
- **The fix is minimal, targeted, and precedence-correct.** Two files, ~9 lines total; `oauthToken` now flows through `HostApiRequest` and is applied with the same OAuth-over-static-bearer-token precedence rule already used elsewhere in the codebase (`EndpointTester.tsx`'s own — now-corrected — UI preview logic, and the server-side proxy logic from the prior commit). No new raw `fetch`, no new console output, no scope creep.
- **Verification evidence is unusually rigorous and legible.** `tasks.md`'s notes on T017/T023/T029 document exactly what was tested, against what (a local mock OAuth2 provider + protected API), and what the before/after HTTP status codes were — this is reviewable evidence, not just a checked box.
- **Honest lifecycle tracking throughout.** Both Rev 1 and Rev 2 correctly left `spec.md` at `In Progress` and tasks unchecked while genuine live-verification work remained outstanding, rather than prematurely marking things `Complete`. That discipline is what makes this Rev 3 `Complete` status trustworthy.

## Findings Detail

*Stable IDs persist across re-reviews. Status updates instead of deleting.*

### Critical Issues (Blocking)

None found.

| ID | Status | Principle | File:Line | Issue | Resolution |
|----|--------|-----------|-----------|-------|-----|
| C-01 | ✅ Resolved | Spec Lifecycle (§6 of this workflow) | spec.md (Status field) | Spec status was `In Progress`, required `Complete` | `spec.md` Status is now `Complete` (verified 2026-07-17) |
| C-02 | ✅ Resolved | Spec Lifecycle (§6 of this workflow) | tasks.md | 27/30 tasks were checked off | All 30/30 tasks now checked (verified via direct count) |

### High Priority Issues

None found.

| ID | Status | Principle | File:Line | Issue | Resolution |
|----|--------|-----------|-----------|-------|-----|
| H-01 | ✅ Resolved | Process/Traceability | tasks.md | No `## Gate Acknowledgements` section recording the intentional decision to keep T017/T023/T029 open | Resolved as no-longer-applicable — T017/T023/T029 are now complete; there is no remaining WIP state to acknowledge |

### Medium Priority Suggestions

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| M-01 | ➡️ Carried | VII. Testing Stance (.NET) | ApiTestSpark/ApiTestSparkExtensions.cs, ApiTestSpark.Tests/HarnessIntegrationTests.cs | New public API (`RemoteApiProfileOAuth`, `RemoteApiProfile.OAuth`) still has no integration test coverage (SHOULD, not MUST) | Add integration test(s) as a fast-follow |

### Low Priority Improvements

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| L-01 | ➡️ Carried | Code Quality | ApiTestSpark/ApiTestSparkExtensions.cs:50 | `OAuthTokenCache` keyed only by `profile.Id`, process-wide static | No action needed today |

### Constitution Improvements

| ID | Status | Section | Observation | Suggested Amendment |
|----|--------|---------|-------------|---------------------|
| CON-01 | ➡️ Carried | §V | `useAuthStore` persists config + tokens (FR-015), registry table still says "Config only" | Update the registry table's `useAuthStore` row |

## Constitution Alignment Details

| Principle | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| I. TypeScript Strict Compilation | ✅ Pass | `npm run verify` re-run this review — clean | Unchanged from Rev 2 |
| II. Code Quality — ESLint Only | ✅ Pass | `npm run verify` — zero errors | Unchanged from Rev 2 |
| III. Feature Structure — Layer Separation & Barrel Exports | ✅ Pass | No new files this revision; existing barrels untouched and still correct | The fix adds a field to an existing hook interface, no new layer/barrel surface |
| IV. API Client Pattern | ✅ Pass | Fix flows the token through the existing `HostApiRequest`/`useMutation` pattern — no raw `fetch` introduced | Confirmed by direct diff read (`useHostApi.ts` +8/−1) |
| V. State Management — Zustand Store Rules | ⚠️ Partial | No store changes this revision | CON-01 registry-table drift unchanged from Rev 2 |
| VI. Observability & Logging | ✅ Pass | No new `console.*` calls; fix reuses existing debug-callback plumbing | Confirmed by direct diff read |
| VII. Testing Stance | ⚠️ Partial | `dotnet test ApiTestSpark.Tests` 49/49 pass; no new .NET tests added | M-01 unchanged from Rev 2; React SPA has no test runner by design (compliant) |
| VIII. PII/PHI Data Protection | ✅ Pass | Fix and doc updates contain no PII/PHI or literal secrets | Confirmed by direct diff read |

## Security Checklist

- [x] No hardcoded secrets or credentials — confirmed by direct read of the 2-line code fix and all doc updates
- [x] Input validation present where needed — N/A, no new input surface in this revision
- [x] Authentication/authorization checks appropriate — this revision's entire purpose is fixing an auth-header attachment defect; verified fixed via live mock-provider test (401 → 200)
- [x] No SQL injection vulnerabilities — N/A
- [x] No XSS vulnerabilities — N/A
- [x] Dependencies reviewed for vulnerabilities — no new dependencies

## Testing Coverage

**Status**: ADEQUATE (React) / PARTIAL (.NET — see M-01, unchanged)

`npm run verify` re-run for this review: clean. `dotnet test ApiTestSpark.Tests` re-run for this review: **49/49 pass**, 0 failures, 583ms. No new automated test files were added by this revision (the added verification was live/manual against a local mock provider, as `tasks.md` explicitly documents) — M-01 remains an open, non-blocking recommendation to eventually backfill automated `.NET` coverage for the server-side OAuth surface added in the prior commit.

## Test Inventory

| File | Rev 2 baseline | Rev 3 | Delta | Justification |
|------|------|--------|-------|---------------|
| `ApiTestSpark.Tests/HarnessIntegrationTests.cs` | 49 | 49 | 0 | Unchanged — see M-01 |
| **Total** | 49 | 49 | 0 | |

No test files changed in this revision.

## Documentation Status

**Status**: ADEQUATE

`tasks.md` now documents live-verification evidence for all 30 tasks including T017/T023/T029; `spec.md` Status is `Complete` with US2/US4 marked ✅ Complete; `plan.md` carries a new, clearly dated Implementation Note (item 5) describing the discovered defect, its fix, and re-verification results.

## Changed Files Summary

| File | Tier | Changes | Type | Findings |
|------|------|---------|------|---------|
| `src/hooks/useHostApi.ts` | P0 | +8 −1 | Modified | None (fix) |
| `src/components/host-api/EndpointTester.tsx` | P0 | +1 −1 | Modified | None (fix) |
| `.documentation/specs/001-oauth-token-config/tasks.md` | P2 | +49 −19 | Modified | None |
| `.documentation/specs/001-oauth-token-config/plan.md` | P2 | +30 −6 | Modified | None |
| `.documentation/specs/001-oauth-token-config/spec.md` | P2 | +3 −3 | Modified | None |
| `.documentation/specs/pr-review/pr-7.md` | P3 | +119 −74 | Modified (self, prior commit) | N/A — review artifact |

## Behavioral Changes

| Change | Before | After | Intentional? | Risk |
|--------|--------|-------|-------------|------|
| Remote endpoint calls with `remoteUseOAuthToken` enabled | Real request sent with no `Authorization` header (token never attached) despite a correct-looking UI preview | Real request now carries `Authorization: Bearer <oauthToken>` when a valid token is available | Yes — bug fix, verified live (401 → 200) | None — this closes a security/correctness gap; no regression risk identified |

## Approval Decision

**Recommendation**: ✅ APPROVE

**Reasoning**:
Both mandatory Critical findings (C-01: spec not `Complete`, C-02: incomplete tasks) that blocked Rev 1 and Rev 2 are now resolved with direct evidence (`spec.md` read, task count verified by this reviewer independently, not just taken from the PR body). The one High finding (H-01) is resolved as no-longer-applicable now that the temporary WIP state it existed to flag has been fully completed. This revision's own code change is a well-scoped, well-verified fix for a genuinely serious defect (silent unauthenticated requests behind a misleading UI preview) that reflects well on the delivery process, not poorly — it was caught by the process before it could ship. The three remaining findings (M-01, L-01, CON-01) are all Medium/Low/Constitution-Improvement severity, explicitly non-blocking by this workflow's own rules, and are appropriately tracked as fast-follow items rather than re-litigated as merge blockers.

**Estimated Rework Time**: N/A — no blocking rework required. M-01 (~30–60 min if picked up) is a reasonable fast-follow; L-01 and CON-01 require no immediate action.

---

*Review generated by devspark.pr-review v1.2*
*Constitution-driven code review for ApiTestSpark*
*To re-review after fixes: `/devspark.pr-review #7 re-review`*
*When addressing these findings, run `/devspark.address-pr-review 7`. The review file must be committed on its own — this rule is enforced by the prompt and can also be enforced by the optional pre-commit hook.*

---

## Previous Review History

### Review 2: 2026-07-16 23:10:00 UTC

**Commit**: `4884e8f`

Re-reviewed the branch after the browser-side OAuth implementation, server-side `RemoteApiProfile.OAuth` addition, and documentation sweep landed on top of the Rev 1 planning-artifacts-only review. No security or constitution-code violations found — critic-001 SHOWSTOPPER (secret redaction) verified fixed, SSRF guard reused correctly for server-side OAuth, `EndpointTester` appeared to block rather than silently degrade (FR-014) based on code read alone. Recommendation: REQUEST CHANGES, blocked by C-01 (spec `In Progress`, not `Complete`) and C-02 (27/30 tasks). Added M-01 (no new .NET integration tests), L-01 (informational note on the static token cache), and CON-01 (store registry table doesn't reflect that `useAuthStore` now persists tokens per FR-015).

### Review 1: 2026-07-16 19:05:00 UTC

**Commit**: `4f37b34`

Initial review of the docs-only planning PR (spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, checklists/requirements.md, gates/analyze.md, gates/critic.md — 9 files, +1127/−0, no source code). Found 2 Critical (spec status Draft, 0/30 tasks) and 1 High (missing Gate Acknowledgements section) — all lifecycle findings, not code-quality issues, since no code existed yet. Recommended REQUEST CHANGES per the mandatory spec-lifecycle rule, while noting the PR was correctly marked draft and the planning artifacts themselves were high quality (already passed `/devspark.analyze` and `/devspark.critic` with a genuine SHOWSTOPPER caught and remediated before any code was written).
