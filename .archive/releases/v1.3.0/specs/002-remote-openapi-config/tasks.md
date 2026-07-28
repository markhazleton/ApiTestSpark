---
description: "Task list for 002-remote-openapi-config"
---

# Tasks: Remote OpenAPI Configuration

**Input**: Design documents from `.documentation/specs/002-remote-openapi-config/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

## Rationale Summary

### Core Problem

ApiTestSpark can only discover OpenAPI endpoints from its embedded .NET host. Teams targeting partner services, staging environments, or third-party APIs have no way to point the tool at a remote OpenAPI document.

### Decision Summary

Add a remote OpenAPI URL + optional auth credentials to `ApiTestSparkOptions` and `useUnifiedConfigStore`. A server-side .NET proxy endpoint fetches the remote document to avoid CORS and keep credentials off the browser. The React app seeds from startup config on first use; persisted UI values always win thereafter.

### Key Drivers

- Developers need to test APIs they do not own or host locally
- CORS blocks direct browser fetches from most real-world API servers
- Credentials must not appear in browser network traffic or debug output

### Reviewer Guidance

Focus on: credential non-exposure in error messages and debug store; seed priority logic (persisted wins over `Program.cs`); proxy `502` response body containing no credential detail; `PublicAPI.Shipped.txt` completeness.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: .NET options + config endpoint delta
- **[US2]**: .NET proxy endpoint (`/api-test-spark/remote-spec`)
- **[US3]**: React types + store + client + hook
- **[US4]**: React config UI panel
- **[US5]**: Endpoint discovery wiring + seeding logic
- **[US6]**: .NET integration tests + quality gates

---

## Phase 1: Setup

**Purpose**: Confirm branch, verify toolchain, and create any new directories needed.

- [X] T001 Confirm active branch is `002-remote-openapi-config` (`git branch --show-current`)
- [X] T002 [P] Run `dotnet build ApiTestSpark` — confirm zero errors baseline
- [X] T003 [P] Run `npm run verify` — confirm zero TypeScript errors baseline
- [X] T004 [P] Run `npm run lint` — confirm zero ESLint errors baseline
- [X] T005 Create `src/components/harness-config/` directory if it does not already exist

**Checkpoint**: Phase complete — 2026-06-05

---

## Phase 2: Foundational (.NET Public API — SEMVER: MINOR)

**Purpose**: Extend `ApiTestSparkOptions` and update the config endpoint. These are the blocking prerequisites — all React work in Phase 3 depends on the `HarnessConfig` shape being settled.

**⚠️ CRITICAL**: Phase 3 React types depend on the `HarnessConfig` shape finalised here.

- [X] T006 [US1] Add four nullable string properties to `ApiTestSpark/ApiTestSparkOptions.cs`: `RemoteOpenApiUrl`, `RemoteOpenApiApiKeyHeader`, `RemoteOpenApiApiKeyValue`, `RemoteOpenApiBearerToken` — all default `null`; add XML doc comments noting local-dev-only trust boundary for credential properties
- [X] T007 [US1] Update `GET /api-test-spark/config` response in `ApiTestSpark/ApiTestSparkExtensions.cs` to include the four new fields from `ApiTestSparkOptions` (null when not set)
- [X] T008 [US1] Update `ApiTestSpark/PublicAPI.Shipped.txt` with the four new public properties — required for SEMVER: MINOR gate

**Checkpoint**: Phase complete — 2026-06-05

---

## Phase 3: .NET Proxy Endpoint

**Purpose**: Add `GET /api-test-spark/remote-spec` — the server-side fetch proxy. Independent of all React work.

- [X] T009 [US2] Register `IHttpClientFactory` via `services.AddHttpClient()` in the harness DI setup in `ApiTestSpark/ApiTestSparkExtensions.cs`; configure the named client with a 10-second timeout (`HttpClient.Timeout = TimeSpan.FromSeconds(10)`) — do NOT use `new HttpClient()` per-request (socket exhaustion risk); add an inline code comment noting this is the first harness-owned DI service registration
- [X] T010 [US2] Add `GET /api-test-spark/remote-spec` route in `ApiTestSpark/ApiTestSparkExtensions.cs`:
  - **SPA middleware**: add `/api-test-spark/remote-spec` to the SPA pass-through exempt paths (alongside `/api-test-spark/config`) so the route handler is reached, not the SPA fallback
  - Return `400` with `{ "error": "RemoteOpenApiUrl is not configured." }` if `RemoteOpenApiUrl` is null/empty
  - **SSRF guard**: validate that `RemoteOpenApiUrl` starts with `http://` or `https://` (case-insensitive); return `400` with `{ "error": "RemoteOpenApiUrl must use http or https scheme." }` for any other scheme (e.g. `file://`, `ldap://`) — add an inline comment noting this prevents SSRF to non-HTTP targets
  - Build outbound request via the registered `IHttpClientFactory` named client; inject `RemoteOpenApiApiKeyHeader`/`RemoteOpenApiApiKeyValue` header if both non-null; inject `Authorization: Bearer {token}` if `RemoteOpenApiBearerToken` non-null
  - On success (2xx): check response `Content-Type` — if it is not `application/json` or `application/vnd.oai.openapi+json`, return `502` with `{ "error": "Remote server returned non-JSON content." }`; otherwise stream body to caller as `application/json`
  - On non-2xx, network error, or timeout: return `502` with `{ "error": "Failed to fetch remote OpenAPI document." }` — credentials and `RemoteOpenApiUrl` MUST NOT appear in the message

