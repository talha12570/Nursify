# ============================================================================
# Nursify Project Git History Backdating Script
# ============================================================================
# This script creates a Git repository with backdated commits to establish
# a proper development history for the Nursify healthcare platform.
# ============================================================================

# Configuration
$DEVELOPER1_NAME = "Talha Aslam"
$DEVELOPER1_EMAIL = "talha.aslam591@gmail.com"
$DEVELOPER2_NAME = "Muhammad Wajahat"
$DEVELOPER2_EMAIL = "47749@students.riphah.edu.pk"
$REPO_URL = "https://github.com/talha12570/Nursify.git"

# Paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$SOURCE_CODE_PATH = $SCRIPT_DIR
$TEMP_REPO_NAME = "nursify-backdated-$(Get-Date -Format 'yyyyMMddHHmmss')"
$TEMP_REPO_PATH = Join-Path $env:TEMP $TEMP_REPO_NAME

# ============================================================================
# Helper Functions
# ============================================================================

function Get-FileTimestamp {
    param([string]$FilePath)
    
    $fullPath = Join-Path $SOURCE_CODE_PATH $FilePath
    if (Test-Path $fullPath) {
        return (Get-Item $fullPath).LastWriteTime
    }
    return $null
}

function Add-RandomHours {
    param([DateTime]$DateTime)
    
    $randomHours = Get-Random -Minimum 3 -Maximum 5
    $randomMinutes = Get-Random -Minimum 0 -Maximum 61
    
    return $DateTime.AddHours($randomHours).AddMinutes($randomMinutes)
}

function Format-GitDate {
    param([DateTime]$DateTime)
    
    return $DateTime.ToString("yyyy-MM-dd HH:mm:ss")
}

# ============================================================================
# Main Commit Function
# ============================================================================

function New-SmartCommit {
    param(
        [string]$Author,
        [string]$Email,
        [string]$Message,
        [DateTime]$Timestamp,
        [string[]]$Files
    )
    
    # Add random hours to timestamp
    $CommitDate = Add-RandomHours -DateTime $Timestamp
    $FormattedDate = Format-GitDate -DateTime $CommitDate
    
    # Set Git environment variables
    $env:GIT_AUTHOR_NAME = $Author
    $env:GIT_AUTHOR_EMAIL = $Email
    $env:GIT_AUTHOR_DATE = $FormattedDate
    $env:GIT_COMMITTER_NAME = $Author
    $env:GIT_COMMITTER_EMAIL = $Email
    $env:GIT_COMMITTER_DATE = $FormattedDate
    
    # Copy files from source to repo
    foreach ($file in $Files) {
        $sourcePath = Join-Path $SOURCE_CODE_PATH $file
        $destPath = Join-Path $TEMP_REPO_PATH $file
        
        if (Test-Path $sourcePath) {
            $destDir = Split-Path -Parent $destPath
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -Path $sourcePath -Destination $destPath -Force
        }
    }
    
    # Stage all changes
    git add -A
    
    # Check if there are changes to commit
    $status = git status --porcelain
    if ($status) {
        git commit -m $Message | Out-Null
        Write-Host "[OK] " -ForegroundColor Green -NoNewline
        Write-Host "$Message" -ForegroundColor White
        Write-Host "     Date: $FormattedDate | Author: $Author" -ForegroundColor Gray
    }
}

# ============================================================================
# Main Script Execution
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Nursify Project - Git History Backdating Script" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Clean up existing temp repo if it exists
if (Test-Path $TEMP_REPO_PATH) {
    Write-Host "[+] Cleaning up existing temporary repository..." -ForegroundColor Yellow
    Remove-Item -Path $TEMP_REPO_PATH -Recurse -Force
}

# Create temporary repository
Write-Host "[+] Creating temporary repository at: $TEMP_REPO_PATH" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TEMP_REPO_PATH -Force | Out-Null
Set-Location $TEMP_REPO_PATH

