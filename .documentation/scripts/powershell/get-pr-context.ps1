#!/usr/bin/env pwsh
#requires -Version 7.0
# Extract PR context for review
#
# This script fetches Pull Request information from Azure DevOps and provides it
# in JSON format for the pr-review command.
#
# Usage: ./get-pr-context.ps1 [PR_NUMBER] [-Json]
#        ./get-pr-context.ps1 -Json           # Auto-detect PR from current branch
#        ./get-pr-context.ps1 123 -Json       # Specific PR number
#        ./get-pr-context.ps1 "#123" -Json    # Also accepts # prefix
#        ./get-pr-context.ps1 123 -Json -IncludeAllFiles
#
# Requires: Azure CLI (az) with azure-devops extension
#   Install extension: az extension add --name azure-devops
#   Authenticate:      az login && az devops configure --defaults organization=https://dev.azure.com/ORG project=PROJECT

param(
    [Parameter(Position=0)]
    [string]$PrNumber,

    [Parameter()]
    [switch]$Json,

    [Parameter()]
    [switch]$IncludeAllFiles,

    [Parameter()]
    [int]$FileSampleLimit = 200
)

$ErrorActionPreference = "Stop"

#==============================================================================
# Configuration
#==============================================================================

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path "$scriptPath\..\..")

#==============================================================================
# Utility Functions
#==============================================================================

function Write-JsonError {
    param(
        [string]$Message,
        [string]$Details = ""
    )

    if ($Json) {
        $errorObj = @{
            error = $true
            message = $Message
            details = $Details
        } | ConvertTo-Json
        Write-Output $errorObj
    } else {
        Write-Error $Message
        if ($Details) {
            Write-Error $Details
        }
    }
}

if ($FileSampleLimit -lt 1) {
    $FileSampleLimit = 200
}

#==============================================================================
# PR Number Detection
#==============================================================================

function Get-DetectedPrNumber {
    # Method 1: Check Azure DevOps pipeline environment variables
    if ($env:SYSTEM_PULLREQUEST_PULLREQUESTID) {
        return $env:SYSTEM_PULLREQUEST_PULLREQUESTID
    }

    if ($env:PR_NUMBER) {
        return $env:PR_NUMBER
    }

    # Method 2: Try Azure CLI for current branch
    if (Get-Command az -ErrorAction SilentlyContinue) {
        try {
            $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
            if ($currentBranch -and $currentBranch -ne 'HEAD') {
                $prListJson = az repos pr list --source-branch $currentBranch --status active --output json 2>$null
                if ($prListJson) {
                    $prList = $prListJson | ConvertFrom-Json
                    if ($prList -and $prList.Count -gt 0) {
                        return $prList[0].pullRequestId
                    }
                }
            }
        } catch {
            # Continue — no active PR found for this branch
        }
    }

    return $null
}

#==============================================================================
# Main Execution
#==============================================================================

# Parse PR number from argument (strip # prefix if present)
if ($PrNumber) {
    $PrNumber = $PrNumber -replace '^#', ''
}

# Detect PR number if not provided
if ([string]::IsNullOrWhiteSpace($PrNumber)) {
    $PrNumber = Get-DetectedPrNumber
    if (-not $PrNumber) {
        Write-JsonError -Message "Unable to detect PR number" `
            -Details "Please provide PR number explicitly: /devspark.pr-review #123"
        exit 1
    }
}

# Validate PR number is numeric
if ($PrNumber -notmatch '^\d+$') {
    Write-JsonError -Message "Invalid PR number: $PrNumber" `
        -Details "PR number must be a positive integer"
    exit 1
}

# Check if Azure CLI is available
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-JsonError -Message "Azure CLI (az) is required but not installed" `
        -Details "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check Azure DevOps extension is installed
try {
    $extensions = az extension list --output json 2>$null | ConvertFrom-Json
    $hasAdoExt = $extensions | Where-Object { $_.name -eq 'azure-devops' }
    if (-not $hasAdoExt) {
        Write-JsonError -Message "Azure DevOps CLI extension not installed" `
            -Details "Run: az extension add --name azure-devops"
        exit 1
    }
} catch {
    Write-JsonError -Message "Failed to check Azure CLI extensions" `
        -Details "Ensure Azure CLI is properly installed. Error: $_"
    exit 1
}

# Fetch PR data from Azure DevOps
try {
    $prDataJson = az repos pr show --id $PrNumber --output json 2>$null
    if (-not $prDataJson) {
        Write-JsonError -Message "PR #$PrNumber not found" `
            -Details "Verify the PR exists and you have access. Run: az devops configure --defaults"
        exit 1
    }
    $prData = $prDataJson | ConvertFrom-Json
} catch {
    Write-JsonError -Message "Failed to fetch PR #$PrNumber from Azure DevOps" `
        -Details "Verify PR exists and defaults are configured. Error: $_"
    exit 1
}

# Extract branch names (strip refs/heads/ prefix)
$sourceBranch = $prData.sourceRefName -replace '^refs/heads/', ''
$targetBranch = $prData.targetRefName -replace '^refs/heads/', ''

# Extract commit SHA (tip of source branch)
$commitSha = "unknown"
try {
    $shaOutput = git rev-parse "origin/$sourceBranch" 2>$null
    if ($LASTEXITCODE -eq 0 -and $shaOutput) { $commitSha = $shaOutput.Trim() }
} catch {}

# Get files changed via git diff (most reliable source in a checked-out repo)
$allFilesChanged = @()
$diffAvailable = $false
try {
    $diffOutput = git diff --name-only "origin/$targetBranch...origin/$sourceBranch" 2>$null
    if ($LASTEXITCODE -eq 0 -and $diffOutput) {
        $allFilesChanged = @($diffOutput -split "`n" | Where-Object { $_.Trim() -ne '' })
        $diffAvailable = $true
    }
} catch {}

