# 🚀 Production Architecture for Nursify (No ngrok needed)

## Current Problem with ngrok

| Issue | Impact |
|-------|--------|
| URL changes every restart (free tier) | Must update `.env` constantly |
| Session expires after 2 hours | App breaks mid-testing |
| Rate limits | Can't handle real traffic |
| Reliability | Tunnel can disconnect randomly |

## ✅ Recommended Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SETUP                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐       ┌──────────────────┐                      │
│   │   Mobile     │       │   Backend API    │                      │
│   │   (Expo Go   │──────▶│   (Node.js)      │                      │
│   │   or APK)    │ HTTPS │                  │                      │
│   └──────────────┘       └────────┬─────────┘                      │
│                                   │                                 │
│                                   ▼                                 │
│                          ┌──────────────────┐                      │
│                          │   MongoDB Atlas  │                      │
│                          │   (Cloud DB)     │                      │
│                          └──────────────────┘                      │
│                                                                     │
│   Backend hosted on: Railway / Render / Fly.io / DigitalOcean     │
│   Database on: MongoDB Atlas (free tier available)                 │
│   CDN/Storage: Cloudinary (already configured)                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Option 1: Railway.app (Recommended - Easiest)

### Setup (5 minutes)

1. **Push code to GitHub**
```powershell
cd Server
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/nursify-backend.git
git push -u origin main
```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub"
   - Select your repo
   - Railway auto-detects Node.js and deploys

3. **Add Environment Variables**
   - In Railway dashboard → Variables
   - Add all your `.env` values (MONGODB_URI, JWT_SECRET, etc.)

4. **Get Your URL**
   - Railway gives you: `https://nursify-backend.up.railway.app`
   - This URL is **permanent** and never changes!

5. **Update App/.env**
```env
EXPO_PUBLIC_BASE_URL=https://nursify-backend.up.railway.app
EXPO_PUBLIC_API_URL=https://nursify-backend.up.railway.app/api
```

### Railway Pricing
- **Free tier**: 500 hours/month (enough for development)
- **Hobby**: $5/month (unlimited)

---

## Option 2: Render.com (Free Tier Available)

### Setup

1. Go to [render.com](https://render.com)
2. Create "Web Service"
3. Connect GitHub repo
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

### render.yaml (add to Server folder)
```yaml
services:
  - type: web
    name: nursify-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET_KEY
        sync: false
```

---

## Option 3: Fly.io (Global Edge Deployment)

Best for apps needing low latency worldwide.

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and deploy
cd Server
fly launch
fly deploy
```

---

## Option 4: DigitalOcean App Platform

### Setup
1. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Create App → Choose GitHub
3. Select repo and branch
4. Configure environment variables
5. Deploy

### Pricing
- **Basic**: $5/month (512MB RAM)
- **Professional**: $12/month (1GB RAM)

---

## MongoDB Atlas (Free Cloud Database)

If not already using Atlas:

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster (M0 Sandbox)
3. Get connection string:
```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/nursify?retryWrites=true&w=majority
```
4. Add to Railway/Render environment variables

---

## Environment-Based Config (Best Practice)

Update `App/config/api.js` for automatic environment detection:

```javascript
const getApiUrl = () => {
  // Production (deployed backend)
  if (!__DEV__) {
    return 'https://nursify-backend.up.railway.app';
  }
  
  // Development with ngrok
  const ngrokUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (ngrokUrl && !ngrokUrl.includes('YOUR-NGROK')) {
    return ngrokUrl;
  }
  
  // Local development fallback
  return 'http://192.168.1.100:5000';
};
```

---

## Final Recommendation

| Stage | Solution | URL Type |
|-------|----------|----------|
| **Local Dev** | `npm start` + same WiFi | `http://192.168.x.x:5000` |
| **Remote Testing** | ngrok | `https://xxx.ngrok-free.app` |
| **Staging/QA** | Railway free tier | `https://xxx.up.railway.app` |
| **Production** | Railway/Render paid | Custom domain possible |

---

## Quick Migration Checklist

- [ ] Create Railway/Render account
- [ ] Push Server to GitHub
- [ ] Deploy to cloud platform
- [ ] Add environment variables
- [ ] Update `App/.env` with production URL
- [ ] Test on Expo Go
- [ ] Build APK for distribution: `npx eas build --platform android`

This gives you a **stable, always-on backend** without ngrok hassles!
