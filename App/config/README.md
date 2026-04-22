# API Configuration

## 📍 Centralized Server Configuration

All API endpoints in the application now use a single configuration file located at:
```
App/config/api.js
```

## 🔧 How to Change Server IP Address

When your network changes and you get a new IP address, follow these steps:

1. **Find your new IP address:**
   - **Windows**: Open Command Prompt (CMD) and type: `ipconfig`
     - Look for "IPv4 Address" under your active network adapter
   - **Mac/Linux**: Open Terminal and type: `ifconfig` or `ip addr`
     - Look for your local network IP (usually starts with 192.168.x.x or 10.x.x.x)

2. **Update the configuration:**
   - Open `App/config/api.js`
   - Change the `SERVER_IP` variable to your new IP address
   - Save the file

3. **Example:**
```javascript
// Before
const SERVER_IP = '192.168.0.107';

// After (with your new IP)
const SERVER_IP = '192.168.0.150';
```

## 📂 Files Updated

The following files have been updated to import from the centralized config:

### Screens
- ✅ patientdashboard.jsx
- ✅ caregiverDashboard.jsx
- ✅ setProfile.jsx
- ✅ userProfile.jsx
- ✅ signup_with_cloudinary.jsx
- ✅ profileDetail.jsx
- ✅ pendingApproval.jsx
- ✅ patientServiceTracking.jsx
- ✅ pendingVerification.jsx
- ✅ locationPayment.jsx
- ✅ caregiverProfile.jsx
- ✅ bookingflow.jsx
- ✅ caregiverActiveBooking.jsx

### Services
- ✅ services/api.js

## 🎯 Benefits

✨ **Single Point of Configuration**: Update IP in one place, affects entire app
✨ **Easy Maintenance**: No need to search through multiple files
✨ **Error Prevention**: Reduces risk of forgetting to update a file
✨ **Development Friendly**: Quick switching between different environments

## 📝 Usage Example

In any component, you can import and use the API URL:

```javascript
import { API_URL } from '../config/api';
import axios from 'axios';

// Use in your API calls
const response = await axios.get(`${API_URL}/endpoint`);
```

## 🔄 Advanced Configuration

The config file also exports:
- `BASE_URL` - Base server URL without /api
- `SERVER_CONFIG` - Object containing all server details

```javascript
import { API_URL, BASE_URL, SERVER_CONFIG } from '../config/api';

console.log(API_URL);           // http://192.168.0.107:5000/api
console.log(BASE_URL);          // http://192.168.0.107:5000
console.log(SERVER_CONFIG.ip);  // 192.168.0.107
```

## ⚠️ Important Notes

- Make sure your server is running on the configured IP and port
- Both your phone/emulator and server must be on the same network
- Restart your React Native app after changing the IP address
- For production, you should use environment variables or a proper configuration management system

---

**Last Updated**: December 2025
