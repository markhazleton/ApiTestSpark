#!/usr/bin/env pwsh
# Structural validation test for API Test Harness
# Verifies project file structure, TypeScript compilation, and build integrity

Write-Host "API Test Harness - Structural Test Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TestResults = @()

function Test-Result {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Message = ""
    )
    $Result = [PSCustomObject]@{
        Test      = $TestName
        Status    = if ($Passed) { "PASS" } else { "FAIL" }
        Message   = $Message
        Timestamp = Get-Date
    }
    $global:TestResults += $Result
    $Color  = if ($Passed) { "Green" } else { "Red" }
    $Symbol = if ($Passed) { "✓" } else { "✗" }
    Write-Host "$Symbol $TestName" -ForegroundColor $Color
    if ($Message) { Write-Host "  $Message" -ForegroundColor Gray }
}

Set-Location $ProjectRoot

# 1. Required source files
Write-Host "`n1. Source File Structure" -ForegroundColor Yellow
Write-Host "------------------------" -ForegroundColor Yellow

$RequiredFiles = @(
    "src/App.tsx",
    "src/main.tsx",
    "src/api/client.ts",
    "src/api/jokeApiClient.ts",
    "src/api/index.ts",
    "src/components/index.ts",
    "src/hooks/index.ts",
    "src/store/index.ts",
    "src/types/index.ts",
    "src/utils/branding.ts",
    "src/utils/appInsights.ts"
)

foreach ($file in $RequiredFiles) {
    Test-Result "File exists: $file" (Test-Path $file)
}

# 2. Barrel exports
Write-Host "`n2. Barrel Export Files" -ForegroundColor Yellow
Write-Host "----------------------" -ForegroundColor Yellow

foreach ($barrel in @("src/store/index.ts","src/types/index.ts","src/components/index.ts","src/hooks/index.ts","src/api/index.ts")) {
    Test-Result "Barrel export: $barrel" (Test-Path $barrel)
}

# 3. TypeScript compilation
Write-Host "`n3. TypeScript Compilation" -ForegroundColor Yellow
Write-Host "-------------------------" -ForegroundColor Yellow

try {
    $tscResult = npx tsc --noEmit 2>&1
    Test-Result "TypeScript compilation" ($LASTEXITCODE -eq 0) ($tscResult | Out-String).Trim()
} catch {
    Test-Result "TypeScript compilation" $false "Could not run tsc"
}

# 4. Production build
Write-Host "`n4. Production Build" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow

try {
    $buildOutput = npm run build 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    Test-Result "Production build" $buildSuccess
    if ($buildSuccess) {
        Test-Result "Build output directory" (Test-Path "build")
        Test-Result "Build index.html"       (Test-Path "build/index.html")
    }
} catch {
    Test-Result "Production build" $false "Could not run npm run build"
}

# Summary
Write-Host "`nTest Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan

$Passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$Failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Total: $($TestResults.Count)  Passed: $Passed  Failed: $Failed"

if ($Failed -eq 0) {
    Write-Host "`n✅ All tests passed." -ForegroundColor Green
} else {
    Write-Host "`n❌ $Failed test(s) failed." -ForegroundColor Red
    $TestResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Test): $($_.Message)" -ForegroundColor Red
    }
    exit 1
}
