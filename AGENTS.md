# AGENTS.md

## DevSpark

- DevSpark framework files live in `.devspark/`.
- Project artifacts and team overrides live in `.documentation/`.
- Resolve DevSpark commands through the first existing file:
  1. `.documentation/{git-user}/commands/devspark.{name}.md`
  2. `.documentation/commands/devspark.{name}.md`
  3. `.devspark/defaults/commands/devspark.{name}.md`
- Preserve user work in `.documentation/`; upgrades refresh `.devspark/` only.

## Active Technologies

- TypeScript 6.0 strict, React 19, .NET 10 / C# for Minimal API package + React Router, TanStack Query, Zustand persist middleware, uuid, ASP.NET Core Minimal APIs, MSTes (001-remote-api-list)
- Browser `localStorage` via Zustand persist key `api-test-spark-remote-config`; server defaults from `MapApiTestSpark` options (001-remote-api-list)

## Recent Changes

- 001-remote-api-list: Added TypeScript 6.0 strict, React 19, .NET 10 / C# for Minimal API package + React Router, TanStack Query, Zustand persist middleware, uuid, ASP.NET Core Minimal APIs, MSTes
