# Release Notes — v1.6.0

**Release Date:** June 20, 2026

## Summary

v1.6.0 is a patch release that improves branding consistency, fixes CSP logo rendering, enhances credential display with user-name token expansion, and updates package references to the latest Microsoft.AspNetCore.OpenApi and Microsoft.OpenApi versions.

## Changes

### Added

- **User-name token expansion** — profiles and request templates now expand `{userName}` tokens at request time, enabling personalized header and body content for multi-user environments.
- **SampleApi publish package** — added a dedicated SampleApi publish output package for simplified deployment workflows.

### Fixed

- **CSP logo rendering** — resolved Content Security Policy violations preventing inline logo rendering in the harness UI.
- **Base-path build-info fetches** — fixed fetch requests for build metadata when the app is deployed at a non-root base path (e.g., `/api-test-spark/`).

### Changed

- **Package reference updates** — upgraded Microsoft.AspNetCore.OpenApi and Microsoft.OpenApi to the latest stable versions for improved OpenAPI v3 compatibility and maintenance.
- **Make Bold branding metadata** — aligned branding icons and metadata across all delivered assets for consistent product identity.

## Breaking Changes

None. This is a fully backwards-compatible patch release.

## Contributors

- Mark Hazleton

## Quality Assurance

- ✅ All 30 integration tests pass
- ✅ Zero TypeScript compilation errors (strict mode)
- ✅ Zero ESLint violations
- ✅ Zero markdownlint violations
- ✅ Package successfully builds and embeds React SPA

## Upgrade Path

Upgrade from v1.5.0 by updating your `package.json` or `.csproj` dependency:

**NuGet CLI:**

```powershell
dotnet add package ApiTestSpark --version 1.6.0
```

**Manual in .csproj:**

```xml
<PackageReference Include="ApiTestSpark" Version="1.6.0" />
```

No configuration changes required — API unchanged.

## Download

- **NuGet Package:** [ApiTestSpark v1.6.0](https://www.nuget.org/packages/ApiTestSpark/1.6.0)
- **GitHub Release:** [v1.6.0](https://github.com/MarkHazleton/ApiTestSpark/releases/tag/v1.6.0)
