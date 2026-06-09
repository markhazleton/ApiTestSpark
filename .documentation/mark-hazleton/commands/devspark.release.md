<!-- 
  Personalized prompt for: mark-hazleton
  Based on: .devspark/defaults/commands/devspark.release.md
  Created: 2026-06-06

  This file takes priority over team and stock defaults when you run /devspark.release.
  Edit freely. To revert, delete this file.

  ApiTestSpark-specific additions (v1.3.0 session learnings):
  - CI/CD auto-publishes to NuGet.org on v*.*.* tag push — no manual push needed
  - Full version-bump checklist for this dual-artifact repo
  - SampleApi home page is inline HTML in a C# file — must be updated manually
  - markdownlint excludes .claude/**, .devspark/**, .github/**
-->

---
description: Seal a release — version-stamp, generate CHANGELOG and release notes, create ADRs, and archive completed specs into the releases directory
handoffs:

- label: Run Post-Release Harvest
  agent: devspark.harvest
  prompt: Clean up stale docs, rewrite spec-linked comments, and archive to .archive/ after the release is complete
- label: Run Final Audit
  agent: devspark.site-audit
  prompt: Run a final site audit before release

---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Overview

This command seals a release by:

1. Archiving completed specs and quickfixes into `/.documentation/releases/v{VERSION}/`
2. Distilling key architectural decisions into ADRs under `/.documentation/decisions/`
3. Generating a versioned CHANGELOG entry and release notes
4. Bumping the version in **all** source files and public-facing docs (see Step 9 — ApiTestSpark-specific list)
5. Leaving a clean `/.documentation/specs/` ready for the next cycle

**Scope boundary**: `/devspark.release` archives into `/.documentation/releases/` only. It does **not** move files to `/.archive/`, rewrite code comments, or clean up stale docs — those are `/devspark.harvest` responsibilities. Run harvest after release to complete the cleanup cycle.

**IMPORTANT**: This command modifies documentation files. Use `--dry-run` to preview changes before committing.

## Prerequisites

- Git repository with version tags (recommended)
- Completed feature specs in `/.documentation/specs/`
- Quickfixes in `/.documentation/quickfixes/` (optional)

## Options

Parse `$ARGUMENTS` for options:

| Option | Description |
|--------|-------------|
| `{version}` | Explicit version (e.g., `2.0.0` or `v2.0.0`) |
| `--from <date>` | Override the release window start date (`YYYY-MM-DD`) |
| `--dry-run` | Preview changes without writing files |

## Outline

### 1. Initialize Release Context

> **Script Resolution**: Before running `.devspark/scripts/powershell/release-context.ps1 $ARGUMENTS -Json`, apply the 2-tier override check — if `.documentation/scripts/powershell/<filename>` (PowerShell) or `.documentation/scripts/bash/<filename>` (Bash) exists on disk, run that file instead, preserving all arguments. Team overrides in `.documentation/scripts/` always take priority over `.devspark/scripts/`.

Run `.devspark/scripts/powershell/release-context.ps1 $ARGUMENTS -Json` to gather context and parse JSON output for:

- `REPO_ROOT`: Repository root path
- `SPECS_DIR`: Path to specs directory
- `RELEASES_DIR`: Path to releases archive
- `QUICKFIX_DIR`: Path to quickfixes directory
- `DECISIONS_DIR`: Path to ADR directory
- `CURRENT_VERSION`: Current version from `package.json` (canonical for this repo)
- `VERSION_SOURCE`: `package.json`
- `NEXT_VERSION`: Proposed next version
- `VERSION_BUMP`: Type of bump (major/minor/patch)
- `RELEASE_FROM`: Start date for the release window
- `RELEASE_TO`: End date for the release window
- `COMPLETED_SPECS`: List of specs ready for archival
- `STATUS_INCONSISTENT_SPECS`: Specs where all tasks are checked but `**Status**:` in spec.md is not `Complete`
- `PENDING_SPECS`: List of incomplete specs
- `QUICKFIXES`: List of quickfixes since last release
- `LAST_TAG`: Most recent git tag
- `LAST_RELEASE_DATE`: Date of last release
- `COMMITS_SINCE_RELEASE`: Commit count since last release
- `BASE_SHA`: Resolved full commit SHA of `LAST_TAG`
- `HEAD_SHA`: Resolved full commit SHA of `HEAD` at release time
- `CONTRIBUTORS`: List of contributors
- `MERGED_PR_NUMBERS`: Pull request numbers detected in the release window
- `MERGED_PR_COUNT`: Number of merged PRs detected in the release window
- `PR_REVIEW_SUMMARY`: Aggregated PR review stats
- `DRY_RUN`: Whether this is a preview run

### 2. Version Confirmation

Display proposed version:

```markdown
## Release Version

- **Current Version**: {CURRENT_VERSION} (from package.json)
- **Proposed Version**: {NEXT_VERSION} ({VERSION_BUMP} bump)
- **Release Window**: {RELEASE_FROM} → {RELEASE_TO}
- **Reason**: {N} completed specs, {M} quickfixes

Confirm this version or provide explicit version:
- To accept: continue
- To change: `/devspark.release {version}`
```

**Version Bump Logic:**

| Content | Bump Type | Example |
|---------|-----------|---------|
| Completed feature specs | Minor | 1.2.4 → 1.3.0 |
| Quickfixes only | Patch | 1.2.4 → 1.2.5 |
| Breaking changes in specs | Major | 1.2.4 → 2.0.0 |

### 3. Classify Artifacts

#### A. Completed Specs (Ready for Archive)

For each spec in COMPLETED_SPECS:

- Verify the `**Status**:` field in `spec.md` is `Complete`
- Verify all tasks are checked in `tasks.md`
- Confirm associated PR merged (if trackable)
- If tasks are all checked but `**Status**:` is not `Complete`: update the status field to `Complete` now
- If `**Status**:` is `Draft` or `In Progress` and tasks are incomplete: move to Pending Specs (section B)

#### B. Pending Specs (Keep Active)

For each spec in PENDING_SPECS:

- Keep in `/.documentation/specs/`
- Note as "Deferred to next release"
- Include in release notes as "Coming Soon"

#### C. Quickfixes

All quickfixes in QUICKFIXES:

- Archive to release directory
- Include in CHANGELOG under "Fixed"

### 4. Extract Architectural Decisions

For each completed spec, analyze `research.md` and `plan.md` for ADR-worthy decisions:

**ADR Criteria:**

- Technology stack choices (frameworks, databases, libraries)
- Architecture pattern decisions (microservices, event-driven, etc.)
- Security or compliance decisions
- Performance trade-offs
- Integration approaches

**Skip:**

- Implementation details
- Bug fixes
- Minor configuration choices

For each identified decision, create ADR at `/.documentation/decisions/ADR-{NNN}.md`.

### 5. Generate CHANGELOG Entry

Create or update `CHANGELOG.md` at repository root.

- Insert new entry at the top (after header)
- Preserve existing entries
- Update comparison link for new version
- Update `[Unreleased]` link to compare from new tag

### 6. Create Release Archive

Create directory structure at `/.documentation/releases/v{NEXT_VERSION}/`.

### 7. Generate Release Notes

Create `/.documentation/releases/v{NEXT_VERSION}/release-notes.md`.

### 8. Generate Metrics JSON

Create `/.documentation/releases/v{NEXT_VERSION}/metrics.json`.

### 9. Bump Version in Source Files — ApiTestSpark Checklist

**IMPORTANT — This repo is a dual-artifact repo (React SPA + .NET NuGet).** The canonical version lives in `package.json`. Both artifacts must stay in sync on every release. **Skip if DRY_RUN.**

Update **all** of the following in a single pass:

#### A. `package.json` (canonical version source)

```json
"version": "{NEXT_VERSION}"
```

#### B. `ApiTestSpark/ApiTestSpark.csproj`

Update the `<Version>` element:

```xml
<Version>{NEXT_VERSION}</Version>
```

Also update `<PackageReleaseNotes>` to summarize the headline features of this release, and update `<Description>` if any new major capability was added.

#### C. PublicAPI.Shipped.txt (MINOR and MAJOR releases)

File: `ApiTestSpark/PublicAPI.Shipped.txt`

After any MINOR or MAJOR release that adds new public properties to `ApiTestSparkOptions`, update this file to reflect the full current public API surface. The file must list every public member in `ApiTestSparkOptions` and `ApiTestSparkExtensions`.

To get the current surface: read `ApiTestSpark/ApiTestSparkOptions.cs` and count all public properties — the shipped.txt must match exactly.

If any new public members were added in this release and shipped.txt does not list them, add them now. Entries follow this exact format (property has both `.get` and `.set` lines; static methods have one line):

```text
#nullable enable
ApiTestSpark.ApiTestSparkOptions
ApiTestSpark.ApiTestSparkOptions.SomeProperty.get -> string?
ApiTestSpark.ApiTestSparkOptions.SomeProperty.set -> void
static ApiTestSpark.ApiTestSparkExtensions.MapApiTestSpark(this Microsoft.AspNetCore.Builder.WebApplication! app, System.Action<ApiTestSpark.ApiTestSparkOptions!>? configure = null) -> Microsoft.AspNetCore.Builder.WebApplication!
```

**PATCH releases**: If no new public members were added, shipped.txt is unchanged.

#### D. Verify version consistency

Confirm these sources agree on `{NEXT_VERSION}` before tagging:

| Source | Expected Value |
|--------|----------------|
| `package.json` → `version` | `{NEXT_VERSION}` |
| `ApiTestSpark/ApiTestSpark.csproj` → `<Version>` | `{NEXT_VERSION}` |
| `CHANGELOG.md` top entry | `## [v{NEXT_VERSION}]` |
| Git tag (to be created) | `v{NEXT_VERSION}` |

If any are out of sync, fix before tagging.

### 10. Update Public-Facing Content — ApiTestSpark Full Checklist

After bumping version (Step 9), update **all** public documents and the live demo site. **Skip if DRY_RUN** — but list every file that would change.

#### A. Root `README.md`

| Section | What to update |
|---------|----------------|
| Package Details table | Version field: `{NEXT_VERSION}`, Last Updated date |
| Demo site sentence | "ApiTestSpark v{NEXT_VERSION} installed" |
| How It Works | Add any new registered endpoints/capabilities |
| Release Notes section | Prepend new `### v{NEXT_VERSION}` entry before previous version |

#### B. `ApiTestSpark/README.md` (NuGet package README)

| Section | What to update |
|---------|----------------|
| Features list | Add any new features |
| Options reference table | Add rows for any new `ApiTestSparkOptions` properties |
| Code examples | Update version references; add examples for new options |

#### C. `SampleApi/Home/HomeEndpoints.cs` — Demo Site Home Page

**Important**: The home page is an inline HTML string (`const string Html`) inside this C# file — there is no separate HTML file. All changes must be made to the string literal.

Sections to update:

| Section | What to update |
|---------|----------------|
| Package card `pkg-tag-list` | Add new feature tags if applicable |
| Package card metadata grid | Version field: `{NEXT_VERSION}`, release date |
| Features grid | Add cards for any new features |
| Options table | Add rows for any new `ApiTestSparkOptions` properties |
| How It Works | Update step count and descriptions if new capabilities added |
| Demo badges | `ApiTestSpark v{NEXT_VERSION}` |
| Release History `#history` section | Prepend new release row with colored badge, mark as "Latest" |
| FAQ | Add entries for any new features that users commonly ask about |

When adding a new release row to the history section, remove the "Latest" badge from the previous version's row.

#### D. `NUGET-PACKAGE-WALKTHROUGH.md`

| Section | What to update |
|---------|----------------|
| Version table | Bump to `{NEXT_VERSION}` |
| PublicAPI.Shipped.txt listing | Update to reflect full current surface (match Step 9C) |
| Integration test count | Update from current test count |
| Config endpoint JSON example | Update to show full current response shape |

#### E. `DEPLOYMENT.md`

| Section | What to update |
|---------|----------------|
| Publish new version steps | Update tag example to reflect current version pattern |
| Reverse proxy `MapApiTestSpark` example | Update to show any new options |

#### F. Verify — no stale version strings

Search for the old version string (`{CURRENT_VERSION}`) across all `.md` files and `HomeEndpoints.cs`. Confirm every remaining reference is intentional (e.g., CHANGELOG history, ADR history). Flag any unintentional stale occurrences.

### 10A. Pre-Release Quality Gate (Run Locally Before Committing)

Run these gates locally before making the release commit. A CI failure after tagging requires a patch release or tag deletion to fix — catching it here is much cheaper.

```powershell
# 1. TypeScript + Vite build (canonical gate — mirrors what CI does)
npm run verify

# 2. ESLint (zero errors)
npm run lint

# 3. .NET build
dotnet build ApiTestSpark

# 4. Integration tests (must all pass — currently 30 tests)
dotnet test ApiTestSpark.Tests

# 5. Local pack (validates the dual-artifact integration end-to-end)
.\scripts\build\pack.ps1

# 6. Verify pack.ps1 output shows expected version
#    → "ApiTestSpark {NEXT_VERSION} — ready for 'dotnet nuget push'"
#    (ignore the "dotnet nuget push" message — CI handles publish)
```

All six must pass before proceeding to Step 11 (markdownlint).

### 11. Markdownlint Preflight (Required)

Before finalizing release output, run a full markdown lint pass. This repo excludes several directories from linting — use the exact command below:

```powershell
npx markdownlint-cli2 "**/*.md" "#node_modules" "#.claude/**" "#.devspark/**" "#.github/**"
```

If lint fails, parse and print a structured report with rule ID, file path, line number, and short message. **Block release completion on lint errors** — do not proceed to the release commit until markdownlint exits cleanly.

### 12. Clean Slate Preparation

After archival (skip if DRY_RUN).

For each spec in COMPLETED_SPECS:

1. Move entire spec directory to `/.documentation/releases/v{NEXT_VERSION}/specs/{spec-name}/`

For each quickfix in QUICKFIXES:

1. Move file to `/.documentation/releases/v{NEXT_VERSION}/quickfixes/`

Create `.gitkeep` files if directories are now empty.

### 13. Output Summary

#### Actual Release Output

```markdown
## Release Complete: v{NEXT_VERSION}