# Get line stats via git diff --shortstat
$linesAdded = 0
$linesDeleted = 0
try {
    $statLine = git diff --shortstat "origin/$targetBranch...origin/$sourceBranch" 2>$null
    if ($statLine -match '(\d+) insertion') { $linesAdded   = [int]$Matches[1] }
    if ($statLine -match '(\d+) deletion')  { $linesDeleted = [int]$Matches[1] }
} catch {}

# Apply file sample limit
$filesChangedTotal = $allFilesChanged.Count
$filesChangedTruncated = $false
$filesChanged = $allFilesChanged
if (-not $IncludeAllFiles -and $filesChangedTotal -gt $FileSampleLimit) {
    $filesChanged = @($allFilesChanged | Select-Object -First $FileSampleLimit)
    $filesChangedTruncated = $true
}

# Check for constitution
$constitutionPath = Join-Path $repoRoot.Path ".documentation\memory\constitution.md"
$constitutionExists = Test-Path $constitutionPath

# Prepare review directory
$reviewDir = Join-Path $repoRoot.Path ".documentation\specs\pr-review"

# Build output
if ($Json) {
    $output = @{
        REPO_ROOT = $repoRoot.Path
        PR_CONTEXT = @{
            enabled                 = $true
            pr_number               = $prData.pullRequestId
            pr_title                = $prData.title
            pr_body                 = if ($prData.description) { $prData.description } else { "" }
            pr_state                = $prData.status
            pr_author               = $prData.createdBy.displayName
            source_branch           = $sourceBranch
            target_branch           = $targetBranch
            commit_sha              = $commitSha
            commit_count            = if ($prData.commits) { $prData.commits.Count } else { 0 }
            files_changed           = $filesChanged
            files_changed_total     = $filesChangedTotal
            files_changed_truncated = $filesChangedTruncated
            lines_added             = $linesAdded
            lines_deleted           = $linesDeleted
            created_at              = $prData.creationDate
            updated_at              = if ($prData.closedDate) { $prData.closedDate } else { $prData.creationDate }
            diff_available          = $diffAvailable
            file_sample_limit       = $FileSampleLimit
            include_all_files       = [bool]$IncludeAllFiles
        }
        CONSTITUTION_PATH = $constitutionPath
        CONSTITUTION_EXISTS = $constitutionExists
        REVIEW_DIR = $reviewDir
    } | ConvertTo-Json -Depth 10

    Write-Output $output
} else {
    # Human-readable output
    Write-Output "PR Context for #$($prData.pullRequestId)"
    Write-Output "========================="
    Write-Output "Title:  $($prData.title)"
    Write-Output "Author: $($prData.createdBy.displayName)"
    Write-Output "State:  $($prData.status)"
    Write-Output "Branch: $sourceBranch → $targetBranch"
    Write-Output "Commit: $commitSha"
    Write-Output "Files:  $filesChangedTotal"
    Write-Output "Lines:  +$linesAdded -$linesDeleted"
    Write-Output ""
    Write-Output "Constitution: $(if ($constitutionExists) { '✓ Found' } else { '✗ Missing' })"
    Write-Output "Review will be saved to: $reviewDir\pr-$($prData.pullRequestId).md"
}
