# Tasks: Portable NuGet Package for API Test Harness

**Input**: Design documents from `.documentation/specs/001-nuget-portable-harness/`
**Prerequisites**: spec.md ✅ | plan.md ✅ | data-model.md ✅ | contracts/config-endpoint.md ✅ | research.md (inline in plan.md) ✅
**Tests**: No test framework in this project (Constitution VII). No test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Rationale Summary

### Core Problem

The API Test Harness React SPA is standalone-only. Developers building .NET Minimal API projects cannot embed it without a separate deployment. This feature packages it as a NuGet package with a one-line install experience.

### Decision Summary

Compile the React SPA with a fixed Vite base path (`/api-test-harness/`) and embed the output as resources in a .NET class library. Expose `MapApiTestHarness()` on `IEndpointRouteBuilder`. The SPA fetches a config endpoint on startup to discover the host app's OpenAPI v3 document URL, auth scheme, and default headers.

### Key Drivers

- Developer experience: one-line install in any .NET 9 Minimal API project
- Existing SWA standalone deployment must remain unaffected (`VITE_BASE_PATH` env var)
- Constitution compliance: all new TypeScript follows the types → api → hooks → components layer order

### Reviewer Guidance

Focus on: (1) `VITE_BASE_PATH` env var correctly separates standalone vs. embedded builds; (2) `EmbeddedFileProvider` resource name prefix matches the assembly namespace; (3) `harnessConfigStore` does not persist to localStorage; (4) all new TypeScript barrel exports are updated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the build system and project scaffolding before any feature work begins.

- [ ] T001 Add `VITE_BASE_PATH` environment variable support to `vite.config.ts` — change `base` from unset to `process.env.VITE_BASE_PATH ?? '/'`
- [ ] T002 Update `src/App.tsx` — change `BrowserRouter` to read `basename` from `import.meta.env.BASE_URL` so routing works under any base path
- [ ] T003 Create .NET class library project `WebSpark.ApiTestHarness/WebSpark.ApiTestHarness.csproj` targeting `net9.0` with `EmbeddedResource Include="build\**"` and framework reference to `Microsoft.AspNetCore.App`
- [ ] T004 [P] Create `scripts/build/pack.ps1` — set `$env:VITE_BASE_PATH = '/api-test-harness/'`, run `npm run build`, clear `$env:VITE_BASE_PATH`, then run `dotnet pack WebSpark.ApiTestHarness/` (PowerShell inline env var prefix syntax does not work on Windows)

**Checkpoint**: Build system ready. `npm run verify` still passes. `pack.ps1` can be run end-to-end.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core TypeScript types, the Zustand store, and the .NET options class that every user story depends on. Must be complete before any user story phase begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Create `src/types/host-api.ts` — define `HarnessConfig`, `DiscoveredEndpoint`, `EndpointParameter`, `OpenApiV3Doc`, `OpenApiV3PathItem`, `OpenApiV3Operation` interfaces per `data-model.md`
- [ ] T006 Update `src/types/index.ts` — re-export all types from `host-api.ts`
- [ ] T007 Create `src/store/harnessConfigStore.ts` — Zustand store with `config`, `endpoints`, `configStatus`, `openApiStatus`, `configError`, `openApiError` state and corresponding actions; NOT persisted to localStorage (no `persist` middleware)
- [ ] T008 Update `src/store/index.ts` — re-export `useHarnessConfigStore` from `harnessConfigStore.ts`
- [ ] T009 Create `WebSpark.ApiTestHarness/ApiTestHarnessOptions.cs` — `ApiTestHarnessOptions` class with `OpenApiUrl`, `AuthScheme`, `DefaultHeaders`, `Environments` properties per `data-model.md`
- [ ] T010 Create `src/utils/openApiParser.ts` — `parseOpenApiV3(doc: OpenApiV3Doc): DiscoveredEndpoint[]` function; rejects documents where `openapi` field does not start with `"3."` and returns empty array; maps each path+method to a `DiscoveredEndpoint`

**Checkpoint**: Foundation ready. `npm run verify` passes. All barrel exports compile. .NET project compiles with `dotnet build`.

---

## Phase 3: User Story 1 — Install Harness in a New .NET API (Priority: P1) 🎯 MVP

**Goal**: A developer adds one line to `Program.cs` and the harness UI loads at `/api-test-harness/` with the host app's endpoints autodiscovered from its OpenAPI v3 document.

**Independent Test**: Create `dotnet new webapi`, add `app.MapApiTestHarness()`, run — navigate to `/api-test-harness/` and confirm the UI loads with the host app's endpoints listed under "Your App's APIs".

