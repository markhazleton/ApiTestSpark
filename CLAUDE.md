# API Test Spark — Claude Code Instructions

> **Engineering rules live in the backbone.**
> All architectural decisions, code quality gates, and MUST/MUST-NOT constraints are
> defined in `bold-docs/backbone.md`. This file covers only what is specific to
> operating Claude Code in this repository: commands, file paths, and
> task-execution guidance. Do not duplicate backbone content here.

## Project Overview

Dual-artifact repository:

- **React SPA** (`src/`) — lightweight developer tool for testing and debugging REST APIs
- **.NET NuGet library** (`ApiTestSpark/`) — embeds the SPA into any .NET 10 Minimal API via `MapApiTestSpark()`
- **Demo site** (`SampleApi/`) — live at `https://apitest.makeboldspark.com`
- **Bold framework** (`.bold/`) — spec-driven development workflows; in-flight work lives in `bold-docs/features/`, durable knowledge in `bold-docs/system/`, historical/completed work in `.archive/` (human-only — do not read it for current context)

## Tech Stack

- React 19 / TypeScript 6 / Vite 8
- Zustand 5 (persist), TanStack Query 5, Tailwind CSS 4, React Router DOM 7
- .NET 10 / ASP.NET Core Minimal API / MSTest
- No test runner for React SPA (see backbone principle 7)

## Development Commands

    .\scripts\build\dev.ps1      # Start React dev server
    .\scripts\build\build.ps1    # Production build (tsc -b + vite)
    .\scripts\build\pack.ps1     # Build SPA + pack NuGet (ApiTestSpark)
    .\scripts\lint\lint.ps1      # ESLint check
    .\scripts\lint\fix.ps1       # Auto-fix linting
    dotnet build ApiTestSpark    # Build .NET library
    dotnet test ApiTestSpark.Tests  # Run .NET integration tests

## Quality Gates (run before every merge)

1. `npm run lint` — zero ESLint errors (backbone principle 2)
2. `npm run verify` — tsc -b + vite build (backbone principle 1, canonical gate)
3. `dotnet build ApiTestSpark` — zero C# errors
4. `dotnet test ApiTestSpark.Tests` — all integration tests pass

## File Layout

| What              | Where                                  |
|-------------------|-----------------------------------------|
| React source      | `src/`                                 |
| Types             | `src/types/`                           |
| Zustand stores    | `src/store/`                           |
| Hooks             | `src/hooks/`                           |
| .NET library      | `ApiTestSpark/`                        |
| .NET tests        | `ApiTestSpark.Tests/`                  |
| Demo/promo site   | `SampleApi/`                           |
| In-flight features | `bold-docs/features/{id}/`            |
| Durable system docs | `bold-docs/system/` (decisions, release history, PR reviews, branding) |
| Backbone (rules)  | `bold-docs/backbone.md`                |
| Project genome    | `bold-docs/project.json`               |
| Bold framework    | `.bold/` (synced, do not hand-edit — see `AGENTS.md`) |
| Personal overrides | `.bold-user/{git-user}/`              |
| Historical archive | `.archive/` (human-only, never read for current context) |
| Scripts           | `scripts/build/`, `scripts/lint/`       |

## Adding a New API (all steps required — see backbone principle 3)

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

## Bold Workflow

- **Plan a feature**: `/bold-plan` → creates/updates `bold-docs/features/{id}/spec.md`, `plan.md`, `tasks.md`
- **Clarify**: `/bold-plan-clarify` — resolve underspecified areas before planning proceeds
- **Critic**: `/bold-plan-critic` — adversarial risk review of spec/plan/tasks
- **Analyze**: `/bold-plan-analyze` — cross-artifact consistency check
- **Checklist**: `/bold-plan-checklist` — generate a feature-specific checklist
- **Build**: `/bold-build` — execute the plan's tasks; `/bold-build-status` to check gate status
- **Ship**: `/bold-ship` — prep for merge; `/bold-ship-review` for PR review, `/bold-ship-address` to address review findings, `/bold-ship-harvest` to harvest a completed feature into `bold-docs/system/` and `.archive/`
- **Personalize**: `/bold-personalize` — create a personal command override under `.bold-user/{git-user}/`; `/bold-personalize-validate` to check it
- **Next**: `/bold-next` — surfaces what to do next given current repo state
- **Upgrade Bold itself**: `/bold-install` — re-syncs `.bold/` from the source manifest

## Backbone Reference

The following principles from `bold-docs/backbone.md` are blocking gates for all work:

| #    | Principle                                                      | Gate              |
|------|----------------------------------------------------------------|-------------------|
| 1    | TypeScript strict — zero errors                                | `npm run verify`  |
| 2    | ESLint only, no Prettier — zero errors                         | `npm run lint`    |
| 3    | Layer separation + barrel exports                              | Code review       |
| 4    | API client pattern — extend ApiClient, per-call, UUID          | Code review       |
| 5    | Zustand — one concern, action-gated, FIFO limits               | Code review       |
| 6    | No `console.log` in `src/` — all observability via debug store | Code review       |
| 7    | No React test framework without amendment                      | Do not add        |
| 8    | No PII/PHI in any store, type, log, or test data               | Code review       |
