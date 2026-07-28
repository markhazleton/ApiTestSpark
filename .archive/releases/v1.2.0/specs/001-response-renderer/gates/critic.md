```yaml
gate: critic
status: pass
blocking: false
severity: info
summary: "PROCEED. All 5 findings resolved 2026-06-02. critic-001 and critic-002 (both critical) addressed in spec/plan/tasks/data-model. No constitution violations. No showstoppers."
```

## Technical Risk Assessment

**Analysis Date:** 2026-06-02
**Scope:** FULL (spec + plan + tasks)
**Detected Archetype:** desktop-app (browser SPA, no server deployment)
**Detected Stack:** TypeScript 5.x + React 19 + Zustand 5 + Tailwind CSS 4
**Context Mode:** brownfield (modifying existing live component)
**Risk Profile:** internal
**Risk Posture:** YELLOW

### Executive Summary

The feature is well-scoped and confined to a single file. The two critical risks are both React state-management traps that are easy to get wrong in brownfield modifications: (1) `nestedFields` not resetting when `data` changes if the `useState` initialiser pattern is misapplied, and (2) clipboard API silently unavailable in non-HTTPS contexts causing all copy actions to fail with no feedback. Both are solvable during implementation without redesign. No architecture, no .NET, no package-boundary risk.

---

### Findings

```yaml
findings:
  - finding_id: critic-001
    category: concurrency_async
    archetype_applicable: true
    location: tasks.md T007, spec.md FR-013
    description: "React useState initialiser only runs once on mount. If ResponseObjectForm receives a new data prop (new API call result), nestedFields will NOT reset automatically — it retains stale edited values from the previous response. This directly violates FR-013 and produces corrupted Copy-as-JSON output silently."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Use useEffect with data as dependency to reset nestedFields, OR restructure ResponseObjectForm to be keyed by a response ID so React remounts it fresh on each new response. Do NOT rely on useState initialiser alone."
    execution_mode: manual
    status: resolved
    outcome: "spec.md FR-013 updated to mandate reactive reset mechanism. data-model.md updated with useEffect([data]) pattern and code example. tasks.md T007 updated to explicitly require useEffect reset for both fields and nestedFields."
  - finding_id: critic-002
    category: error_handling_resilience
    archetype_applicable: true
    location: tasks.md T015, T009, T022-T024, spec.md FR-011
    description: "navigator.clipboard.writeText() is only available in secure contexts (HTTPS or localhost). In mixed-content or HTTP-served dev environments, the API is undefined — calling it throws a TypeError, not a rejected Promise. A catch() handler will not catch a synchronous TypeError from accessing .writeText on undefined."
    base_severity: critical
    effective_severity: critical
    recommended_action: "Guard all clipboard call-sites with: if (!navigator.clipboard) { addError(...); return; }. This converts the sync TypeError into a handled branch before the async call."
    execution_mode: manual
    status: resolved
    outcome: "spec.md FR-011 updated with navigator?.clipboard guard requirement. data-model.md updated with guard code pattern. tasks.md T009, T015, T022, T023, T024, T034 all updated to reference the two-step guard pattern."
  - finding_id: critic-003
    category: testing_strategy
    archetype_applicable: true
    location: tasks.md T036, spec.md § Constitution §VII
    description: "The only verification path for all 5 user stories is a manual browser smoke test (T036). No automated regression guard exists. A future change to EndpointTester.tsx could silently break nested editing, cURL copy, or JSON toggle with no CI signal."
    base_severity: high
    effective_severity: high
    recommended_action: "Accept for now per Constitution §VII (no test framework). Recommend noting this as tech debt in tasks.md and flagging as a candidate for the first utility test when §VII is amended. At minimum, ensure T036 smoke test steps are specific enough to catch regressions."
    execution_mode: manual
    status: resolved
    outcome: "T036 expanded with explicit per-story smoke test steps covering all 5 stories + US6 row truncation. Accepted as tech debt under Constitution §VII."
  - finding_id: critic-004
    category: error_handling_resilience
    archetype_applicable: true
    location: plan.md § buildCurl extraction, tasks.md T001-T002
    description: "Extracting buildCurl from DebugPanel.tsx and updating the import in T002 is a brownfield change to a file not otherwise in scope. If the extraction changes the function signature or export name, DebugPanel.tsx will fail silently at runtime (TypeScript will catch it only if types change). Risk is low but the step is easy to forget to verify."
    base_severity: high
    effective_severity: high
    recommended_action: "T002 must run npm run verify immediately after the import update — this is already in the task description. Confirm the extracted function signature is identical to what DebugPanel currently uses before extraction."
    execution_mode: selective
    status: resolved
    outcome: "tasks.md T002 updated to explicitly require npm run verify immediately after the import update, with the brownfield risk rationale documented inline."
  - finding_id: critic-005
    category: concurrency_async
    archetype_applicable: true
    location: tasks.md T014, plan.md § lastRequest state
    description: "lastRequest state is set synchronously in handleFire before the async mutation completes. If the user fires two requests in rapid succession, lastRequest will always reflect the most recent fire — the Copy-as-cURL button will show the second request's cURL even if the response panel still shows the first response's data. This is an edit-and-verify UX hazard."
    base_severity: high
    effective_severity: high
    recommended_action: "Capture lastRequest at mutation completion time (in the onSuccess / data callback), not in handleFire. This ensures the displayed response and the cURL command always correspond to the same call."
    execution_mode: manual
    status: resolved
    outcome: "tasks.md T014 updated to require onSuccess capture. plan.md state table updated with explicit note. data-model.md LastRequest interface documents the onSuccess capture requirement."
```

