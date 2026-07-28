---
participants:
  owner: human
  planner: ai
  implementer: ai
  reviewer: human
  critic: ai
  scribe: ai
---

# Implementation Plan: Remote API List

**Branch**: `001-remote-api-list` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.documentation/specs/001-remote-api-list/spec.md`

## Rationale Summary

### Core Problem

API Test Spark has a single remote API target. Users who test or document multiple external APIs must overwrite the same saved remote settings, which is fragile and makes the home, explorer, and documentation experiences hard to distinguish.

### Decision Summary

Model remote APIs as a list of named profiles with stable GUID identifiers. Server configuration seeds default profiles, browser persistence stores user-created profiles, overrides, and hidden server profile ids, and the UI routes explorer/documentation views by profile id. The server-side OpenAPI proxy is limited to server-provided profile ids; browser-created profiles fetch OpenAPI documents directly from the browser.

### Key Drivers

- Preserve existing browser persistence behavior and migrate the current single-remote shape.
- Keep server-provided `Program.cs` configuration as the shared baseline.
- Make navigation and generated documentation trustworthy by using unique display names and descriptions.
- Keep credentials scoped to the selected profile and out of display text.
- Keep server-provided proxy credentials server-side and out of `/api-test-spark/config`.

### Source Inputs

- [spec.md](./spec.md)
- API Test Spark Constitution v1.1.2
- Existing single-remote implementation in `ApiTestSparkOptions`, `/api-test-spark/config`, `/api-test-spark/remote-spec`, `useRemoteConfigStore`, `ConfigScreen`, `HomeScreen`, and remote API screens.

### Tradeoffs Considered

- Keep one remote and add manual switching: rejected because it preserves overwrite friction.
- Match profiles by name: rejected because names are user-facing and must be renameable.
- Replace all server defaults with browser values: rejected because it makes shared defaults brittle.
- Let browser-created profiles drive the server proxy with arbitrary URLs: rejected because it creates an SSRF trust-boundary risk.
- Serialize every server-provided credential to the browser config payload: rejected because it expands credential blast radius.
- Selected: stable profile ids with browser overrides and hidden markers keyed by id; server proxy by server profile id only; browser-created profiles use direct browser OpenAPI fetch.

### Architectural Impact

- Public .NET options add a remote profile collection while retaining backward-compatible single-remote properties long enough to seed one profile.
- The config endpoint returns a remote profile list with server-provided credential values redacted, plus legacy non-secret single-remote fields during transition.
- The SPA's persisted remote store changes from one config object to a profile collection with migration from version 1.
- Remote explorer and doc builder routes resolve the active profile by id.
- Remote spec fetching splits by profile source: server profiles use `/api-test-spark/remote-spec?profileId=...`; browser-created profiles fetch directly from the browser.

### Reviewer Guidance

Focus review on migration compatibility, public API shape, credential redaction in config responses, profile id merge semantics, unique-name validation, SSRF controls on the proxy, and whether all remote API UI routes use the selected profile instead of stale global config.

## Summary

Implement multi-remote API profiles across the .NET host configuration and React harness. The server can seed multiple profiles, browser persistence can add/edit/delete/hide profiles, API/doc navigation renders each visible profile using its unique name and description, and remote spec fetching respects the server-profile-only proxy trust boundary.

## Technical Context

**Language/Version**: TypeScript 6.0 strict, React 19, .NET 10 / C# for Minimal API package
**Primary Dependencies**: React Router, TanStack Query, Zustand persist middleware, uuid, ASP.NET Core Minimal APIs, MSTest
**Storage**: Browser `localStorage` via Zustand persist key `api-test-spark-remote-config`; server defaults from `MapApiTestSpark` options
**Testing**: `npm run verify`; `dotnet test ApiTestSpark.Tests`; MSTest integration tests for config/proxy; no JS test runner by constitution
**Target Platform**: Embedded SPA served from .NET Minimal API package at `/api-test-spark/`
**Project Type**: Brownfield library plus React SPA harness
**Performance Goals**: Config merge and profile selection remain immediate for small developer-managed lists; OpenAPI fetch behavior remains bounded by existing request timeout
**Constraints**: No `console.log`; all source barrels maintained; persisted store has focused concern and migration; credentials must not appear in display labels, generated titles, errors, or server-profile config payload values; browser-created profiles cannot trigger server-side remote spec fetches
**Scale/Scope**: Developer tool use; expected remote profile list is small enough for simple client-side management and validation

## Constitution Check

*GATE: Passed before Phase 0 research. Re-check after Phase 1 design.*

- **I. TypeScript Strict Compilation**: Plan requires `npm run verify` and avoids `@ts-ignore` suppression.
- **II. ESLint Only, No Prettier**: Plan keeps ESLint as the only style gate and does not introduce Prettier.
- **III. Feature Structure**: Types, API clients, hooks, components, store, utilities, and barrels remain in existing layer order.
- **IV. API Client Pattern**: Remote spec/API calls continue through existing client/hook patterns; no raw fetch in components.
- **V. Zustand Store Rules**: `useRemoteConfigStore` remains the single persisted store for remote profiles and uses explicit migration/versioning.
- **VI. Observability & Logging**: Configuration and OpenAPI failures route through debug-store-facing hooks; no `console.log`.
- **VII. Testing Stance**: .NET integration tests are required; React validation uses TypeScript/ESLint/build per constitution.
- **VIII. PII/PHI Data Protection**: Display text, generated documentation, and server-profile config payload values must not include credential values; sample data remains synthetic.

## Project Structure

### Documentation (this feature)

```text
.documentation/specs/001-remote-api-list/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── remote-api-profiles.md
├── checklists/
│   └── requirements.md
├── gates/
│   ├── analyze.md
│   └── critic.md
└── tasks.md
```

### Source Code (repository root)

```text
ApiTestSpark/
├── ApiTestSparkOptions.cs
├── ApiTestSparkExtensions.cs
├── PublicAPI.Shipped.txt
└── PublicAPI.Unshipped.txt