# Initialize Git repository
Write-Host "[+] Initializing Git repository..." -ForegroundColor Yellow
git init | Out-Null
git branch -M main

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Creating Commits" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# COMMIT GROUPS
# ============================================================================
# Add your commit calls here using New-SmartCommit
#
# Example format:
# New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
#     -Message "Initial commit message" `
#     -Timestamp (Get-Date "2024-01-15 10:00:00") `
#     -Files @("README.md", "Server/package.json")
#
# Groups 1-13: Backend (DEVELOPER1) - Server files
# Groups 14-24: Mobile App (DEVELOPER2) - App files  
# Groups 25-32: Admin Portal (DEVELOPER2)
# Groups 33-36: Root files (DEVELOPER1)
# ============================================================================

# [ADD YOUR COMMIT CALLS HERE]

# Get earliest timestamp from actual files
Write-Host "[+] Scanning files for actual modification dates..." -ForegroundColor Yellow
$allFiles = @(
    "Server/index.js", "Server/modals/user-modals.js", "Server/middleware/auth-middleware.js",
    "App/package.json", "App/screens/login.jsx", "Admin Portal/package.json"
)
$fileTimestamps = @()
foreach ($file in $allFiles) {
    $ts = Get-FileTimestamp $file
    if ($ts) { $fileTimestamps += $ts }
}
if ($fileTimestamps.Count -gt 0) {
    $earliestTime = ($fileTimestamps | Sort-Object | Select-Object -First 1)
    Write-Host "[+] Earliest file date found: $($earliestTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Green
} else {
    $earliestTime = (Get-Date).AddMonths(-3)
    Write-Host "[!] No files found, using default: $($earliestTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Yellow
}
Write-Host ""

