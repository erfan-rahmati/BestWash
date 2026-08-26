param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectRoot = "C:\Users\ERFAN\Desktop\bestwash"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class BestWashWorkerSupervisorNative
{
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@

$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]1
$ES_DISPLAY_REQUIRED = [uint32]2
$keepAwakeFlags = (
  $ES_CONTINUOUS -bor
  $ES_SYSTEM_REQUIRED -bor
  $ES_DISPLAY_REQUIRED
)

$resolvedProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$workerPackage = Join-Path $resolvedProjectRoot "apps\worker\package.json"

if (-not (Test-Path -LiteralPath $workerPackage)) {
  throw "ProjectRoot must point to the BestWash repository root."
}

$keepAwakeResult = [BestWashWorkerSupervisorNative]::SetThreadExecutionState(
  $keepAwakeFlags
)

if ($keepAwakeResult -eq 0) {
  throw "Unable to activate Windows Keep Awake mode."
}

$restartCount = 0

Write-Host ""
Write-Host "BestWash Worker Supervisor is ACTIVE." -ForegroundColor Green
Write-Host "Worker will restart automatically after an unexpected exit."
Write-Host "Windows idle sleep is disabled while this window remains open."
Write-Host "Press Ctrl+C only when you want to stop the Worker." `
  -ForegroundColor Yellow

Push-Location $resolvedProjectRoot
try {
  while ($true) {
    $startedAt = Get-Date
    Write-Host ""
    Write-Host (
      "Starting Worker at {0}..." -f $startedAt.ToString("yyyy-MM-dd HH:mm:ss")
    ) -ForegroundColor Cyan

    & pnpm --filter worker start
    $workerExitCode = $LASTEXITCODE
    $runSeconds = ((Get-Date) - $startedAt).TotalSeconds

    if ($runSeconds -ge 60) {
      $restartCount = 0
    }

    $restartCount++
    $restartDelay = [Math]::Min(30, 5 * $restartCount)

    Write-Host (
      "Worker exited with code {0}; automatic restart in {1} seconds." -f `
        $workerExitCode, `
        $restartDelay
    ) -ForegroundColor Yellow

    Start-Sleep -Seconds $restartDelay
  }
}
finally {
  Pop-Location
  [void][BestWashWorkerSupervisorNative]::SetThreadExecutionState(
    $ES_CONTINUOUS
  )
}
