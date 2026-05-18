#!/usr/bin/env pwsh
# Development server script for API Test Harness
# Starts Vite dev server for local API development

Write-Host "Starting API Test Harness development server..." -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Generate dev build info (without incrementing version)
Write-Host "Generating development build info..." -ForegroundColor Blue
& "$PSScriptRoot\increment-version.ps1" -Dev

Write-Host "Starting development server..." -ForegroundColor Blue
Write-Host "Open http://localhost:5173 in your browser" -ForegroundColor Cyan

npm run dev