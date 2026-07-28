# Collector for bold.plan (default/triage). Emits deterministic JSON facts —
# system doc inventory, active feature tiers/status, backbone principle
# status, and the project genome — so the triage prompt reasons over
# structured ground truth instead of re-deriving it from prose.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/Common.ps1')

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }
$docsDir = Join-Path $repoRoot 'bold-docs'
Add-BoldRunLog -RepoRoot $repoRoot -Command 'plan' -Collector 'collect-triage-context'

Sync-BoldGitRemote -RepoRoot $repoRoot

$systemDocs = Get-SystemDocs -RepoRoot $repoRoot -DocsDir $docsDir
$activeFeatures = Get-ActiveFeatures -DocsDir $docsDir
$backbonePrinciples = Get-BackbonePrinciples -DocsDir $docsDir
$staleReferences = Get-StaleReferences -RepoRoot $repoRoot -DocsDir $docsDir
$knownFeatureIds = Get-KnownFeatureIds -RepoRoot $repoRoot -DocsDir $docsDir
$nextFeatureNumber = Get-NextFeatureNumber -KnownFeatureIds $knownFeatureIds
$gitStatus = Get-GitStatus -RepoRoot $repoRoot

$genome = $null
$genomeFile = Join-Path $docsDir 'project.json'
if (Test-Path $genomeFile) {
  $genome = Get-Content $genomeFile -Raw | ConvertFrom-Json
}

# Feature 0008, AC1: project.json's repo block, once it exists, rides
# along in $genome above with no code change needed here. What IS new:
# detecting candidate values when the block is missing or incomplete, so
# plan/default.md's backfill/correction step has something to reason over
# instead of re-deriving detection itself. Never touches `policies` --
# no auto-detection path exists for that field.
$repoBlock = if ($genome) { $genome.repo } else { $null }
$repoIncomplete = (-not $repoBlock) -or (-not $repoBlock.platform) -or (-not $repoBlock.organization) -or (-not $repoBlock.repository)
$detectedRepoFacts = $null
if ($repoIncomplete) {
  $detectedRepoFacts = Get-RepoFactsFromRemote -RepoRoot $repoRoot
}

[ordered]@{
  system_docs          = $systemDocs
  active_features      = $activeFeatures
  backbone_principles  = $backbonePrinciples
  stale_references     = $staleReferences
  known_feature_ids    = $knownFeatureIds
  next_feature_number  = $nextFeatureNumber
  git_status           = $gitStatus
  genome               = $genome
  detected_repo_facts  = $detectedRepoFacts
  user                 = Get-BoldUserSlug -Root $repoRoot
} | ConvertTo-Json -Depth 10 -Compress
