# Contract Manager — demo launcher
# Brings up the API on http://localhost:5000 and the web dev server,
# waits for both to be ready, then opens the SPA in your default browser.
#
# Run from File Explorer: double-click demo-start.cmd (the wrapper).
# Run from a terminal:    pwsh -ExecutionPolicy Bypass -File .\demo-start.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $root 'api\src\ContractManager.Api'
$webDir = Join-Path $root 'web'

Write-Host ''
Write-Host '=== Contract Manager demo launcher ===' -ForegroundColor Cyan
Write-Host ''

# --- 1) Clear any stale processes on the demo ports ---
Write-Host '[1/5] Clearing stale processes on ports 5000 / 5173 / 5174...' -ForegroundColor Yellow
foreach ($port in 5000, 5173, 5174) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "       stopping $($proc.ProcessName) (PID $($proc.Id)) on port $port"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 1

# --- 2) Make sure web dependencies are installed ---
if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Host '[2/5] Installing web dependencies (first-run only)...' -ForegroundColor Yellow
    Push-Location $webDir
    try {
        npm install --legacy-peer-deps --no-audit --no-fund
    } finally {
        Pop-Location
    }
} else {
    Write-Host '[2/5] Web dependencies already installed.' -ForegroundColor Green
}

# --- 3) Start the API in its own PowerShell window ---
Write-Host '[3/5] Starting API on http://localhost:5000...' -ForegroundColor Yellow
$apiCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Contract Manager API'
Set-Location '$apiDir'
`$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --no-launch-profile --urls http://localhost:5000
"@
Start-Process powershell -ArgumentList '-NoExit', '-Command', $apiCmd | Out-Null

# --- 4) Wait for the API to be ready ---
Write-Host '       waiting for API to respond' -NoNewline
$apiReady = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest 'http://localhost:5000/api/contracts?pageSize=1' `
            -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $apiReady = $true; break }
    } catch { }
    Write-Host '.' -NoNewline
}
Write-Host ''
if (-not $apiReady) {
    Write-Host '       API did not come up in two minutes. Check the API window.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host '       API ready.' -ForegroundColor Green

# --- 5) Start the web dev server in its own PowerShell window ---
Write-Host '[4/5] Starting web dev server...' -ForegroundColor Yellow
$webCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Contract Manager Web'
Set-Location '$webDir'
npm run dev
"@
Start-Process powershell -ArgumentList '-NoExit', '-Command', $webCmd | Out-Null

# --- 6) Wait for the web dev server (Vite may use 5173 or fall back to 5174) ---
Write-Host '       waiting for web to respond' -NoNewline
$webPort = $null
for ($attempt = 1; $attempt -le 60; $attempt++) {
    Start-Sleep -Seconds 2
    foreach ($candidate in 5173, 5174) {
        try {
            $r = Invoke-WebRequest "http://localhost:$candidate" `
                -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200 -and $r.Content -match 'id="root"') {
                $webPort = $candidate
                break
            }
        } catch { }
    }
    if ($webPort) { break }
    Write-Host '.' -NoNewline
}
Write-Host ''
if (-not $webPort) {
    Write-Host '       Web did not come up in two minutes. Check the web window.' -ForegroundColor Red
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host "       Web ready at http://localhost:$webPort" -ForegroundColor Green

# --- 7) Open the browser ---
$url = "http://localhost:$webPort"
Write-Host "[5/5] Opening $url..." -ForegroundColor Cyan
Start-Process $url

Write-Host ''
Write-Host 'Both servers are running in their own windows.' -ForegroundColor Cyan
Write-Host 'Close those windows when you are done with the demo.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Bonus URLs:'
Write-Host "  Dashboard ........ $url"
Write-Host '  API explorer ..... http://localhost:5000/swagger'
Write-Host ''
Read-Host 'Press Enter to close this launcher window'
