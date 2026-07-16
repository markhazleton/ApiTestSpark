```yaml
gate: pr-review
status: fail
blocking: true
severity: showstopper
summary: "Re-review after 4 new commits (browser-side implementation, server-side OAuth addition, doc sweep). Substantive code now exists and was reviewed line-by-line for the first time (Rev 1 covered planning docs only). No security or constitution-code violations found - critic-001 SHOWSTOPPER is verifiably fixed, SSRF guards and credential redaction are correct. Still BLOCKED on the same mandatory spec-lifecycle rule as Rev 1: spec.md Status is 'In Progress' (not Complete) and 3/30 tasks remain unchecked. One new Medium finding (missing .NET test coverage for new public API) and one new Constitution Improvement (store registry table out of date) were added; H-01 (missing Gate Acknowledgements section) is still open."
```

# Pull Request Review: feat(001-oauth-token-config): implement OAuth token configuration for API authentication (SEMVER: MINOR)

## Review Metadata

- **PR Number**: #7
- **Source Branch**: `001-oauth-token-config`
- **Target Branch**: `main`
- **Review Date**: 2026-07-16 19:05:00 UTC
- **Last Updated**: 2026-07-16 23:10:00 UTC
- **Reviewed Commit**: `4884e8f690cc1b87b8c11c6f671b9d1cc0357eda`
- **Reviewer**: devspark.pr-review
- **Constitution Version**: 1.1.2

## Revision Log

| Rev | Commit | Date | Critical | High | Medium | Low | CON | Test Command | Result |
|-----|--------|------|----------|------|--------|-----|-----|--------------|--------|
| 1 | `4f37b34` | 2026-07-16 | 2 | 1 | 0 | 0 | 0 | N/A (docs-only, no test files changed) | skipped |
| 2 | `4884e8f` | 2026-07-16 | 2 | 1 | 1 | 1 | 1 | `npm run verify` + `dotnet test ApiTestSpark.Tests` | pass (49/49 .NET, verify clean) |

*Note: the `get-pr-context.ps1` team override at `.documentation/scripts/powershell/` returns stale/unrelated data (a 2016 PR from a different repository/branch) for this repo — the stock `.devspark/scripts/powershell/get-pr-context.ps1` was also blocked by a false-negative `gh auth status` (keyring token invalid, but `gh pr view`/`gh pr edit` work via a different auth path). Both scripts were bypassed; PR context was gathered directly via `gh pr view --json ...` and `git diff`/`git rev-list`. Flagging both script issues for follow-up outside this review's scope.*

## PR Summary

- **Author**: @markhazleton
- **Created**: 2026-07-16T18:55:00Z
- **Status**: OPEN (ready for review, not draft)
- **Files Changed**: 36
- **Commits**: 5
- **Lines**: +2408 −139

## Stats

| Metric | Value |
|--------|-------|
| Files changed | 36 |
| Lines added | +2408 |
| Lines removed | −139 |
| Net lines | +2269 |
| Commit snapshot | `4884e8f` |

*Collected via `gh pr view --json additions,deletions,changedFiles` and `git diff --numstat` (delta since Rev 1: +1,281 / −139 across 28 files, driven by the browser-side implementation, server-side OAuth addition, and documentation sweep).*

## Trust-Tier Classification

**full-compliance** — `spec.md`, `plan.md`, and `tasks.md` are all present under `.documentation/specs/001-oauth-token-config/`. Standard review depth applied; no trust-tier-01 finding emitted.

## Branch Sync Check

`git rev-list --count HEAD..origin/main` = 0 (not behind). `git rev-list --count origin/main..HEAD` = 5 (ahead). **Branch is in sync with `main`** — review may proceed per the hard rule.

## Executive Summary

