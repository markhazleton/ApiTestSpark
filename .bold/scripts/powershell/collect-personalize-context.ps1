# Collector for bold.personalize (default and validate). Emits current
# .bold-user/{slug}/preferences.json contents (or the OS-inferred default
# when it's absent or shell is unset), the developer's identity, and
# project.json's repo block -- so both subcommands reason over the same
# facts, one acting on them, one just reporting them.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib/Common.ps1')

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) { $repoRoot = (Get-Location).Path }
$docsDir = Join-Path $repoRoot 'bold-docs'
Add-BoldRunLog -RepoRoot $repoRoot -Command 'personalize' -Collector 'collect-personalize-context'

$slug = Get-BoldUserSlug -Root $repoRoot
$prefsPath = Join-Path $repoRoot ".bold-user/$slug/preferences.json"
$hasPreferencesFile = Test-Path $prefsPath

$shell = $null
if ($hasPreferencesFile) {
  $prefs = Get-Content $prefsPath -Raw | ConvertFrom-Json
  if ($prefs.shell) { $shell = $prefs.shell }
}

$osDefaultShell = if ($IsWindows) { 'pwsh' } else { 'bash' }

$repo = $null
$genomeFile = Join-Path $docsDir 'project.json'
if (Test-Path $genomeFile) {
  $genome = Get-Content $genomeFile -Raw | ConvertFrom-Json
  if ($genome.repo) { $repo = $genome.repo }
}

[ordered]@{
  has_preferences_file = $hasPreferencesFile
  shell                = $shell
  os_default_shell     = $osDefaultShell
  user                 = $slug
  repo                 = $repo
} | ConvertTo-Json -Depth 10 -Compress
