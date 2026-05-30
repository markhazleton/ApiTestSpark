#!/usr/bin/env pwsh
# Pack script for ApiTestSpark NuGet package.
# Pipeline:
#   1. npm audit           — security gate (fail on critical, warn on high)
#   2. npm run lint        — ESLint gate (zero errors required)
#   3. npm run build       — React SPA → build/ (base=/api-test-spark/)
#   4. Read + validate version from package.json
#   5. dotnet build        — .NET compile (skips SPA rebuild via incremental sentinel)
#   6. dotnet pack --no-build — produce .nupkg + .snupkg from already-built artifacts
#   7. Package size check  — warn if > 2 MB (SC-006 budget)

param(
    [switch]$SkipAudit = $false,
    [switch]$SkipLint  = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "ApiTestSpark — NuGet Pack Pipeline" -ForegroundColor Cyan

# 1. npm audit (warn on high, fail on critical only — avoids false-positive dev-dep blocks)
if (-not $SkipAudit) {
    Write-Host "`n[1/7] Running npm audit..." -ForegroundColor Blue
    npm audit --audit-level=critical --json 2>&1 | Out-Null
    $auditExitCode = $LASTEXITCODE
    if ($auditExitCode -ne 0) {
        Write-Error "npm audit found CRITICAL vulnerabilities. Fix before packing. Run 'npm audit' for details."
        exit 1
    }
    # Warn on high but do not block
    npm audit --audit-level=high --json 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "npm audit found HIGH vulnerabilities. Review 'npm audit' output — not blocking for now."
    }
    Write-Host "  npm audit passed (no critical vulnerabilities)" -ForegroundColor Green
} else {
    Write-Host "`n[1/7] Skipping npm audit (--SkipAudit flag set)" -ForegroundColor Yellow
}

# 2. ESLint gate — zero errors required before packing
if (-not $SkipLint) {
    Write-Host "`n[2/7] Running ESLint (zero errors required)..." -ForegroundColor Blue
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ESLint found errors. Fix all lint errors before packing. Run 'npm run lint' for details."
        exit 1
    }
    Write-Host "  ESLint passed (zero errors)" -ForegroundColor Green
} else {
    Write-Host "`n[2/7] Skipping ESLint (--SkipLint flag set)" -ForegroundColor Yellow
}

# 3. Build the React SPA — base path /api-test-spark/ is now the default in vite.config.ts
Write-Host "`n[3/7] Building React SPA (base=/api-test-spark/)..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run build failed."
    exit 1
}
Write-Host "  React SPA build complete → build/" -ForegroundColor Green

# 4. Read and validate version from package.json
Write-Host "`n[4/7] Reading version from package.json..." -ForegroundColor Blue
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

# 5. Build the .NET project (skips SPA rebuild — incremental sentinel is fresh from step 3)
Write-Host "`n[5/7] Running dotnet build (Release)..." -ForegroundColor Blue
dotnet build ApiTestSpark/ApiTestSpark.csproj --configuration Release /p:Version=$nugetVersion
if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet build failed."
    exit 1
}
Write-Host "  dotnet build passed" -ForegroundColor Green

# 6. Pack the .NET project (no-build — artifacts already compiled in step 5)
Write-Host "`n[6/7] Running dotnet pack --no-build..." -ForegroundColor Blue
dotnet pack ApiTestSpark/ApiTestSpark.csproj `
    --configuration Release `
    --no-build `
    /p:Version=$nugetVersion `
    --output ./nupkg

if ($LASTEXITCODE -ne 0) {
    Write-Error "dotnet pack failed."
    exit 1
}

Write-Host "`n[6/7] Pack complete! Output: ./nupkg/ApiTestSpark.$nugetVersion.nupkg" -ForegroundColor Green

# 7. Size check against SC-006 (2 MB budget)
Write-Host "`n[7/7] Checking package size..." -ForegroundColor Blue
$nupkgPath = "./nupkg/ApiTestSpark.$nugetVersion.nupkg"
if (Test-Path $nupkgPath) {
    $sizeMB = [math]::Round((Get-Item $nupkgPath).Length / 1MB, 2)
    if ($sizeMB -gt 2) {
        Write-Warning "Package size is ${sizeMB}MB — exceeds 2MB SC-006 budget. Review embedded assets."
    } else {
        Write-Host "  Package size: ${sizeMB}MB (within 2MB SC-006 budget)" -ForegroundColor Green
    }
}

Write-Host "`nApiTestSpark $nugetVersion — ready for 'dotnet nuget push'" -ForegroundColor Cyan