# Group 1: Initial Backend Setup
$serverTs = Get-FileTimestamp "Server/index.js"
if (-not $serverTs) { $serverTs = $earliestTime }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Initial backend setup for Nursify healthcare platform" `
    -Timestamp $serverTs `
    -Files @("Server/package.json", "Server/package-lock.json", "Server/.gitignore", "Server/index.js", "Server/.env.example", "Server/README.md")

# Group 2: Database
New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "MongoDB connection and database configuration" `
    -Timestamp $serverTs.AddHours(1) `
    -Files @("Server/db.js", "Server/config")

# Group 3: User Models
$userModelTs = Get-FileTimestamp "Server/modals/user-modals.js"
if (-not $userModelTs) { $userModelTs = $serverTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "User models with patient nurse caretaker admin roles" `
    -Timestamp $userModelTs `
    -Files @("Server/modals/user-modals.js")

# Group 4: Authentication
$authTs = Get-FileTimestamp "Server/middleware/auth-middleware.js"
if (-not $authTs) { $authTs = $userModelTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "JWT authentication and middleware setup" `
    -Timestamp $authTs `
    -Files @("Server/middleware/auth-middleware.js", "Server/middleware/admin-middleware.js")

# Group 5: Auth Controllers
$authCtrlTs = Get-FileTimestamp "Server/controllers/auth-controller.js"
if (-not $authCtrlTs) { $authCtrlTs = $authTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Registration login OTP verification controllers" `
    -Timestamp $authCtrlTs `
    -Files @("Server/controllers/auth-controller.js", "Server/router/auth-router.js")

# Group 6: Booking System
$bookingTs = Get-FileTimestamp "Server/modals/booking-modals.js"
if (-not $bookingTs) { $bookingTs = $authCtrlTs.AddDays(2) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Booking models and patient APIs" `
    -Timestamp $bookingTs `
    -Files @("Server/modals/booking-modals.js", "Server/controllers/patient-controllers.js", "Server/router/patient-router.js")

# Group 7: Caregiver
$caregiverTs = Get-FileTimestamp "Server/controllers/caregiver-controllers.js"
if (-not $caregiverTs) { $caregiverTs = $bookingTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Caregiver controllers and booking management" `
    -Timestamp $caregiverTs `
    -Files @("Server/controllers/caregiver-controllers.js", "Server/router/caregiver-router.js")

# Group 8: Admin
$adminTs = Get-FileTimestamp "Server/controllers/admin-controllers.js"
if (-not $adminTs) { $adminTs = $caregiverTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Admin controllers for user verification and approval" `
    -Timestamp $adminTs `
    -Files @("Server/controllers/admin-controllers.js", "Server/router/admin-router.js")

# Group 9: Cloudinary
$cloudinaryTs = Get-FileTimestamp "Server/config/cloudinary.js"
if (-not $cloudinaryTs) { $cloudinaryTs = $adminTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Cloudinary configuration for image uploads with HEIC support" `
    -Timestamp $cloudinaryTs `
    -Files @("Server/config/cloudinary.js", "Server/config/multer.js")

# Group 10: Validation
$validationTs = Get-FileTimestamp "Server/config/validation-data.js"
if (-not $validationTs) { $validationTs = $cloudinaryTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "CNIC and license validation system" `
    -Timestamp $validationTs `
    -Files @("Server/config/validation-data.js", "Server/validators")

# Group 11: Email System
$emailTs = Get-FileTimestamp "Server/modals/EmailVerificationToken.js"
if (-not $emailTs) { $emailTs = $validationTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Email verification token model and OTP system" `
    -Timestamp $emailTs `
    -Files @("Server/modals/EmailVerificationToken.js", "Server/controllers/otp-controller.js", "Server/router/otp-router.js")

# Group 12: Utility Scripts
$scriptsTs = Get-FileTimestamp "Server/createAdmin.js"
if (-not $scriptsTs) { $scriptsTs = $emailTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Admin creation and testing scripts" `
    -Timestamp $scriptsTs `
    -Files @("Server/createAdmin.js", "Server/check-admin.js", "Server/test-registration.js", "Server/test-booking.js", "Server/seedDatabase.js")

# Group 13: IP Detection
$ipTs = Get-FileTimestamp "Server/scripts/update-ip.js"
if (-not $ipTs) { $ipTs = $scriptsTs.AddDays(2) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Automatic IP detection for network switching" `
    -Timestamp $ipTs `
    -Files @("Server/scripts")

# ===== FRONTEND DEVELOPER =====

# Group 14: Mobile App Setup
$appTs = Get-FileTimestamp "App/package.json"
if (-not $appTs) { $appTs = $serverTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "React Native Expo app initialization with NativeWind" `
    -Timestamp $appTs `
    -Files @("App/package.json", "App/package-lock.json", "App/.gitignore", "App/app.json", "App/babel.config.js", "App/tailwind.config.js", "App/metro.config.js", "App/global.css")

# Group 15: Navigation
$navTs = Get-FileTimestamp "App/app/_layout.jsx"
if (-not $navTs) { $navTs = $appTs.AddHours(5) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "App navigation and layout setup" `
    -Timestamp $navTs `
    -Files @("App/app")

# Group 16: API Config
$apiConfigTs = Get-FileTimestamp "App/config/api.js"
if (-not $apiConfigTs) { $apiConfigTs = $navTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "API service layer and auto-updating config" `
    -Timestamp $apiConfigTs `
    -Files @("App/config", "App/services/api.js")

# Group 17: Auth Screens
$loginTs = Get-FileTimestamp "App/screens/login.jsx"
if (-not $loginTs) { $loginTs = $apiConfigTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Login signup OTP screens with validation" `
    -Timestamp $loginTs `
    -Files @("App/screens/login.jsx", "App/screens/signup.jsx", "App/screens/otp.jsx")

# Group 18: Onboarding
$onboardTs = Get-FileTimestamp "App/screens/splash.jsx"
if (-not $onboardTs) { $onboardTs = $loginTs.AddHours(6) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Splash screen and onboarding flow" `
    -Timestamp $onboardTs `
    -Files @("App/screens/splash.jsx", "App/screens/obnboarding.jsx")

# Group 19: Profile
$profileTs = Get-FileTimestamp "App/screens/setProfile.jsx"
if (-not $profileTs) { $profileTs = $onboardTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Profile setup and user profile pages" `
    -Timestamp $profileTs `
    -Files @("App/screens/setProfile.jsx", "App/screens/userProfile.jsx", "App/screens/profileDetail.jsx")

# Group 20: Patient Features
$patientTs = Get-FileTimestamp "App/screens/patientdashboard.jsx"
if (-not $patientTs) { $patientTs = $profileTs.AddDays(2) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Patient dashboard and booking flow" `
    -Timestamp $patientTs `
    -Files @("App/screens/patientdashboard.jsx", "App/screens/bookingflow.jsx", "App/screens/bookingconfirmation.jsx")

# Group 21: Caregiver Features
$caregiverAppTs = Get-FileTimestamp "App/screens/caregiverDashboard.jsx"
if (-not $caregiverAppTs) { $caregiverAppTs = $patientTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Caregiver dashboard and profile management" `
    -Timestamp $caregiverAppTs `
    -Files @("App/screens/caregiverDashboard.jsx", "App/screens/caregiverProfile.jsx", "App/screens/caregiverActiveBooking.jsx")

# Group 22: Tracking
$trackingTs = Get-FileTimestamp "App/screens/tracking.jsx"
if (-not $trackingTs) { $trackingTs = $caregiverAppTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Service tracking and location features" `
    -Timestamp $trackingTs `
    -Files @("App/screens/tracking.jsx", "App/screens/patientServiceTracking.jsx", "App/screens/locationPayment.jsx")

# Group 23: Pending Screens
$pendingTs = Get-FileTimestamp "App/screens/pendingVerification.jsx"
if (-not $pendingTs) { $pendingTs = $trackingTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Pending verification and approval screens" `
    -Timestamp $pendingTs `
    -Files @("App/screens/pendingVerification.jsx", "App/screens/pendingApproval.jsx")

# Group 24: Assets
$assetsTs = Get-FileTimestamp "App/assets/images/icon.png"
if (-not $assetsTs) { $assetsTs = $pendingTs.AddHours(4) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "App assets images and icons" `
    -Timestamp $assetsTs `
    -Files @("App/assets")

# ===== ADMIN PORTAL =====

# Group 25: Admin Setup
$adminPortalTs = Get-FileTimestamp "Admin Portal/package.json"
if (-not $adminPortalTs) { $adminPortalTs = $appTs.AddDays(3) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Admin portal with Vite React TypeScript Tailwind" `
    -Timestamp $adminPortalTs `
    -Files @("Admin Portal/package.json", "Admin Portal/package-lock.json", "Admin Portal/.gitignore", "Admin Portal/vite.config.ts", "Admin Portal/tailwind.config.js", "Admin Portal/tsconfig.json", "Admin Portal/index.html")

# Group 26: Admin Components
$adminCompTs = Get-FileTimestamp "Admin Portal/src/components/Layout.tsx"
if (-not $adminCompTs) { $adminCompTs = $adminPortalTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Admin portal layout sidebar header components" `
    -Timestamp $adminCompTs `
    -Files @("Admin Portal/src/components", "Admin Portal/src/App.tsx", "Admin Portal/src/main.tsx")

# Group 27: Admin Login
$adminLoginTs = Get-FileTimestamp "Admin Portal/src/pages/Login.tsx"
if (-not $adminLoginTs) { $adminLoginTs = $adminCompTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Admin authentication and login page" `
    -Timestamp $adminLoginTs `
    -Files @("Admin Portal/src/pages/Login.tsx", "Admin Portal/src/config/api.ts")

# Group 28: Admin Dashboard
$adminDashTs = Get-FileTimestamp "Admin Portal/src/pages/Dashboard.tsx"
if (-not $adminDashTs) { $adminDashTs = $adminLoginTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Admin dashboard with statistics and analytics" `
    -Timestamp $adminDashTs `
    -Files @("Admin Portal/src/pages/Dashboard.tsx", "Admin Portal/src/pages/Analytics.tsx")

# Group 29: Verification
$verifyTs = Get-FileTimestamp "Admin Portal/src/pages/VerificationCenter.tsx"
if (-not $verifyTs) { $verifyTs = $adminDashTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "User verification center for document approval" `
    -Timestamp $verifyTs `
    -Files @("Admin Portal/src/pages/VerificationCenter.tsx")

# Group 30: Management Pages
$mgmtTs = Get-FileTimestamp "Admin Portal/src/pages/UserManagement.tsx"
if (-not $mgmtTs) { $mgmtTs = $verifyTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "User and booking management pages" `
    -Timestamp $mgmtTs `
    -Files @("Admin Portal/src/pages/UserManagement.tsx", "Admin Portal/src/pages/BookingManagement.tsx")

# Group 31: Additional Pages
$addPagesTs = Get-FileTimestamp "Admin Portal/src/pages/Payments.tsx"
if (-not $addPagesTs) { $addPagesTs = $mgmtTs.AddDays(1) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Payments reviews safety monitoring pages" `
    -Timestamp $addPagesTs `
    -Files @("Admin Portal/src/pages/Payments.tsx", "Admin Portal/src/pages/Reviews.tsx", "Admin Portal/src/pages/SafetyMonitoring.tsx", "Admin Portal/src/pages/Settings.tsx")

# Group 32: Admin Styling
$adminStyleTs = Get-FileTimestamp "Admin Portal/src/index.css"
if (-not $adminStyleTs) { $adminStyleTs = $addPagesTs.AddHours(5) }

New-SmartCommit -Author $DEVELOPER2_NAME -Email $DEVELOPER2_EMAIL `
    -Message "Admin portal styling and assets" `
    -Timestamp $adminStyleTs `
    -Files @("Admin Portal/src/index.css", "Admin Portal/src/App.css", "Admin Portal/public")

