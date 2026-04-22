/**
 * ═══════════════════════════════════════════════════════════════════
 * useLocation – React hook for device GPS
 * ═══════════════════════════════════════════════════════════════════
 *
 * Returns:
 *  location   – { lat, lng } or null
 *  error      – human-readable error string or null
 *  loading    – true while waiting for permission / fix
 *  refresh    – call to re-request location
 *  permission – 'granted' | 'denied' | 'pending'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

const useLocation = ({
  autoRequest = true,
  watch = false,
  watchTimeIntervalMs = 10000,
  watchDistanceIntervalM = 10,
  accuracy = Location.Accuracy.BestForNavigation,
} = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('pending');
  const watchSubscriptionRef = useRef(null);

  const requestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ── 1. Check / request permission ────────────────────────────
      const { status: existingStatus } =
        await Location.getForegroundPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPermission('denied');
        setError('Location permission denied. Enable it in Settings to find nearby caregivers.');
        setLoading(false);

        Alert.alert(
          'Location Access Required',
          'Nursify needs your location to find nearby caregivers. Open Settings to allow location access.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      setPermission('granted');

      // ── 2. Get current position ──────────────────────────────────
      const pos = await Location.getCurrentPositionAsync({
        accuracy,
        timeout: 15000,
      });

      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });

      if (watch && !watchSubscriptionRef.current) {
        watchSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy,
            timeInterval: watchTimeIntervalMs,
            distanceInterval: watchDistanceIntervalM,
          },
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          }
        );
      }
    } catch (err) {
      console.error('[useLocation] Error:', err);
      setError('Unable to retrieve your location. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accuracy, watch, watchDistanceIntervalM, watchTimeIntervalMs]);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, [autoRequest, requestLocation]);

  return {
    location,
    error,
    loading,
    permission,
    refresh: requestLocation,
  };
};

export default useLocation;
