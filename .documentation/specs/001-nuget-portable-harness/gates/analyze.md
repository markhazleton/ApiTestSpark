# Analyze Gate: Portable NuGet Package for API Test Harness

```yaml
gate: analyze
status: pass
blocking: false
severity: info
summary: "All 12 findings resolved 2026-05-29. No critical or high issues remain. Artifacts are consistent and ready for /devspark.implement."
```

**Feature**: `001-nuget-portable-harness` | **Analyzed**: 2026-05-29
**Artifacts**: spec.md ✅ | plan.md ✅ | tasks.md ✅ | constitution.md ✅ | data-model.md ✅ | contracts/config-endpoint.md ✅

---

## Findings (all resolved)

| ID | Category | Severity | Status | Resolution |
| --- | --- | --- | --- | --- |
| C-001 | Inconsistency | HIGH | Resolved | FR-009 updated to describe `VITE_BASE_PATH` env-var mechanism |
| C-002 | Inconsistency | HIGH | Resolved | Edge case 3 reworded to scope trailing-slash to default path only |
| C-003 | Inconsistency | HIGH | Resolved | US4 note updated: no path parameter this release |
| U-001 | Underspecification | MEDIUM | Resolved | ILogger.LogDebug per asset request added to T024 |
| U-002 | Underspecification | MEDIUM | Resolved | Environment gating folded into T023 |
| U-003 | Underspecification | MEDIUM | Resolved | Path conflict detection folded into T023 |
| U-004 | Underspecification | MEDIUM | Resolved | SC-001 manual timing task added as T035 |
| U-005 | Underspecification | MEDIUM | Resolved | Contract updated: baseUrl always derived from Host header |
| A-001 | Ambiguity | MEDIUM | Resolved | useHostApi moved to T014 in Phase 3; US1 independently testable |
| A-002 | Ambiguity | LOW | Resolved | T013: defaultHeaders not sent on OpenAPI fetch |
| A-003 | Ambiguity | LOW | Resolved | T004 updated to PowerShell env var syntax |
| D-001 | Duplication | LOW | Accepted | Intentional repetition; no action required |

---

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|-------------|-----------|----------|-------|
| FR-001: Serve SPA at `/api-test-harness/` | ✅ | T023, T024 | |
| FR-002: `MapApiTestHarness()` extension method | ✅ | T023 | |
| FR-003: Public config endpoint | ✅ | T023 | |
| FR-004: SPA fetches config on startup | ✅ | T013 | |
| FR-005: Parse OpenAPI v3 → endpoint list | ✅ | T010, T013, T016 | |
| FR-006: Default headers injected into requests | ✅ | T014, T017 | Scope clarified in T013 |
| FR-007: Built-in examples remain functional | ✅ | T026, T027, T028 | |
| FR-008: Graceful OpenAPI failure handling | ✅ | T018, T027 | |
| FR-009: Vite base path via `VITE_BASE_PATH` | ✅ | T001, T004 | |
| FR-010: All assets embedded in NuGet | ✅ | T003 | |
| FR-011: Environment gating | ✅ | T023 | Folded into extension method task |
| FR-012: ILogger structured logging | ✅ | T023, T024 | All three log points covered |
| FR-013: Debug store history preserved | ✅ | T007, T013, T014 | |
| SC-001: < 5 min install | ✅ | T035 | Manual timing validation task |
| SC-002: Endpoints appear < 2s | ✅ | T010, T013 | Achievability → /devspark.critic |
| SC-003: UI loads fully at mount path | ✅ | T023, T024 | |
| SC-004: SWA standalone unaffected | ✅ | T001, T034 | |
| SC-005: Built-in examples work embedded | ✅ | T026–T028 | |
| SC-006: Package < 2 MB | ✅ | T033 | Achievability → /devspark.critic |

---

## Constitution Alignment

**No violations.** All 7 active constitution gates addressed in tasks:

- Gate I (TypeScript strict): T031
- Gate II (ESLint): T032
- Gate III (Layer structure + barrels): T005–T008, T011–T012, T015, T019–T020; T030 validates
- Gate IV (ApiClient pattern): T011 — extends `ApiClient`, per-call, debug callbacks
- Gate V (Zustand store rules): T007 — one concern, action-gated, no persist
- Gate VI (No console.log): T029 audits; `useDebugStore` routing in T013, T014
- Gate VIII (PII/PHI): no personal data in any type, store, or log field

---

## Metrics