### Implementation for User Story 1

- [ ] T011 [US1] Create `src/api/hostApiClient.ts` — extend `ApiClient` from `src/api/client.ts`; add `fetchConfig(): Promise<HarnessConfig>` method that calls `GET /api-test-harness/config`; instantiated per-call with debug callbacks from `useDebugStore`
- [ ] T012 [US1] Update `src/api/index.ts` — re-export `HostApiClient` from `hostApiClient.ts`
- [ ] T013 [US1] Create `src/hooks/useHarnessConfig.ts` — TanStack Query `useQuery` hook that: instantiates `HostApiClient` per-call with debug callbacks, fetches config, stores result in `harnessConfigStore`, then fetches and parses the OpenAPI doc if `openApiUrl` is non-null (does NOT send `defaultHeaders` on the OpenAPI fetch — only on host endpoint requests), stores endpoints in `harnessConfigStore`; routes all request/response/error through `useDebugStore` via `buildDebugCallbacks`
- [ ] T014 [US1] Create `src/hooks/useHostApi.ts` — TanStack Query `useMutation` hook for firing requests to host app endpoints; reads `config.defaultHeaders` from `harnessConfigStore` and merges into every request; reads `config.authScheme` to pre-populate the Authorization header field; instantiates `HostApiClient` per-call with debug callbacks; routes all request/response/error/metric through `useDebugStore`
- [ ] T015 [US1] Update `src/hooks/index.ts` — re-export `useHarnessConfig` and `useHostApi` from their respective files
- [ ] T016 [P] [US1] Create `src/components/host-api/EndpointList.tsx` — renders `DiscoveredEndpoint[]` grouped by `tags[0]` (or "General" if no tags); each item shows method badge + path + summary; clicking selects an endpoint for testing
- [ ] T017 [P] [US1] Create `src/components/host-api/EndpointTester.tsx` — renders form for selected `DiscoveredEndpoint`; populates path params, query params, and request body fields from the endpoint schema; wires `useHostApi` mutation to fire requests; shows response in debug panel; pre-populates Authorization header input from `config.authScheme`; injects `config.defaultHeaders` as read-only badges with optional override
- [ ] T018 [US1] Create `src/components/host-api/HostApiScreen.tsx` — root screen component; calls `useHarnessConfig` on mount; renders loading state while `configStatus === 'loading'`; renders error banner when `configStatus === 'error'`; renders `EndpointList` + `EndpointTester` when `openApiStatus === 'ready'`; renders "No endpoints configured" message when `openApiStatus === 'skipped'`
- [ ] T019 [US1] Create `src/components/host-api/index.ts` — barrel export for `HostApiScreen`, `EndpointList`, `EndpointTester`
- [ ] T020 [US1] Update `src/components/index.ts` — re-export from `./host-api`
- [ ] T021 [US1] Update `src/App.tsx` — add lazy import for `HostApiScreen`; add `<Route path="/host-api" element={<HostApiScreen />} />`
- [ ] T022 [US1] Update `src/components/HomeScreen.tsx` — add "Your App's APIs" card to `SECTIONS` array pointing to `/host-api`
- [ ] T023 [US1] Create `WebSpark.ApiTestHarness/ApiTestHarnessExtensions.cs` — `MapApiTestHarness(this WebApplication app, Action<ApiTestHarnessOptions>? configure = null)` extension method (no path parameter — mount path is always `/api-test-harness/`); registers `EmbeddedFileProvider` serving `build/` at `/api-test-harness`; registers `MapGet("/api-test-harness/config", ...)` handler that serializes `HarnessOptions.OpenApiUrl`, `HarnessOptions.AuthScheme`, `HarnessOptions.DefaultHeaders`, and `baseUrl` (derived from `HttpContext.Request`) into JSON response; logs startup message and config requests via `ILogger`; checks `options.Environments` — if non-empty, verifies `IHostEnvironment.EnvironmentName` is in the list and throws `InvalidOperationException` if not; throws `InvalidOperationException` at startup if `/api-test-harness/` routes are already registered (path conflict detection)
- [ ] T024 [US1] Create `WebSpark.ApiTestHarness/ApiTestHarnessMiddleware.cs` — SPA fallback middleware; serves `index.html` for any request under `/api-test-harness/` not matched by static files or config endpoint; sets `Cache-Control: no-cache` on `index.html`; sets `Cache-Control: public, max-age=31536000, immutable` on hashed asset responses; emits `ILogger.LogDebug` per asset served and per SPA fallback as specified in `contracts/config-endpoint.md`

