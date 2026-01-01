@echo off
title Nursify Server
color 0A
echo ========================================
echo Starting Nursify Server...
echo ========================================
echo.

cd /d "%~dp0Server"

echo Checking if port 5000 is in use...
netstat -ano | findstr :5000 > nul
if %ERRORLEVEL% EQU 0 (
    echo WARNING: Port 5000 is already in use!
    echo Killing existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        taskkill /F /PID %%a 2>nul
    )
    echo Killed existing process on port 5000
    timeout /t 2 /nobreak > nul
)

echo.
echo Starting Node.js server...
echo Server will be available at: http://192.168.0.106:5000
echo.
echo Keep this window open! Press Ctrl+C to stop the server
echo ========================================
echo.

node index.js

echo.
echo Server stopped!
pause
