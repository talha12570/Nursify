# PRODUCTION DEPLOYMENT GUIDE - NO NGROK

## Why Move Away from ngrok

| Issue | Impact |
|-------|--------|
| URL changes every session | Must update .env constantly |
| 2-hour timeout (free tier) | Session expires during testing |
| Rate limiting | Can't handle real traffic |
| Unreliable tunnels | Random disconnects |

---

## ✅ RECOMMENDED: Railway.app

### Step 1: Prepare Backend

```powershell
cd d:\Nursify\Server

# Create .gitignore if not exists
@'
node_modules/
.env
*.log
'@ | Out-File -FilePath .gitignore -Encoding utf8

# Initialize git
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Push to GitHub

```powershell
# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/nursify-backend.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `nursify-backend` repo
5. Railway auto-detects Node.js and deploys

### Step 4: Add Environment Variables

In Railway dashboard:
- Click your project → Variables tab
- Add all your .env variables:
  - `MONGODB_URI`
  - `JWT_SECRET_KEY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `NODE_ENV=production`

### Step 5: Get Your Permanent URL

Railway gives you: `https://nursify-backend-production.up.railway.app`

**This URL NEVER changes!**

### Step 6: Update App Configuration

```powershell
cd d:\Nursify\App
```

Update `.env`:
```env
EXPO_PUBLIC_BASE_URL=https://nursify-backend-production.up.railway.app
EXPO_PUBLIC_API_URL=https://nursify-backend-production.up.railway.app/api
```

### Step 7: Test

```powershell
# Start Expo (no ngrok needed!)
cd App
npx expo start --tunnel --clear

# App will connect to Railway backend
```

---

## Alternative: Render.com (Free Tier)

### Quick Deploy

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - **Name**: nursify-backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add environment variables (same as Railway)

6. Deploy → Get URL: `https://nursify-backend.onrender.com`

---

## Comparison

| Platform | Free Tier | Cold Starts | SSL | Custom Domain |
|----------|-----------|-------------|-----|---------------|
| **Railway** | 500 hrs/mo | No | ✅ | ✅ ($5/mo plan) |
| **Render** | Unlimited | Yes (slow) | ✅ | ✅ (paid) |
| **Fly.io** | Limited | Minimal | ✅ | ✅ |
| **ngrok** | 2hr sessions | No | ✅ | ❌ |

---

## Build Production APK

Once backend is deployed:

```powershell
cd d:\Nursify\App

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure build
eas build:configure

# Build Android APK (internal testing)
eas build --platform android --profile preview

# Build production
eas build --platform android --profile production
```

---

## Environment-Based Config

Update `App/config/api.js` for automatic detection:

```javascript
import Constants from 'expo-constants';

const getApiUrl = () => {
  // Production: Use Railway
  const productionUrl = 'https://nursify-backend-production.up.railway.app';
  
  // Development: Check env variable
  const devUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BASE_URL;
  
  // Return production URL if in release mode
  if (!__DEV__) {
    return productionUrl;
  }
  
  // Development: Use .env or fallback
  return devUrl && !devUrl.includes('YOUR-NGROK') 
    ? devUrl 
    : productionUrl;
};

export const BASE_URL = getApiUrl();
export const API_URL = `${BASE_URL}/api`;
```

This way:
- **Development with ngrok**: Uses .env URL
- **Production build**: Automatically uses Railway URL
- **No manual switching needed**

---

## Final Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 PRODUCTION SETUP                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📱 Mobile App (APK)                                   │
│          │                                              │
│          │ HTTPS                                        │
│          ▼                                              │
│  ┌──────────────────────┐                              │
│  │  Railway Backend     │                              │
│  │  (Always Online)     │                              │
│  │  Port 443            │                              │
│  └──────────┬───────────┘                              │
│             │                                           │
│             ▼                                           │
│  ┌──────────────────────┐                              │
│  │  MongoDB Atlas       │                              │
│  │  (Cloud Database)    │                              │
│  └──────────────────────┘                              │
│                                                         │
│  Benefits:                                              │
│  ✅ Permanent URL                                      │
│  ✅ Always accessible                                  │
│  ✅ No tunnel dependency                               │
│  ✅ SSL by default                                     │
│  ✅ Auto-scaling                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Cost:** $0 (Railway free tier) or $5/mo for unlimited
