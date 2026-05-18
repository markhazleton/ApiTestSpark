#!/usr/bin/env pwsh
# API Integration Test - tests connectivity to configured API endpoints
# Usage: .\api-integration-test.ps1 -BaseUrl "http://localhost:8000" [-ApiKey "your-key"]

param(
    [string]$BaseUrl  = "http://localhost:8000",
    [string]$ApiKey   = "",
    [int]   $Timeout  = 10
)

Write-Host "API Test Harness - Integration Tests" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n" -ForegroundColor Gray

$TestResults = @()

function Test-Endpoint {
    param(
        [string]$TestName,
        [string]$Url,
        [string]$Method  = "GET",
        [object]$Body    = $null
    )
    try {
        $headers = @{ "Content-Type" = "application/json" }
        if ($ApiKey) { $headers["x-api-key"] = $ApiKey }

        $params = @{
            Uri        = $Url
            Method     = $Method
            Headers    = $headers
            TimeoutSec = $Timeout
        }
        if ($Body -and $Method -ne "GET") {
            $params.Body = $Body | ConvertTo-Json -Depth 10
        }

        $sw       = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod @params
        $sw.Stop()

        $global:TestResults += [PSCustomObject]@{ Test=$TestName; Status="PASS"; DurationMs=$sw.ElapsedMilliseconds }
        Write-Host "✓ $TestName ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Green
        return $response
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "ERR" }
        $global:TestResults += [PSCustomObject]@{ Test=$TestName; Status="FAIL"; Error="$code - $($_.Exception.Message)" }
        Write-Host "✗ $TestName  [$code] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# --- Add your API endpoint tests below ---

# Example: Test-Endpoint "Health check" "$BaseUrl/health"
# Example: Test-Endpoint "List items"  "$BaseUrl/api/items"

Write-Host "No endpoints configured. Add Test-Endpoint calls to this script to test your API." -ForegroundColor Yellow

# --- Summary ---
Write-Host "`nTest Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan
$Passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$Failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Total: $($TestResults.Count)  Passed: $Passed  Failed: $Failed"

if ($Failed -gt 0) {
    $TestResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Test): $($_.Error)" -ForegroundColor Red
    }
    exit 1
}