---

### Critical

| ID | Category | Location | Risk | Likely Impact | Action |
|----|----------|----------|------|---------------|--------|
| critic-001 | concurrency_async | tasks.md T007 / FR-013 | `useState` initialiser does not re-run on prop change — `nestedFields` retains stale edits after new API call | Copy-as-JSON silently produces wrong output with previous call's edited values | Use `useEffect` with `data` dep, or key the component to force remount |
| critic-002 | error_handling_resilience | tasks.md T009/T015/T022–T024 | `navigator.clipboard` is `undefined` in non-HTTPS contexts — accessing `.writeText` throws a synchronous TypeError not caught by `.catch()` | All copy buttons throw uncaught error; console error logged instead of debug store | Guard all sites with `if (!navigator.clipboard)` check before async call |

---

### High

| ID | Category | Location | Issue | Impact | Suggestion |
|----|----------|----------|-------|--------|------------|
| critic-003 | testing_strategy | tasks.md T036 | Manual-only verification; no automated regression guard for 5 stories | Silent regressions in future EndpointTester.tsx edits | Accept under §VII; make T036 smoke test steps explicit; flag as first §VII amendment candidate |
| critic-004 | error_handling_resilience | tasks.md T002 | buildCurl extraction touches DebugPanel.tsx — easy to forget verify step after import update | Runtime break in debug panel if signature drifts | Run `npm run verify` immediately after T002 |
| critic-005 | concurrency_async | tasks.md T014 | `lastRequest` captured in handleFire, not at response receipt — rapid double-fire produces mismatched cURL/response | Developer copies wrong cURL for displayed response | Capture `lastRequest` in mutation success callback, not in fire handler |

---

### Missing Critical Tasks

- **Observability**: FR-011 + T034 cover clipboard failures. No gaps for this scope.
- **Testing**: T036 smoke test is the only verification. Acceptable under Constitution §VII but noted as debt (critic-003).
- **Security**: No auth, no PII capture, no new endpoints. No gaps.

---

### Questionable Assumptions

1. **`useHarnessConfigStore` is the right home for `jsonViewMode`** → Failure mode: if the store is ever reset by other code paths (e.g., a future `resetAll` action), the user's view preference is lost mid-session. Mitigation: review `harnessConfigStore.ts` for any bulk-reset actions before adding the field.

2. **`<details>/<summary>` renders consistently in all browsers the tool targets** → Failure mode: older or non-standard browser in a corporate dev environment may style `<details>` differently. Mitigation: acceptable for a developer tool; no action needed.

3. **A single `lastRequest` state is sufficient for cURL copy** → Failure mode: documented in critic-005 above — rapid double-fire causes mismatch. Mitigation: capture at response receipt, not fire time.

---

### Dependency Risk Assessment

| Dependency | Concern | Alternative |
|------------|---------|------------|
| `navigator.clipboard` (Web API) | Unavailable in non-HTTPS; sync TypeError on undefined (critic-002) | Guard with `if (!navigator.clipboard)` before all call-sites |
| `WeakSet` (built-in) | None — universally available in all ES2021+ targets | N/A |
| `<details>/<summary>` (HTML5) | Minor styling variance in non-standard browsers | Acceptable for dev tool |
| Existing `buildCurl` in DebugPanel.tsx | Extraction risk — brownfield change (critic-004) | Extract carefully; verify immediately |

---

### Estimated Technical Debt at Launch

- **Testing Debt**: HIGH — 5 user stories verified only by manual smoke test. First candidate for §VII amendment.
- **Code Debt**: LOW — all changes in one file; clean utility extraction.
- **Operational Debt**: NONE — local dev tool, no deployment, no monitoring.
- **Documentation Debt**: LOW — analyze gate found 3 medium terminology gaps (A-004 to A-006).

---

### Metrics

- Showstoppers: 0
- Critical: 2 (critic-001, critic-002)
- High: 3 (critic-003, critic-004, critic-005)
- Medium/Low: 0
- Missing operational tasks: 0

**VERDICT:** PROCEED

All 5 findings resolved 2026-06-02. Artifacts updated — ready for `/devspark.implement`.

**Resolution Summary:**

- **critic-001** ✅: `useEffect([data])` reset pattern documented in data-model.md, spec FR-013, tasks T007
- **critic-002** ✅: `navigator?.clipboard` guard pattern documented in data-model.md, spec FR-011, tasks T009/T015/T022–T024/T034
- **critic-003** ✅: T036 expanded with per-story smoke test steps; accepted as tech debt under §VII
- **critic-004** ✅: T002 updated with inline verify-immediately instruction
- **critic-005** ✅: T014 updated to capture `lastRequest` in `onSuccess`; plan.md and data-model.md updated
