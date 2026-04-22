# 🌐 NURSIFY - Global Testing Guide (ngrok + Expo)

## ⚡ Quick Start (3 Steps)

### Step 1: Start ngrok (Terminal 1)
```powershell
cd Server
ngrok http 5000
```
📋 **Copy** the HTTPS URL: `https://xxxx-xxxx.ngrok-free.app`

### Step 2: Update `.env` (One-time per session)
Open `App/.env` and update:
```env
EXPO_PUBLIC_BASE_URL=https://YOUR-COPIED-URL.ngrok-free.app
EXPO_PUBLIC_API_URL=https://YOUR-COPIED-URL.ngrok-free.app/api
```

### Step 3: Start Backend + Expo (Terminal 2 & 3)
```powershell
# Terminal 2 - Backend
cd Server
npm start

# Terminal 3 - Expo with tunnel mode
cd App
npx expo start --tunnel --clear
```

✅ **Done!** Scan QR code with Expo Go from ANY network.

---

## 🔍 Why This Works

| Component | What it does | Network |
|-----------|-------------|---------|
| **ngrok** | Exposes port 5000 (backend API) to internet | Global |
| **Expo --tunnel** | Exposes Metro bundler via Expo's servers | Global |
| **Backend** | Your Node.js API | localhost:5000 |

**Key Insight**: You only need ONE ngrok tunnel (for API). Expo's `--tunnel` flag handles the Metro bundler automatically!

---

## ❌ Common Mistakes & Fixes

### 1. "App gets stuck loading"
**Cause**: Metro bundler not reachable from device
**Fix**: Use `npx expo start --tunnel` (NOT `--lan`)

### 2. "API calls fail with network error"
**Cause**: Stale ngrok URL or ngrok not running
**Fix**: 
1. Check ngrok is running: `http://localhost:4040`
2. Copy fresh URL to `App/.env`
3. Restart Expo with `--clear`

### 3. "ngrok shows HTML instead of JSON"
**Cause**: Missing `ngrok-skip-browser-warning` header
**Fix**: Already fixed in your `App/services/api.js`

### 4. "Android build fails network requests"
**Cause**: Missing cleartext permissions
**Fix**: Already added `usesCleartextTraffic: true` to `app.json`

---

## 🧪 Testing Checklist

Run these commands to verify everything works:

### 1. Test ngrok is exposing backend:
```powershell
# In browser or curl
curl https://YOUR-NGROK-URL.ngrok-free.app/api/health -H "ngrok-skip-browser-warning: true"
```
Expected: `{"status":"ok","message":"API is healthy",...}`

### 2. Test from Expo app:
Open your app → Should load home screen

### 3. Test API connectivity:
Make a login/register request → Should work

---

## 📱 Expo Start Modes Explained

| Command | Use Case | Network Access |
|---------|----------|----------------|
| `npx expo start` | Default (LAN) | Same WiFi only |
| `npx expo start --lan` | Local network | Same WiFi only |
| `npx expo start --tunnel` | **Global** ✅ | Anywhere in world |
| `npx expo start --offline` | No network | Cached only |

**For global testing, ALWAYS use `--tunnel`**

---

## 🔧 Full Terminal Setup

```
┌─────────────────────────────────────────────────────────────────┐
│ TERMINAL 1 - ngrok                                               │
│ > ngrok http 5000                                                │
│                                                                  │
│ Forwarding: https://abc123.ngrok-free.app -> localhost:5000     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TERMINAL 2 - Backend                                            │
│ > cd Server && npm start                                        │
│                                                                  │
│ ✅ Server is running on port 5000                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TERMINAL 3 - Expo                                               │
│ > cd App && npx expo start --tunnel --clear                     │
│                                                                  │
│ › Metro waiting on exp://xxxxx.exp.direct:443                   │
│ › Scan QR code above with Expo Go                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Production Alternative (No ngrok needed)

For stable global access without ngrok:

1. **Deploy backend to cloud**:
   - Railway.app (free tier)
   - Render.com (free tier)
   - DigitalOcean App Platform
   - AWS/GCP/Azure

2. **Update `.env` with production URL**:
   ```env
   EXPO_PUBLIC_BASE_URL=https://your-app.railway.app
   EXPO_PUBLIC_API_URL=https://your-app.railway.app/api
   ```

3. **Build standalone app**:
   ```bash
   npx eas build --platform android --profile preview
   ```

This gives you a stable URL that never changes!
