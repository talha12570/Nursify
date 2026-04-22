# ============================================================================
# NURSIFY - GLOBAL DEVELOPMENT STARTUP SCRIPT
# ============================================================================
# This script starts all services needed for global testing with ngrok + Expo
# ============================================================================

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     NURSIFY - STARTING GLOBAL DEVELOPMENT MODE             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Kill any existing processes
Write-Host "[1/5] Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name "ngrok","node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "      ✓ Cleanup complete`n" -ForegroundColor Green

# Step 2: Start Backend Server
Write-Host "[2/5] Starting Backend Server (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Nursify\Server'; npm start" -WindowStyle Normal
Start-Sleep -Seconds 6

# Verify backend
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 3
    Write-Host "      ✓ Backend running: $($health.status)`n" -ForegroundColor Green
} catch {
    Write-Host "      ⚠ Backend not ready yet (may still be starting)`n" -ForegroundColor Yellow
}

# Step 3: Start ngrok tunnel for Backend
Write-Host "[3/5] Starting ngrok tunnel (Backend API)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Nursify\Server'; ngrok http 5000" -WindowStyle Normal
Start-Sleep -Seconds 8

# Get ngrok URL
try {
    $tunnels = Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels'
    $ngrokUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
    Write-Host "      ✓ ngrok URL: $ngrokUrl`n" -ForegroundColor Green
} catch {
    Write-Host "      ⚠ ngrok not ready yet`n" -ForegroundColor Yellow
    $ngrokUrl = "https://doglike-lupita-subobliquely.ngrok-free.dev"
}

# Step 4: Clear Expo caches
Write-Host "[4/5] Clearing Expo caches..." -ForegroundColor Yellow
Set-Location "d:\Nursify\App"
Remove-Item .expo -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "      ✓ Caches cleared`n" -ForegroundColor Green

# Step 5: Start Expo with Tunnel
Write-Host "[5/5] Starting Expo (Metro + Tunnel)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Nursify\App'; npx expo start --tunnel --clear" -WindowStyle Normal
Write-Host "      ✓ Expo starting in separate window`n" -ForegroundColor Green

# Wait for services to initialize
Write-Host "Waiting for all services to initialize (30 seconds)..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Final Status Check
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ALL SERVICES STARTED                          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

try {
    $h = Invoke-RestMethod 'http://localhost:5000/health' -TimeoutSec 3
    Write-Host "  [✓] Backend (port 5000): $($h.status)" -ForegroundColor Green
} catch {
    Write-Host "  [✗] Backend (port 5000): Not responding" -ForegroundColor Red
}

try {
    $t = Invoke-RestMethod 'http://localhost:4040/api/tunnels'
    $bu = ($t.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
    Write-Host "  [✓] ngrok (Backend): $bu" -ForegroundColor Green
} catch {
    Write-Host "  [✗] ngrok: Not running" -ForegroundColor Red
}

try {
    $m = Invoke-WebRequest 'http://localhost:8081' -TimeoutSec 10 -UseBasicParsing
    Write-Host "  [✓] Metro Bundler (port 8081): Running" -ForegroundColor Green
} catch {
    Write-Host "  [~] Metro Bundler: Still building (check Expo window)" -ForegroundColor Yellow
}

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          WHAT TO DO ON YOUR PHONE NOW                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "  1. Open Expo Go app" -ForegroundColor White
Write-Host "  2. Settings → Apps → Expo Go → Storage → Clear storage" -ForegroundColor White
Write-Host "  3. Force close Expo Go" -ForegroundColor White
Write-Host "  4. Reopen Expo Go" -ForegroundColor White
Write-Host "  5. Look at the EXPO WINDOW on your computer" -ForegroundColor White
Write-Host "  6. Scan the QR code" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "  📱 URL format: exp://xxxxx-anonymous-8081.exp.direct" -ForegroundColor Gray
Write-Host "  🌐 API URL: $ngrokUrl" -ForegroundColor Gray
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  If you get 'Failed to download remote update' error:     ║" -ForegroundColor Yellow
Write-Host "║  → UNINSTALL Expo Go completely                            ║" -ForegroundColor Yellow
Write-Host "║  → Reinstall from Play Store                               ║" -ForegroundColor Yellow
Write-Host "║  → Scan QR code again                                      ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
