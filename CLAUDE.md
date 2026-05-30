# API Test Spark — Claude Code Instructions

> **Engineering rules live in the constitution.**
> All architectural decisions, code quality gates, and MUST/MUST-NOT constraints are
> defined in `.documentation/memory/constitution.md`. This file covers only what is
> specific to operating Claude Code in this repository: commands, file paths, and
> task-execution guidance. Do not duplicate constitution content here.

## Project Overview

Dual-artifact repository:

- **React SPA** (`src/`) — lightweight developer tool for testing and debugging REST APIs
- **.NET NuGet library** (`ApiTestSpark/`) — embeds the SPA into any .NET 10 Minimal API via `MapApiTestSpark()`
- **Demo site** (`SampleApi/`) — live at `https://apitest.makeboldspark.com`
- **DevSpark framework** (`.devspark/`) — spec-driven development workflows; commands resolved via `.documentation/`

## Tech Stack

- React 19 / TypeScript 5.x / Vite 8
- Zustand 5 (persist), TanStack Query 5, Tailwind CSS 4, React Router DOM 7
- .NET 10 / ASP.NET Core Minimal API / MSTest
- No test runner for React SPA (see Constitution VII)

## Development Commands

    .\scripts\build\dev.ps1      # Start React dev server
    .\scripts\build\build.ps1    # Production build (tsc -b + vite)
    .\scripts\build\pack.ps1     # Build SPA + pack NuGet (ApiTestSpark)
    .\scripts\lint\lint.ps1      # ESLint check
    .\scripts\lint\fix.ps1       # Auto-fix linting
    dotnet build ApiTestSpark    # Build .NET library
    dotnet test ApiTestSpark.Tests  # Run .NET integration tests

## Quality Gates (run before every merge)

1. `npm run lint` — zero ESLint errors (Constitution II)
2. `npm run verify` — tsc -b + vite build (Constitution I, canonical gate)
3. `dotnet build ApiTestSpark` — zero C# errors
4. `dotnet test ApiTestSpark.Tests` — all integration tests pass

## File Layout

| What              | Where                                                    |
|-------------------|----------------------------------------------------------|
| React source      | `src/`                                                   |
| Types             | `src/types/`                                             |
| Zustand stores    | `src/store/`                                             |
| Hooks             | `src/hooks/`                                             |
| .NET library      | `ApiTestSpark/`                                          |
| .NET tests        | `ApiTestSpark.Tests/`                                    |
| Demo/promo site   | `SampleApi/`                                             |
| Feature specs     | `.documentation/specs/`                                  |
| Constitution      | `.documentation/memory/constitution.md`                  |
| DevSpark commands | `.devspark/` (framework) + `.documentation/` (overrides) |
| Scripts           | `scripts/build/`, `scripts/lint/`                        |

## Adding a New API (all steps required — see Constitution III)

1. `src/types/my-api.ts` + re-export from `src/types/index.ts`
2. `src/api/myApiClient.ts` extending `ApiClient` + re-export from `src/api/index.ts`
3. `src/hooks/useMyApi.ts` with `useMutation` + re-export from `src/hooks/index.ts`
4. `src/components/my-api/MyApiScreen.tsx` + `index.ts` barrel + re-export from `src/components/index.ts`
5. Route in `src/App.tsx`
6. Nav card in `SECTIONS` in `src/components/HomeScreen.tsx`

## NuGet Package Workflow

- `pack.ps1` is the only correct way to pack — sets `VITE_BASE_PATH=/api-test-spark/`, runs `npm audit`, builds React, then `dotnet pack`
- Changes to `MapApiTestSpark`, `ApiTestSparkOptions`, or `ApiTestSparkExtensions` require updating `PublicAPI.Shipped.txt` and a semver decision (`SEMVER: MAJOR` or `SEMVER: MINOR` in the PR title)
- `VITE_BASE_PATH` unset = standalone build at `/`; set to `/api-test-spark/` = NuGet embedded build

## DevSpark Workflow

- **Spec**: `/devspark.specify` → `.documentation/specs/###-feature-name/spec.md`
- **Plan**: `/devspark.plan` → `plan.md` in the same folder
- **Tasks**: `/devspark.tasks` → `tasks.md`
- **Implement**: `/devspark.implement`
- **Audit**: `/devspark.site-audit` — validates compliance against the constitution
- **Amend constitution**: `/devspark.evolve-constitution` after PR review findings

## Constitution Reference

The following principles from `.documentation/memory/constitution.md` are blocking gates for all work:

| #    | Principle                                                      | Gate              |
|------|----------------------------------------------------------------|-------------------|
| I    | TypeScript strict — zero errors                                | `npm run verify`  |
| II   | ESLint only, no Prettier — zero errors                         | `npm run lint`    |
| III  | Layer separation + barrel exports                              | Code review       |
| IV   | API client pattern — extend ApiClient, per-call, UUID          | Code review       |
| V    | Zustand — one concern, action-gated, FIFO limits               | Code review       |
| VI   | No `console.log` in `src/` — all observability via debug store | Code review       |
| VII  | No React test framework without amendment                      | Do not add        |
| VIII | No PII/PHI in any store, type, log, or test data               | Code review       |
