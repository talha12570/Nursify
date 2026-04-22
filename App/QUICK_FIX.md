# 🚀 Quick Start Guide - Fix "Something Went Wrong" Error

## The Problem
Your Expo app can't connect to the backend because Windows Firewall is blocking port 5000.

## The Solution (3 Steps)

### Step 1: Add Firewall Rule (REQUIRED)

**Run PowerShell as Administrator:**
1. Press `Win + X`
2. Select "Windows PowerShell (Admin)" or "Terminal (Admin)"
3. Navigate to Nursify folder:
   ```powershell
   cd D:\Nursify
   ```
4. Run the firewall script:
   ```powershell
   .\add-firewall-rule.ps1
   ```

✅ This allows port 5000 through Windows Firewall

### Step 2: Start Backend Server

```bash
cd D:\Nursify\Server
node index.js
```

Wait for:
```
Server running at http://192.168.0.105:5000 (bound to 0.0.0.0)
```

### Step 3: Start Expo App

**New terminal:**
```bash
cd D:\Nursify\App
npm start
```

Scan the QR code with Expo Go app.

---

## ✅ Verification

Test if backend is accessible:
```bash
cd D:\Nursify\App
node scripts/test-connection.js
```

Should see:
```
✅ Server responded with status: 400
✅ Backend is accessible!
```

---

## 📱 Final Checklist

- [ ] Firewall rule added (Step 1)
- [ ] Backend running (shows "Server running at...")
- [ ] Computer and phone on same WiFi
- [ ] Expo app started with `npm start`
- [ ] QR code scanned in Expo Go

---

## 🆘 Still Having Issues?

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed help.

**Most Common Issues:**
1. ❌ Forgot to add firewall rule → Run `add-firewall-rule.ps1` as Admin
2. ❌ Different WiFi networks → Connect both to same network
3. ❌ Backend not running → Start with `node index.js`
4. ❌ Old Expo cache → Run `npm start -- --clear`

---

## 🎉 Success!

Once connected, you should see the login screen in your Expo Go app.

**Test credentials:**
- Admin: admin@nursify.com / admin123
- Or create a new account in the app
