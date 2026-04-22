@echo off
echo ========================================
echo    Clear Git History - Nursify
echo ========================================
echo.
echo WARNING: This will DELETE all commit history!
echo Your code will remain, but all commits will be removed.
echo.
set /p confirm="Are you sure? Type 'YES' to continue: "

if not "%confirm%"=="YES" (
    echo.
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo [1/6] Removing old .git folder...
if exist ".git" (
    rmdir /s /q .git
    echo ✓ Old git history removed
) else (
    echo ✓ No existing git history found
)

echo.
echo [2/6] Initializing fresh repository...
git init
git branch -M main
echo ✓ Fresh repository initialized

echo.
echo [3/6] Adding all files...
git add .
echo ✓ Files staged

echo.
echo [4/6] Creating initial commit...
git commit -m "Initial commit: Nursify Healthcare Platform"
echo ✓ Initial commit created

echo.
echo [5/6] Adding remote repository...
git remote add origin https://github.com/talha12570/nursify.git
echo ✓ Remote added

echo.
echo [6/6] Force pushing to GitHub...
echo This will overwrite the repository on GitHub!
git push -u origin main --force
echo ✓ Pushed to GitHub

echo.
echo ========================================
echo    Success!
echo ========================================
echo.
echo Your repository now has a clean history with one commit.
echo All your code is preserved, only the commit history was cleared.
echo.
pause
