#!/bin/bash

# ============================================================================
# Nursify Healthcare Platform - Smart Backdating Script
# ============================================================================
# Reads actual file creation dates and commits 3-4 hours later
# Repository: https://github.com/USERNAME/Nursify.git (UPDATE THIS)
# Timezone: Pakistan Standard Time (UTC+5)
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Nursify - Smart Backdating with File Dates            ║"
echo "║         Commits created 3-4 hours after file creation         ║"
echo "║                   Pakistan Time (UTC+5)                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# CONFIGURATION
# ============================================================================

DEVELOPER1_NAME="Talha Aslam"
DEVELOPER1_EMAIL="talha.aslam591@gmail.com"

DEVELOPER2_NAME="Muhammad Wajahat"
DEVELOPER2_EMAIL="47749@students.riphah.edu.pk"

REPO_URL="https://github.com/talha12570/Nursify.git"
REPO_NAME="Nursify"

# Source code path - current directory
SOURCE_CODE_PATH="$(pwd)"

export TZ="Asia/Karachi"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Developer 1:  $DEVELOPER1_NAME <$DEVELOPER1_EMAIL>"
echo "  Developer 2:  $DEVELOPER2_NAME <$DEVELOPER2_EMAIL>"
echo "  Repository:   $REPO_URL"
echo "  Source Code:  $SOURCE_CODE_PATH"
echo "  Timezone:     Pakistan (UTC+5)"
echo "  Strategy:     Commits 3-4 hours after file creation"
echo ""

# ============================================================================
# FILE DATE EXTRACTION FUNCTION
# ============================================================================

get_file_date() {
    local filepath="$1"
    
    if [ ! -f "$filepath" ]; then
        echo ""
        return
    fi
    
    # Get file modification time (Unix timestamp)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        stat -f "%m" "$filepath" 2>/dev/null || echo ""
    else
        # Linux/Git Bash
        stat -c "%Y" "$filepath" 2>/dev/null || echo ""
    fi
}

# Add random hours (3-4) to timestamp
add_random_hours() {
    local timestamp="$1"
    local random_seconds=$((10800 + RANDOM % 3600))  # 3-4 hours in seconds
    echo $((timestamp + random_seconds))
}

# Convert Unix timestamp to Git date format
timestamp_to_git_date() {
    local timestamp="$1"
    date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || date -r "$timestamp" "+%Y-%m-%d %H:%M:%S"
}

# ============================================================================
# ANALYZE FILES AND GENERATE COMMIT PLAN
# ============================================================================

echo -e "${BLUE}${BOLD}Analyzing file dates...${NC}"
echo ""

declare -A file_dates
total_files=0

