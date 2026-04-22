# Automatic IP Detection for Expo Go

## 🎯 Problem Solved

When developing with Expo Go, your mobile device needs to connect to your local backend server. However:
- Your local IP address changes when you switch networks (home ↔ office ↔ coffee shop)
- Hardcoding IPs in code requires manual updates every time
- This causes connection failures and development friction

## ✨ Solution

This automation **detects your current local IP and updates the `.env` file automatically** before Expo starts, ensuring your app always connects to the correct backend.

---

## 📁 Files Created/Modified

### 1. **`App/scripts/update-ip.js`** (NEW)
Node.js script that:
- Detects active local IPv4 address
- Updates `.env` file with `EXPO_PUBLIC_API_URL`
- Cross-platform compatible (Windows, macOS, Linux)

### 2. **`App/package.json`** (MODIFIED)
Added scripts:
```json
{
  "scripts": {
    "prestart": "node ./scripts/update-ip.js",  // Runs BEFORE expo start
    "update-ip": "node ./scripts/update-ip.js"   // Manual trigger
  }
}
```

### 3. **`App/config/api.js`** (MODIFIED)
Now reads from environment variables:
```javascript
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 
                       `http://${SERVER_IP}:${SERVER_PORT}/api`;
```

### 4. **`App/app.config.js`** (NEW)
Passes `.env` variables to Expo configuration

### 5. **`App/.env`** (AUTO-GENERATED)
Created automatically with:
```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
EXPO_PUBLIC_BASE_URL=http://192.168.x.x:5000
EXPO_PUBLIC_SERVER_IP=192.168.x.x
EXPO_PUBLIC_SERVER_PORT=5000
```

---

## 🚀 How It Works

### Automatic Flow (Default)
```
npm start
   ↓
prestart hook triggers
   ↓
scripts/update-ip.js runs
   ↓
Detects local IP (e.g., 192.168.1.100)
   ↓
Updates/creates .env file
   ↓
Expo starts and loads .env
   ↓
api.js reads EXPO_PUBLIC_API_URL
   ↓
App connects to correct backend ✅
```

### When You Switch Networks
```
Switch from WiFi A to WiFi B
   ↓
Run: npm start (or expo start)
   ↓
Script detects new IP automatically
   ↓
.env updates with new IP
   ↓
App connects to new IP ✅
```

---

## 💻 Usage

### Start Development (IP Auto-Detected)
```bash
cd App
npm start
```

The `prestart` hook automatically:
1. Detects your current local IP
2. Updates `.env` file
3. Starts Expo with correct configuration

### Manual IP Update (Optional)
If you need to update IP without starting Expo:
```bash
cd App
npm run update-ip
```

### Check Current Configuration
The `.env` file shows the current detected IP:
```bash
cat App/.env  # macOS/Linux
type App\.env  # Windows
```

---

## 🔧 How It Solves the IP Change Issue

### Before (Manual Configuration) ❌
```javascript
// api.js - Hardcoded IP
const SERVER_IP = '192.168.1.100';  // ⚠️ Must update manually

// Switch networks → IP changes to 192.168.2.50
// App still uses 192.168.1.100 → Connection fails ❌
```

### After (Automatic Detection) ✅
```javascript
// api.js - Reads from .env
const SERVER_IP = process.env.EXPO_PUBLIC_SERVER_IP;

// Switch networks → Run npm start
// Script detects 192.168.2.50
// .env updates automatically
// App uses 192.168.2.50 → Connection works ✅
```

---

## 🎨 Key Benefits

| Benefit | Description |
|---------|-------------|
| **Zero Manual Config** | No need to edit files when changing networks |
| **Cross-Platform** | Works on Windows, macOS, Linux |
| **Automatic** | Runs before every `expo start` |
| **Environment-Based** | Uses `.env` best practices |
| **Expo-Compatible** | Uses `EXPO_PUBLIC_*` prefix |
| **Development-Only** | No impact on production builds |

---

## 🛠️ Technical Details

### IP Detection Logic
```javascript
// Prioritizes active network interfaces:
// 1. Ethernet (eth, en)
// 2. WiFi (wlan, wi-fi)
// 3. Other valid IPv4 interfaces
// 4. Fallback to 127.0.0.1

const interfaces = os.networkInterfaces();
// Filters out internal (127.0.0.1) and IPv6 addresses
// Returns first active IPv4 address
```

### Environment Variable Pattern
Expo requires the `EXPO_PUBLIC_` prefix for variables accessible in the app:
- ✅ `EXPO_PUBLIC_API_URL` → Accessible in app
- ❌ `API_URL` → Not accessible in app

### npm Lifecycle Hooks
```json
"prestart": "node ./scripts/update-ip.js"
```
- `pre` hooks run **before** the main command
- Ensures `.env` is updated before Expo loads configuration

---

## 📋 Troubleshooting

### Issue: "Cannot find module"
**Solution:** Ensure you're in the `App` directory:
```bash
cd App
npm start
```

### Issue: IP not detected
**Solution:** Check network connection:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

### Issue: App still uses old IP
**Solution:** Restart Expo completely:
```bash
# Stop Expo (Ctrl+C)
npm start -- --clear
```

### Issue: Environment variables not loaded
**Solution:** Ensure `app.config.js` exists and restart Expo

---

## 🔐 Security Note

⚠️ **Development Only**
- This automation is for development environments
- In production, use proper environment configuration
- Never commit `.env` files with sensitive data

Add to `.gitignore`:
```gitignore
# Environment files
.env
.env.local
```

---

## 📚 Additional Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo (auto-detects IP first) |
| `npm run update-ip` | Manually update IP without starting Expo |
| `npm run android` | Start on Android (IP auto-detected) |
| `npm run ios` | Start on iOS (IP auto-detected) |

---

## 🎓 Why This Approach Works

1. **Automatic Execution:** `prestart` hook ensures script runs before every Expo start
2. **No Hardcoding:** IP is never hardcoded in source files
3. **Environment-Based:** Follows 12-factor app methodology
4. **Expo-Compatible:** Uses `EXPO_PUBLIC_*` prefix for runtime access
5. **Cross-Platform:** Node.js `os` module works on all platforms
6. **Idempotent:** Safe to run multiple times, updates only when needed

---

## 📞 Support

If you encounter issues:
1. Check that you're connected to a network
2. Verify `scripts/update-ip.js` exists
3. Ensure `app.config.js` is present
4. Try running `npm run update-ip` manually
5. Check console output for error messages

---

**Happy coding! Your Expo app will now always connect to the right backend. 🚀**
