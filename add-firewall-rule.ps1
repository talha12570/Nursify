# Add Windows Firewall Rule for Node.js Server
# Run this in PowerShell as Administrator

Write-Host "Adding Windows Firewall rule for Node.js server..." -ForegroundColor Cyan

try {
    # Check if rule already exists
    $existingRule = Get-NetFirewallRule -DisplayName "Node.js Server (Port 5000)" -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "✓ Firewall rule already exists" -ForegroundColor Green
        Remove-NetFirewallRule -DisplayName "Node.js Server (Port 5000)"
        Write-Host "  Removed old rule to recreate" -ForegroundColor Yellow
    }
    
    # Create new rule
    New-NetFirewallRule `
        -DisplayName "Node.js Server (Port 5000)" `
        -Description "Allow inbound connections to Node.js backend server on port 5000" `
        -Direction Inbound `
        -LocalPort 5000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -Enabled True
    
    Write-Host "✅ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Port 5000 is now allowed through Windows Firewall" -ForegroundColor Green
    Write-Host "Your Expo app should now be able to connect!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure you're running PowerShell as Administrator" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