# Scan all relevant files (exclude .bat and .md except README.md)
for file in $(find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.css" \) | grep -v node_modules | grep -v .git); do
    timestamp=$(get_file_date "$file")
    if [ -n "$timestamp" ]; then
        file_dates["$file"]="$timestamp"
        total_files=$((total_files + 1))
    fi
done

# Add README.md specifically
if [ -f "README.md" ]; then
    timestamp=$(get_file_date "README.md")
    if [ -n "$timestamp" ]; then
        file_dates["README.md"]="$timestamp"
        total_files=$((total_files + 1))
    fi
fi

echo -e "${GREEN}Found $total_files files with dates${NC}"
echo ""

# ============================================================================
# SAFETY CHECKS
# ============================================================================

echo -e "${YELLOW}${BOLD}SAFETY CHECKS:${NC}"

if [ ! -d "Server" ] || [ ! -d "App" ]; then
    echo -e "${RED}ERROR: Server/ or App/ folder not found${NC}"
    echo "Run this script from the Nursify root directory"
    exit 1
fi

echo -e "${GREEN}✓ Nursify project structure verified${NC}"
echo ""

# ============================================================================
# CONFIRMATIONS
# ============================================================================

echo -e "${RED}${BOLD}WARNING:${NC}"
echo -e "${RED}  This will create a FRESH Git history${NC}"
echo -e "${RED}  Repository: $REPO_URL${NC}"
echo -e "${RED}  Commits will be backdated to file creation dates + 3-4 hours${NC}"
echo ""
read -p "Have you updated DEVELOPER names, emails, and REPO_URL? (type YES): " config_confirm

if [ "$config_confirm" != "YES" ]; then
    echo -e "${RED}Please update configuration first${NC}"
    exit 1
fi

echo ""
read -p "Type 'CREATE HISTORY' to proceed: " confirm

if [ "$confirm" != "CREATE HISTORY" ]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

echo -e "${GREEN}Starting...${NC}"
echo ""

# ============================================================================
# REPOSITORY SETUP
# ============================================================================

echo -e "${BLUE}${BOLD}Setting up repository...${NC}"

# Create temporary directory for new repo
TEMP_DIR="Nursify-Backdated-$(date +%s)"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

git init
git branch -M main

echo -e "${GREEN}✓ Fresh repository initialized${NC}"
echo ""

# ============================================================================
# SMART COMMIT FUNCTION
# ============================================================================

make_smart_commit() {
    local author="$1"
    local email="$2"
    local message="$3"
    local timestamp="$4"
    shift 4
    local files=("$@")
    
    # Add random 3-4 hours to timestamp
    local commit_timestamp=$(add_random_hours "$timestamp")
    local git_date=$(timestamp_to_git_date "$commit_timestamp")
    
    export GIT_AUTHOR_NAME="$author"
    export GIT_AUTHOR_EMAIL="$email"
    export GIT_COMMITTER_NAME="$author"
    export GIT_COMMITTER_EMAIL="$email"
    export GIT_AUTHOR_DATE="$git_date +0500"
    export GIT_COMMITTER_DATE="$git_date +0500"
    
    # Copy files
    for file in "${files[@]}"; do
        local source_file="$SOURCE_CODE_PATH/$file"
        if [ -f "$source_file" ] || [ -d "$source_file" ]; then
            mkdir -p "$(dirname "$file")"
            cp -r "$source_file" "$file" 2>/dev/null || true
        fi
    done
    
    git add -A
    
    if ! git diff --cached --quiet; then
        git commit -m "$message" --quiet
        echo -e "${GREEN}✓${NC} ${CYAN}$git_date${NC} - ${BOLD}$author:${NC} $message"
    fi
}

# ============================================================================
# CREATE COMMITS BASED ON FILE DATES
# ============================================================================

echo -e "${BLUE}${BOLD}Creating commits based on file creation dates...${NC}"
echo ""

# Group 1: Initial Setup (earliest files)
earliest_timestamp=$(echo "${file_dates[@]}" | tr ' ' '\n' | sort -n | head -1)

make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "initial backend setup for nursify healthcare platform" \
    "$earliest_timestamp" \
    "Server/package.json" "Server/package-lock.json" "Server/.gitignore" \
    "Server/index.js"

# Get timestamps for different modules
server_ts=$(get_file_date "Server/index.js")
app_ts=$(get_file_date "App/package.json")
admin_ts=$(get_file_date "Admin Portal/package.json")

# Group 2: Database setup
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "mongodb connection and config setup" \
    "${server_ts:-$earliest_timestamp}" \
    "Server/db.js" "Server/config/"

# Group 3: User models
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "user model with patient nurse caretaker admin roles" \
    "$(get_file_date 'Server/modals/user-modals.js')" \
    "Server/modals/user-modals.js"

# Group 4: Authentication
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "jwt auth middleware and admin middleware" \
    "$(get_file_date 'Server/middleware/auth-middleware.js')" \
    "Server/middleware/auth-middleware.js" "Server/middleware/admin-middleware.js" "Server/middleware/error-middleware.js"

# Group 5: Auth controllers and OTP
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "auth controller with registration login otp verification" \
    "$(get_file_date 'Server/controllers/auth-controller.js')" \
    "Server/controllers/auth-controller.js" "Server/router/auth-router.js" "Server/modals/EmailVerificationToken.js" "Server/controllers/otp-controller.js" "Server/router/otp-router.js"

# Group 6: Booking system
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "booking model and patient apis for booking flow" \
    "$(get_file_date 'Server/modals/booking-modals.js')" \
    "Server/modals/booking-modals.js" "Server/modals/service-modals.js" "Server/controllers/patient-controllers.js" "Server/router/patient-router.js"

# Group 7: Caregiver features
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "caregiver controllers for managing bookings" \
    "$(get_file_date 'Server/controllers/caregiver-controllers.js')" \
    "Server/controllers/caregiver-controllers.js" "Server/modals/caregiver-modals.js" "Server/router/caregiver-router.js"

# Group 8: Admin features
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "admin controllers user verification approval system" \
    "$(get_file_date 'Server/controllers/admin-controllers.js')" \
    "Server/controllers/admin-controllers.js" "Server/router/admin-router.js"

# Group 9: Cloudinary setup
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "cloudinary config with multer for image uploads" \
    "$(get_file_date 'Server/config/cloudinary.js')" \
    "Server/config/cloudinary.js" "Server/config/multer.js"

# Group 10: Validation
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "cnic and license validation with validators" \
    "$(get_file_date 'Server/config/validation-data.js')" \
    "Server/config/validation-data.js" "Server/validators/" "Server/middleware/validate-middleware.js"

# Group 11: Utility scripts
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "admin creation testing and seed scripts" \
    "$(get_file_date 'Server/createAdmin.js')" \
    "Server/createAdmin.js" "Server/check-admin.js" "Server/test-registration.js" "Server/test-booking.js" "Server/test-cloudinary.js" "Server/seedDatabase.js" "Server/add-phone-numbers.js" "Server/check-phone.js" "Server/delete-old-users.js"

# Group 12: IP detection system
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "automatic ip detection for network switching" \
    "$(get_file_date 'Server/scripts/update-ip.js')" \
    "Server/scripts/"

# Group 13: IP detection system
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "Automatic IP detection for network switching" \
    "$(get_file_date 'Server/scripts/update-ip.js')" \
    "Server/scripts/" "Server/package.json"

# ===== FRONTEND DEVELOPER (Developer 2) =====

# Group 14: Mobile app setup
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "React Native Expo app initialization with NativeWind" \
    "${app_ts:-$earliest_timestamp}" \
    "App/package.json" "App/package-lock.json" "App/.gitignore" \
    "App/app.json" "App/babel.config.js" "App/tailwind.config.js"

# Group 15: App navigation
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "App navigation and layout setup" \
    "$(get_file_date 'App/app/_layout.jsx')" \
    "App/app/" "App/global.css"

# Group 16: API configuration
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "API service layer and auto-updating config" \
    "$(get_file_date 'App/config/api.js')" \
    "App/config/" "App/services/api.js"

# Group 17: Auth screens
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Login signup OTP screens with validation" \
    "$(get_file_date 'App/screens/login.jsx')" \
    "App/screens/login.jsx" "App/screens/signup.jsx" "App/screens/otp.jsx"

# Group 18: Onboarding
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Splash screen and onboarding flow" \
    "$(get_file_date 'App/screens/splash.jsx')" \
    "App/screens/splash.jsx" "App/screens/obnboarding.jsx"

# Group 19: Profile screens
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Profile setup and user profile pages" \
    "$(get_file_date 'App/screens/setProfile.jsx')" \
    "App/screens/setProfile.jsx" "App/screens/userProfile.jsx" \
    "App/screens/profileDetail.jsx"

# Group 20: Patient features
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Patient dashboard and booking flow" \
    "$(get_file_date 'App/screens/patientdashboard.jsx')" \
    "App/screens/patientdashboard.jsx" "App/screens/bookingflow.jsx" \
    "App/screens/bookingconfirmation.jsx"

# Group 21: Caregiver features
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Caregiver dashboard and profile management" \
    "$(get_file_date 'App/screens/caregiverDashboard.jsx')" \
    "App/screens/caregiverDashboard.jsx" "App/screens/caregiverProfile.jsx" \
    "App/screens/caregiverActiveBooking.jsx"

# Group 22: Tracking features
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Service tracking and location features" \
    "$(get_file_date 'App/screens/tracking.jsx')" \
    "App/screens/tracking.jsx" "App/screens/patientServiceTracking.jsx"

# Group 23: Payment
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Location based payment screen" \
    "$(get_file_date 'App/screens/locationPayment.jsx')" \
    "App/screens/locationPayment.jsx"

# Group 24: Pending screens
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Pending verification and approval screens" \
    "$(get_file_date 'App/screens/pendingVerification.jsx')" \
    "App/screens/pendingVerification.jsx" "App/screens/pendingApproval.jsx"

# Group 25: Assets
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "App assets images and icons" \
    "$(get_file_date 'App/assets/images/icon.png')" \
    "App/assets/"

# ===== ADMIN PORTAL =====

# Group 24: Admin portal setup
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Admin portal with Vite React TypeScript Tailwind" \
    "${admin_ts:-$earliest_timestamp}" \
    "Admin Portal/package.json" "Admin Portal/package-lock.json" \
    "Admin Portal/.gitignore" "Admin Portal/vite.config.ts" \
    "Admin Portal/tailwind.config.js" "Admin Portal/tsconfig.json"

# Group 27: Admin components
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Admin portal layout sidebar header components" \
    "$(get_file_date 'Admin Portal/src/components/Layout.tsx')" \
    "Admin Portal/src/components/" "Admin Portal/src/App.tsx" \
    "Admin Portal/src/main.tsx"

# Group 28: Admin login
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Admin authentication and login page" \
    "$(get_file_date 'Admin Portal/src/pages/Login.tsx')" \
    "Admin Portal/src/pages/Login.tsx" "Admin Portal/src/config/api.ts"

# Group 29: Admin dashboard
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Admin dashboard with statistics" \
    "$(get_file_date 'Admin Portal/src/pages/Dashboard.tsx')" \
    "Admin Portal/src/pages/Dashboard.tsx"

# Group 30: Verification center
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "User verification center for document approval" \
    "$(get_file_date 'Admin Portal/src/pages/VerificationCenter.tsx')" \
    "Admin Portal/src/pages/VerificationCenter.tsx"

# Group 31: User management
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "User management and booking management pages" \
    "$(get_file_date 'Admin Portal/src/pages/UserManagement.tsx')" \
    "Admin Portal/src/pages/UserManagement.tsx" \
    "Admin Portal/src/pages/BookingManagement.tsx"

# Group 32: Additional admin pages
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Analytics payments reviews pages" \
    "$(get_file_date 'Admin Portal/src/pages/Analytics.tsx')" \
    "Admin Portal/src/pages/Analytics.tsx" \
    "Admin Portal/src/pages/Payments.tsx" \
    "Admin Portal/src/pages/Reviews.tsx"

# Group 33: Safety and settings
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Safety monitoring and settings pages" \
    "$(get_file_date 'Admin Portal/src/pages/SafetyMonitoring.tsx')" \
    "Admin Portal/src/pages/SafetyMonitoring.tsx" \
    "Admin Portal/src/pages/Settings.tsx"

# Group 34: Admin assets
make_smart_commit "$DEVELOPER2_NAME" "$DEVELOPER2_EMAIL" \
    "Admin portal styling and assets" \
    "$(get_file_date 'Admin Portal/src/index.css')" \
    "Admin Portal/src/index.css" "Admin Portal/src/App.css" \
    "Admin Portal/public/"

# ===== ROOT FILES =====

# Group 35: Documentation
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "Project documentation and setup guides" \
    "$(get_file_date 'README.md')" \
    "README.md" "QUICK_START.md" "ADMIN_CREDENTIALS.md" "GITHUB_SETUP.md"

# Group 36: Startup scripts
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "Windows batch scripts for easy startup" \
    "$(get_file_date 'START_ALL.bat')" \
    "START_ALL.bat" "start-server.bat" "Server/start-server.bat"

# Group 37: Git utilities
make_smart_commit "$DEVELOPER1_NAME" "$DEVELOPER1_EMAIL" \
    "Git setup and history management scripts" \
    "$(get_file_date 'setup-git.bat')" \
    "setup-git.bat" "clear-git-history.bat" ".gitignore"

# ============================================================================
# FINALIZE
# ============================================================================

echo ""
echo -e "${GREEN}${BOLD}✓ All commits created with backdated timestamps!${NC}"
echo ""

total=$(git log --oneline | wc -l)
dev1=$(git log --author="$DEVELOPER1_NAME" --oneline | wc -l)
dev2=$(git log --author="$DEVELOPER2_NAME" --oneline | wc -l)

echo -e "${GREEN}${BOLD}Statistics:${NC}"
echo "  Total Commits:     $total"
echo "  $DEVELOPER1_NAME:  $dev1 commits"
echo "  $DEVELOPER2_NAME:  $dev2 commits"
echo ""

echo -e "${CYAN}Recent commits:${NC}"
git log --oneline --graph --all -15 --date=format:'%Y-%m-%d %H:%M PKT' \
    --pretty=format:'%C(yellow)%h%Creset %C(cyan)%ad%Creset - %C(bold)%an:%Creset %s'
echo ""
echo ""

echo -e "${RED}${BOLD}Ready to push to GitHub!${NC}"
echo ""
echo -e "${YELLOW}Commands to push:${NC}"
echo "  cd $(pwd)"
echo "  git remote add origin $REPO_URL"
echo "  git push -u origin main --force"
echo ""

read -p "Push now? (y/n): " push_now

if [ "$push_now" = "y" ] || [ "$push_now" = "Y" ]; then
    git remote add origin "$REPO_URL"
    git push -u origin main --force
    echo ""
    echo -e "${GREEN}${BOLD}✓ Pushed to GitHub!${NC}"
fi

echo ""
echo -e "${GREEN}Done! Repository: $REPO_URL${NC}"
echo ""
