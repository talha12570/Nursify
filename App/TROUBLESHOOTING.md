# 🔧 Expo App Connection Troubleshooting Guide

## ❌ Issue: "Something went wrong" when scanning QR code

This guide will help you fix connection issues between Expo Go and your backend server.

---

## ✅ Quick Fix Checklist

### 1. **Verify Backend Server is Running**
```bash
cd Server
node index.js
```

You should see:
```
Server running at http://192.168.0.105:5000 (bound to 0.0.0.0)
API available at: http://192.168.0.105:5000/api
```

### 2. **Update IP Address**
```bash
cd App
npm run update-ip
```

### 3. **Start Expo with Clean Cache**
```bash
cd App
npm start -- --clear
```

### 4. **Ensure Same Network**
- Your computer and mobile device MUST be on the same WiFi network
- Do NOT use mobile data or VPN
- Do NOT use different WiFi networks (e.g., 2.4GHz vs 5GHz)

---

## 🔥 Windows Firewall Fix (MOST COMMON ISSUE)

### Option A: Quick Allow (Recommended)

Run this in PowerShell as Administrator:

```powershell
# Allow Node.js through Windows Firewall
New-NetFirewallRule -DisplayName "Node.js Server (Port 5000)" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow

# Or allow all Node.js traffic
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### Option B: Manual Configuration

1. Open **Windows Defender Firewall with Advanced Security**
   - Press `Win + R`
   - Type: `wf.msc`
   - Press Enter

2. Click **Inbound Rules** → **New Rule**

3. Select **Port** → Next

4. Select **TCP** and enter port **5000** → Next

5. Select **Allow the connection** → Next

6. Check all profiles (Domain, Private, Public) → Next

7. Name: "Node.js Backend Server" → Finish

8. Restart your backend server

---

## 🧪 Test Connection

### From Your Computer:
```bash
cd App
node scripts/test-connection.js
```

Expected output:
```
✅ Server responded with status: 400
✅ Response received
✅ Backend is accessible!
```

### From Your Browser:
Open: `http://192.168.0.105:5000/api/auth/login`

You should see:
```json
{"message":"..."}
```

---

## 📱 Expo Go Connection Issues

### Issue: QR Code Scans But App Won't Load

**Causes:**
1. ❌ Firewall blocking port 5000
2. ❌ Different WiFi networks
3. ❌ Wrong IP address in config
4. ❌ Backend not running
5. ❌ VPN or mobile data enabled on phone

**Solutions:**

1. **Check Firewall** (see above)

2. **Verify Same Network:**
   ```bash
   # On computer (PowerShell)
   ipconfig
   
   # On phone (Settings → WiFi)
   # Should see same network name
   ```

3. **Restart Everything:**
   ```bash
   # Stop backend (Ctrl+C)
   # Stop Expo (Ctrl+C)
   
   cd Server
   node index.js
   
   # New terminal
   cd App
   npm start -- --clear
   ```

4. **Use Tunnel Mode (Backup):**
   ```bash
   cd App
   expo start --tunnel
   ```
   ⚠️ Slower but bypasses network issues

---

## 🔍 Detailed Diagnostics

### Check if Backend is Listening
```bash
netstat -ano | findstr ":5000"
```

Should show:
```
TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       12345
```

### Check IP Address
```bash
ipconfig
```

Look for **IPv4 Address** under your active network adapter (WiFi or Ethernet).

### Test API Endpoint
```bash
curl http://192.168.0.105:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"test","password":"test"}'
```

Should get a response (even if error, proves connectivity).

---

## 📋 Common Error Messages

### Error: "ECONNREFUSED"
**Meaning:** Cannot connect to server  
**Fix:** 
- Backend not running → Start it
- Firewall blocking → Allow port 5000
- Wrong IP → Run `npm run update-ip`

### Error: "ETIMEDOUT"
**Meaning:** Connection timed out  
**Fix:**
- Different networks → Connect to same WiFi
- Firewall → Allow port 5000
- VPN active → Disable VPN

### Error: "Network request failed"
**Meaning:** Expo can't reach backend  
**Fix:**
- Check if backend is running
- Verify IP address is correct
- Use tunnel mode: `expo start --tunnel`

---

## 🚀 Complete Setup from Scratch

1. **Start Backend:**
   ```bash
   cd Server
   node index.js
   ```
   Wait for: "Server running at..."

2. **New Terminal - Update IP & Start Expo:**
   ```bash
   cd App
   npm run update-ip
   npm start
   ```

3. **Add Firewall Rule:**
   - Run PowerShell as Administrator
   - Execute the firewall command above

4. **Connect Phone:**
   - Open Expo Go app
   - Scan QR code
   - Wait for app to load

5. **Troubleshoot if Needed:**
   - Check both devices on same WiFi
   - Test with: `node scripts/test-connection.js`
   - Try tunnel mode if LAN fails

---

## 📞 Still Not Working?

### Check These:

- [ ] Backend console shows "Server running at..."
- [ ] Ran `npm run update-ip` in App folder
- [ ] Computer and phone on SAME WiFi (not guest network)
- [ ] Windows Firewall allows port 5000
- [ ] No VPN active on computer or phone
- [ ] Not using mobile data on phone
- [ ] Port 5000 not used by another program
- [ ] IP address in api.js matches computer's IP
- [ ] Expo app started with `npm start -- --clear`

### Last Resort Options:

1. **Use Tunnel Mode:**
   ```bash
   expo start --tunnel
   ```
   Slower but works across different networks.

2. **Use localhost + Android Emulator:**
   ```bash
   # Update api.js SERVER_IP to 10.0.2.2
   npm run android
   ```

3. **Disable Firewall Temporarily:**
   ```bash
   # Test only - re-enable after
   netsh advfirewall set allprofiles state off
   ```

---

## 📝 Working Configuration Example

**Computer IP:** 192.168.0.105  
**Backend Port:** 5000  
**WiFi Network:** "MyHomeWifi"

**App/config/api.js:**
```javascript
const SERVER_IP = '192.168.0.105';
const SERVER_PORT = '5000';
```

**Backend Running:**
```
Server running at http://192.168.0.105:5000 (bound to 0.0.0.0)
```

**Phone:**
- Connected to "MyHomeWifi"
- Expo Go installed
- Scans QR code
- App loads and connects ✅

---

**Good luck! 🎉**