### Archive Created

`/.documentation/releases/v{NEXT_VERSION}/`

- Specs archived: {N}
- Quickfixes archived: {M}
- ADRs created: {P}

### Documentation Updated

- CHANGELOG.md: New entry added
- Release notes: Created
- Metrics: Recorded

### Version Bumps Applied

- package.json: {NEXT_VERSION}
- ApiTestSpark/ApiTestSpark.csproj: {NEXT_VERSION}
- PublicAPI.Shipped.txt: {updated / no change needed}

### Public Content Updated

- README.md
- ApiTestSpark/README.md
- SampleApi/Home/HomeEndpoints.cs (demo site home page)
- NUGET-PACKAGE-WALKTHROUGH.md
- DEPLOYMENT.md

### Clean Slate

- Specs directory: {Cleared / {N} deferred specs remain}
- Quickfixes directory: Cleared

### Next Steps

1. Review generated documentation:
   - `/.documentation/releases/v{NEXT_VERSION}/release-notes.md`
   - `CHANGELOG.md`

2. Commit changes:

   ```powershell
   git add -A
   git commit -m "docs: release v{NEXT_VERSION}"
   ```

1. Tag release:

   ```powershell
   git tag -a v{NEXT_VERSION} -m "Release v{NEXT_VERSION}"
   ```

