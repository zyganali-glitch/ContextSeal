param(
  [switch]$PlanOnly,
  [switch]$SkipCompact,
  [switch]$ReadOnly,
  [double]$MinFreeGb = 15,
  [int]$DockerTimeoutSeconds = 600,
  [int]$DataHubTimeoutSeconds = 600
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host ("==> " + $Message) -ForegroundColor Cyan
}

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-CFreeGb {
  return [math]::Round((Get-PSDrive -Name C).Free / 1GB, 2)
}

function Get-DockerVhdxPath {
  return Join-Path $env:LOCALAPPDATA 'Docker\wsl\disk\docker_data.vhdx'
}

function Get-DockerDesktopPath {
  $dockerCli = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCli) {
    $installRoot = Split-Path (Split-Path $dockerCli.Source -Parent) -Parent
    $derivedCandidate = Join-Path $installRoot 'Docker Desktop.exe'
    if (Test-Path $derivedCandidate) { return $derivedCandidate }
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path $env:ProgramFiles 'Docker\Docker\resources\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Docker Desktop\Docker Desktop.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Docker\Docker\Docker Desktop.exe')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  throw 'Docker Desktop executable was not found.'
}

function Test-DockerReady {
  $dockerCli = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCli) { return $false }

  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $dockerCli.Source
  $startInfo.Arguments = 'info'
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true

  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $null = $process.Start()
  $null = $process.StandardOutput.ReadToEnd()
  $null = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  return $process.ExitCode -eq 0
}

function Start-DockerDesktop {
  $dockerCli = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCli) {
    & $dockerCli.Source desktop start --detach
    if ($LASTEXITCODE -eq 0) { return }
    Write-Warning 'docker desktop start failed; falling back to the Desktop executable.'
  }

  Start-Process -FilePath (Get-DockerDesktopPath) | Out-Null
}

function Get-DotEnvValue {
  param([string]$Key)
  $envPath = Join-Path $PSScriptRoot '..\.env'
  if (-not (Test-Path $envPath)) { return $null }
  foreach ($rawLine in Get-Content $envPath) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { continue }
    $candidateKey = $line.Substring(0, $separator).Trim()
    if ($candidateKey -ne $Key) { continue }
    $value = $line.Substring($separator + 1).Trim().Trim('"').Trim("'")
    return $value
  }
  return $null
}

function Ensure-Admin {
  if ($PlanOnly -or $SkipCompact -or (Test-IsAdmin)) { return }
  Write-Warning 'This helper needs an elevated PowerShell session for safe Docker VHDX compaction. A UAC prompt will open now.'
  $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
  if ($SkipCompact) { $arguments += '-SkipCompact' }
  if ($ReadOnly) { $arguments += '-ReadOnly' }
  $arguments += @('-MinFreeGb', $MinFreeGb, '-DockerTimeoutSeconds', $DockerTimeoutSeconds, '-DataHubTimeoutSeconds', $DataHubTimeoutSeconds)
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments | Out-Null
  exit 0
}