**Checkpoint**: US1 complete. Running `pack.ps1` produces a `.nupkg`. Installing into `dotnet new webapi` and calling `app.MapApiTestHarness()` serves the harness UI at `/api-test-harness/` with endpoints from `/openapi.json` listed. `useHostApi` is available and wired into `EndpointTester`.

---

## Phase 4: User Story 2 — Configure Auth and Custom Headers (Priority: P2)

**Goal**: A developer configures `AuthScheme` and `DefaultHeaders` in `Program.cs`. The SPA confirms those values are returned by the config endpoint and that they were already applied by `useHostApi` (implemented in US1).

**Independent Test**: Register with `options.AuthScheme = "Bearer"` and `options.DefaultHeaders["X-Tenant-Id"] = "acme"`. Call `GET /api-test-harness/config` — verify response contains `"authScheme": "Bearer"` and `"defaultHeaders": {"X-Tenant-Id": "acme"}`. Fire a request in the UI — verify debug panel shows the `X-Tenant-Id` header and `Authorization: Bearer` header field is pre-populated.

### Implementation for User Story 2

- [ ] T025 [US2] Manual validation: register harness with `AuthScheme = "Bearer"` and `DefaultHeaders["X-Tenant-Id"] = "acme"`; call `GET /api-test-harness/config` and confirm response shape matches the contract in `contracts/config-endpoint.md`; fire a host endpoint request and confirm `X-Tenant-Id` and `Authorization` appear in the debug panel (US2 is now fully implemented by T014, T017, T023 — this task validates the integration end-to-end)

**Checkpoint**: US2 complete. Config endpoint returns auth metadata. Default headers and auth scheme appear in debug panel for all host API requests.

---

## Phase 5: User Story 3 — Built-in Examples Still Work (Priority: P3)

**Goal**: When no `openApiUrl` is configured, JokeAPI and JsonPlaceholder examples remain fully functional. The "Your App's APIs" section shows a graceful "no endpoints configured" state.

**Independent Test**: Call `app.MapApiTestHarness(o => o.OpenApiUrl = null)`. Load the harness UI — "Your App's APIs" section shows "No endpoints configured". Navigate to `/joke-api` — fire a request and verify a joke response is returned.

### Implementation for User Story 3

- [ ] T026 [US3] Update `src/components/host-api/HostApiScreen.tsx` — when `openApiStatus === 'skipped'`, render a "No host API endpoints configured" empty-state message with a link to the how-to-use guide; ensure existing JokeAPI and JsonPlaceholder nav cards remain visible on `HomeScreen`
- [ ] T027 [US3] Update `src/hooks/useHarnessConfig.ts` — when config fetch succeeds but `openApiUrl` is null, set `openApiStatus` to `'skipped'` immediately without attempting an OpenAPI fetch; log this path through `useDebugStore` as an informational event
- [ ] T028 [US3] Update `WebSpark.ApiTestHarness/ApiTestHarnessExtensions.cs` — handle `options.OpenApiUrl = null` cleanly in the config endpoint response (serialize as JSON `null`, not omitted key); verify existing JokeAPI and JsonPlaceholder routes in the embedded SPA are unaffected

**Checkpoint**: US3 complete. Harness works with or without OpenAPI config. Built-in examples unaffected.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Constitution compliance sweep, ILogger audit, build pipeline validation, package size verification, and SC-001 manual timing.

- [ ] T029 [P] Audit all new `src/` files for `console.log` — replace any found with `useDebugStore` routing (Constitution VI)
- [ ] T030 [P] Verify all new `src/` directories have `index.ts` barrel exports and that `src/types/index.ts`, `src/api/index.ts`, `src/hooks/index.ts`, `src/store/index.ts`, `src/components/index.ts` are all updated (Constitution III)
- [ ] T031 Run `npm run verify` (tsc -b + vite build) — confirm zero TypeScript errors (Constitution I)
- [ ] T032 Run `npm run lint` — confirm zero ESLint errors including `react-hooks/exhaustive-deps` (Constitution II)
- [ ] T033 Run `pack.ps1` — confirm `.nupkg` is produced and is under 2 MB (SC-006)
- [ ] T034 Verify `npm run build` (no `VITE_BASE_PATH` set) — confirm standalone SWA build still passes and assets resolve at `/` not `/api-test-harness/` (SC-004)
- [ ] T035 Manual validation: time the full `dotnet add package WebSpark.ApiTestHarness` → `app.MapApiTestHarness()` → running harness flow against SC-001 target of under 5 minutes
- [ ] T036 [P] Update `DEPLOYMENT.md` — document the NuGet packaging step and `VITE_BASE_PATH` dual-build approach
- [ ] T037 [P] Update `.github/copilot-instructions.md` to note the new `WebSpark.ApiTestHarness/` project structure

