# API Test Harness

A lightweight React + TypeScript developer tool for testing and debugging REST APIs with real-time request inspection.

## What It Does

- Sends requests to any REST API and captures every request, response, and error in a live debug panel
- Configures independent base URLs and API keys per environment (localhost, tst2, other)
- Demonstrates the pattern with a working **JokeAPI** integration at `/joke-api`

## Quick Start

```powershell
.\scripts\build\dev.ps1
```

Open [http://localhost:5151](http://localhost:5151) in your browser.

## Key Capabilities

### Multi-Environment Configuration

- Configure independent base URLs and API keys for `localhost`, `tst2`, and `other` environments
- Settings persist in `localStorage` via Zustand persist middleware
- Environment selector available on the Configuration screen (`/config`)

### JokeAPI Reference Integration

- Fetch jokes from the public JokeAPI v2 with category, type, language, and content filters
- Demonstrates the full API client → hook → screen pattern
- All requests captured automatically in the debug panel

### Debug Panel

- Always-on side panel capturing requests, responses, performance metrics, and errors
- Summary tiles show average latency, success rate, and total request count
- Tabs: **Requests** (latest 50), **Responses** (latest 50), **Metrics** (latest 100), **Errors**
- cURL snippet generation for every request
- Toggle open/closed via floating button; panel width is drag-resizable
- Only the enabled flag persists in localStorage — telemetry resets on page reload

## Technology Stack

- **React 19** with TypeScript 5.x
- **React Router DOM 7** for client-side routing
- **Zustand 5** with persist middleware for config, auth, and debug state
- **TanStack Query 5** mutations for API orchestration
- **Tailwind CSS 4** utility-first styles
- **Vite** build tooling
- **Application Insights** (optional — disabled when `CONNECTION_STRING` is empty)

## Prerequisites

- Node.js 20.19 or later
- npm (bundled with Node.js)

## Getting Started

```bash
# Install dependencies
npm install

# Launch the Vite dev server
npm run dev
```

PowerShell helpers are available under `scripts/` for Windows:

- `.\scripts\build\dev.ps1` — start dev server
- `.\scripts\build\build.ps1` — production build (runs `tsc -b` first)
- `.\scripts\lint\lint.ps1` — ESLint
- `.\scripts\lint\fix.ps1` — auto-fix linting issues

## Project Structure

```
src/
├── api/
│   ├── client.ts           # Base ApiClient class
│   ├── jokeApiClient.ts    # JokeAPI client (reference implementation)
│   └── index.ts
├── components/
│   ├── HomeScreen.tsx      # Navigation dashboard
│   ├── HowToUseScreen.tsx  # Usage documentation
│   ├── AboutScreen.tsx     # About page
│   ├── UnifiedConfigurationScreen.tsx
│   ├── DebugPanel.tsx      # Request/response inspector
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── ErrorBoundary.tsx
│   ├── joke-api/
│   │   └── JokeApiScreen.tsx
│   └── index.ts
├── hooks/
│   ├── useJokeApi.ts       # TanStack mutation for JokeAPI
│   ├── useConfig.ts
│   ├── useAuth.ts
│   ├── useTrackedMutation.ts
│   └── index.ts
├── store/
│   ├── unifiedConfigStore.ts
│   ├── debugStore.ts
│   ├── authStore.ts
│   └── index.ts
├── types/
│   ├── api.ts
│   ├── joke-api.ts
│   ├── auth.ts
│   ├── state.ts
│   └── index.ts
├── utils/
│   ├── appInsights.ts      # Application Insights (opt-in)
│   ├── branding.ts
│   ├── exporters.ts
│   ├── session.ts
│   ├── storage.ts
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Adding a New API

Follow the JokeAPI pattern:

1. **Types** → `src/types/my-api.ts` + re-export from `src/types/index.ts`
2. **Client** → `src/api/myApiClient.ts` extending `ApiClient` + re-export from `src/api/index.ts`
3. **Hook** → `src/hooks/useMyApi.ts` with TanStack `useMutation` + re-export from `src/hooks/index.ts`
4. **Screen** → `src/components/my-api/MyApiScreen.tsx` + barrel `index.ts` + re-export from `src/components/index.ts`
5. **Route** → add route in `src/App.tsx`
6. **Nav** → add entry to `SECTIONS` array in `src/components/HomeScreen.tsx`

## Development Scripts

```bash
npm run dev           # Start development server
npm run lint          # ESLint check
npm run typecheck     # tsc --noEmit
npm run build         # Full production bundle
npm run verify        # typecheck + build (quality gate)
npm run build:full    # clean + verify
npm run build:release # version bump + clean + verify
npm run preview       # Preview production build locally
```

## Troubleshooting

- **Connection failures**: confirm the base URL and API key on the Configuration screen, then open the Debug panel to inspect the failing request/response.
- **Configuration not persisting**: ensure browser localStorage is allowed. Clearing `localStorage` key `api-test-harness-config` resets environments to defaults.
- **Debug panel missing data**: verify debug mode is enabled (toggle bottom-right). Telemetry resets on page reload.
- **Build problems**: run `npm run verify` locally first. If dependency state looks suspect, run `npm run clean:full` then `npm install`.

## Security Considerations

- API keys are only base64-obfuscated in `localStorage`; treat the browser as an untrusted environment.
- Prefer environment-specific keys, HTTPS for non-local environments, and routine key rotation.
- This tool has no authentication layer and is intended for developer workstations only.

## Browser Support

Modern evergreen browsers that support React 19 and the Fetch API.