- ✅ **Constitution Compliance**: PASS on all applicable code principles (7/8 evaluated with code evidence; 1 — Testing Stance §.NET — partial, see M-01)
- 📋 **Spec Lifecycle**: In Progress (was Draft in Rev 1 — improved, still not Complete)
- 📝 **Task Completion**: 27/30 tasks complete (was 0/30 in Rev 1 — significant improvement, still incomplete)
- 🔒 **Security**: 0 issues found — reviewed secret redaction (critic-001), SSRF guard, credential-safe error messages, and server-side token caching in detail; all correct
- 📊 **Code Quality**: 1 new Low finding (shared static token cache scope), 1 new CON finding (store registry doc drift)
- 🧪 **Testing**: PASS — `npm run verify` clean; `dotnet test ApiTestSpark.Tests` 49/49 pass; 1 new Medium finding (no new integration tests for the new public API surface)
- 📝 **Documentation**: ADEQUATE — full sweep across README.md, ApiTestSpark/README.md, NUGET-PACKAGE-WALKTHROUGH.md, DEPLOYMENT.md, CHANGELOG.md, and in-app help (AboutScreen.tsx, HowToUseScreen.tsx)
- 🏛️ **Constitution Improvements**: 1 CON finding

**Overall Assessment**: This revision adds substantive, well-engineered code on top of the Rev 1 planning artifacts: the browser-side OAuth implementation, a new server-side `RemoteApiProfile.OAuth` capability, and a thorough documentation sweep. Every principle with code evidence in this PR passes on direct inspection — the previously-identified critic-001 SHOWSTOPPER (secret leakage into the debug/telemetry pipeline) is verifiably fixed via a redaction wrapper in `oauthTokenClient.ts`, the server-side token acquisition correctly reuses the existing SSRF guard and never logs credentials, and `EndpointTester` blocks rather than silently degrades when a required OAuth token is unavailable (FR-014). The only reasons this PR still cannot be approved are the same mandatory spec-lifecycle gates as Rev 1 — spec status is not `Complete` and 3 tasks remain unchecked — which reflect the feature's genuinely still-in-progress state (the 3 open tasks require a live/mock OAuth2 endpoint not available in this environment) rather than any defect in the code that has landed.

**Approval Recommendation**: ⚠️ REQUEST CHANGES
*Note: APPROVE remains blocked because Spec Lifecycle is not Complete and 3/30 tasks are still unchecked. This is the same lifecycle-state block as Rev 1, now with far less remaining work (27/30 vs 0/30) and zero code-quality/security blockers found on review.*

## Action Items

*All findings ordered by severity. CRITICAL and HIGH items include broken code and the fix where applicable.*

### Immediate Actions (Blocking — must resolve before merge)

- [ ] **C-01** `.documentation/specs/001-oauth-token-config/spec.md` — Spec `**Status**:` field is `In Progress`, not `Complete`. Per the spec lifecycle rule, this blocks an APPROVE recommendation.
  - **Fix**: No code fix — update `**Status**:` to `Complete` once T017/T023/T029 are verified and merged, or explicitly waive via a documented Gate Acknowledgement.
- [ ] **C-02** `.documentation/specs/001-oauth-token-config/tasks.md` — 27/30 tasks are checked off; 3 remain (`T017`, `T023`, `T029`), each marked `<!-- WIP -->` pending a live/mock OAuth2 endpoint.
  - **Fix**: Complete T017 (password-grant live-provider check), T023 (Clear Token → blocked-request verification), T029 (full quickstart.md walkthrough) against a real or mock OAuth2 provider, or explicitly acknowledge/waive per the note below.
- [ ] **H-01** `.documentation/specs/001-oauth-token-config/tasks.md` — Still no `## Gate Acknowledgements` section recording the intentional two-phase delivery (planning PR → implementation commits landing in the same PR). Carried unresolved from Rev 1.
  - **Fix**: Add a `## Gate Acknowledgements` section to `tasks.md` documenting why T017/T023/T029 remain open and the team's decision on whether to merge before they're verified.

### Recommended Improvements

- [ ] **M-01** `ApiTestSpark/ApiTestSparkExtensions.cs`, `ApiTestSpark/ApiTestSparkOptions.cs` — New public API surface (`RemoteApiProfileOAuth`, `RemoteApiProfile.OAuth`, `GetOAuthAccessTokenAsync` caching/injection logic) has no corresponding integration test in `ApiTestSpark.Tests/HarnessIntegrationTests.cs` (49 tests, unchanged from before this PR).
  - **Recommendation**: Add at least one `[TestMethod]` covering: (a) `remoteOAuthConfigured` appears correctly (and only) in `/api-test-spark/config` for an OAuth-configured profile, (b) the remote-call/remote-spec proxy injects `Authorization: Bearer <token>` when `profile.OAuth` is set and a mocked token endpoint responds successfully, (c) a failed token acquisition logs a warning and proceeds without the header rather than throwing.