**Checkpoint**: Phase complete — 2026-06-05

---

## Phase 4: React Types + Store + Client + Hook

**Purpose**: Extend the React data layer. All four tasks touch different files and can be worked in order; T013 depends on T011 being merged first.

- [X] T011 [US3] Extend `HarnessConfig` in `src/types/host-api.ts` with four optional fields: `remoteOpenApiUrl?: string`, `remoteOpenApiApiKeyHeader?: string`, `remoteOpenApiApiKeyValue?: string`, `remoteOpenApiBearerToken?: string`
- [X] T012 [P] [US3] Extend the per-environment config shape in `src/types/state.ts` (`ApiConfigSet`) with the same four optional fields
- [X] T013a [US3] Bump the Zustand persist migration version in `src/store/unifiedConfigStore.ts` (`version` field in `persist` options): increment from the current value to the next integer; write a non-destructive migration function that preserves all existing `ApiConfigSet` fields and defaults the four new remote fields to `undefined` — do NOT use `createDefaultConfig()` as the migration handler (it would wipe all previously saved config)
- [X] T013 [US3] Add four store actions to `src/store/unifiedConfigStore.ts`: `setRemoteOpenApiUrl(env, url)`, `setRemoteOpenApiApiKeyHeader(env, header)`, `setRemoteOpenApiApiKeyValue(env, value)`, `setRemoteOpenApiBearerToken(env, token)`; add a fifth action `clearRemoteOpenApiConfig(env)` that sets all four fields to `undefined` (not empty string — `undefined` makes the field re-seed-eligible on next load if `Program.cs` values are present); ensure all fields are included in the persisted shape; `setRemoteOpenApiUrl` MUST also call the clear logic for credential fields when the URL argument is `undefined` or `''` (enforces atomicity invariant even without the explicit Clear button)
- [X] T014 [US3] Create `src/api/remoteOpenApiClient.ts` using `createRestCaller` (Pattern B): exposes a `fetchRemoteSpec(callbacks)` function that calls `GET /api-test-spark/remote-spec` with UUID correlation, timing, and debug callbacks; re-export from `src/api/index.ts` — note: sequential after T012/T013 (no `[P]` tag); T015 depends on this task
- [X] T015 [US3] Create `src/hooks/useRemoteOpenApi.ts`: `useMutation` hook that calls `remoteOpenApiClient.fetchRemoteSpec`, pipes the response through the existing `openApiParser` to produce `DiscoveredEndpoint[]`, routes errors to `useDebugStore.addError()` with category `'Configuration'` (never including credential values in the error message); re-export from `src/hooks/index.ts`

**Checkpoint**: Phase complete — 2026-06-05

---

## Phase 5: React Config UI Panel

**Purpose**: Expose the remote OpenAPI config fields in the configuration screen.

- [X] T016 [US4] Create `src/components/harness-config/RemoteOpenApiConfig.tsx` (evolved into `src/components/ConfigScreen.tsx` — dedicated top-level Config page with `useRemoteConfigStore`, no env dimension, masked credential fields, token hints)
- [X] T017 [US4] Create `src/components/harness-config/index.ts` barrel; re-export from `src/components/index.ts`
- [X] T018 [US4] Integrate config UI into navigation — `/config` route in `App.tsx`, Config nav link in `Header.tsx`, Config card on `HomeScreen.tsx`

**Checkpoint**: Phase complete — 2026-06-05

---

## Phase 6: Endpoint Discovery Wiring + Seeding Logic

**Purpose**: Connect the remote config to actual endpoint discovery and seed `Program.cs` values on first load.

- [X] T019 [US5] Add seeding logic inside the `queryFn` of `useHarnessConfig.ts` — browser-persisted values win over `Program.cs`; seeds only empty fields; placed inside `queryFn` (not `onSuccess` — removed in TanStack Query v5)
- [X] T020 [US5] Remote endpoint discovery wired: `RemoteApiScreen` calls `useRemoteOpenApi` mutation to fetch and parse the remote spec via the proxy; `RemoteApiDocScreen` mirrors the same for the doc builder; `useHostApi` reads live remote config from `useRemoteConfigStore` so header/credential changes take effect immediately without restart

**Checkpoint**: Phase complete — 2026-06-06

---

## Phase 7: .NET Integration Tests + Quality Gates

**Purpose**: Cover the new .NET surface with integration tests and run all four quality gates.

