$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$graphifyExe = 'C:/Users/Ceferino Jumao-as V/.local/bin/graphify.EXE'

function Invoke-GraphifyCheck {
  & $graphifyExe hook-check
  exit $LASTEXITCODE
}

if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
  Invoke-GraphifyCheck
}

$statusLines = git -C $repoRoot status --porcelain
if ($LASTEXITCODE -ne 0) {
  Invoke-GraphifyCheck
}

if (-not $statusLines -or $statusLines.Count -eq 0) {
  exit 0
}

$paths = @()
foreach ($line in $statusLines) {
  if ($line.Length -lt 4) {
    continue
  }

  $pathPart = $line.Substring(3).Trim()
  if ($pathPart -match ' -> ') {
    $parts = $pathPart -split ' -> '
    $pathPart = $parts[-1]
  }

  $normalized = $pathPart -replace '\\', '/'
  if ($normalized) {
    $paths += $normalized
  }
}

if ($paths.Count -eq 0) {
  exit 0
}

$hasStructuralChange = $false
$significantCount = 0

foreach ($path in $paths) {
  if ($path -match '^AGENTS\.md$' -or
      $path -match '^\.codex/' -or
      $path -match '^docs/' -or
      $path -match '^graphify-out/') {
    continue
  }

  if ($path -match '^(apps/|packages/|supabase/|scripts/|n8n/workflows/)') {
    $significantCount++
  }

  if ($path -match '^supabase/migrations/.*\.sql$' -or
      $path -match '/route\.ts$' -or
      $path -match '^n8n/workflows/.*\.json$' -or
      $path -match '^apps/.*/(layout|page)\.tsx$') {
    $hasStructuralChange = $true
  }
}

if ($hasStructuralChange -or $significantCount -ge 5) {
  Invoke-GraphifyCheck
}

exit 0
