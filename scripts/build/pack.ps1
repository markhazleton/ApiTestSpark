#!/usr/bin/env pwsh
# Pack script for WebSpark.ApiTestHarness NuGet package.
# Runs npm audit, builds the React SPA with the embedded base path,
# then packs the .NET project with the npm version as the NuGet version.

param(
    [switch]$SkipAudit = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "WebSpark.ApiTestHarness — NuGet Pack Pipeline" -ForegroundColor Cyan

# 1. npm audit (warn on high, fail on critical only — avoids false-positive dev-dep blocks)
if (-not $SkipAudit) {
    Write-Host "`n[1/4] Running npm audit..." -ForegroundColor Blue
    $auditOutput = npm audit --audit-level=critical --json 2>&1
    $auditExitCode = $LASTEXITCODE
    if ($auditExitCode -ne 0) {
        Write-Error "npm audit found CRITICAL vulnerabilities. Fix before packing. Run 'npm audit' for details."
        exit 1
    }
    # Warn on high but do not block
    $highOutput = npm audit --audit-level=high --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "npm audit found HIGH vulnerabilities. Review 'npm audit' output — not blocking for now."
    }
    Write-Host "  npm audit passed (no critical vulnerabilities)" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Skipping npm audit (--SkipAudit flag set)" -ForegroundColor Yellow
}

# 2. Build the React SPA with embedded base path
Write-Host "`n[2/4] Building React SPA (VITE_BASE_PATH=/api-test-harness/)..." -ForegroundColor Blue
$env:VITE_BASE_PATH = '/api-test-harness/'
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm run build failed."
        exit 1
    }
    Write-Host "  React SPA build complete → build/" -ForegroundColor Green
} finally {
    Remove-Item Env:\VITE_BASE_PATH -ErrorAction SilentlyContinue
}

# 3. Read and validate version from package.json
Write-Host "`n[3/4] Reading version from package.json..." -ForegroundColor Blue
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$rawVersion = $packageJson.version

# Strip build metadata suffix (+...) — invalid for NuGet semver
$nugetVersion = $rawVersion -replace '\+.*$', ''

# Validate NuGet semver: major.minor.patch[-prerelease]
if ($nugetVersion -notmatch '^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$') {
    Write-Error "package.json version '$rawVersion' produces NuGet version '$nugetVersion' which is not valid NuGet semver (major.minor.patch[-prerelease]). Fix package.json version before packing."
    exit 1
}

Write-Host "  npm version: $rawVersion → NuGet version: $nugetVersion" -ForegroundColor Green

# 4. Pack the .NET project
Write-Host "`n[4/4] Running dotnet pack..." -ForegroundColor Blue
dotnet pack WebSpark.ApiTestHarness/WebSpark.ApiTestHarness.csproj `
    --configuration Release `
    /p:Version=$nugetVersion `
    --output ./nupkg

if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet pack failed."
    exit 1
}

Write-Host "`nPack complete! Output: ./nupkg/WebSpark.ApiTestHarness.$nugetVersion.nupkg" -ForegroundColor Green

# Size check against SC-006 (2 MB budget)
$nupkgPath = "./nupkg/WebSpark.ApiTestHarness.$nugetVersion.nupkg"
if (Test-Path $nupkgPath) {
    $sizeMB = [math]::Round((Get-Item $nupkgPath).Length / 1MB, 2)
    if ($sizeMB -gt 2) {
        Write-Warning "Package size is ${sizeMB}MB — exceeds 2MB SC-006 budget. Review embedded assets."
    } else {
        Write-Host "  Package size: ${sizeMB}MB (within 2MB SC-006 budget)" -ForegroundColor Green
    }
}
