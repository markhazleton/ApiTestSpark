# Release Notes — v2.1.0

**Release Date:** 2026-09-23
**Version Bump:** Minor (2.0.1 → 2.1.0)
**Contributors:** Mark Hazleton
**Pull Requests:** [#10](https://github.com/MarkHazleton/ApiTestSpark/pull/10), [#9](https://github.com/MarkHazleton/ApiTestSpark/pull/9)

---

## Headline

**Package and security maintenance.** CI had been failing on every run: a high-severity `npm audit` finding (`browserslist`) and a NuGet audit failure (`Microsoft.Build.Tasks.Git` via SourceLink) blocked the build. This release clears both, brings every .NET dependency current, adds CodeQL scanning, and improves how the SPA reads OAS 3.1 documents (the .NET 10 default output).

---

## Fixed

- **NuGet audit failure** — `Microsoft.SourceLink.GitHub` 10.0.301 → 10.0.401 (transitive `Microsoft.Build.Tasks.Git`, CVE-2026-62900). Build-time only.
- **npm audit alerts** — lockfile-only updates: `browserslist` 4.29.0, `baseline-browser-mapping` 2.11.25, `@humanfs/node` 0.16.8, `autoprefixer` 10.6.1 (Dependabot #11, #13, #14). Build/lint tooling only; nothing in the SPA bundle.
- **OAS 3.1 `examples`** — `openApiParser` falls back to `examples[0]` when `example` is absent.
- **OAS 3.1 nullables** — `oneOf`/`anyOf` wrappers with a `{ type: 'null' }` branch are marked nullable.

## Changed

- `pack.ps1` audit gate now fails on high-severity findings, matching CI.
- New CodeQL workflow (C#, JS/TS, Actions).
- SampleApi: `Microsoft.AspNetCore.OpenApi` 10.0.12, `Microsoft.OpenApi` 2.12.2 (held on 2.x — 3.x breaks the .NET 10 XML-comment generator).
- Tests: `Mvc.Testing` 10.0.12, `Test.Sdk` 18.10.1, MSTest 4.4.1.
- SampleApi build warnings eliminated (`ASPDEPR002`, `CS8602`).
- `OPENAPI-DOTNET.md` September 2026 revision.

---

## Public API Changes

None. `PublicAPI.Unshipped.txt` is empty.

---

## Repository Cleanup

- Deleted merged branch `fix/deps-security-2026-09` (PR #10), local and remote.
- Abandoned feature `0001-tauri-desktop-build` (Tauri desktop wrapper, spec only, never merged) — branch deleted local and remote; the feature will not move forward.

---

## Quality Gates

| Gate | Result |
|------|--------|
| `npm run lint` | ✓ Pass |
| `npm run verify` (tsc + vite build) | ✓ Pass |
| `dotnet build ApiTestSpark` | ✓ Pass — 0 errors, 0 warnings |
| `dotnet build SampleApi` | ✓ Pass — 0 errors, 0 warnings |
| `dotnet test ApiTestSpark.Tests` | ✓ Pass — 53/53 |
| `pack.ps1` | ✓ Pass — 0.50 MB `.nupkg`, 19.4 KB `.snupkg` |
