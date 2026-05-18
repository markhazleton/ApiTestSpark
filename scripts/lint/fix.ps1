#!/usr/bin/env pwsh
# Lint fix script for API Test Harness
# Automatically fixes ESLint issues where possible

Write-Host "Running ESLint with auto-fix on API Test Harness..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

Write-Host "Auto-fixing linting issues..." -ForegroundColor Blue
npx eslint . --fix

if ($LASTEXITCODE -eq 0) {
    Write-Host "Linting auto-fix completed!" -ForegroundColor Green
}
else {
    Write-Warning "Some linting issues could not be automatically fixed."
    Write-Host "Run scripts/lint/lint.ps1 to see remaining issues." -ForegroundColor Yellow
}