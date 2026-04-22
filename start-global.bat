@echo off
echo ╔════════════════════════════════════════════════════════════╗
echo ║         NURSIFY - GLOBAL STARTUP (Dual Ngrok Mode)         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Starting TWO ngrok tunnels:
echo   1. Port 5000 - Backend API
echo   2. Port 8081 - Expo Metro Bundler
echo.
echo ⚠️  KEEP ALL WINDOWS OPEN!
echo.
pause

REM Start Backend ngrok tunnel
start "Ngrok - Backend (Port 5000)" cmd /k "cd /d %~dp0 && ngrok http 5000"

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start Metro ngrok tunnel
start "Ngrok - Metro (Port 8081)" cmd /k "cd /d %~dp0 && ngrok http 8081"

echo.
echo ✅ Both ngrok tunnels starting...
echo.
echo 📋 NEXT STEPS:
echo.
echo 1. Check both ngrok windows for URLs:
echo    - Backend: https://xxxx.ngrok-free.app
echo    - Metro: https://yyyy.ngrok-free.app
echo.
echo 2. Update App/.env with BOTH URLs
echo.
echo 3. Start Backend: cd Server ^&^& npm start
echo.
echo 4. Start Expo: cd App ^&^& npm start
echo.
pause
