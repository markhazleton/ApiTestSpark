# Collector for bold.next. Emits a cross-phase snapshot -- entry-path
# presence, branch/base position, the active-feature inventory, and the
# same gate/task/staleness facts bold.plan, bold.build, and bold.ship each
# already compute in isolation -- so bold.next can point at a single next
# command without re-deriving state its siblings already know how to get.
# Deliberately never hard-gates (no exit 1 anywhere below): bold.next only
# reports what's true, it never blocks or advances a work item itself --
# that stays each verb's own job.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/Common.ps1')

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }
$docsDir = Join-Path $repoRoot 'bold-docs'
Set-Location $repoRoot
Add-BoldRunLog -RepoRoot $repoRoot -Command 'next' -Collector 'collect-next-context'

$hasBoldDocs = Test-Path (Join-Path $docsDir 'backbone.md')

Sync-BoldGitRemote -RepoRoot $repoRoot
$gitStatus = Get-GitStatus -RepoRoot $repoRoot
$currentBranch = $gitStatus.current_branch

$activeFeatures = @()
$backbonePrinciples = @()
$staleReferences = @()
$hasUncheckedTasks = $false
$gateProblems = @()
$gateOrderProblems = @()
$changedFiles = @()
$repo = $null

if ($hasBoldDocs) {
  $activeFeatures = Get-ActiveFeatures -DocsDir $docsDir
  $backbonePrinciples = Get-BackbonePrinciples -DocsDir $docsDir
  $staleReferences = Get-StaleReferences -RepoRoot $repoRoot -DocsDir $docsDir

  # Feature 0008, AC7: pass project.json's repo block through the same
  # way collect-triage-context does -- null when the file or the block
  # is absent, never an error.
  $genomeFile = Join-Path $docsDir 'project.json'
  if (Test-Path $genomeFile) {
    $genome = Get-Content $genomeFile -Raw | ConvertFrom-Json
    if ($genome.repo) { $repo = $genome.repo }
  }

  $specPath = Join-Path $docsDir "features/$currentBranch/spec.md"
  if ($currentBranch -and $currentBranch -ne 'unknown' -and (Test-Path $specPath)) {
    $specContent = Get-Content $specPath
    $hasUncheckedTasks = [bool]($specContent | Select-String '^\s*-\s*\[ \]')
    $tierMatch = $specContent | Select-String '^\*\*Tier\*\*: (.+)$' | Select-Object -First 1
    $featureTier = if ($tierMatch) { $tierMatch.Matches.Groups[1].Value } else { '' }
    if ($featureTier -eq 'Feature') {
      $gateProblems = Get-FeatureGateProblems -DocsDir $docsDir -FeatureId $currentBranch
      $gateOrderProblems = Get-FeatureGateOrderProblems -DocsDir $docsDir -FeatureId $currentBranch
    }
  }

  if ($currentBranch -and $currentBranch -ne $gitStatus.base_branch) {
    $changedFiles = @(git diff --name-only "$($gitStatus.compared_against)...HEAD" 2>$null | Where-Object { $_ })
  }
}

$hasUncommittedChanges = [bool](git status --porcelain 2>$null)

[ordered]@{
  has_bold_docs           = $hasBoldDocs
  git_status              = $gitStatus
  active_features         = $activeFeatures
  has_unchecked_tasks     = $hasUncheckedTasks
  gate_problems           = $gateProblems
  gate_order_problems     = $gateOrderProblems
  changed_files           = $changedFiles
  has_uncommitted_changes = $hasUncommittedChanges
  backbone_principles     = $backbonePrinciples
  stale_references        = $staleReferences
  repo                    = $repo
  user                    = Get-BoldUserSlug -Root $repoRoot
} | ConvertTo-Json -Depth 10 -Compress
