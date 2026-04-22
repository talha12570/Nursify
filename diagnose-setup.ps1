Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       NURSIFY - SETUP DIAGNOSTIC TOOL                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$issues = @()

# Check 1: Backend running
Write-Host "[1/7] Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 3
    Write-Host "   ✅ Backend is running on localhost:5000" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend NOT running on localhost:5000" -ForegroundColor Red
    $issues += "Backend server not running. Run: cd Server && npm start"
}

# Check 2: ngrok running
Write-Host "`n[2/7] Checking ngrok tunnel..." -ForegroundColor Yellow
try {
    $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 3
    $ngrokUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
    if ($ngrokUrl) {
        Write-Host "   ✅ ngrok tunnel active: $ngrokUrl" -ForegroundColor Green
        
        # Test ngrok URL
        try {
            $test = Invoke-RestMethod -Uri "$ngrokUrl/health" -Headers @{"ngrok-skip-browser-warning"="true"} -TimeoutSec 5
            Write-Host "   ✅ Backend accessible through ngrok" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ ngrok URL not accessible" -ForegroundColor Red
            $issues += "ngrok tunnel exists but backend not reachable through it"
        }
    } else {
        Write-Host "   ❌ No HTTPS tunnel found" -ForegroundColor Red
        $issues += "ngrok not running. Run: cd Server && ngrok http 5000"
    }
} catch {
    Write-Host "   ❌ ngrok not running" -ForegroundColor Red
    $issues += "ngrok not running. Run: cd Server && ngrok http 5000"
}

# Check 3: .env file
Write-Host "`n[3/7] Checking .env configuration..." -ForegroundColor Yellow
$envFile = "App\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'EXPO_PUBLIC_BASE_URL=(.+)') {
        $configuredUrl = $matches[1].Trim()
        Write-Host "   📄 .env URL: $configuredUrl" -ForegroundColor Gray
        
        if ($configuredUrl -match 'YOUR-NGROK|your-ngrok|placeholder') {
            Write-Host "   ⚠️  .env has placeholder URL - needs updating!" -ForegroundColor Yellow
            $issues += ".env has placeholder URL. Update with real ngrok URL"
        } elseif ($ngrokUrl -and $configuredUrl -ne $ngrokUrl) {
            Write-Host "   ⚠️  .env URL doesn't match current ngrok URL!" -ForegroundColor Yellow
            $issues += ".env URL mismatch. Update to: $ngrokUrl"
        } else {
            Write-Host "   ✅ .env configured correctly" -ForegroundColor Green
        }
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
    $issues += ".env file missing in App folder"
}

# Check 4: Metro bundler port
Write-Host "`n[4/7] Checking Metro bundler port 8081..." -ForegroundColor Yellow
$metroPort = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($metroPort) {
    Write-Host "   ✅ Metro is running on port 8081" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Metro not running (expected if you haven't started Expo yet)" -ForegroundColor Yellow
}

# Check 5: Port conflicts
Write-Host "`n[5/7] Checking for port conflicts..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
$port8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue

if ($port5000) {
    $count5000 = ($port5000 | Measure-Object).Count
    if ($count5000 -gt 1) {
        Write-Host "   ⚠️  Multiple processes on port 5000!" -ForegroundColor Yellow
        $issues += "Multiple processes using port 5000 - potential conflict"
    }
}

if ($port8081) {
    $count8081 = ($port8081 | Measure-Object).Count
    if ($count8081 -gt 1) {
        Write-Host "   ❌ Multiple processes on port 8081 - CONFLICT!" -ForegroundColor Red
        $issues += "Port 8081 conflict detected - likely manual ngrok tunnel interfering"
    }
}

# Check 6: app.json updates config
Write-Host "`n[6/7] Checking app.json configuration..." -ForegroundColor Yellow
$appJsonFile = "App\app.json"
if (Test-Path $appJsonFile) {
    $appJson = Get-Content $appJsonFile -Raw | ConvertFrom-Json
    if ($appJson.expo.updates.enabled -eq $false) {
        Write-Host "   ✅ Updates disabled (correct for development)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Updates enabled - may cause issues" -ForegroundColor Yellow
        $issues += "Set 'updates.enabled: false' in app.json"
    }
}

# Check 7: Firewall
Write-Host "`n[7/7] Checking Windows Firewall..." -ForegroundColor Yellow
$firewallRules = Get-NetFirewallRule -DisplayName "*Node*" -ErrorAction SilentlyContinue
if ($firewallRules) {
    Write-Host "   ✅ Firewall rules found for Node.js" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No firewall rules for Node.js (may block connections)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DIAGNOSTIC SUMMARY                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "✅ No issues detected! Your setup looks good.`n" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start Expo: cd App && npx expo start --tunnel --clear" -ForegroundColor White
    Write-Host "2. Clear Expo Go cache on your phone" -ForegroundColor White
    Write-Host "3. Scan the QR code`n" -ForegroundColor White
} else {
    Write-Host "❌ Found $($issues.Count) issue(s):`n" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   • $_" -ForegroundColor Yellow }
    Write-Host ""
}

Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
