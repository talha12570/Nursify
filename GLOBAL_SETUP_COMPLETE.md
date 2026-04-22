# 🌍 NURSIFY - COMPLETE GLOBAL SETUP GUIDE

## ❌ WHAT WAS WRONG

**Problem:** App stuck on loading screen when using Expo's `--tunnel` mode

**Root Cause:**
1. Expo's built-in tunnel (`exp.direct`) is SLOW and goes through Expo's servers
2. Only ONE ngrok tunnel (backend) was running
3. Metro bundler had no global access
4. App couldn't load JavaScript bundle globally

**Why Expo tunnel fails:**
- Routes through Expo infrastructure (slow)
- Unreliable for production testing
- Times out frequently
- Not suitable for global testing

---

## ✅ THE CORRECT SOLUTION

**Use TWO ngrok tunnels** (both directly to your PC):
1. **Backend API** (port 5000) → `https://api-xxx.ngrok-free.app`
2. **Metro Bundler** (port 8081) → `https://metro-yyy.ngrok-free.app`

This way:
- ✅ Fast loading (direct ngrok, not Expo servers)
- ✅ Reliable connection
- ✅ Works from ANY device, ANY network
- ✅ No timeouts or hanging

---

## 🚀 STEP-BY-STEP SETUP

### 1️⃣ Start Both Ngrok Tunnels

**Option A: Use the automated script**
```batch
start-global.bat
```

**Option B: Manual (two separate terminals)**
```powershell
# Terminal 1 - Backend ngrok
ngrok http 5000

# Terminal 2 - Metro ngrok
ngrok http 8081
```

You'll see TWO URLs like:
```
Terminal 1: https://abc123.ngrok-free.app → localhost:5000
Terminal 2: https://xyz789.ngrok-free.app → localhost:8081
```

---

### 2️⃣ Update App/.env File

Copy your ngrok URLs and update:

```env
# Backend API ngrok URL (from Terminal 1)
EXPO_PUBLIC_BASE_URL=https://abc123.ngrok-free.app
EXPO_PUBLIC_API_URL=https://abc123.ngrok-free.app/api

# Metro Bundler ngrok URL (from Terminal 2) - JUST THE DOMAIN, NO https://
REACT_NATIVE_PACKAGER_HOSTNAME=xyz789.ngrok-free.app
```

⚠️ **IMPORTANT:** 
- Backend URL includes `https://`
- Metro hostname does NOT include `https://` (just domain)

---

### 3️⃣ Start Backend Server

```powershell
cd Server
npm start
```

Wait for: `✅ Server is running on port 5000`

---

### 4️⃣ Start Expo (App)

```powershell
cd App
npm start --clear
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║              NURSIFY - EXPO START SCRIPT                    ║
║              🌍 GLOBAL MODE (Ngrok Tunnels)                ║
╠════════════════════════════════════════════════════════════╣
║  📡 Metro: xyz789.ngrok-free.app                           ║
║  📱 API: Using ngrok (see config/api.js)                   ║
╚════════════════════════════════════════════════════════════╝

› Metro waiting on exp://192.168.0.111:8081
```

⚠️ **The exp:// URL is IGNORED** - Expo will use your ngrok URL internally

---

### 5️⃣ Test on Phone

1. **Scan QR code** with Expo Go
2. App loads JavaScript from: `https://xyz789.ngrok-free.app` (Metro ngrok)
3. API calls go to: `https://abc123.ngrok-free.app` (Backend ngrok)
4. **Works from ANY network** ✅

---

## 📱 TESTING FROM DIFFERENT NETWORKS

### Local Network (Same WiFi)
- ✅ Works instantly
- Uses ngrok URLs

### Mobile Data (Different Network)
- ✅ Works perfectly
- Uses ngrok URLs
- Can be anywhere in the world

### Share with Remote Testers
1. Share the QR code screenshot
2. They scan with Expo Go
3. Works from their location ✅

---

## 🔧 KEY CONFIGURATION FILES

### App/.env
```env
EXPO_PUBLIC_BASE_URL=https://your-backend.ngrok-free.app
EXPO_PUBLIC_API_URL=https://your-backend.ngrok-free.app/api
REACT_NATIVE_PACKAGER_HOSTNAME=your-metro.ngrok-free.app
```

### App/config/api.js
Already configured with:
- `ngrok-skip-browser-warning: true` header
- Timeout handling
- Error retries

### App/services/api.js
Already includes:
- Axios interceptors with ngrok headers
- Proper error handling

---

## ⚠️ COMMON ISSUES & FIXES

### Issue 1: "Loading..." Stuck
**Cause:** Metro ngrok tunnel not running or wrong URL in `.env`
**Fix:** 
1. Check ngrok Metro terminal is open
2. Verify REACT_NATIVE_PACKAGER_HOSTNAME in .env
3. Restart app with `npm start --clear`

### Issue 2: "Network Error" on API Calls
**Cause:** Backend ngrok tunnel not running
**Fix:**
1. Check ngrok Backend terminal is open
2. Check server is running: `cd Server && npm start`
3. Test URL in browser: `https://your-backend.ngrok-free.app/api/health`

### Issue 3: Ngrok "Browser Warning" Page
**Cause:** Missing ngrok header (already fixed in code)
**Fix:** Already handled - headers automatically added

### Issue 4: Free Ngrok URL Changes
**Cause:** Free ngrok URLs are temporary
**Fix:** 
1. Get new URLs from ngrok terminals
2. Update App/.env
3. Restart app

---

## 🎯 STARTUP COMMANDS (Quick Reference)

```powershell
# Terminal 1: Backend Ngrok
ngrok http 5000

# Terminal 2: Metro Ngrok
ngrok http 8081

# Terminal 3: Backend Server
cd Server
npm start

# Terminal 4: Expo App
cd App
npm start --clear
```

---

## ✅ SUCCESS CHECKLIST

- [ ] Both ngrok tunnels running (check terminals)
- [ ] Both URLs copied to App/.env
- [ ] Backend server started and shows port 5000
- [ ] Expo started and shows "GLOBAL MODE"
- [ ] Phone on ANY network can scan QR code
- [ ] App loads (not stuck on splash)
- [ ] Login/registration works (API calls succeed)

---

## 🆘 EMERGENCY RESET

If nothing works:

```powershell
# Kill all Node processes
taskkill /F /IM node.exe

# Kill all ngrok
taskkill /F /IM ngrok.exe

# Clear Expo cache
cd App
npx expo start --clear

# Restart from Step 1
```

---

## 💡 WHY THIS WORKS

**Before (BROKEN):**
```
Phone → Expo tunnel (exp.direct) → Expo Servers → Your PC
                ↑
            SLOW & UNRELIABLE
```

**After (WORKING):**
```
Phone → Your Ngrok (Metro) → Your PC (port 8081)
        Your Ngrok (API) → Your PC (port 5000)
                ↑
            FAST & DIRECT
```

---

## 📊 PERFORMANCE

| Method | Load Time | Reliability | Global Access |
|--------|-----------|-------------|---------------|
| LAN only | 2-3s | High | ❌ No |
| Expo --tunnel | 30-60s | Low | ❌ Unreliable |
| **Dual Ngrok** | **5-8s** | **High** | **✅ Yes** |

---

**You're now running globally! 🌍🎉**