- [ ] **L-01** `ApiTestSpark/ApiTestSparkExtensions.cs:50` — `OAuthTokenCache` is a `static ConcurrentDictionary<string, ...>` keyed only by `profile.Id`, shared process-wide across every `MapApiTestSpark()` registration in the same app domain. If a host ever registers the harness twice with different `RemoteApiProfileOAuth` configs reusing the same profile `Id`, tokens could be served to the wrong OAuth client. Informational only — no known caller does this today, and the existing `RemoteOpenApiBearerToken` pattern has the same process-wide-static characteristic by design.
  - **Recommendation**: No action required now; if multi-registration-per-process ever becomes a supported scenario, key the cache by `(appInstanceId, profile.Id)` instead.

### Constitution Improvements (Non-blocking — feed into `/devspark.evolve-constitution`)

- [ ] **CON-01** §V (State Management — Zustand Store Rules) — The canonical store registry table lists `useAuthStore`'s "Persists" column as **"Config only"**, but this PR's implementation (per FR-015, documented in `plan.md`'s Implementation Notes) now persists **both config and acquired access tokens** per Environment. The code is correct and intentional (this is a deliberate, spec-driven reversal of the original "tokens are session-only" comment) — the constitution's registry table is simply out of date.
  - **Suggested Amendment**: Update the `useAuthStore` row in §V's canonical store registry to read "Config + access tokens" and add a one-line rationale note (tokens are cached per Environment to avoid re-authenticating on every reload, consistent with FR-015).

## What's Good

- **critic-001 SHOWSTOPPER verifiably fixed**: `src/api/oauthTokenClient.ts` wraps `callbacks.onRequest` to substitute a redacted copy of the request body (`client_secret`/`password` → `***redacted***`) before it reaches the debug store / Application Insights pipeline, while the real, unredacted body still goes to `executeRequest`/`fetch`. Confirmed by direct code read — this is exactly the fix described in `gates/critic.md`.
- **`ensureOAuthToken` vs `acquireOAuthToken` split is clean and well-documented**: `src/hooks/useOAuthToken.ts` carries an explicit doc comment cross-referencing `gates/analyze.md` finding A1 and clearly states which callers must use which function — this closes the ambiguity the analyze gate flagged.
- **Server-side OAuth reuses existing security patterns rather than inventing new ones**: `GetOAuthAccessTokenAsync` sits behind the same SSRF guard already present for `RemoteOpenApiUrl`, never logs the client secret or acquired token (only `profile.Id` and HTTP status appear in `logger?.LogWarning` calls), and fails open (returns `null`, proceeds without the header) rather than throwing — matching the existing `RemoteOpenApiBearerToken` proxy behavior exactly.
- **`EndpointTester.tsx` blocks rather than silently degrades**: when `remoteProfile.remoteUseOAuthToken` is set and no valid token can be acquired, the request is not sent and a distinct validation error is shown — satisfying FR-014's "never send unauthenticated, never silently fall back" requirement, verified directly in the diff.
- **Documentation sweep is comprehensive and consistent**: the same OAuth capability is documented in 7 different surfaces (root README, NuGet README, walkthrough, deployment guide, changelog, and both in-app help screens) using consistent terminology (`remoteOAuthConfigured`, "configured on server", `EnableRemoteCallProxy` requirement) — verified by grep across all 7 files.

## Findings Detail

*Stable IDs persist across re-reviews. Status updates instead of deleting.*

### Critical Issues (Blocking)

| ID | Status | Principle | File:Line | Issue | Fix |
|----|--------|-----------|-----------|-------|-----|
| C-01 | ➡️ Carried | Spec Lifecycle (§6 of this workflow) | spec.md (Status field) | Spec status is `In Progress` (was `Draft` in Rev 1), required `Complete` before merge | Update to `Complete` once T017/T023/T029 land, or explicitly waive via Gate Acknowledgements |
| C-02 | ➡️ Carried | Spec Lifecycle (§6 of this workflow) | tasks.md | 27/30 tasks checked off (improved from 0/30) — 3 remain (T017, T023, T029) | Same as C-01 |

### High Priority Issues

| ID | Status | Principle | File:Line | Issue | Fix |
|----|--------|-----------|-----------|-------|-----|
| H-01 | ➡️ Carried | Process/Traceability | tasks.md | Still no `## Gate Acknowledgements` section recording the intentional decision to keep T017/T023/T029 open | Add a `## Gate Acknowledgements` section documenting the decision |

### Medium Priority Suggestions

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| M-01 | 🔴 Open | VII. Testing Stance (.NET) | ApiTestSpark/ApiTestSparkExtensions.cs, ApiTestSpark.Tests/HarnessIntegrationTests.cs | New public API (`RemoteApiProfileOAuth`, `RemoteApiProfile.OAuth`) has no integration test coverage (SHOULD, not MUST) | Add integration test(s) covering `remoteOAuthConfigured` exposure and proxy token injection/failure paths |

### Low Priority Improvements

| ID | Status | Principle | File:Line | Issue | Recommendation |
|----|--------|-----------|-----------|-------|----------------|
| L-01 | 🔴 Open | Code Quality | ApiTestSpark/ApiTestSparkExtensions.cs:50 | `OAuthTokenCache` keyed only by `profile.Id`, process-wide static | No action needed today; note for future multi-registration scenarios |

### Constitution Improvements

| ID | Status | Section | Observation | Suggested Amendment |
|----|--------|---------|-------------|---------------------|
| CON-01 | 🔴 Open | §V | `useAuthStore` now persists config + tokens (FR-015), but the registry table still says "Config only" | Update the registry table's `useAuthStore` row to "Config + access tokens" with a one-line FR-015 rationale note |

## Constitution Alignment Details

| Principle | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| I. TypeScript Strict Compilation | ✅ Pass | `npm run verify` re-run this review — clean | `tsc -b` + `vite build` both succeed with zero errors |
| II. Code Quality — ESLint Only | ✅ Pass | `npm run verify` includes `eslint .` — zero errors | No Prettier introduced |
| III. Feature Structure — Layer Separation & Barrel Exports | ✅ Pass | `src/api/index.ts`, `src/hooks/index.ts`, `src/components/harness-config/index.ts`, `src/components/index.ts` all updated for new files | `OAuthConfigPanel.tsx`, `oauthTokenClient.ts`, `useOAuthToken.ts` all correctly barrel-exported; components consume the hook layer only (verified `ConfigScreen.tsx`/`EndpointTester.tsx` have no direct client imports) |
| IV. API Client Pattern | ✅ Pass | `src/api/oauthTokenClient.ts` calls `executeRequest` exclusively, no raw `fetch` | Uses a third, minimal calling shape (bare async function around `executeRequest`) rather than extending `ApiClient` or `createRestCaller` — satisfies all listed invariants (UUID, timing, debug callbacks) since they live inside `executeRequest` itself; not a violation, just worth noting for future pattern documentation |
| V. State Management — Zustand Store Rules | ⚠️ Partial | `src/store/authStore.ts` | Store logic itself is compliant (action-gated, zero I/O, single concern); registry **table** is stale — see CON-01 |
| VI. Observability & Logging | ✅ Pass | grep for `console.log`/`console.warn`/`console.error` in the diff returned zero matches | All new error paths route through `addError`/`logger?.LogWarning`; server-side warnings never include secret values |
| VII. Testing Stance | ⚠️ Partial | `dotnet test ApiTestSpark.Tests` 49/49 pass, but 0 new tests added for new public API | React SPA has no test runner by design (compliant); .NET SHOULD-level gap — see M-01 |
| VIII. PII/PHI Data Protection | ✅ Pass | Reviewed all new/changed files | No real PII/PHI; OAuth credential *field names* only, no literal secret values committed |

## Security Checklist

- [x] No hardcoded secrets or credentials — confirmed by direct read of `oauthTokenClient.ts`, `OAuthConfigPanel.tsx`, `ApiTestSparkExtensions.cs`, `ApiTestSparkOptions.cs`, and all documentation examples (all use placeholder/config-reference values like `builder.Configuration["Orders:ClientSecret"]`)
- [x] Input validation present where needed — SSRF guard on `RemoteOpenApiUrl` (pre-existing, reused for OAuth-fetched specs); OAuth grant body validated for required fields before sending
- [x] Authentication/authorization checks appropriate — client_credentials and password grants correctly separated; server-side token never returned to the browser (`remoteOAuthConfigured` boolean only)
- [x] No SQL injection vulnerabilities — N/A, no database access in this PR
- [x] No XSS vulnerabilities — N/A, no unescaped output introduced
- [x] Dependencies reviewed for vulnerabilities — no new npm or NuGet packages added

## Testing Coverage

**Status**: ADEQUATE (React) / PARTIAL (.NET — see M-01)

`npm run verify` re-run for this review: clean (tsc, eslint, vite build all pass). `dotnet test ApiTestSpark.Tests` re-run for this review: **49/49 pass**, 0 failures, 560ms. No new .NET test files or `[TestMethod]`s were added for the new `RemoteApiProfileOAuth` public surface — flagged as M-01 (SHOULD-level gap per Constitution §VII .NET, not a MUST-level blocker).

## Test Inventory

| File | Main (Rev 1 baseline) | Branch (this revision) | Delta | Justification |
|------|------|--------|-------|---------------|
| `ApiTestSpark.Tests/HarnessIntegrationTests.cs` | 49 | 49 | 0 | No test files changed in this PR — see M-01 for the resulting coverage gap on new public API |
| **Total** | 49 | 49 | 0 | |

No test files removed in this PR.

## Documentation Status

**Status**: ADEQUATE

Full sweep confirmed across: `README.md` (features table, options table, new "OAuth-authenticated remote APIs" subsection), `ApiTestSpark/README.md` (mirrored), `NUGET-PACKAGE-WALKTHROUGH.md` (`remoteOAuthConfigured` in example config JSON, `PublicAPI.Unshipped.txt` example block), `DEPLOYMENT.md` (OAuth-configured profile example), `CHANGELOG.md` (`[Unreleased]` entry, `SEMVER: MINOR` noted), and both in-app help screens (`AboutScreen.tsx`, `HowToUseScreen.tsx`). Grep confirmed no dangling references to the old server-side-OAuth-as-"out of scope" language remain outside `spec.md`'s intentionally-struck-through Out of Scope bullet.

## Changed Files Summary

| File | Tier | Changes | Type | Findings |
|------|------|---------|------|---------|
| `ApiTestSpark/ApiTestSparkExtensions.cs` | P0 | +105 −0 | Modified | M-01, L-01 |
| `ApiTestSpark/ApiTestSparkOptions.cs` | P0 | +28 −0 | Modified | M-01 |
| `ApiTestSpark/PublicAPI.Unshipped.txt` | P0 | +10 −0 | Modified | None |
| `src/api/client.ts` | P0 | +52 −3 | Modified | None |
| `src/api/oauthTokenClient.ts` | P0 | +80 −0 | Added | None |
| `src/store/authStore.ts` | P0 | +93 −73 | Modified | CON-01 |
| `src/hooks/useOAuthToken.ts` | P1 | +76 −0 | Added | None |
| `src/components/harness-config/OAuthConfigPanel.tsx` | P1 | +272 −0 | Added | None |
| `src/components/host-api/EndpointTester.tsx` | P1 | +37 −6 | Modified | None |
| `src/components/ConfigScreen.tsx` | P1 | +22 −1 | Modified | None |
| `src/components/remote-api/RemoteApiDocScreen.tsx` | P1 | +17 −3 | Modified | None |
| `src/types/state.ts`, `src/types/auth.ts`, `src/types/host-api.ts` | P1 | +42 −41 | Modified | None |
| `.documentation/specs/001-oauth-token-config/tasks.md` | P2 | +70 −40 | Modified | C-02, H-01 |
| `.documentation/specs/001-oauth-token-config/spec.md` | P2 | +6 −6 | Modified | C-01 |
| `.documentation/specs/001-oauth-token-config/plan.md` | P2 | +66 −0 | Modified | None |
| `README.md`, `ApiTestSpark/README.md`, `NUGET-PACKAGE-WALKTHROUGH.md`, `DEPLOYMENT.md`, `CHANGELOG.md` | P3 | +123 −5 | Modified | None |
| `src/components/AboutScreen.tsx`, `src/components/HowToUseScreen.tsx` | P3 | +25 −6 | Modified | None |
| *(remaining barrels: `src/api/index.ts`, `src/hooks/index.ts`, `src/components/harness-config/index.ts`, `src/components/index.ts`, `src/store/remoteConfigStore.ts`)* | P2 | +6 −1 | Modified | None |

## Behavioral Changes

| Change | Before | After | Intentional? | Risk |
|--------|--------|-------|-------------|------|
| `useAuthStore` persistence scope | Config only (per store registry docs) | Config + access tokens (per Environment) | Yes (FR-015, documented in `plan.md`) | Low — tokens are short-lived and scoped to the user's own browser `localStorage`; flagged as CON-01 for doc alignment, not a code defect |
| Remote spec/call proxy `Authorization` header source | Static `RemoteOpenApiBearerToken` only | OAuth-acquired token takes precedence over static bearer token when `profile.OAuth` is configured | Yes (documented in PR body and `plan.md`) | Low — only applies to profiles that opt into `OAuth`; existing static-token profiles unaffected |

## Approval Decision

**Recommendation**: ⚠️ REQUEST CHANGES

**Reasoning**:
This revision resolved every substantive concern that could have blocked approval on code-quality or security grounds — the SHOWSTOPPER-severity critic-001 finding is verifiably fixed, the server-side OAuth addition follows existing, already-reviewed security patterns exactly (SSRF guard reuse, credential-safe logging, fail-open token acquisition), and both quality-gate commands (`npm run verify`, `dotnet test ApiTestSpark.Tests`) pass cleanly on re-run. The remaining blockers are unchanged in kind from Rev 1: this workflow's mandatory Spec Lifecycle Validation rule requires `spec.md` Status to be `Complete` and all `tasks.md` items to be checked before an APPROVE recommendation can be given, and this PR is at `In Progress` / 27-of-30. That is a genuine, honestly-tracked in-progress state (the 3 open tasks are explicitly marked `<!-- WIP -->` because they require a live/mock OAuth2 provider not available in this environment) rather than an oversight. The one process gap carried from Rev 1 (H-01 — no `## Gate Acknowledgements` section) should be closed regardless of whether the team decides to merge before T017/T023/T029 are verified, so that the decision is recorded rather than implicit. The two new findings (M-01, CON-01) are both SHOULD-level and non-blocking — recommended for follow-up, not required before merge.

**Estimated Rework Time**: ~5 minutes for H-01 (add Gate Acknowledgements section); T017/T023/T029 completion depends on availability of a live/mock OAuth2 test provider (out of this reviewer's control); M-01 (integration test) ~30–60 minutes if picked up before merge, otherwise reasonable as fast-follow.

---

*Review generated by devspark.pr-review v1.2*
*Constitution-driven code review for ApiTestSpark*
*To re-review after fixes: `/devspark.pr-review #7 re-review`*
*When addressing these findings, run `/devspark.address-pr-review 7`. The review file must be committed on its own — this rule is enforced by the prompt and can also be enforced by the optional pre-commit hook.*

---

## Previous Review History

### Review 1: 2026-07-16 19:05:00 UTC

**Commit**: `4f37b34`

Initial review of the docs-only planning PR (spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, checklists/requirements.md, gates/analyze.md, gates/critic.md — 9 files, +1127/−0, no source code). Found 2 Critical (spec status Draft, 0/30 tasks) and 1 High (missing Gate Acknowledgements section) — all lifecycle findings, not code-quality issues, since no code existed yet. Recommended REQUEST CHANGES per the mandatory spec-lifecycle rule, while noting the PR was correctly marked draft and the planning artifacts themselves were high quality (already passed `/devspark.analyze` and `/devspark.critic` with a genuine SHOWSTOPPER caught and remediated before any code was written).
