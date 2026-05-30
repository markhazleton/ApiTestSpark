#!/usr/bin/env pwsh
# Build script for API Test Spark
# Runs the full verification pipeline and optional release version bump

param(
    [switch]$Release = $false
)

Write-Host "Building API Test Spark..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

$command = if ($Release) { "build:release" } else { "build:full" }

if ($Release) {
    Write-Host "Running explicit release build (version bump + verify)..." -ForegroundColor Blue
} else {
    Write-Host "Running full verification build..." -ForegroundColor Blue
}

npm run $command
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed"
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Output directory: build/" -ForegroundColor Cyan