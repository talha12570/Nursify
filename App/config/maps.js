/**
 * ═══════════════════════════════════════════════════════════════════
 * GOOGLE MAPS CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════
 *
 * SETUP (developer must do this before running):
 *
 *  1. Open App/.env
 *  2. Add the following line:
 *       EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBL6pktDov9nngweQ-w3wvvBnAne1Yxrx0
 *  3. Restart Expo with --clear flag:
 *       npx expo start --clear
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import Constants from 'expo-constants';

// Resolve the API key from multiple sources in priority order
const getGoogleMapsApiKey = () => {
  // Priority 1: Expo Constants extra (most reliable, loaded via app.config.js)
  const fromExtra = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (fromExtra && fromExtra !== 'undefined') return fromExtra;

  // Priority 2: Process env (Metro may inject this)
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (fromEnv && fromEnv !== 'undefined') return fromEnv;

  // Priority 3: Hard-coded fallback so the app works without .env during development.
  // WARNING: Remove or blank this out before committing to version control.
  const fallback = 'AIzaSyBL6pktDov9nngweQ-w3wvvBnAne1Yxrx0';
  if (__DEV__) {
    console.warn(
      '⚠️ [Maps Config] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not found in env. ' +
        'Using fallback key. Add the key to App/.env for production.'
    );
  }
  return fallback;
};

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();

// ─── Endpoint helpers ────────────────────────────────────────────────────────

/** Google Distance Matrix API base URL */
export const DISTANCE_MATRIX_URL =
  'https://maps.googleapis.com/maps/api/distancematrix/json';

/** Google Geocoding API base URL */
export const GEOCODING_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

// ─── Search radius stages (metres) ──────────────────────────────────────────
export const RADIUS_STAGES_M = [1000, 3000, 5000, 7000, 10000]; // 1 → 3 → 5 → 7 → 10 km

// ─── Map defaults ────────────────────────────────────────────────────────────
export const MAP_DEFAULTS = {
  /** Default delta values for MapView region (roughly 5 km view) */
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default {
  GOOGLE_MAPS_API_KEY,
  DISTANCE_MATRIX_URL,
  GEOCODING_URL,
  RADIUS_STAGES_M,
  MAP_DEFAULTS,
};