function Invoke-VhdxCompaction {
  param([string]$Path)
  if (-not (Test-Path $Path)) { throw "Docker VHDX not found: $Path" }

  $optimizeVhd = Get-Command Optimize-VHD -ErrorAction SilentlyContinue
  if ($optimizeVhd) {
    & $optimizeVhd.Source -Path $Path -Mode Full
    return
  }

  $diskpartScript = Join-Path $env:TEMP 'contextseal-diskpart.txt'
  @(
    "select vdisk file=`"$Path`"",
    'compact vdisk',
    'exit'
  ) | Set-Content -Path $diskpartScript -Encoding ASCII

  try {
    & diskpart /s $diskpartScript
    if ($LASTEXITCODE -ne 0) {
      throw "diskpart exited with code $LASTEXITCODE"
    }
  } finally {
    Remove-Item $diskpartScript -Force -ErrorAction SilentlyContinue
  }
}

function Wait-ForDocker {
  param([int]$TimeoutSeconds)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-DockerReady) { return }
    Start-Sleep -Seconds 5
  }
  throw "docker info did not succeed within $TimeoutSeconds seconds."
}

function Wait-ForDataHub {
  param([int]$TimeoutSeconds)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-NetConnection -ComputerName '127.0.0.1' -Port 8080 -InformationLevel Quiet -WarningAction SilentlyContinue) {
      return
    }
    Start-Sleep -Seconds 5
  }
  throw "DataHub GMS port 8080 did not become ready within $TimeoutSeconds seconds."
}

function Initialize-DataHubCli {
  & datahub init --host http://localhost:8080 --username datahub --password datahub --force
  if ($LASTEXITCODE -ne 0) {
    throw "datahub init exited with code $LASTEXITCODE"
  }
}

Ensure-Admin

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$vhdxPath = Get-DockerVhdxPath
$tokenConfigured = -not [string]::IsNullOrWhiteSpace((Get-DotEnvValue 'DATAHUB_GMS_TOKEN'))

Write-Step 'Current blocker snapshot'
Write-Host ("Admin: " + (Test-IsAdmin))
Write-Host ("C free GB: " + (Get-CFreeGb))
if (Test-Path $vhdxPath) {
  $vhdxSizeGb = [math]::Round((Get-Item $vhdxPath).Length / 1GB, 2)
  Write-Host ("docker_data.vhdx GB: " + $vhdxSizeGb)
}
Write-Host ("DATAHUB_GMS_TOKEN in .env: " + ($(if ($tokenConfigured) { 'SET' } else { 'UNSET' })))

if ($PlanOnly) {
  Write-Step 'Plan only mode'
  Write-Host '1. Relaunch as admin if needed.'
  Write-Host '2. Stop Docker Desktop and run offline VHDX compaction.'
  Write-Host '3. Restart Docker Desktop and wait for docker info.'
  Write-Host '4. Start local DataHub quickstart and wait for port 8080.'
  Write-Host '5. Upsert ContextSeal structured properties.'
  Write-Host '6. Run npm run datahub:seed.'
  Write-Host '7. Run npm run datahub:capture with mutations disabled.'
  if ($ReadOnly) {
    Write-Host '8. Stop after the fresh read-only MCP evidence artifact.'
  } else {
    Write-Host '8. Run npm run datahub:prove with mutations enabled to refresh write-back evidence.'
  }
  exit 0
}

Write-Step 'Preparing Docker Desktop for safe compaction'
Get-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build','com.docker.proxy' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
& wsl --shutdown

if (-not $SkipCompact) {
  Write-Step 'Compacting Docker VHDX'
  Invoke-VhdxCompaction -Path $vhdxPath
}

Write-Step 'Starting Docker Desktop'
Start-DockerDesktop
Wait-ForDocker -TimeoutSeconds $DockerTimeoutSeconds

$freeAfterDocker = Get-CFreeGb
Write-Step ('Docker is back. C free GB: ' + $freeAfterDocker)
if ($freeAfterDocker -lt $MinFreeGb) {
  throw "C: free space is $freeAfterDocker GB, below the configured safety floor of $MinFreeGb GB. Stop here and recover more space before restoring DataHub images."
}

Write-Step 'Starting local DataHub quickstart'
Push-Location $repoRoot
try {
  & datahub docker quickstart
  if ($LASTEXITCODE -ne 0) {
    throw "datahub docker quickstart exited with code $LASTEXITCODE"
  }

  Wait-ForDataHub -TimeoutSeconds $DataHubTimeoutSeconds

  Write-Step 'Initializing local DataHub CLI access'
  Initialize-DataHubCli

  Write-Step 'Upserting ContextSeal structured properties'
  & datahub properties upsert -f config/contextseal-structured-properties.yml
  if ($LASTEXITCODE -ne 0) {
    throw "datahub properties upsert exited with code $LASTEXITCODE"
  }

  $env:CONTEXTSEAL_MODE = 'datahub'
  $env:DATAHUB_MCP_TRANSPORT = 'stdio'
  $env:DATAHUB_MCP_COMMAND = 'uvx'
  $env:DATAHUB_MCP_ARGS = '["mcp-server-datahub@0.6.0"]'
  $env:DATAHUB_GMS_URL = 'http://localhost:8080'

  Write-Step 'Seeding disposable local metadata'
  & npm run datahub:seed
  if ($LASTEXITCODE -ne 0) {
    throw "npm run datahub:seed exited with code $LASTEXITCODE"
  }

  Write-Step 'Refreshing read-only MCP evidence'
  $env:DATAHUB_MCP_MUTATIONS_ENABLED = 'false'
  & npm run datahub:capture
  if ($LASTEXITCODE -ne 0) {
    throw "npm run datahub:capture exited with code $LASTEXITCODE"
  }

  if (-not $ReadOnly) {
    Write-Step 'Refreshing approved write-back evidence'
    $env:DATAHUB_MCP_MUTATIONS_ENABLED = 'true'
    & npm run datahub:prove
    if ($LASTEXITCODE -ne 0) {
      throw "npm run datahub:prove exited with code $LASTEXITCODE"
    }
  }
} finally {
  Pop-Location
}

Write-Step 'W-23 helper completed'
Write-Host 'Read artifact: examples/outputs/live-datahub-read-evidence.json'
if (-not $ReadOnly) {
  Write-Host 'Write-back artifact: examples/outputs/live-datahub-writeback-evidence.json'
}