- [X] T021 [P] [US6] Add integration test: `GET /api-test-spark/config` includes `remoteOpenApiUrl` and `remoteOpenApiApiKeyHeader` when set in options
- [X] T022 [P] [US6] Add integration test: `GET /api-test-spark/config` returns null for remote fields when not configured; verify `ApiTestSparkOptions` defaults are `null`
- [X] T023 [US6] Add integration tests for `GET /api-test-spark/remote-spec` 400 cases: (a) not configured; (b) `file://` path — both return `400`; body contains no URL value (CRIT-01 SSRF guard)
- [X] T024 [US6] Add integration tests for proxy success path: (a) mock returns `200 application/json` → `200` proxied; (b) mock returns `200 text/html` → `502` content-type guard; (c) mock delays > timeout → `502` safe message
- [X] T025 [US6] Add integration test: `502` response body contains no credential values and no `RemoteOpenApiUrl`
- [X] T026a [US6] Add integration test: `/remote-spec` returns `application/json` (not `text/html`) — verifies SPA middleware pass-through (CRIT-03)
- [X] T026 [US6] `dotnet test ApiTestSpark.Tests` — 30 passed, 0 failed
- [X] T027 [US6] `npm run verify` — zero TypeScript errors, build ✓
- [X] T028 [US6] `npm run lint` — zero ESLint errors
- [X] T029 [US6] `dotnet build ApiTestSpark` — zero C# errors

**Checkpoint**: Phase complete — 2026-06-06

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T030 [P] `PublicAPI.Shipped.txt` verified — `dotnet build` analyzer passes
- [X] T031 [P] XML doc comments added to credential properties in `ApiTestSparkOptions.cs` noting local-dev-only trust boundary and that harness must not be exposed to the public internet
- [X] T032 `checklists/requirements.md` — all items marked complete

**Checkpoint**: Phase complete — 2026-06-06

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies — start immediately
- **Phase 2** (Foundational .NET): Depends on Phase 1 — `HarnessConfig` shape must be settled before React types
- **Phase 3** (Proxy endpoint): Depends on Phase 2 — needs `ApiTestSparkOptions` properties; can overlap with Phase 4 once T006 is done
- **Phase 4** (React types/store/client/hook): Depends on T011 (Phase 2) for `HarnessConfig` type; T012–T015 can proceed in parallel once T011 is merged
- **Phase 5** (UI): Depends on Phase 4 (store actions must exist)
- **Phase 6** (Wiring): Depends on Phases 4 + 5
- **Phase 7** (Tests + gates): Depends on Phases 2, 3, 4, 5, 6 all complete
- **Phase 8** (Polish): Depends on Phase 7 passing

### Parallel Opportunities Within Phases

- T002, T003, T004 — parallel baseline checks
- T011, T012 — parallel type extensions (different files)
- T013a must complete before T013 (migration version must be bumped before adding fields)
- T013 must complete before T014 (store actions must exist before client references them)
- T014 → T015 — sequential (client before hook); T014 is NOT parallel with T015
- T021, T022 — parallel integration tests (same file, different test methods — coordinate)
- T023, T024, T025, T026a — sequential proxy tests (same test class)
- T027, T028, T029 — parallel quality gate runs

---

## Gate Acknowledgements

No gate failures — all gates passed cleanly before and after implementation.

## Implementation Notes

- **Config store architecture**: Implemented a dedicated `useRemoteConfigStore` (flat, no env dimension) instead of per-env fields in `useUnifiedConfigStore`. Remote config is connection-specific, not environment-specific. The per-env fields remain in `ApiConfigSet` for backward compatibility but new code paths use `remoteConfigStore` exclusively.
- **Browser-wins seeding**: `useHarnessConfig` seeds `remoteConfigStore` from `Program.cs` values only when browser fields are empty, then merges browser values on top before writing to `harnessConfigStore`. Effective config always reflects browser overrides.
- **UI credential masking**: API Key Value and Bearer Token fields use `type="password"` inputs. The About page masks credential values as bullet characters. Credentials never appear in debug store entries or error messages.
- **Header token replacement**: `{session-guid}` (module-level singleton UUID) and `{request-guid}` (fresh UUID per call) are resolved via `resolveHeaderTokens()` at request-send time in `useHostApi`, `ApiDocScreen`, and `RemoteApiDocScreen`.
- **Focus-loss bug fix**: `HeadersEditor` key input uses a `KeyInput` sub-component with local state and `onBlur` commit to prevent row remount on each keystroke.
- **Live config reads**: `useHostApi` reads remote headers/credentials from `useRemoteConfigStore` directly (not the startup snapshot in `harnessConfigStore`) so Config page saves take effect immediately.
- **Version/build date**: `harnessVersion` and `harnessBuiltAt` added to the config endpoint response, read from `AssemblyInformationalVersionAttribute` and `File.GetLastWriteTimeUtc(assembly.Location)`. About page reads from `harnessConfigStore` — works in both standalone and NuGet-embedded modes.
