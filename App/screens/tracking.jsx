/**
 * NurseTracking — live map shown inside PatientServiceTracking
 * when booking status = 'on_the_way' or 'arrived'.
 *
 * Props:
 *  bookingId      – booking._id
 *  patientLocation – { lat, lng } from useLocation hook
 *  nurseInfo       – { name, photo } already loaded from booking
 *  onArrived       – called when server reports status = 'arrived'
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';
import { MAP_DEFAULTS } from '../config/maps';

export default function NurseTracking({ bookingId, patientLocation, nurseInfo, onArrived }) {
  const [nursePosition, setNursePosition] = useState(null);
  const [trackingActive, setTrackingActive] = useState(true);
  const [bookingStatus, setBookingStatus] = useState('on_the_way');
  const [noLocationYet, setNoLocationYet] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    fetchNurseLocation(); // immediate first call
    const interval = setInterval(fetchNurseLocation, 1000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchNurseLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await axios.get(
        `${API_URL}/patient/bookings/${bookingId}/nurse-location`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data.success) return;

      setTrackingActive(res.data.trackingActive);
      setBookingStatus(res.data.status || 'on_the_way');

      if (res.data.nurse?.hasLocation) {
        const { latitude, longitude } = res.data.nurse;
        const newPos = { latitude, longitude };
        setNursePosition(newPos);
        setNoLocationYet(false);

        // Smoothly pan map to show both pin and nurse
        if (patientLocation && mapRef.current) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: patientLocation.lat, longitude: patientLocation.lng },
              newPos,
            ],
            { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
          );
        } else if (mapRef.current) {
          mapRef.current.animateCamera(
            { center: newPos, zoom: 15 },
            { duration: 800 }
          );
        }
      }

      if (res.data.status === 'arrived') {
        onArrived?.();
      }
    } catch (e) {
      // Silent — network hiccups should not break the UI
    }
  };

  const initialRegion = patientLocation
    ? {
        latitude: patientLocation.lat,
        longitude: patientLocation.lng,
        latitudeDelta: MAP_DEFAULTS.latitudeDelta,
        longitudeDelta: MAP_DEFAULTS.longitudeDelta,
      }
    : nursePosition
      ? {
          latitude: nursePosition.latitude,
          longitude: nursePosition.longitude,
          latitudeDelta: MAP_DEFAULTS.latitudeDelta,
          longitudeDelta: MAP_DEFAULTS.longitudeDelta,
        }
      : null;

  return (
    <View style={styles.container}>
      {/* Status banner */}
      <View style={[styles.banner, bookingStatus === 'arrived' && styles.bannerArrived]}>
        {bookingStatus !== 'arrived' ? (
          <>
            <View style={styles.pulseDot} />
            <Text style={styles.bannerText}>
              {nurseInfo?.name || 'Your nurse'} is on the way…
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.arrivedEmoji}>📍</Text>
            <Text style={styles.bannerText}>
              {nurseInfo?.name || 'Your nurse'} has arrived!
            </Text>
          </>
        )}
      </View>

      {/* Map */}
      {initialRegion ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {/* Patient location pin */}
          {patientLocation && (
            <Marker
              coordinate={{ latitude: patientLocation.lat, longitude: patientLocation.lng }}
              title="Your Location"
              pinColor="#1824b6"
            />
          )}

          {/* Nurse moving marker */}
          {nursePosition && (
            <Marker
              coordinate={nursePosition}
              title={nurseInfo?.name || 'Your Nurse'}
              description={bookingStatus === 'arrived' ? 'Arrived!' : 'On the way to you'}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {nurseInfo?.photo ? (
                <Image
                  source={{ uri: nurseInfo.photo }}
                  style={[
                    styles.nurseMarker,
                    { borderColor: bookingStatus === 'arrived' ? '#10b981' : '#3b82f6' },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.nurseMarkerFallback,
                    { backgroundColor: bookingStatus === 'arrived' ? '#10b981' : '#3b82f6' },
                  ]}
                >
                  <Text style={styles.nurseMarkerInitial}>
                    {nurseInfo?.name?.charAt(0) || 'N'}
                  </Text>
                </View>
              )}
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.waitingOverlayStatic}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.waitingText}>Waiting for live location...</Text>
        </View>
      )}

      {/* Overlay while waiting for first GPS ping */}
      {noLocationYet && trackingActive && (
        <View style={styles.waitingOverlay}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.waitingText}>Locating nurse…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    zIndex: 10,
  },
  bannerArrived: {
    backgroundColor: '#059669',
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#93c5fd',
  },
  arrivedEmoji: {
    fontSize: 16,
  },
  nurseMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
  },
  nurseMarkerFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  nurseMarkerInitial: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  waitingOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  waitingOverlayStatic: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  waitingText: {
    color: '#374151',
    fontSize: 13,
  },
});
