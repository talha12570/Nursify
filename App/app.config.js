module.exports = ({ config }) => {
  // Load dotenv manually for environment variables
  require('dotenv').config();
  
  const EXPO_PUBLIC_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;
  const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;
  const EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Log configuration for debugging
  console.log('📡 [app.config.js] Environment loaded:');
  console.log('   EXPO_PUBLIC_BASE_URL:', EXPO_PUBLIC_BASE_URL || '❌ NOT SET');
  console.log('   EXPO_PUBLIC_API_URL:', EXPO_PUBLIC_API_URL || '❌ NOT SET');
  console.log('   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:', EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ SET' : '❌ NOT SET');
  
  return {
    ...config,
    extra: {
      // Pass environment variables to the app (accessible via Constants.expoConfig.extra)
      EXPO_PUBLIC_API_URL: EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_BASE_URL: EXPO_PUBLIC_BASE_URL,
      EXPO_PUBLIC_SERVER_IP: process.env.EXPO_PUBLIC_SERVER_IP,
      EXPO_PUBLIC_SERVER_PORT: process.env.EXPO_PUBLIC_SERVER_PORT,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      // Add eas for EAS Build compatibility
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'your-project-id',
      },
    },
    // Android-specific configuration for network access
    android: {
      ...config.android,
      // Allow cleartext (HTTP) traffic for development
      // This is needed if you ever need to hit HTTP endpoints
      usesCleartextTraffic: true,
      config: {
        googleMaps: {
          apiKey: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
  };
};
