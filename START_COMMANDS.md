# 🚀 Nursify - Global Development Startup Commands

## ⚡ AUTOMATIC (Recommended)

Just run this one script:

```powershell
.\start-global-dev.ps1
```

This starts everything automatically and checks status.

---

## 📝 MANUAL COMMANDS (Step-by-Step)

If you prefer to start each service manually:

### Step 1: Clean Up Old Processes

```powershell
Get-Process -Name "ngrok","node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Start Backend Server (Terminal 1)

```powershell
cd d:\Nursify\Server
npm start
```

**Wait for:** `✅ Server is running on port 5000`

### Step 3: Start ngrok (Terminal 2)

```powershell
cd d:\Nursify\Server
ngrok http 5000
```

**Copy the HTTPS URL:** `https://xxxx.ngrok-free.dev`

### Step 4: Clear Expo Caches

```powershell
cd d:\Nursify\App
Remove-Item .expo -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 5: Start Expo (Terminal 3)

```powershell
cd d:\Nursify\App
npx expo start --tunnel --clear
```

**Wait for:** QR code to appear with URL like `exp://xxxxx-anonymous-8081.exp.direct`

---

## 📱 ON YOUR PHONE

**CRITICAL - Do this BEFORE scanning:**

1. Go to **Settings → Apps → Expo Go**
2. Tap **Storage**
3. Tap **Clear storage** (not just cache!)
4. Force close Expo Go
5. Reopen Expo Go
6. Scan the QR code from the Expo window

---

## 🔍 VERIFY EVERYTHING IS RUNNING

```powershell
# Check Backend
Invoke-RestMethod http://localhost:5000/health

# Check ngrok
Invoke-RestMethod http://localhost:4040/api/tunnels | ConvertTo-Json

# Check Metro
Invoke-WebRequest http://localhost:8081 -UseBasicParsing
```

---

## ❌ TROUBLESHOOTING

### Error: "Failed to download remote update"

**Solution:**
1. **UNINSTALL** Expo Go from phone
2. **Reinstall** from Play Store
3. Scan QR code again

### Error: Port 8081 already in use

```powershell
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess | 
    ForEach-Object { Stop-Process -Id $_ -Force }
```

### Backend not responding through ngrok

```powershell
# Restart backend
cd d:\Nursify\Server
npm start

# Restart ngrok
ngrok http 5000
```

---

## 🌍 ARCHITECTURE

```
Phone (ANY network)
    │
    ├──► Expo Tunnel → Metro 8081 (JavaScript bundle)
    │    exp://xxxxx-anonymous-8081.exp.direct
    │
    └──► ngrok → Backend 5000 (API calls)
         https://doglike-lupita-subobliquely.ngrok-free.dev
```

- **Expo Tunnel**: Uses Expo's own infrastructure (NOT ngrok)
- **ngrok**: Only for backend API (port 5000)
- **No conflict**: They use different systems

---

## 📋 QUICK REFERENCE

| Service | Port | URL |
|---------|------|-----|
| Backend | 5000 | `http://localhost:5000` |
| ngrok (Backend) | - | `https://doglike-lupita-subobliquely.ngrok-free.dev` |
| Metro | 8081 | `http://localhost:8081` |
| Expo Tunnel | - | `exp://xxxxx-anonymous-8081.exp.direct` |
| ngrok Dashboard | 4040 | `http://localhost:4040` |

---

## 🛑 STOPPING EVERYTHING

```powershell
Get-Process -Name "ngrok","node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

Or close all 3 PowerShell windows manually.
