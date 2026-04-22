@echo off
echo Starting Expo with forced IP 192.168.0.105...
echo.

cd /d "%~dp0"

REM Set the correct IP address for Expo
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.105

REM Clear cache and start
npx expo start --clear --lan

pause