1. Push to remote (this triggers CI/CD):

   ```powershell
   git push origin main --tags
   ```

1. **CI/CD auto-publish**: The `publish-nuget.yml` workflow fires automatically on the
   `v*.*.*` tag push. It runs `npm run build`, all `.NET` integration tests, vulnerability
   audits, packs the library, and pushes `ApiTestSpark.{NEXT_VERSION}.nupkg` + `.snupkg`
   to nuget.org. It also creates the GitHub Release with `CHANGELOG.md` as the body.

   **Do NOT run `dotnet nuget push` or `gh release create` manually** — CI handles both.

   Monitor the run at:
   `https://github.com/MarkHazleton/ApiTestSpark/actions/workflows/publish-nuget.yml`

   > **Note**: `pack.ps1` ends with "ready for 'dotnet nuget push'" — ignore that message.
   > It is leftover text in the script. CI publishes; you do not need to push manually.

1. After CI passes (~3-5 min), verify the package is live:
   `https://www.nuget.org/packages/ApiTestSpark/{NEXT_VERSION}`

   NuGet.org indexing can take an additional 5-15 min after the push succeeds.

1. Verify the demo site reflects the new version:
   `https://apitest.makeboldspark.com`

   **The NuGet publish does NOT deploy SampleApi.** SampleApi is a separate IIS deployment
   on a Windows VM. If you updated `SampleApi/Home/HomeEndpoints.cs` in this release,
   you must `dotnet publish SampleApi` and deploy to the VM manually. See `DEPLOYMENT.md`.

