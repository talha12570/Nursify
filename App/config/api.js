/**
 * Global API Configuration
 * 
 * ═══════════════════════════════════════════════════════════════════
 * CONFIGURATION PRIORITY (highest to lowest):
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. EXPO_PUBLIC_BASE_URL environment variable (from .env file)
 * 2. Fallback URL (for development when .env is not loaded)
 * 
 * HOW TO USE:
 * 1. Start ngrok: ngrok http 5000
 * 2. Copy the HTTPS URL (e.g., https://xxxx-xxxx.ngrok-free.app)
 * 3. Update App/.env with: EXPO_PUBLIC_BASE_URL=https://your-url.ngrok-free.app
 * 4. Restart Expo with --clear flag: npx expo start --clear
 * 
 * The app will work on ANY network (WiFi, mobile data, anywhere)
 */

import Constants from 'expo-constants';

// ═══════════════════════════════════════════════════════════════════
// DYNAMIC URL RESOLUTION
// ═══════════════════════════════════════════════════════════════════

// Get URL from multiple sources (environment variables don't always load in Metro)
const getBaseUrl = () => {
  // Priority 1: Expo Constants extra config (most reliable)
  const extraUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BASE_URL;
  if (extraUrl && extraUrl !== 'undefined') {
    console.log('📡 [Config] Using URL from Constants.extra:', extraUrl);
    return extraUrl;
  }
  
  // Priority 2: Process environment variable
  const envUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (envUrl && envUrl !== 'undefined') {
    console.log('📡 [Config] Using URL from process.env:', envUrl);
    return envUrl;
  }
  
  // Priority 3: Fallback (UPDATE THIS when starting ngrok)
  // ⚠️ This URL expires! Update it or use .env file
  const fallbackUrl = 'https://YOUR-NGROK-URL-HERE.ngrok-free.app';
  console.warn('⚠️ [Config] Using FALLBACK URL - Update App/.env with your ngrok URL!');
  return fallbackUrl;
};

const NGROK_URL = getBaseUrl();

// ═══════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
export const API_URL = `${NGROK_URL}/api`;
export const BASE_URL = NGROK_URL;
export const HEALTH_CHECK_URL = `${NGROK_URL}/api/health`;

// For backward compatibility
export const SERVER_CONFIG = {
  ngrokUrl: NGROK_URL,
  apiUrl: API_URL,
  baseUrl: BASE_URL,
};

// ═══════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
export const NETWORK_CONFIG = {
  // Timeout settings (in milliseconds)
  timeout: {
    default: 15000,      // 15 seconds for normal requests
    upload: 120000,      // 2 minutes for file uploads
    health: 5000,        // 5 seconds for health checks
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  
  // Headers required for ngrok (skip browser warning)
  ngrokHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
};

// Log the configuration in development
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('📡 API Configuration:', {
    API_URL,
    BASE_URL,
    NGROK_URL,
  });
}

export default {
  API_URL,
  BASE_URL,
  NGROK_URL,
  HEALTH_CHECK_URL,
  SERVER_CONFIG,
  NETWORK_CONFIG,
};
