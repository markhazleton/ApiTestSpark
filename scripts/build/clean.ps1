#!/usr/bin/env pwsh
# Clean script for API Test Harness
# Removes build artifacts and dependency cache

param(
    [switch]$Full,
    [switch]$Cache
)

Write-Host "Cleaning API Test Harness..." -ForegroundColor Green

# Remove all build output directories
$buildDirs = @("dist", "dist-ssr", "build", "out", ".vite")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir/ directory..." -ForegroundColor Blue
        Remove-Item -Recurse -Force $dir
    }
}

# Remove TypeScript build info
if (Test-Path "tsconfig.tsbuildinfo") {
    Write-Host "Removing TypeScript build info..." -ForegroundColor Blue
    Remove-Item "tsconfig.tsbuildinfo"
}

# Remove cache if requested
if ($Cache -or $Full) {
    Write-Host "Clearing npm cache..." -ForegroundColor Blue
    npm cache clean --force
}

# Remove node_modules for full clean
if ($Full) {
    if (Test-Path "node_modules") {
        Write-Host "Removing node_modules/ directory..." -ForegroundColor Blue
        Remove-Item -Recurse -Force "node_modules"
    }
    
    if (Test-Path "package-lock.json") {
        Write-Host "Removing package-lock.json..." -ForegroundColor Blue
        Remove-Item "package-lock.json"
    }
    
    Write-Host "Run 'npm install' to restore dependencies." -ForegroundColor Yellow
}

Write-Host "Clean completed!" -ForegroundColor Green