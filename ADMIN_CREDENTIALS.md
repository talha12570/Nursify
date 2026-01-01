# Nursify Admin Credentials

## Admin Portal Login

**Admin Email:** `admin@nursify.com`  
**Admin Password:** `admin123`

⚠️ **Important:** Please change this password after your first login!

---

## How to Access Admin Portal

1. **Start the server** (if not already running):
   - Double-click `START_ALL.bat` in the Nursify folder (✨ auto-detects IP)
   - OR run: `cd Server && npm start` (✨ auto-detects IP)

2. **Start Admin Portal** (if not started by START_ALL.bat):
   - Open terminal in `Admin Portal` folder
   - Run: `npm run dev`

3. **Login to Admin Portal**:
   - Open the Admin Portal URL (shown in terminal)
   - Use the credentials above

---

## Server Configuration

✨ **IP Address Auto-Detection Enabled!**

The server automatically detects your local network IP and updates all configurations when you start it.

**Current IP:** Check the terminal output when starting the server  
**Backend Server:** `http://<auto-detected-ip>:5000`  
**API Endpoint:** `http://<auto-detected-ip>:5000/api`

**Manual IP Update:**
If you switch networks and need to manually update the IP:
```bash
cd Server
npm run update-ip
```

---

## MongoDB Connection

Your MongoDB URI is stored in: `d:\Nursify\Server\.env`

---

## Email Configuration

**SMTP Host:** Gmail (smtp.gmail.com)  
**Email From:** Your configured business email  
**Note:** Make sure you're using a Gmail App Password (not regular password)

---

## Admin Functions

The admin can:
- ✅ View all pending user verifications (nurses & caretakers)
- ✅ Approve or reject user registrations
- ✅ View user details and documents
- ✅ Manage all platform users
- ✅ View analytics and statistics

---

## Troubleshooting

**If you get "Failed to fetch pending users":**
1. Make sure the server is running on port 5000
2. Check that you're logged in as admin
3. Verify the API URL in Admin Portal matches your server IP
4. Check browser console for detailed errors

**If login fails:**
1. Verify the admin user exists (run `node createAdmin.js` in Server folder)
2. Check that credentials are correct
3. Make sure MongoDB is connected

---

**Created:** December 20, 2025