# ===== ROOT FILES =====

# Group 33: Documentation
$docsTs = Get-FileTimestamp "README.md"
if (-not $docsTs) { $docsTs = $adminStyleTs.AddDays(2) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Project documentation and setup guides" `
    -Timestamp $docsTs `
    -Files @("README.md", "ADMIN_CREDENTIALS.md")

# Group 34: Startup Scripts
$startupTs = Get-FileTimestamp "START_ALL.bat"
if (-not $startupTs) { $startupTs = $docsTs.AddHours(4) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Windows batch scripts for easy startup" `
    -Timestamp $startupTs `
    -Files @("START_ALL.bat", "start-server.bat", "Server/start-server.bat")

# Group 35: Git Utilities
$gitUtilTs = Get-FileTimestamp ".gitignore"
if (-not $gitUtilTs) { $gitUtilTs = $startupTs.AddHours(2) }

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Git configuration and ignore rules" `
    -Timestamp $gitUtilTs `
    -Files @(".gitignore")

# Group 36: Remaining Files
$finalTs = (Get-Date).AddMinutes(-30)

New-SmartCommit -Author $DEVELOPER1_NAME -Email $DEVELOPER1_EMAIL `
    -Message "Additional utility files and configurations" `
    -Timestamp $finalTs `
    -Files @("Server/modals", "Server/middleware", "imgs")

# ============================================================================
# Completion and Push Instructions
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Repository Statistics" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Show commit count
$commitCount = (git rev-list --count HEAD)
Write-Host "[+] Total commits created: $commitCount" -ForegroundColor Green

# Show author statistics
Write-Host ""
Write-Host "Commits by author:" -ForegroundColor Yellow
git shortlog -sn

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Ready to Push" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository is ready at: $TEMP_REPO_PATH" -ForegroundColor Green
Write-Host ""
Write-Host "To push to GitHub, run these commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  cd `"$TEMP_REPO_PATH`"" -ForegroundColor White
Write-Host "  git remote add origin $REPO_URL" -ForegroundColor White
Write-Host "  git push -u origin main --force" -ForegroundColor White
Write-Host ""

# Ask user if they want to push now
Write-Host "Do you want to push to GitHub now? (y/n): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "[+] Adding remote and pushing to GitHub..." -ForegroundColor Yellow
    git remote add origin $REPO_URL
    git push -u origin main --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "[ERROR] Failed to push to GitHub. Please check your credentials and try manually." -ForegroundColor Red
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "[+] Skipping push. You can push manually later using the commands above." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Script Complete" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
