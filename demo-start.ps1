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
$logDir = Join-Path $root '.demo-logs'
$apiLog = Join-Path $logDir 'api.log'
$webLog = Join-Path $logDir 'web.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Host ''
Write-Host '=== Contract Manager demo launcher ===' -ForegroundColor Cyan
Write-Host ''

# --- 1) Clear any stale processes on the demo ports ---
Write-Host '[1/6] Clearing stale processes on ports 5000 / 5173 / 5174...' -ForegroundColor Yellow
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

# --- 2) Make sure LocalDB is running before the API starts ---
# Without this, a cold MSSQLLocalDB instance produces SqlException 4060
# ("Cannot open database ContractManager") and the API crashes on its
# DevBypass seed query before binding to port 5000.
Write-Host '[2/6] Starting LocalDB (MSSQLLocalDB)...' -ForegroundColor Yellow
$localdb = Get-Command sqllocaldb -ErrorAction SilentlyContinue
if ($localdb) {
    try {
        & sqllocaldb start MSSQLLocalDB 2>&1 | ForEach-Object { Write-Host "       $_" }
        Start-Sleep -Seconds 3
    } catch {
        Write-Host '       sqllocaldb start failed; the API may not connect.' -ForegroundColor Red
    }
} else {
    Write-Host '       sqllocaldb command not on PATH - hoping LocalDB auto-starts.' -ForegroundColor Yellow
}

# --- 3) Make sure web dependencies are installed ---
if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Host '[3/6] Installing web dependencies (first-run only)...' -ForegroundColor Yellow
    Push-Location $webDir
    try {
        npm install --legacy-peer-deps --no-audit --no-fund
    } finally {
        Pop-Location
    }
} else {
    Write-Host '[3/6] Web dependencies already installed.' -ForegroundColor Green
}

# --- 4) Start the API in its own PowerShell window, mirroring output to a log ---
Write-Host '[4/6] Starting API on http://localhost:5000 (log: .demo-logs\api.log)...' -ForegroundColor Yellow
# Single-line semicolon-separated command - multi-line strings through
# Start-Process -ArgumentList can get mangled on some PowerShell hosts.
$apiInner = "`$Host.UI.RawUI.WindowTitle = 'Contract Manager API'; Set-Location '$apiDir'; `$env:ASPNETCORE_ENVIRONMENT = 'Development'; dotnet run --no-launch-profile --urls http://localhost:5000 2>&1 | Tee-Object -FilePath '$apiLog'"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $apiInner | Out-Null

# --- 5) Wait for the API (or detect a fatal startup error in its log) ---
Write-Host '       waiting for API to respond' -NoNewline
$apiReady = $false
$apiFatal = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-WebRequest 'http://localhost:5000/api/contracts?pageSize=1' `
            -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $apiReady = $true; break }
    } catch { }
    if (Test-Path $apiLog) {
        $logTail = Get-Content $apiLog -Tail 80 -ErrorAction SilentlyContinue
        if ($logTail -match 'Unhandled exception|Login failed for user') {
            $apiFatal = $true
            break
        }
    }
    Write-Host '.' -NoNewline
}
Write-Host ''
if (-not $apiReady) {
    Write-Host '       API did not come up. Last lines of api.log:' -ForegroundColor Red
    if (Test-Path $apiLog) {
        Get-Content $apiLog -Tail 20 | ForEach-Object { Write-Host "         $_" -ForegroundColor DarkYellow }
    }
    Write-Host ''
    Write-Host '       Most common cause: LocalDB is not running or the ContractManager' -ForegroundColor Yellow
    Write-Host '       database is not attached. Try:    sqllocaldb start MSSQLLocalDB' -ForegroundColor Yellow
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host '       API ready.' -ForegroundColor Green

# --- 6) Start the web dev server in its own PowerShell window ---
Write-Host '[5/6] Starting web dev server...' -ForegroundColor Yellow
$webInner = "`$Host.UI.RawUI.WindowTitle = 'Contract Manager Web'; Set-Location '$webDir'; npm run dev 2>&1 | Tee-Object -FilePath '$webLog'"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $webInner | Out-Null

# --- 7) Wait for the web dev server (Vite may use 5173 or fall back to 5174) ---
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
    Write-Host '       Web did not come up. Last lines of web.log:' -ForegroundColor Red
    if (Test-Path $webLog) {
        Get-Content $webLog -Tail 20 | ForEach-Object { Write-Host "         $_" -ForegroundColor DarkYellow }
    }
    Read-Host 'Press Enter to exit'
    exit 1
}
Write-Host "       Web ready at http://localhost:$webPort" -ForegroundColor Green

# --- 8) Open the browser ---
$url = "http://localhost:$webPort"
Write-Host "[6/6] Opening $url..." -ForegroundColor Cyan
Start-Process $url

Write-Host ''
Write-Host 'Both servers are running in their own windows.' -ForegroundColor Cyan
Write-Host 'Close those windows when you are done with the demo.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Bonus URLs:'
Write-Host "  Dashboard ........ $url"
Write-Host '  API explorer ..... http://localhost:5000/swagger'
Write-Host ''
Write-Host "Logs (handy if anything breaks): $logDir" -ForegroundColor DarkGray
Write-Host ''
Read-Host 'Press Enter to close this launcher window'
