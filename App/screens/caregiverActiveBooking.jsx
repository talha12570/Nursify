import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { API_URL } from '../config/api';
import { MAP_DEFAULTS } from '../config/maps';
import ReviewSubmission from './reviewSubmission';

const START_SERVICE_MAX_DISTANCE_M = 50;

const toRad = (deg) => (deg * Math.PI) / 180;

const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * @param {Object} props
 * @param {Object} props.bookingData - The confirmed booking data
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onComplete]
 * @param {() => void} [props.onCancelled]
 */
export default function CaregiverActiveBooking({ bookingData: initialBooking, onBack, onComplete, onCancelled } = {}) {
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [distanceToPatientM, setDistanceToPatientM] = useState(null);
  const [caregiverLiveCoords, setCaregiverLiveCoords] = useState(null);
  const locationSubRef = useRef(null); // expo-location watch subscription
  const mapLocationSubRef = useRef(null); // local map-only location watch
  const mapRef = useRef(null);

  const shouldTrackCaregiverLocation = (status) => status === 'on_the_way' || status === 'arrived';

  const saveCaregiverLiveCoords = (coords) => {
    const latitude = Number(coords?.latitude);
    const longitude = Number(coords?.longitude);
    const accuracy = Number(coords?.accuracy);
    const timestamp = Number(coords?.timestamp) || Date.now();

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setCaregiverLiveCoords({
      lat: latitude,
      lng: longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      timestamp,
    });
  };

  const getPatientCoords = () => {
    const bookingLat = Number(booking?.patientLatitude);
    const bookingLng = Number(booking?.patientLongitude);
    if (
      Number.isFinite(bookingLat) &&
      Number.isFinite(bookingLng) &&
      bookingLat >= -90 && bookingLat <= 90 &&
      bookingLng >= -180 && bookingLng <= 180 &&
      !(bookingLat === 0 && bookingLng === 0)
    ) {
      return { lat: bookingLat, lng: bookingLng };
    }

    return null;
  };

  const checkDistanceToPatient = async () => {
    const patientCoords = getPatientCoords();
    if (!patientCoords) {
      setDistanceToPatientM(null);
      return {
        ok: false,
        distance: null,
        reason: 'Patient location is unavailable or invalid. Ask patient to set exact map location and create a new booking.',
      };
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { ok: false, distance: null, reason: 'Location permission is required to start service.' };
    }

    const candidates = [];

    // Candidate A: latest live-tracking position (usually freshest while on_the_way/arrived)
    if (
      caregiverLiveCoords &&
      Number.isFinite(caregiverLiveCoords.lat) &&
      Number.isFinite(caregiverLiveCoords.lng)
    ) {
      candidates.push({
        lat: caregiverLiveCoords.lat,
        lng: caregiverLiveCoords.lng,
        accuracy: Number.isFinite(caregiverLiveCoords.accuracy) ? caregiverLiveCoords.accuracy : 9999,
        timestamp: Number.isFinite(caregiverLiveCoords.timestamp) ? caregiverLiveCoords.timestamp : 0,
      });
    }

    // Candidate B: one-shot fresh GPS read
    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 12000,
      });

      candidates.push({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        accuracy: Number.isFinite(current.coords.accuracy) ? current.coords.accuracy : 9999,
        timestamp: Number.isFinite(current.timestamp) ? current.timestamp : Date.now(),
      });

      saveCaregiverLiveCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
        timestamp: current.timestamp,
      });
    } catch (_e) {
      // Keep going with live-tracking candidate if available.
    }

    if (candidates.length === 0) {
      return {
        ok: false,
        distance: null,
        reason: 'Unable to fetch your live location. Please wait a few seconds and try again.',
      };
    }

    // Prefer better GPS accuracy, then fresher timestamp.
    candidates.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.timestamp - a.timestamp;
    });

    const best = candidates[0];
    const distance = distanceMeters(best.lat, best.lng, patientCoords.lat, patientCoords.lng);
    setDistanceToPatientM(distance);

    return {
      ok: distance <= START_SERVICE_MAX_DISTANCE_M,
      distance,
      reason: `You are ${distance}m away from patient. Move within ${START_SERVICE_MAX_DISTANCE_M}m to start service.`,
    };
  };

  // ── Clean up location watch on unmount ──────────────────────────────────
  useEffect(() => {
    startMapLocationTracking();
    return () => {
      stopLocationTracking();
      stopMapLocationTracking();
    };
  }, []);

  const startMapLocationTracking = async () => {
    if (mapLocationSubRef.current) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[MapTracking] Location permission denied.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 12000,
      });
      saveCaregiverLiveCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        accuracy: current.coords.accuracy,
        timestamp: current.timestamp,
      });

      mapLocationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (position) => {
          saveCaregiverLiveCoords({
            latitude: position?.coords?.latitude,
            longitude: position?.coords?.longitude,
            accuracy: position?.coords?.accuracy,
            timestamp: position?.timestamp,
          });
        }
      );
    } catch (e) {
      console.warn('[MapTracking] Could not start map tracking:', e.message);
    }
  };

  const stopMapLocationTracking = () => {
    if (mapLocationSubRef.current) {
      mapLocationSubRef.current.remove();
      mapLocationSubRef.current = null;
    }
  };

  const startLocationTracking = async () => {
    if (locationSubRef.current) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Tracking] Location permission denied — live tracking disabled.');
        return;
      }
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          saveCaregiverLiveCoords({
            latitude,
            longitude,
            accuracy,
            timestamp: position.timestamp,
          });
          try {
            const token = await AsyncStorage.getItem('authToken');
            await axios.post(
              `${API_URL}/caregiver/heartbeat`,
              { latitude, longitude, accuracy },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (e) {
            // Silent fail — tracking is best-effort
            console.warn('[Tracking] Heartbeat failed:', e.message);
          }
        }
      );
      console.log('[Tracking] Location tracking started.');

      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 12000,
      });
      saveCaregiverLiveCoords({
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
        accuracy: initialPosition.coords.accuracy,
        timestamp: initialPosition.timestamp,
      });
    } catch (e) {
      console.warn('[Tracking] Could not start location tracking:', e.message);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
      console.log('[Tracking] Location tracking stopped.');
    }
  };

  useEffect(() => {
    // Poll for status updates every 3 seconds
    const interval = setInterval(() => {
      fetchBookingStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [booking?._id]);

  useEffect(() => {
    if (shouldTrackCaregiverLocation(booking?.status)) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [booking?.status]);

  const fetchBookingStatus = async () => {
    try {
      if (!booking?._id) return;

      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `${API_URL}/caregiver/bookings`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const updatedBooking = response.data.bookings.find(b => b._id === booking._id);
        if (updatedBooking) {
          if (updatedBooking.status === 'cancelled') {
            Alert.alert(
              'Booking Cancelled',
              'This booking was cancelled by the patient.',
              [{ text: 'OK', onPress: () => onCancelled?.() }]
            );
            return;
          }

          setBooking(updatedBooking);
          
          // Log when booking reaches completed_confirmed
          if (updatedBooking.status === 'completed_confirmed') {
            console.log('Booking is completed_confirmed:', {
              caregiverReviewSubmitted: updatedBooking.caregiverReviewSubmitted,
              _id: updatedBooking._id
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching booking status:', error);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await axios.put(
        `${API_URL}/caregiver/bookings/${booking._id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const updatedBooking = response.data.booking;
        setBooking(updatedBooking);
        
        // ── Start / stop GPS tracking based on status ──────────────────
        if (shouldTrackCaregiverLocation(newStatus)) {
          startLocationTracking();
        } else if (newStatus === 'service_started' || newStatus === 'service_completed') {
          stopLocationTracking();
        }

        console.log('Booking after status update:', {
          status: updatedBooking.status,
          caregiverReviewSubmitted: updatedBooking.caregiverReviewSubmitted,
          _id: updatedBooking._id
        });
        
        const messages = {
          'on_the_way': 'Status updated: On the Way',
          'arrived': 'Status updated: Arrived at Location',
          'service_started': 'Service Started Successfully',
          'service_completed': 'Service Marked as Completed'
        };

        Alert.alert('Success', messages[newStatus] || 'Status updated');

        // Keep caregiver on active page to wait for patient confirmation.
        if (newStatus === 'service_completed') {
          setTimeout(() => {
            Alert.alert(
              'Service Completed',
              'Waiting for patient confirmation.'
            );
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCaregiverCancel = async () => {
    const reasons = [
      'Medical emergency',
      'Vehicle breakdown',
      'Family emergency',
      'Severe weather/travel disruption',
      'Other urgent issue'
    ];

    Alert.alert(
      'Cancel Booking',
      'Select a cancellation reason:',
      [
        { text: 'Never mind', style: 'cancel' },
        ...reasons.map((reason) => ({
          text: reason,
          onPress: async () => {
            try {
              setCancelling(true);
              const token = await AsyncStorage.getItem('authToken');

              const response = await axios.put(
                `${API_URL}/caregiver/bookings/${booking._id}/cancel`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.data.success) {
                Alert.alert('Booking Cancelled', response.data.message || 'Booking cancelled successfully.', [
                  {
                    text: 'OK',
                    onPress: () => onCancelled?.()
                  }
                ]);
              }
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          }
        }))
      ]
    );
  };

  // Show review screen if triggered
  if (showReviewScreen) {
    return (
      <ReviewSubmission
        bookingId={booking._id}
        userType="caregiver"
        onBack={() => {
          setShowReviewScreen(false);
          // Refresh booking data
          fetchBookingStatus();
        }}
        onComplete={() => {
          // Redirect to completion page
          onComplete?.();
        }}
      />
    );
  }

  const getStatusInfo = () => {
    const statusMap = {
      'approved': {
        label: 'Booking Accepted',
        color: '#0ea5e9',
        icon: 'check',
        nextAction: 'on_the_way',
        nextLabel: 'On the Way'
      },
      'confirmed': {
        label: 'Booking Confirmed',
        color: '#10b981',
        icon: 'check',
        nextAction: 'on_the_way',
        nextLabel: 'On the Way'
      },
      'on_the_way': {
        label: 'On the Way',
        color: '#3b82f6',
        icon: 'car',
        nextAction: 'arrived',
        nextLabel: 'Mark as Arrived'
      },
      'arrived': {
        label: 'Arrived at Location',
        color: '#8b5cf6',
        icon: 'location',
        nextAction: 'service_started',
        nextLabel: 'Start Service'
      },
      'service_started': {
        label: 'Service in Progress',
        color: '#f59e0b',
        icon: 'activity',
        nextAction: 'service_completed',
        nextLabel: 'Complete Service'
      },
      'service_completed': {
        label: 'Service Completed',
        color: '#059669',
        icon: 'check-circle',
        nextAction: null,
        nextLabel: 'Waiting for Patient Confirmation'
      },
      'completed_confirmed': {
        label: 'Confirmed by Patient',
        color: '#10b981',
        icon: 'check-double',
        nextAction: null,
        nextLabel: 'Service Fully Completed'
      }
    };

    return statusMap[booking?.status] || statusMap['confirmed'];
  };

  const formatTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const statusInfo = getStatusInfo();
  const patient = booking?.patient || {};
  const patientCoords = getPatientCoords();
  const isStartServiceAction = statusInfo.nextAction === 'service_started';
  const startBlockedByDistance =
    isStartServiceAction &&
    (distanceToPatientM != null && distanceToPatientM > START_SERVICE_MAX_DISTANCE_M);

  const mapRegion = caregiverLiveCoords
    ? {
        latitude: caregiverLiveCoords.lat,
        longitude: caregiverLiveCoords.lng,
        latitudeDelta: MAP_DEFAULTS.latitudeDelta,
        longitudeDelta: MAP_DEFAULTS.longitudeDelta,
      }
    : patientCoords
      ? {
          latitude: patientCoords.lat,
          longitude: patientCoords.lng,
          latitudeDelta: MAP_DEFAULTS.latitudeDelta,
          longitudeDelta: MAP_DEFAULTS.longitudeDelta,
        }
      : null;

  useEffect(() => {
    if (!mapRef.current || !patientCoords || !caregiverLiveCoords) return;

    mapRef.current.fitToCoordinates(
      [
        { latitude: patientCoords.lat, longitude: patientCoords.lng },
        { latitude: caregiverLiveCoords.lat, longitude: caregiverLiveCoords.lng },
      ],
      {
        edgePadding: { top: 70, right: 50, bottom: 70, left: 50 },
        animated: true,
      }
    );
  }, [patientCoords?.lat, patientCoords?.lng, caregiverLiveCoords?.lat, caregiverLiveCoords?.lng]);

  const handlePrimaryAction = async () => {
    if (!statusInfo.nextAction) return;

    if (statusInfo.nextAction === 'service_started') {
      try {
        setUpdating(true);
        const result = await checkDistanceToPatient();
        if (!result.ok) {
          Alert.alert('Cannot Start Service', result.reason || 'Please move closer to patient.');
          return;
        }
      } catch (error) {
        Alert.alert('Location Check Failed', 'Unable to verify your distance to patient right now.');
        return;
      } finally {
        setUpdating(false);
      }
    }

    handleUpdateStatus(statusInfo.nextAction);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Service</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>

        {/* Patient Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{patient.fullName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{patient.phone || 'N/A'}</Text>
          </View>
        </View>

        {/* Live Tracking */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Tracking</Text>

          <View style={styles.mapWrap}>
            {mapRegion ? (
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={mapRegion}
                showsUserLocation={false}
                showsMyLocationButton={false}
                toolbarEnabled={false}
              >
                {patientCoords && (
                  <Marker
                    coordinate={{ latitude: patientCoords.lat, longitude: patientCoords.lng }}
                    title="Patient"
                    description={booking?.location || 'Patient location'}
                    pinColor="#8b5cf6"
                  />
                )}

                {caregiverLiveCoords && (
                  <Marker
                    coordinate={{ latitude: caregiverLiveCoords.lat, longitude: caregiverLiveCoords.lng }}
                    title="Your Location"
                    description="Live caregiver location"
                    pinColor="#2563eb"
                  />
                )}

                {patientCoords && caregiverLiveCoords && (
                  <Polyline
                    coordinates={[
                      { latitude: caregiverLiveCoords.lat, longitude: caregiverLiveCoords.lng },
                      { latitude: patientCoords.lat, longitude: patientCoords.lng },
                    ]}
                    strokeColor="#2563eb"
                    strokeWidth={4}
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapLoadingState}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.mapLoadingStateText}>Waiting for live location...</Text>
              </View>
            )}
          </View>

          <Text style={styles.mapHintText}>
            {patientCoords
              ? caregiverLiveCoords
                ? 'Live route to patient is active.'
                : 'Waiting for your GPS position...'
              : 'Patient map location is not available for this booking.'}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Timeline</Text>
          
          <TimelineItem 
            label="Booking Confirmed" 
            time={formatTime(booking?.updatedAt)}
            completed={true}
          />
          <TimelineItem 
            label="On the Way" 
            time={formatTime(booking?.onTheWayAt)}
            completed={!!booking?.onTheWayAt}
          />
          <TimelineItem 
            label="Arrived" 
            time={formatTime(booking?.arrivedAt)}
            completed={!!booking?.arrivedAt}
          />
          <TimelineItem 
            label="Service Started" 
            time={formatTime(booking?.serviceStartedAt)}
            completed={!!booking?.serviceStartedAt}
          />
          <TimelineItem 
            label="Service Completed" 
            time={formatTime(booking?.serviceCompletedAt)}
            completed={!!booking?.serviceCompletedAt}
            isLast={true}
          />
        </View>

        {/* Action Button */}
        {statusInfo.nextAction && (
          <TouchableOpacity 
            style={[
              styles.actionButton,
              (updating || startBlockedByDistance) && styles.actionButtonDisabled
            ]}
            onPress={handlePrimaryAction}
            disabled={updating || startBlockedByDistance}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>{statusInfo.nextLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {isStartServiceAction && (
          <View style={styles.distanceHintCard}>
            <Text style={styles.distanceHintText}>
              {distanceToPatientM == null
                ? `Distance check required. You must be within ${START_SERVICE_MAX_DISTANCE_M}m of patient.`
                : `Current distance: ${distanceToPatientM}m (required: <= ${START_SERVICE_MAX_DISTANCE_M}m)`}
            </Text>
          </View>
        )}

        {(booking?.status === 'approved' || booking?.status === 'confirmed') && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={handleCaregiverCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            )}
          </TouchableOpacity>
        )}

        {booking?.status === 'service_completed' && (
          <View style={styles.waitingCard}>
            <ActivityIndicator color="#3b82f6" size="small" />
            <Text style={styles.waitingText}>
              Waiting for patient to confirm service completion
            </Text>
          </View>
        )}

        {booking?.status === 'completed_confirmed' && (
          <View style={styles.completedCard}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
            <Text style={styles.completedText}>Service Fully Completed!</Text>
            
            {/* Debug: Log booking data */}
            {console.log('Caregiver Booking Review Debug:', {
              bookingId: booking._id,
              status: booking.status,
              caregiverReviewSubmitted: booking.caregiverReviewSubmitted,
              hasFlag: booking.hasOwnProperty('caregiverReviewSubmitted'),
              shouldShowButton: booking.caregiverReviewSubmitted !== true
            })}
            
            {/* Review Button - Show if review NOT submitted (handles undefined/null as false) */}
            {booking.caregiverReviewSubmitted !== true && (
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => {
                  console.log('Review button pressed for booking:', booking._id);
                  setShowReviewScreen(true);
                }}
              >
                <Text style={styles.reviewButtonText}>⭐ Rate This Patient</Text>
              </TouchableOpacity>
            )}
            
            {booking.caregiverReviewSubmitted === true && (
              <View style={styles.reviewSubmittedBadge}>
                <Text style={styles.reviewSubmittedText}>✓ Review Submitted</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const TimelineItem = ({ label, time, completed, isLast }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineIndicator}>
      <View style={[styles.timelineDot, completed && styles.timelineDotCompleted]}>
        {completed && (
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </Svg>
        )}
      </View>
      {!isLast && <View style={[styles.timelineLine, completed && styles.timelineLineCompleted]} />}
    </View>
    <View style={styles.timelineContent}>
      <Text style={[styles.timelineLabel, completed && styles.timelineLabelCompleted]}>
        {label}
      </Text>
      {time && <Text style={styles.timelineTime}>{time}</Text>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 36,
  },
  statusBadge: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  mapWrap: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  mapLoadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
  },
  mapLoadingStateText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  mapHintText: {
    marginTop: 10,
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  locationValue: {
    flex: 1.5,
  },
  amountValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10b981',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#10b981',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  timelineLabelCompleted: {
    color: '#111827',
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  distanceHintCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  distanceHintText: {
    fontSize: 13,
    color: '#1e3a8a',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  waitingText: {
    color: '#1e40af',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  completedCard: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  completedText: {
    color: '#065f46',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  reviewButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  reviewSubmittedBadge: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  reviewSubmittedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