| Metric | Value |
|--------|-------|
| Total Requirements (FR + SC) | 19 |
| Total Tasks | 37 |
| Requirements with ≥1 task | 19/19 (100%) |
| Critical issues | 0 |
| High issues resolved | 3/3 |
| Medium issues resolved | 6/6 |
| Low issues resolved | 3/3 |

---

## Resolution Contract

```yaml
findings:
  - finding_id: analyze-C-001
    severity: high
    description: "spec.md FR-009 stated Vite base is 'fixed and not configurable at runtime' but the mechanism uses VITE_BASE_PATH env var."
    recommended_action: "Update FR-009 to describe the VITE_BASE_PATH mechanism."
    execution_mode: selective
    status: resolved
    outcome: "FR-009 reworded in spec.md to describe the VITE_BASE_PATH dual-build approach."

  - finding_id: analyze-C-002
    severity: high
    description: "Edge case 3 implied trailing-slash normalization applied to custom mount paths (US4 deferred)."
    recommended_action: "Reword edge case 3 to scope it to the default path only."
    execution_mode: auto
    status: resolved
    outcome: "Edge case 3 reworded in spec.md to scope to /api-test-harness/ only."

  - finding_id: analyze-C-003
    severity: high
    description: "US4 deferred note implied a path parameter in MapApiTestHarness() that was not defined anywhere."
    recommended_action: "Clarify the method signature explicitly."
    execution_mode: manual
    status: resolved
    outcome: "US4 deferred note updated in spec.md: no path parameter in this release; signature is MapApiTestHarness(this WebApplication app, Action<ApiTestHarnessOptions>? configure = null)."

  - finding_id: analyze-U-001
    severity: medium
    description: "FR-012 requires ILogger for static asset requests but T023/T024 did not state this."
    recommended_action: "Add ILogger.LogDebug to middleware task."
    execution_mode: auto
    status: resolved
    outcome: "T024 description updated to include ILogger.LogDebug per asset served and SPA fallback."

  - finding_id: analyze-U-002
    severity: medium
    description: "FR-011 environment gating had no implementation task."
    recommended_action: "Add environment check to MapApiTestHarness() task."
    execution_mode: auto
    status: resolved
    outcome: "Environment gating folded into T023 (ApiTestHarnessExtensions.cs)."

  - finding_id: analyze-U-003
    severity: medium
    description: "Edge case 4 path conflict detection had no implementation task."
    recommended_action: "Add startup path conflict check."
    execution_mode: auto
    status: resolved
    outcome: "Path conflict detection (InvalidOperationException) folded into T023."

  - finding_id: analyze-U-004
    severity: medium
    description: "SC-001 had no validation task."
    recommended_action: "Add manual timing validation task to Phase 6."
    execution_mode: auto
    status: resolved
    outcome: "T035 added to Phase 6: manual timing of install flow against SC-001."

  - finding_id: analyze-U-005
    severity: medium
    description: "Contract implied HarnessOptions could have a BaseUrl property but data-model.md had none."
    recommended_action: "Remove 'if not explicitly set' clause from contract or add BaseUrl property."
    execution_mode: selective
    status: resolved
    outcome: "Contract updated: baseUrl is always derived from request Host header; no BaseUrl property in HarnessOptions."

  - finding_id: analyze-A-001
    severity: medium
    description: "T016 (US1) forward-referenced useHostApi from US2, breaking US1 independent testability."
    recommended_action: "Move useHostApi creation to Phase 3."
    execution_mode: selective
    status: resolved
    outcome: "useHostApi moved to T014 in Phase 3 (US1). US2 is now a validation-only phase. EndpointTester fully wired in US1."

  - finding_id: analyze-A-002
    severity: low
    description: "FR-006 scope for defaultHeaders was ambiguous regarding the OpenAPI fetch."
    recommended_action: "Clarify in T013 that defaultHeaders are not sent on OpenAPI fetch."
    execution_mode: auto
    status: resolved
    outcome: "T013 description updated: defaultHeaders NOT sent on OpenAPI doc fetch, only on host endpoint requests."

  - finding_id: analyze-A-003
    severity: low
    description: "T004 used Unix-style inline env var syntax that does not work in PowerShell."
    recommended_action: "Use $env:VITE_BASE_PATH in pack.ps1."
    execution_mode: auto
    status: resolved
    outcome: "T004 updated to use $env:VITE_BASE_PATH = '/api-test-harness/' PowerShell syntax."

  - finding_id: analyze-D-001
    severity: low
    description: "Fixed base path constraint repeated in 5 locations with slight wording variation."
    recommended_action: "No action — intentional repetition."
    execution_mode: auto
    status: resolved
    outcome: "Accepted as intentional. No changes made."
```
