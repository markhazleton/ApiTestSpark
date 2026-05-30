#!/usr/bin/env pwsh
# Increment build version and generate build metadata
# Usage: .\increment-version.ps1 [-Dev] [-Increment]

param(
    [switch]$Dev = $false,
    [switch]$Increment = $false
)

$ErrorActionPreference = "Stop"

$packageJsonPath = "package.json"
$buildInfoPath = "src/public/build-info.json"

# Read package.json
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

# Parse current version
$version = $packageJson.version
if ($version -match '^(\d+)\.(\d+)\.(\d+)$') {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    $patch = [int]$matches[3]
} else {
    Write-Error "Invalid version format in package.json: '$version'. Expected major.minor.patch (e.g. 1.0.0)."
    exit 1
}

$shouldIncrement = $Increment -or (-not $Dev)

# Increment patch version only for explicit release/build bump workflows
if ($shouldIncrement) {
    $patch++
    $newVersion = "$major.$minor.$patch"
    
    # Update package.json
    $packageJson.version = $newVersion
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath -Encoding UTF8
    
    Write-Host "Version incremented: $version -> $newVersion" -ForegroundColor Green
} else {
    $newVersion = "$major.$minor.$patch"
    Write-Host "Using existing version: $newVersion" -ForegroundColor Cyan
}

# Generate build info with current UTC timestamp
$utcNow = [DateTime]::UtcNow
$buildInfo = @{
    version = $newVersion
    buildDate = $utcNow.ToString("yyyy-MM-ddTHH:mm:ss") + "Z"
    buildTimestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
}

# Ensure src/public directory exists
if (-not (Test-Path "src/public")) {
    New-Item -ItemType Directory -Path "src/public" | Out-Null
}

# Write build info
$buildInfo | ConvertTo-Json | Set-Content $buildInfoPath -Encoding UTF8

Write-Host "Build info generated: $buildInfoPath" -ForegroundColor Green
Write-Host "  Version: $newVersion" -ForegroundColor Cyan
Write-Host "  Build Date: $($buildInfo.buildDate)" -ForegroundColor Cyan

exit 0