**Checkpoint**: All constitution gates pass. Package under 2 MB. Standalone deployment unaffected.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — fully self-contained; `useHostApi` created here (T014) so `EndpointTester` is fully functional within US1
- **Phase 4 (US2)**: Depends on Phase 3 — US2 is now a validation-only phase confirming T014/T017/T023 work end-to-end with real auth options
- **Phase 5 (US3)**: Depends on Phase 3 — touches `HostApiScreen` (T018) and `useHarnessConfig` (T013); US3 must follow US1
- **Phase 6 (Polish)**: Depends on all desired user story phases completing

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|----------------------|
| US1 (P1) | Phase 2 complete | — |
| US2 (P2) | Phase 3 complete (US2 is validation only) | — |
| US3 (P3) | Phase 3 complete | — |

### Within Each Phase

- `[P]` tasks within a phase touch different files and can run concurrently
- Tasks without `[P]` depend on previous tasks in the same phase completing first
- All TypeScript barrel export updates (`index.ts` files) must follow the file they export

### Parallel Opportunities

```text
Phase 1:  T001, T002 can run concurrently with T003, T004
Phase 2:  T005, T006 → then T007, T008, T009, T010 [P across files]
Phase 3:  T016, T017 [P] once T015 done; T023, T024 [P] once T011 done
Phase 4:  T025 (validation only, no parallel needed)
Phase 6:  T029, T030, T034, T036, T037 all [P]
```

---

## Parallel Example: Phase 3 (US1)

```text
After T015 (useHostApi + useHarnessConfig + barrel export complete):
  → T016 EndpointList.tsx        [P] no dependency on T017
  → T017 EndpointTester.tsx      [P] no dependency on T016 (useHostApi already in T014)

After T016, T017:
  → T018 HostApiScreen.tsx       (composes T016 + T017)

After T011 (HostApiClient complete):
  → T023 ApiTestHarnessExtensions.cs  [P] .NET side, independent of React work
  → T024 ApiTestHarnessMiddleware.cs  [P] .NET side, independent of React work
```

---

## Gate Acknowledgements

- **Gate**: `analyze`
- **Concern**: `/devspark.analyze` has not been run — cross-artifact consistency between spec.md, plan.md, and tasks.md is unverified by automated tooling
- **Decision**: Proceed — plan and spec are freshly authored in this session with full consistency review; run `/devspark.analyze` before merging to main
- **Recorded By**: Mark Hazleton
- **Date**: 2026-05-29

---

- **Gate**: `critic`
- **Concern**: `/devspark.critic` adversarial risk analysis has not been run
- **Decision**: Proceed — medium risk feature with well-established patterns (Scalar/Swagger UI precedent); run `/devspark.critic` before merging to main
- **Recorded By**: Mark Hazleton
- **Date**: 2026-05-29

---

## Implementation Strategy

### MVP First (User Story 1 Only) — Recommended Starting Point

1. Complete Phase 1 (Setup) — ~4 tasks
2. Complete Phase 2 (Foundational) — ~6 tasks
3. Complete Phase 3 (US1) — ~13 tasks
4. **STOP and VALIDATE**: Run `pack.ps1`, install package in `dotnet new webapi`, confirm harness UI loads with host endpoints listed
5. If validation passes → continue to US2

### Incremental Delivery

1. Setup + Foundational → compile baseline established
2. US1 → NuGet package installable, SPA loads with endpoint discovery **(MVP)**
3. US2 → Auth and custom headers working
4. US3 → Graceful degradation confirmed, built-in examples verified
5. Polish → All gates green, package size verified

### Total Tasks

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Phase 1: Setup | 4 | 2 |
| Phase 2: Foundational | 6 | 4 |
| Phase 3: US1 (P1) | 14 | 4 |
| Phase 4: US2 (P2) | 1 | 0 |
| Phase 5: US3 (P3) | 3 | 0 |
| Phase 6: Polish | 9 | 5 |
| **Total** | **37** | **15** |

---

## Notes

- `[P]` tasks touch different files and have no dependency on incomplete sibling tasks
- `[Story]` label maps every task to its user story for traceability
- No test tasks generated — Constitution VII: no test framework in this project
- Commit after each checkpoint to maintain a clean rollback point
- Run `npm run verify` after every TypeScript file addition to catch type errors early
- `harnessConfigStore` must NOT use Zustand `persist` middleware — config is always re-fetched fresh
