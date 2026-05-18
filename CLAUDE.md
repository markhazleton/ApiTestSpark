# API Test Harness - Claude Code Instructions

Practical guidance for Claude Code. Keep in sync with .github/copilot-instructions.md.

## Project Overview

Lightweight React + TypeScript developer tool for testing and debugging REST APIs. Includes a working JokeAPI integration as a reference implementation. Prioritize simplicity and fast iteration.

## Tech Stack

- React 19 / TypeScript 5.x / Vite 8
- Zustand 5 (persist), TanStack Query 5, Tailwind CSS 4, React Router DOM 7
- No test runner -- quality gates are type-check + lint + build

## Development Commands

    .\scripts\build\dev.ps1      # Start dev server
    .\scripts\build\build.ps1    # Production build
    .\scripts\lint\lint.ps1      # ESLint check
    .\scripts\lint\fix.ps1       # Auto-fix linting

## Quality Gates

1. npm run lint
2. npm run verify -- tsc -b + vite build (canonical gate)

## File Organization

| What | Where |
|------|-------|
| Source code | src/ |
| Types | src/types/ |
| Stores (Zustand) | src/store/ |
| Hooks | src/hooks/ |
| Feature specs | .documentation/specs/ |
| Scripts | scripts/build/, scripts/lint/ |

Barrel Exports required: src/store/index.ts, src/types/index.ts, src/components/index.ts, src/hooks/index.ts

## Architecture Rules

- Stores: useUnifiedConfigStore, useDebugStore, useAuthStore -- each owns a focused concern
- Never mutate Zustand state directly -- always use store actions
- Hook layer owns API orchestration, not components
- API clients created per-call with debug callbacks (onRequest, onResponse, onError)
- Every request gets a UUID for correlation across request/response/error
- TanStack Query mutations for all API calls with performance tracking

## Environment Configuration

Three environments with independent base URL + API key:

| Environment | Purpose |
|-------------|---------|
| localhost | Local API development |
| tst2 | Secondary environment |
| other | Custom endpoint |

Persisted in localStorage via Zustand persist middleware.

## Adding a New API (follow the JokeAPI pattern)

1. Types -> src/types/my-api.ts + re-export from src/types/index.ts
2. Client -> src/api/myApiClient.ts extending ApiClient + re-export from src/api/index.ts
3. Hook -> src/hooks/useMyApi.ts with TanStack useMutation + re-export from src/hooks/index.ts
4. Screen -> src/components/my-api/MyApiScreen.tsx + barrel index.ts + re-export from src/components/index.ts
5. Route -> add route in src/App.tsx
6. Nav -> add card to SECTIONS in src/components/HomeScreen.tsx

## Store Persistence

| Store | Persisted | Key |
|-------|-----------|-----|
| unifiedConfigStore | Yes | api-test-harness-config |
| authStore | Config only | api-test-harness-auth-config |
| debugStore | Enabled flag only | api-test-harness-debug |

Debug buffer limits: 50 requests/responses, 100 metrics (FIFO).

## What NOT To Do

- Do not add test frameworks
- Do not use webpack, create-react-app, or class components
- Do not place AI-generated docs in root -- use .documentation/
- Do not add Prettier (ESLint only)
- Do not skip barrel export updates when adding new files
- Do not commit major dependency bumps in batched updates