# ═══════════════════════════════════════════════════════════════════
# NURSIFY - HOW TO RUN GLOBALLY WITH NGROK
# ═══════════════════════════════════════════════════════════════════

## ✅ Your ngrok is now configured with authtoken!

## 🚀 STEP-BY-STEP GUIDE

### Terminal 1: Start Ngrok Tunnel
```powershell
cd Server
ngrok http 5000
```

**What to look for:**
You'll see output like this:
```
Session Status                online
Account                       Your Name (Plan: Free)
Forwarding                    https://xxxx-xxxx.ngrok-free.app -> http://localhost:5000
```

**📋 COPY** that `https://xxxx-xxxx.ngrok-free.app` URL!

---

### Terminal 2: Update App Configuration

Open `App/config/api.js` and find this line (around line 23):
```javascript
const NGROK_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://doglike-lupita-subobliquely.ngrok-free.dev';
```

Replace the URL with YOUR ngrok URL:
```javascript
const NGROK_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://YOUR-NGROK-URL-HERE';
```

**Save the file!**

---

### Terminal 3: Start the Server
```powershell
cd Server
npm start
```

Wait until you see: `✅ Server running on port 5000`

---

### Terminal 4: Start the Expo App
```powershell
cd App
npx expo start --clear
```

---

## 🎉 DONE!

Your app is now accessible **globally**!
- ✅ Works on any WiFi network
- ✅ Works on mobile data  
- ✅ Works from anywhere in the world
- ✅ Share with testers anywhere

## 📱 Test It

1. Scan the Expo QR code with your phone
2. The app will connect to your server via ngrok
3. Test login, registration, booking - everything works!

---

## ⚠️ IMPORTANT NOTES

- **Keep Terminal 1 (ngrok) running** - If you close it, the URL stops working
- **Keep Terminal 3 (server) running** - Your Express backend
- **Free ngrok URLs change** every time you restart ngrok
- **8-hour session limit** on free plan
- If ngrok URL changes, update `App/config/api.js` again

---

## 🔧 QUICK COMMANDS CHEAT SHEET

Start everything (4 separate terminals):
```powershell
# Terminal 1
cd Server; ngrok http 5000

# Terminal 2  
# (Manually update App/config/api.js with ngrok URL)

# Terminal 3
cd Server; npm start

# Terminal 4
cd App; npx expo start --clear
```

---

## 🆘 TROUBLESHOOTING

### Ngrok not starting?
- Make sure port 5000 is not already in use
- Check internet connection
- Verify authtoken: `ngrok config check`

### App can't connect?
1. Verify ngrok URL in Terminal 1
2. Check App/config/api.js has correct URL
3. Make sure server is running (Terminal 3)
4. Clear Expo cache: `npx expo start --clear`

### "ERR_NGROK_108" or tunnel errors?
- Your account might have too many tunnels
- Close all other ngrok windows
- Restart ngrok

---

## 💡 PRO TIP

Create a `.env` file in the App folder:
```
EXPO_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

Then you don't need to edit `api.js` every time!
