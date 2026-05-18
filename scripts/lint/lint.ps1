#!/usr/bin/env pwsh
# Lint script for API Test Harness
# Runs ESLint with TypeScript and React rules

Write-Host "Running ESLint on API Test Harness..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

Write-Host "Linting TypeScript and React files..." -ForegroundColor Blue
npm run lint

if ($LASTEXITCODE -eq 0) {
    Write-Host "Linting completed successfully!" -ForegroundColor Green
}
else {
    Write-Error "Linting found issues. Please fix them before committing."
    exit 1
}