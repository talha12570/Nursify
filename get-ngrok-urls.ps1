Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         GET NGROK URLS - Helper Script                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Get Backend ngrok URL
try {
    $backendUrl = (Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels').tunnels[0].public_url
    Write-Host "✅ Backend (Port 5000):" -ForegroundColor Green
    Write-Host "   $backendUrl`n" -ForegroundColor White
} catch {
    Write-Host "❌ Backend ngrok not running on port 4040`n" -ForegroundColor Red
}

# Get Metro ngrok URL
try {
    $metroUrl = (Invoke-RestMethod -Uri 'http://localhost:4041/api/tunnels').tunnels[0].public_url
    $metroDomain = $metroUrl -replace 'https://', ''
    
    Write-Host "✅ Metro (Port 8081):" -ForegroundColor Green
    Write-Host "   $metroUrl`n" -ForegroundColor White
    
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║         COPY THIS TO App/.env                              ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host "REACT_NATIVE_PACKAGER_HOSTNAME=$metroDomain`n" -ForegroundColor Cyan
    
    # Copy to clipboard
    $metroDomain | Set-Clipboard
    Write-Host "📋 Metro domain copied to clipboard!`n" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Metro ngrok not running on port 4041" -ForegroundColor Red
    Write-Host "   Check if the Metro ngrok window is open`n" -ForegroundColor Yellow
}

Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