1. Run `/devspark.harvest` to complete the cleanup cycle.

```

## Guidelines

### Spec Completion Validation

A spec is considered complete when:

- The `**Status**:` field in `spec.md` is `Complete`
- All tasks in `tasks.md` are checked (`[x]`)
- At least one task exists (not an empty file)
- `spec.md` exists in the directory

### Version Numbering

Follow semantic versioning:

- **MAJOR**: Breaking changes, removed features
- **MINOR**: New features, backwards compatible — update PublicAPI.Shipped.txt
- **PATCH**: Bug fixes, documentation updates — PublicAPI.Shipped.txt usually unchanged

### CI/CD Pipeline Reference

The `publish-nuget.yml` workflow (`.github/workflows/publish-nuget.yml`) is the canonical quality gate and publisher. **Read the actual file** if you need the ground truth — this summary reflects v1.3.0.

**Triggers:**

| Event | Runs quality gate? | Publishes to NuGet? | Creates GitHub Release? |
|-------|--------------------|---------------------|------------------------|
| `push` tag `v*.*.*` | Yes | **Yes** | **Yes** |
| `workflow_dispatch` (manual) | Yes | No | No |

`workflow_dispatch` is useful for testing the quality gate without publishing. Only tag pushes publish.

**What the workflow does (in order):**

1. `npm ci` — install dependencies
2. `npm run build` — React SPA build (sets `VITE_BASE_PATH=/api-test-spark/`)
3. `dotnet restore ApiTestSpark.slnx`
4. `dotnet build ApiTestSpark.slnx --configuration Release /p:Version=$VERSION`
5. `dotnet test ApiTestSpark.slnx` — all integration tests must pass
6. `dotnet list ... package --vulnerable --include-transitive` — .NET vulnerability check
7. `npm audit --audit-level=high` — npm vulnerability check
8. `dotnet pack ApiTestSpark.csproj /p:Version=$VERSION --output ./nupkg`
9. Verify package contents (asset count check)
10. `dotnet nuget push ./nupkg/ApiTestSpark.*.nupkg --skip-duplicate` (tag push only)
11. `dotnet nuget push ./nupkg/ApiTestSpark.*.snupkg --skip-duplicate` (tag push only, `continue-on-error: true`)
12. `softprops/action-gh-release@v2` — creates GitHub Release with `CHANGELOG.md` as body and `.nupkg`/`.snupkg` as release assets (tag push only)

**Critical invariant**: The workflow reads `VERSION` from `package.json` via `node -p "require('./package.json').version"`, then passes it to `dotnet build` and `dotnet pack` via `/p:Version=$VERSION`. This means:

- `package.json` version controls what gets published — the tag name is just the trigger
- If `package.json` says `1.3.0` and you push tag `v1.4.0`, the published package will be `1.3.0`
- Always bump `package.json` AND `ApiTestSpark.csproj` to `{NEXT_VERSION}` before tagging

**`--skip-duplicate`**: The push uses `--skip-duplicate`, so accidentally pushing the same tag twice will not fail — NuGet.org silently skips the already-published version. This is a safety net, not an excuse to push duplicate tags.

### SampleApi Deployment (Demo Site)

The NuGet CI/CD pipeline publishes the package but does **not** deploy the demo site. These are two separate operations.

**When to deploy SampleApi:**

- Always deploy after a release that changes `SampleApi/Home/HomeEndpoints.cs` (home page content)
- Deploy after any change to `SampleApi/Program.cs` (e.g., new `RemoteBaseUrl` config)
- You can skip if only the NuGet package changed with no demo site changes

**How to deploy SampleApi:**

```powershell
# 1. Publish to a local output folder
dotnet publish SampleApi/SampleApi.csproj `
    --configuration Release `
    --runtime win-x64 `
    --self-contained false `
    --output ./publish/SampleApi

# 2. Copy ./publish/SampleApi/ to the Windows VM running IIS
# 3. Recycle the IIS app pool
```

See [DEPLOYMENT.md](../../../DEPLOYMENT.md) for full IIS setup instructions.

**Verification after deploy:**

- `https://apitest.makeboldspark.com` — home page should show `v{NEXT_VERSION}`
- `https://apitest.makeboldspark.com/api-test-spark/` — harness should load
- `https://apitest.makeboldspark.com/api-test-spark/config` — config JSON should show `"harnessVersion": "{NEXT_VERSION}"`

### Handling Edge Cases

**No completed specs:**

- Generate release with quickfixes only
- Note: "Maintenance release — bug fixes only"

**Pending specs warning:**

```markdown
Pending Specs Detected

The following specs are incomplete and will NOT be archived:

{List of pending specs with status}

These will remain active for the next development cycle.
Continue with release? The above specs will be noted as "Deferred".
```

## Context

$ARGUMENTS