ApiTestSpark.Tests/
└── HarnessIntegrationTests.cs

SampleApi/
└── Program.cs

src/
├── types/
│   ├── host-api.ts
│   └── index.ts
├── store/
│   ├── remoteConfigStore.ts
│   └── index.ts
├── hooks/
│   ├── useHarnessConfig.ts
│   ├── useHostApi.ts
│   ├── useRemoteOpenApi.ts
│   └── index.ts
├── components/
│   ├── ConfigScreen.tsx
│   ├── HomeScreen.tsx
│   ├── remote-api/
│   │   ├── RemoteApiScreen.tsx
│   │   ├── RemoteApiDocScreen.tsx
│   │   └── index.ts
│   └── index.ts
└── utils/
    ├── openApiParser.ts
    └── index.ts
```

**Structure Decision**: Use the existing layered React SPA and .NET package structure. No new project or framework is introduced; the feature extends existing remote API surfaces and preserves barrel exports.

## Complexity Tracking

No constitution waivers or complexity violations are required.

## Phase 0 Research Summary

See [research.md](./research.md).

Key decisions:

- Use GUID profile ids as stable identity.
- Persist browser overrides, custom profiles, and hidden server profile ids in the existing remote config store key with a versioned migration.
- Keep legacy single-remote options as seed inputs and add a profile collection for new multi-remote defaults.
- Route explorer/documentation by profile id rather than a single global remote config.
- Keep server-side remote spec proxying limited to server-provided profile ids.
- Redact server-provided OpenAPI credential values from `/api-test-spark/config`.
- Browser-created profiles use direct browser OpenAPI fetch and surface CORS/configuration errors when the remote server blocks browser-side access.

## Phase 1 Design Summary

See [data-model.md](./data-model.md), [contracts/remote-api-profiles.md](./contracts/remote-api-profiles.md), and [quickstart.md](./quickstart.md).

Design outputs:

- Remote API profile entity with stable GUID id, name, description, base URL, OpenAPI URL, credential metadata/redacted server credentials, and headers.
- Remote profile collection merge rules: server defaults filtered by hidden ids, browser overrides by matching id, browser-created profiles appended, visible names unique.
- Config endpoint contract with multi-profile list, redacted server credential values, and legacy field compatibility.
- Remote spec proxy contract that accepts only server-provided profile ids; browser-created profile OpenAPI fetches are direct browser requests.
- UI flow contract for add/edit/delete/reset and selected-profile navigation.

## Post-Design Constitution Check

*GATE: Passed after Phase 1 design.*

- Layered source layout remains intact.
- Persisted store migration is explicit and bounded to remote config.
- Public .NET API changes require `PublicAPI` updates and MSTest coverage.
- Server-provided credential values remain server-side for proxy use and are not serialized in config payloads; browser-local credentials remain browser-local and must not be used in display labels or generated documentation titles.
- Required validation commands: `npm run verify`, `dotnet test ApiTestSpark.Tests`.

## Gate Finding Resolutions

| Finding | Resolution |
| --- | --- |
| `critic-001` / C1 SSRF risk | Server proxy accepts only server-provided profile ids. It never accepts browser-submitted URLs or browser-created profile ids. Browser-created profiles fetch OpenAPI documents directly from the browser. |
| `critic-002` / C2 credential exposure | `/api-test-spark/config` redacts server-provided API key values and bearer tokens. The proxy uses server-held credentials by profile id. Browser-created credentials stay in browser storage only. |
| `critic-003` / C3 migration/merge validation | Tasks add deterministic validation coverage for profile normalization, migration, merge, hidden ids, duplicate names, and fallback labels without introducing a JS test runner. |
| `critic-004` / C4 API compatibility | Legacy single-remote properties remain additive seed inputs for this release, are documented, and are not removed without a future deprecation cycle. |
| `analyze-001` fallback label coverage | Tasks add explicit fallback display-label implementation and validation work. |
| `analyze-002` proxy request model inconsistency | Contract and plan use one request model: server-provided profile id for proxy; direct browser fetch for browser-created profiles. |
| `analyze-003` stale gate acknowledgement | Tasks include a gate remediation acknowledgement documenting that findings were resolved by artifact revisions before implementation. |
