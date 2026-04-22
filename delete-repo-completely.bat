@echo off
echo ========================================
echo    COMPLETELY CLEAR GitHub Repository
echo ========================================
echo.
echo WARNING: This will:
echo - Delete ALL commits and history from GitHub
echo - Remove ALL files from the repository
echo - Leave the repository completely empty
echo.
echo Your local files will NOT be deleted.
echo.
set /p confirm="Type 'DELETE' to completely clear the repository: "

if not "%confirm%"=="DELETE" (
    echo.
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo [1/5] Removing local .git folder...
if exist ".git" (
    rmdir /s /q .git
    echo Done
)

echo.
echo [2/5] Creating temporary empty repository...
git init
git branch -M main

echo.
echo [3/5] Creating empty commit...
git commit --allow-empty -m "Repository cleared"

echo.
echo [4/5] Adding remote...
git remote add origin https://github.com/talha12570/Nursify.git

echo.
echo [5/5] Force pushing to GitHub (this will delete everything)...
git push -u origin main --force

echo.
echo ========================================
echo    Repository Cleared!
echo ========================================
echo.
echo Your GitHub repository is now completely empty.
echo All commits and files have been removed from GitHub.
echo.
echo To add your code back:
echo   git add .
echo   git commit -m "Your message"
echo   git push
echo.
pause
