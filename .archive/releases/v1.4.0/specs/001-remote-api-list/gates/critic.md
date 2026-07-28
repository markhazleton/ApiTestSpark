```yaml
gate: critic
status: fail
blocking: true
severity: showstopper
summary: "Two trust-boundary risks must be resolved before implementation: browser-created profile proxying can become SSRF-prone, and multi-profile config serialization can expose all configured credentials at once."
```

## Technical Risk Assessment

**Scope**: FULL
**Detected Archetype**: library with embedded web-service surfaces
**Context Mode**: brownfield
**Risk Profile**: internal
**Checklists Applied**: `.devspark/risk-checklists/dotnet-aspnet.md`, `.devspark/risk-checklists/library.md`, `.devspark/risk-checklists/web-service.md`

| ID | Category | Base Severity | Effective Severity | Location(s) | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | trust_boundaries / input_validation | SHOWSTOPPER | SHOWSTOPPER | `contracts/remote-api-profiles.md` remote-spec request contract; `tasks.md` T039-T040 | Browser-created profiles imply the browser can cause the server proxy to fetch arbitrary OpenAPI URLs. The existing plan only preserves scheme validation, which is not enough to prevent SSRF to private networks, link-local metadata endpoints, localhost, or internal services. | Add an explicit proxy trust-boundary design before implementation: either restrict proxy fetches to server-configured profile ids only, or add allowlist/private-network blocking, URL normalization, DNS/IP validation, redirect limits, timeout/body-size caps, and sanitized audit/error capture for browser-supplied profile URLs. |
| C2 | secrets_handling | SHOWSTOPPER | SHOWSTOPPER | `plan.md` config endpoint contract; `contracts/remote-api-profiles.md` config response; `tasks.md` T006, T037 | Returning every remote profile's API key and bearer token in `/api-test-spark/config` increases credential blast radius from one remote to all configured remotes. A single config fetch exposes credentials for profiles the user may never open. | Reduce credential exposure scope. Prefer server-side credentials for server-provided profiles, per-profile fetch on demand, redacted config payloads, or explicit dev-only warning/guardrails. Add tests proving display text and config/proxy errors never leak credential values and that the config endpoint does not unnecessarily return all profile secrets. |
| C3 | testing_strategy | CRITICAL | CRITICAL | `tasks.md` T013-T014, T026-T035, T049 | Store migration, merge precedence, hidden server ids, and duplicate-name validation are complex but currently rely mainly on implementation tasks plus manual quickstart validation. A bug here can silently lose or duplicate persisted browser profiles. | Add deterministic validation tasks for pure migration/merge helpers. If no JS test runner is allowed, isolate migration/merge logic into pure functions and validate via TypeScript build-time examples or documented manual fixtures checked during `npm run verify` and quickstart. |
| C4 | api_compatibility | CRITICAL | CRITICAL | `ApiTestSparkOptions.cs`, `PublicAPI.Unshipped.txt`, `tasks.md` T004-T009 | The published package public surface is changing, but the plan does not define semver/deprecation treatment for legacy single-remote properties beyond "retain during transition." Consumers need a stable compatibility story. | Add explicit compatibility notes to README and tasks: legacy single-remote properties remain supported as a seed profile for this release, new profile collection is additive, and no removal occurs without a later deprecation cycle. |

## Findings

```yaml
findings:
  - finding_id: critic-001
    severity: critical
    description: "Browser-created profiles can drive the server-side remote-spec proxy toward arbitrary URLs without a complete SSRF defense model."
    recommended_action: "Revise plan/tasks to add explicit proxy trust-boundary controls before implementation."
    execution_mode: manual
    status: open
    outcome: ""
  - finding_id: critic-002
    severity: critical
    description: "Multi-profile config serialization can expose all configured API keys and bearer tokens in one config response."
    recommended_action: "Revise the config/proxy contract to scope or redact credentials and add credential non-disclosure tests."
    execution_mode: manual
    status: open
    outcome: ""
  - finding_id: critic-003
    severity: medium
    description: "Profile migration and merge precedence have meaningful regression risk without deterministic validation beyond manual quickstart checks."
    recommended_action: "Add tasks for pure migration/merge validation fixtures or an allowed no-test-runner validation approach."
    execution_mode: selective
    status: open
    outcome: ""
  - finding_id: critic-004
    severity: medium
    description: "The public package compatibility story for legacy single-remote properties is not explicit enough for consumers."
    recommended_action: "Document additive behavior and legacy property retention/deprecation policy in README and package docs."
    execution_mode: auto
    status: open
    outcome: ""
```

## Gate Outcome

Do not proceed to `/devspark.implement` until C1 and C2 are addressed in the plan and tasks. C3 and C4 can be resolved as task refinements once the trust-boundary design is updated.
