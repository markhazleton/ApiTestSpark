# API Test Spark

[![NuGet](https://img.shields.io/nuget/v/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)
[![NuGet Downloads](https://img.shields.io/nuget/dt/ApiTestSpark)](https://www.nuget.org/packages/ApiTestSpark)

**NuGet**: [https://www.nuget.org/packages/ApiTestSpark](https://www.nuget.org/packages/ApiTestSpark)
**Live Site**: [https://apitest.makeboldspark.com](https://apitest.makeboldspark.com)

A React + TypeScript developer tool for testing and debugging REST APIs, embedded in the [ApiTestSpark NuGet package](ApiTestSpark/README.md) for drop-in use in any .NET 10 Minimal API.

## About

API Test Spark ships as a NuGet package that embeds the full React SPA into any .NET 10 Minimal API with a single method call — `MapApiTestSpark()`. The live demo runs at [https://apitest.makeboldspark.com](https://apitest.makeboldspark.com).

> Built by [Mark Hazleton](https://markhazleton.com) — Mark Hazleton, Solutions Architect
> ApiTestSpark is part of the [Make Bold Spark](https://makeboldspark.com) portfolio of technical demonstrations.

## What It Does

- **Autodiscovers** your OpenAPI v3 endpoints and renders them in a collapsible accordion grouped by tag (e.g. `"Products: Catalog"` → `Products > Catalog`)
- **Tests** any endpoint interactively — path params, query params, JSON body scaffold pre-filled from schema defaults, auth token injection
- **Surfaces full OpenAPI metadata** — operation descriptions rendered as markdown, response codes as coloured badges with expandable schemas, `operationId`, field constraints, default values, nullable hints
- **Generates API documentation** via the API Doc Builder (`/api-docs`) — capture live curl + responses, annotate sections, export markdown for front-end developer agents
- **Captures** every request, response, and error in a live resizable debug panel with cURL snippet generation and performance metrics
- **Demonstrates** the pattern with built-in reference integrations: **JokeAPI** at `/joke-api` and **JsonPlaceholder** at `/json-placeholder`

## Quick Start

```powershell
.\scripts\build\dev.ps1
```

Open [http://localhost:5151](http://localhost:5151) in your browser.

## Key Capabilities

### Endpoint Explorer (`/host-api`)

- Collapsible accordion groups from OpenAPI tags — `"Namespace: Label"` format splits into two levels
- Real-time search filter across path, method, summary, and tags
- Expand/collapse all controls; groups start collapsed when 3 or more are present
- Full markdown rendering of operation descriptions (bold, italic, code, fenced blocks, tables)
- All documented response codes shown as coloured badges; click to expand the response schema inline
- `operationId` displayed as a copyable chip
- Schema property tables with type, format, required, default, nullable, min/max constraints
- JSON body scaffold pre-filled from `example → default → enum[0] → type placeholder`
- Response rendering: arrays as sortable tables, objects as editable forms, primitives as pre blocks
- API info header showing title, version, contact, and license from the OpenAPI `info` block

### API Doc Builder (`/api-docs`)

- Select any combination of endpoints from the accordion
- ▲ ▼ reorder sections; add prose annotations per section
- "Capture Live Response" fires the actual request and stores the exact curl command + response
- Preview tab shows rendered markdown alongside raw markdown textarea
- Export as a `.md` file or copy to clipboard
- Generated document structure: audience callout, table of contents, per-endpoint sections with parameter tables, schema tables, response code tables, and fenced curl + JSON examples

### Debug Panel

- Always-on side panel capturing requests, responses, performance metrics, and errors
- cURL snippet generation for every captured request
- Performance metrics: average latency, success rate, total request count
- FIFO buffers: 50 requests/responses/errors, 100 metrics
- Panel width is drag-resizable; collapse toggle persists in localStorage

### Reference Integrations

- **JokeAPI** (`/joke-api`) — JokeAPI v2 with category, type, language, and content filters
- **JSONPlaceholder** (`/json-placeholder`) — JSONPlaceholder CRUD operations

## Technology Stack

- **React 19** with TypeScript 5.x
- **React Router DOM 7** for client-side routing
- **Zustand 5** with persist middleware for config, auth, harness config, and debug state
- **TanStack Query 5** mutations for API orchestration
- **Tailwind CSS 4** utility-first styles
- **Vite 8** build tooling
- **Application Insights** (optional — disabled when connection string is empty)

## Prerequisites

- Node.js 20.19 or later
- npm (bundled with Node.js)

## Getting Started

```bash
npm install
npm run dev
```

PowerShell helpers under `scripts/` for Windows:

- `.\scripts\build\dev.ps1` — start dev server
- `.\scripts\build\build.ps1` — production build
- `.\scripts\build\pack.ps1` — build SPA + pack NuGet
- `.\scripts\lint\lint.ps1` — ESLint
- `.\scripts\lint\fix.ps1` — auto-fix linting

## Project Structure

```
src/
├── api/
│   ├── client.ts               # Base ApiClient + executeRequest
│   ├── hostApiClient.ts        # Host API client (config fetch)
│   ├── jokeApiClient.ts        # JokeAPI reference client
│   ├── jsonPlaceholderClient.ts
│   └── index.ts
├── components/
│   ├── HomeScreen.tsx          # Navigation dashboard
│   ├── HowToUseScreen.tsx
│   ├── AboutScreen.tsx
│   ├── DebugPanel.tsx          # Request/response inspector
│   ├── Header.tsx / Footer.tsx / ErrorBoundary.tsx
│   ├── api-doc/
│   │   └── ApiDocScreen.tsx    # API Doc Builder (/api-docs)
│   ├── host-api/
│   │   ├── HostApiScreen.tsx   # Endpoint explorer (/host-api)
│   │   ├── EndpointList.tsx    # Collapsible accordion
│   │   └── EndpointTester.tsx  # Request/response form
│   ├── joke-api/
│   └── json-placeholder/
├── hooks/
│   ├── useHarnessConfig.ts     # Fetches /api-test-spark/config + OpenAPI doc
│   ├── useHostApi.ts           # TanStack mutation for host endpoint requests
│   ├── useJokeApi.ts
│   ├── useJsonPlaceholder.ts
│   └── index.ts
├── store/
│   ├── unifiedConfigStore.ts   # Per-section, per-environment API config (persisted)
│   ├── authStore.ts            # Auth token state (persisted)
│   ├── debugStore.ts           # Request/response/metric/error buffers (enabled flag persisted)
│   ├── harnessConfigStore.ts   # OpenAPI config + endpoints + apiInfo (session only)
│   └── index.ts
├── types/
│   ├── api.ts                  # ApiRequest, ApiResponse, PerformanceMetrics
│   ├── host-api.ts             # DiscoveredEndpoint, HarnessConfig, ApiInfo, ResponseCode
│   ├── api-doc.ts              # DocEntry, CapturedCall, ApiDoc
│   ├── state.ts                # Store state shapes
│   └── index.ts
├── utils/
│   ├── openApiParser.ts        # OpenAPI v3 parser + buildJsonScaffold + parseApiInfo
│   ├── renderMarkdown.tsx      # Lightweight markdown renderer (bold/italic/code/tables/fences)
│   ├── generateMarkdown.ts     # API Doc Builder markdown generator + buildCurlCommand
│   ├── appInsights.ts          # Application Insights (opt-in)
│   ├── branding.ts
│   ├── session.ts / storage.ts / errorMessages.ts
│   └── index.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Adding a New API Integration

1. **Types** → `src/types/my-api.ts` + re-export from `src/types/index.ts`
2. **Client** → `src/api/myApiClient.ts` extending `ApiClient` + re-export from `src/api/index.ts`
3. **Hook** → `src/hooks/useMyApi.ts` with TanStack `useMutation` + re-export from `src/hooks/index.ts`
4. **Screen** → `src/components/my-api/MyApiScreen.tsx` + barrel `index.ts` + re-export from `src/components/index.ts`
5. **Route** → add route in `src/App.tsx`
6. **Nav** → add card to `SECTIONS` in `src/components/HomeScreen.tsx`

## Development Scripts

```bash
npm run dev           # Start development server
npm run lint          # ESLint check
npm run typecheck     # tsc -b
npm run build         # Full production bundle
npm run verify        # typecheck + build (quality gate)
npm run build:full    # clean + verify
npm run preview       # Preview production build locally
```

## Troubleshooting

- **Connection failures**: confirm base URL is reachable, check the debug panel for the failing request/response.
- **Config not persisting**: ensure localStorage is allowed. Clearing `api-test-spark-config` resets to defaults.
- **Build problems**: run `npm run verify` locally first; if dependency state looks suspect run `npm run clean:full && npm install`.

## Security Considerations

- API keys are only base64-obfuscated in localStorage; treat the browser as an untrusted environment.
- This tool is intended for developer workstations. Use `options.Environments = ["Development"]` to prevent it loading in production.

## Browser Support

Modern evergreen browsers that support React 19 and the Fetch API.
