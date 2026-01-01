@echo off
title Nursify - Starting All Services
color 0A
echo ========================================
echo    NURSIFY - Starting All Services
echo ========================================
echo.

echo [0/3] Detecting Network IP and Updating Configs...
cd /d "%~dp0\Server"
node scripts/update-ip.js
echo.

echo [1/3] Starting Backend Server...
start "Nursify Server" cmd /k "cd /d "%~dp0\Server" && npm start"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Admin Portal...
start "Nursify Admin Portal" cmd /k "cd /d "%~dp0\Admin Portal" && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Starting Mobile App...
start "Nursify Mobile App" cmd /k "cd /d "%~dp0\App" && npx expo start"

echo.
echo ========================================
echo    All Services Started Successfully!
echo ========================================
echo.
echo IP address auto-detected and configured!
echo Check individual terminal windows for URLs.
echo.
echo Press any key to exit this window...
pause >nul
