import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { GOOGLE_MAPS_API_KEY, GEOCODING_URL } from '../config/maps';
import { wp, hp, fp, spacing, componentSizes, shadows } from '../utils/responsive';

// ── Smart Time Helpers (defined outside component so useState can use them) ──

/** Round current time UP to the next 30-minute mark. */
const getSmartDefaultTime = () => {
  const now = new Date();
  const mins = now.getMinutes();
  const remainder = mins % 30;
  const clone = new Date(now);
  if (remainder !== 0) {
    clone.setMinutes(mins + (30 - remainder), 0, 0);
  } else {
    // Already on a boundary — advance by 30 so we never default to 'right now'
    clone.setMinutes(mins + 30, 0, 0);
  }
  return clone;
};

/** Format a Date as "HH:MM" (24-h). */
const formatTimeDisplay = (date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

/** Hours to add for each booking duration (used for conflict window). */
const DURATION_HOURS = { hourly: 1, daily: 8, weekly: 168, monthly: 720 };

const SERVICE_OPTIONS = [
  'Home Caregiver',
  'Hospital Assistant',
  'IV Therapy',
  'Wound Care',
  'ICU Care',
  'Elderly Care',
];

/** Compute end Date from a start Date and duration string. */
const computeEndDate = (startDate, duration) => {
  const end = new Date(startDate);
  end.setHours(end.getHours() + (DURATION_HOURS[duration] || 1));
  return end;
};

/**
 * @param {Object} props
 * @param {string} [props.caregiverId] - ID of the caregiver for booking
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onComplete]
 */
export default function BookingFlow({ caregiverId, onBack, onComplete } = {}) {
  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [caregiver, setCaregiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // ── Time picker & availability state ──────────────────────────────────────
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => getSmartDefaultTime());
  const [availabilityStatus, setAvailabilityStatus] = useState(null); // null | 'checking' | 'available' | 'unavailable'
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [bookingData, setBookingData] = useState({
    serviceType: '',
    date: '',
    time: '',
    startDateTime: '',   // ISO UTC string confirmed by server
    duration: 'hourly',
    location: ''
  });

  const allowedServiceTypes = useMemo(() => {
    if (!caregiver) return SERVICE_OPTIONS;

    const candidates = [];
    if (typeof caregiver.specialty === 'string') candidates.push(caregiver.specialty);
    if (typeof caregiver.specialization === 'string') candidates.push(caregiver.specialization);
    if (Array.isArray(caregiver.services)) candidates.push(...caregiver.services);

    const tokens = candidates
      .flatMap((value) =>
        String(value)
          .split(/,|\/|&|\band\b/gi)
          .map((part) => part.trim())
          .filter(Boolean)
      )
      .map((token) => token.toLowerCase());

    const matched = SERVICE_OPTIONS.filter((service) => {
      const serviceLower = service.toLowerCase();
      return tokens.some((token) => token === serviceLower || serviceLower.includes(token) || token.includes(serviceLower));
    });

    return matched.length > 0 ? matched : SERVICE_OPTIONS;
  }, [caregiver]);

  const isServiceAllowed = (service) => allowedServiceTypes.includes(service);

  // ── Location / Map state (Step 3) ─────────────────────────────────────────
  const [mapRegion, setMapRegion] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(null); // { latitude, longitude }
  const [locationLoading, setLocationLoading] = useState(false);
  const mapRef = useRef(null);
  const step3LocationWatchRef = useRef(null);

  useEffect(() => {
    if (caregiverId) {
      fetchCaregiverData();
    }
  }, [caregiverId]);

  useEffect(() => {
    if (!bookingData.serviceType) return;
    if (!isServiceAllowed(bookingData.serviceType)) {
      setBookingData((prev) => ({ ...prev, serviceType: '' }));
    }
  }, [allowedServiceTypes, bookingData.serviceType]);

  // Auto-fetch GPS when patient lands on Step 3
  useEffect(() => {
    if (step === 3 && !markerCoords) {
      fetchCurrentLocation();
    }
  }, [step]);

  useEffect(() => {
    if (step !== 3 || step3LocationWatchRef.current) return;

    let isMounted = true;

    const startStep3Watch = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;

        step3LocationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (position) => {
            if (!isMounted) return;
            const latitude = position?.coords?.latitude;
            const longitude = position?.coords?.longitude;
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

            const region = {
              latitude,
              longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            };

            setMapRegion(region);
            setMarkerCoords({ latitude, longitude });
            mapRef.current?.animateToRegion(region, 500);
          }
        );
      } catch (error) {
        console.warn('[bookingflow] Step 3 location watch failed:', error?.message || error);
      }
    };

    startStep3Watch();

    return () => {
      isMounted = false;
      if (step3LocationWatchRef.current) {
        step3LocationWatchRef.current.remove();
        step3LocationWatchRef.current = null;
      }
    };
  }, [step]);

  // ── GPS + reverse geocode helpers ────────────────────────────────────────
  const reverseGeocode = async (lat, lng) => {
    try {
      const url = `${GEOCODING_URL}?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await axios.get(url);
      if (res.data.status === 'OK' && res.data.results.length > 0) {
        return res.data.results[0].formatted_address;
      }
    } catch (e) {
      console.warn('[reverseGeocode] failed:', e.message);
    }
    // Fallback: use expo-location built-in geocoder
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (place) {
        const parts = [place.name, place.street, place.district, place.city, place.region].filter(Boolean);
        return parts.join(', ');
      }
    } catch (e) {
      console.warn('[reverseGeocode fallback] failed:', e.message);
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  const fetchCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access so we can fill your service address automatically.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeout: 15000,
      });
      const { latitude, longitude } = pos.coords;
      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapRegion(region);
      setMarkerCoords({ latitude, longitude });
      mapRef.current?.animateToRegion(region, 600);
      const address = await reverseGeocode(latitude, longitude);
      setBookingData((prev) => ({ ...prev, location: address }));
    } catch (err) {
      console.error('[fetchCurrentLocation] error:', err);
      Alert.alert('Location Error', 'Unable to get your current location. Please enter the address manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMarkerDragEnd = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarkerCoords({ latitude, longitude });
    setLocationLoading(true);
    const address = await reverseGeocode(latitude, longitude);
    setBookingData((prev) => ({ ...prev, location: address }));
    setLocationLoading(false);
  };

  // Reset availability whenever the patient changes the date or duration
  useEffect(() => {
    setAvailabilityStatus(null);
    setAvailabilityMessage('');
  }, [bookingData.date, bookingData.duration]);

  const fetchCaregiverData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_URL}/patient/caregivers/detail/${caregiverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setCaregiver(response.data.caregiver);
      }
    } catch (error) {
      console.error('Error fetching caregiver data:', error);
      Alert.alert('Error', 'Failed to load caregiver details');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmount = () => {
    if (!caregiver) return 500; // Default minimum amount

    const rateMap = {
      'hourly': caregiver.hourlyRate,
      'daily': caregiver.dailyRate,
      'weekly': caregiver.weeklyRate,
      'monthly': caregiver.monthlyRate
    };

    const rate = rateMap[bookingData.duration];
    // Return rate if available, otherwise use default based on duration
    if (rate && rate > 0) return rate;
    
    // Default rates if not set
    const defaults = {
      'hourly': 500,
      'daily': 3000,
      'weekly': 18000,
      'monthly': 60000
    };
    
    return defaults[bookingData.duration] || 500;
  };

  // ── Inner helpers ─────────────────────────────────────────────────────────

  /** Returns true when the selected time is in the past for today's date. */
  const isPastTimeOnToday = () => {
    if (!bookingData.date) return false;
    const selectedDate = new Date(bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate.getTime() !== today.getTime()) return false;
    const now = new Date();
    const candidate = new Date();
    candidate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    return candidate <= now;
  };

  /** Build a UTC ISO string combining bookingData.date + selectedTime. */
  const buildStartDateTimeUTC = () => {
    if (!bookingData.date) return null;
    const [year, month, day] = bookingData.date.split('-').map(Number);
    // Use UTC so the server stores consistent timestamps regardless of device TZ
    const utc = new Date(Date.UTC(year, month - 1, day, selectedTime.getHours(), selectedTime.getMinutes(), 0, 0));
    return utc;
  };

  /** Call the availability endpoint and update state. */
  const checkAvailability = async () => {
    if (isPastTimeOnToday()) {
      setAvailabilityStatus('unavailable');
      setAvailabilityMessage('Cannot select a past time. Please pick a future time.');
      return;
    }

    const startDT = buildStartDateTimeUTC();
    if (!startDT || !caregiverId) return;

    const endDT = computeEndDate(startDT, bookingData.duration);

    setAvailabilityStatus('checking');
    setAvailabilityMessage('');

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.post(
        `${API_URL}/patient/bookings/check-availability`,
        {
          caregiverId,
          startDateTime: startDT.toISOString(),
          endDateTime:   endDT.toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.available) {
        setAvailabilityStatus('available');
        setAvailabilityMessage(response.data.message || 'Nurse is available for the selected time.');
        // Persist confirmed time into bookingData
        setBookingData(prev => ({
          ...prev,
          time: formatTimeDisplay(selectedTime),
          startDateTime: startDT.toISOString()
        }));
      } else {
        setAvailabilityStatus('unavailable');
        setAvailabilityMessage(response.data.message || 'This nurse is already booked for the selected time.');
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setAvailabilityStatus(null);
      setAvailabilityMessage('');
      Alert.alert('Error', 'Could not check availability. Please try again.');
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Submit booking request for caregiver approval
      await handleSubmitBooking();
    }
  };

  const handleSubmitBooking = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      const amount = calculateAmount();

      if (!caregiverId) {
        Alert.alert('Error', 'Caregiver information is missing');
        return;
      }

      const bookingPayload = {
        caregiverId,
        serviceType: bookingData.serviceType,
        date: bookingData.date,
        time: bookingData.time,
        startDateTime: bookingData.startDateTime, // UTC ISO – used for conflict detection
        duration: bookingData.duration,
        location: bookingData.location,
        latitude: markerCoords?.latitude ?? null,
        longitude: markerCoords?.longitude ?? null,
        paymentMethod: 'cash',
        amount,
        status: 'pending'
      };

      const response = await axios.post(
        `${API_URL}/patient/bookings`,
        bookingPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Request Sent',
          'Your booking request has been sent to the caregiver. You will be notified once they respond.',
          [
            {
              text: 'OK',
              onPress: () => {
                onComplete?.(response.data.booking);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send booking request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setBookingData((prev) => ({ ...prev, date: formattedDate }));
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isNextDisabled = () => {
    if (step === 1 && !bookingData.serviceType) return true;
    if (step === 2 && (
      !bookingData.date ||
      !bookingData.time ||
      availabilityStatus !== 'available'  // must confirm slot before proceeding
    )) return true;
    if (step === 3 && !bookingData.location) return true;
    return false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDurationLabel = (duration) => {
    const labels = {
      'hourly': 'Per Hour',
      'daily': 'Per Day',
      'weekly': 'Per Week',
      'monthly': 'Per Month'
    };
    return labels[duration] || duration;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Request Service</Text>
            <Text style={styles.headerSubtitle}>Step {step} of 3</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                s <= step ? styles.progressActive : styles.progressInactive
              ]}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Service Type */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Service Type</Text>
            {SERVICE_OPTIONS.map((service) => (
              (() => {
                const disabled = !isServiceAllowed(service);
                return (
              <TouchableOpacity
                key={service}
                onPress={() => {
                  if (disabled) return;
                  setBookingData((prev) => ({ ...prev, serviceType: service }));
                }}
                disabled={disabled}
                style={[
                  styles.serviceOption,
                  bookingData.serviceType === service && styles.serviceOptionActive,
                  disabled && styles.serviceOptionDisabled,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.serviceText,
                  bookingData.serviceType === service && styles.serviceTextActive,
                  disabled && styles.serviceTextDisabled,
                ]}>
                  {service}
                </Text>
                {bookingData.serviceType === service && (
                  <View style={styles.checkmark}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </Svg>
                  </View>
                )}
              </TouchableOpacity>
                );
              })()
            ))}
          </View>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Date & Time</Text>
            
            {/* Date Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </Svg>
                <Text style={[
                  styles.datePickerText,
                  bookingData.date && styles.datePickerTextSelected
                ]}>
                  {formatDisplayDate(bookingData.date)}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                />
              )}
              
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity 
                  style={styles.datePickerDone}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Smart Time Selection ──────────────────────────────────── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Time</Text>

              {/* Time picker trigger */}
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Svg>
                <Text style={[styles.datePickerText, styles.datePickerTextSelected]}>
                  {formatTimeDisplay(selectedTime)}
                </Text>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </Svg>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minuteInterval={30}
                  onChange={(event, time) => {
                    if (Platform.OS === 'android') setShowTimePicker(false);
                    if (time) {
                      setSelectedTime(time);
                      // Reset availability when time changes
                      setAvailabilityStatus(null);
                      setAvailabilityMessage('');
                    }
                  }}
                  style={styles.datePicker}
                />
              )}
              {Platform.OS === 'ios' && showTimePicker && (
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              )}

              {/* Computed end time info */}
              {bookingData.date && (
                <View style={styles.timeInfoRow}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.timeInfoText}>
                    Session ends at{' '}
                    <Text style={styles.timeInfoBold}>
                      {formatTimeDisplay(computeEndDate((() => {
                        const d = buildStartDateTimeUTC();
                        return d || new Date();
                      })(), bookingData.duration))}
                    </Text>
                    {' '}({bookingData.duration})
                  </Text>
                </View>
              )}

              {/* Past-time warning */}
              {isPastTimeOnToday() && (
                <View style={[styles.availabilityBadge, styles.availabilityUnavailable]}>
                  <Text style={styles.availabilityText}>⚠ Cannot select a past time for today.</Text>
                </View>
              )}
            </View>

            {/* ── Availability Check ───────────────────────────────────────── */}
            {bookingData.date && !isPastTimeOnToday() && (
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={[
                    styles.checkAvailabilityButton,
                    availabilityStatus === 'checking' && styles.checkAvailabilityButtonDisabled
                  ]}
                  onPress={checkAvailability}
                  disabled={availabilityStatus === 'checking'}
                  activeOpacity={0.8}
                >
                  {availabilityStatus === 'checking' ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </Svg>
                      <Text style={styles.checkAvailabilityText}>Check Availability</Text>
                    </>
                  )}
                </TouchableOpacity>

                {availabilityStatus === 'available' && (
                  <View style={[styles.availabilityBadge, styles.availabilityAvailable]}>
                    <Text style={styles.availabilityText}>✓ {availabilityMessage}</Text>
                  </View>
                )}
                {availabilityStatus === 'unavailable' && (
                  <View style={[styles.availabilityBadge, styles.availabilityUnavailable]}>
                    <Text style={styles.availabilityText}>✗ {availabilityMessage}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationGrid}>
                {['Hourly', 'Daily', 'Weekly', 'Monthly'].map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    onPress={() =>
                      setBookingData((prev) => ({ ...prev, duration: duration.toLowerCase() }))
                    }
                    style={[
                      styles.durationOption,
                      bookingData.duration === duration.toLowerCase() && styles.durationOptionActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.durationText,
                      bookingData.duration === duration.toLowerCase() && styles.durationTextActive
                    ]}>
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Service Location</Text>

            {/* Real Map */}
            <View style={styles.mapContainer}>
              {mapRegion ? (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.mapView}
                  region={mapRegion}
                  onRegionChangeComplete={(r) => setMapRegion(r)}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                >
                  {markerCoords && (
                    <Marker
                      coordinate={markerCoords}
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                      pinColor="#2563eb"
                      title="Service Location"
                      description="Drag to adjust"
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.mapLoadingText}>Waiting for live GPS location…</Text>
                </View>
              )}

              {/* Loading overlay */}
              {locationLoading && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.mapLoadingText}>Fetching your location…</Text>
                </View>
              )}

              {/* Use My Location button (top-right of map) */}
              <TouchableOpacity
                style={styles.myLocationBtn}
                onPress={fetchCurrentLocation}
                activeOpacity={0.8}
                disabled={locationLoading}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </Svg>
              </TouchableOpacity>
            </View>

            <Text style={styles.mapHint}>📍 Drag the pin to set exact service location</Text>

            {/* Address Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Address</Text>
              <View style={styles.textareaContainer}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.textareaIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </Svg>
                <TextInput
                  value={bookingData.location}
                  onChangeText={(text) => setBookingData((prev) => ({ ...prev, location: text }))}
                  placeholder="Address will auto-fill from map — or type manually"
                  multiline
                  numberOfLines={3}
                  style={styles.textarea}
                  placeholderTextColor="#9ca3af"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleNext}
          disabled={isNextDisabled() || submitting}
          style={[
            styles.continueButton,
            (isNextDisabled() || submitting) && styles.continueButtonDisabled
          ]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.continueButtonText}>
              {step < 3 ? 'Continue' : 'Send Request'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fp(16),
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  backButton: {
    width: componentSizes.touchTarget.min,
    height: componentSizes.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: componentSizes.touchTarget.min / 2,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: fp(16),
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: fp(14),
  },
  progressBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  progressSegment: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#2563eb',
  },
  progressInactive: {
    backgroundColor: '#e5e7eb',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: spacing.xl,
  },
  stepTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: fp(18),
    marginBottom: spacing.base,
  },
  serviceOption: {
    padding: spacing.base,
    borderRadius: componentSizes.card.borderRadius,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: componentSizes.touchTarget.min,
  },
  serviceOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  serviceOptionDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    opacity: 0.45,
  },
  serviceText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(16),
  },
  serviceTextActive: {
    color: '#2563eb',
  },
  serviceTextDisabled: {
    color: '#9ca3af',
  },
  checkmark: {
    width: wp(24),
    height: wp(24),
    backgroundColor: '#2563eb',
    borderRadius: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    fontSize: fp(14),
    marginBottom: spacing.sm,
  },  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: componentSizes.button.borderRadius,
    padding: spacing.base,
    minHeight: componentSizes.touchTarget.min,
  },
  datePickerText: {
    flex: 1,
    fontSize: fp(16),
    color: '#9ca3af',
  },
  datePickerTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  datePicker: {
    marginTop: spacing.md,
  },
  datePickerDone: {
    backgroundColor: '#2563eb',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: wp(8),
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: componentSizes.touchTarget.min,
    justifyContent: 'center',
  },
  datePickerDoneText: {
    color: '#ffffff',
    fontSize: fp(16),
    fontWeight: '600',
  },  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.base,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingLeft: wp(48),
    paddingRight: spacing.base,
    paddingVertical: spacing.inputPadding,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: componentSizes.button.borderRadius,
    fontSize: fp(16),
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: componentSizes.touchTarget.min,
  },
  // ── Smart time picker & availability styles ────────────────────────────
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: spacing.md,
    borderRadius: componentSizes.button.borderRadius,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: componentSizes.touchTarget.min,
    justifyContent: 'center',
  },
  timeSlotActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  timeText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: fp(14),
  },
  timeTextActive: {
    color: '#2563eb',
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  timeInfoText: {
    fontSize: fp(13),
    color: '#6b7280',
    flex: 1,
  },
  timeInfoBold: {
    fontWeight: '600',
    color: '#374151',
  },
  checkAvailabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#2563eb',
    paddingVertical: spacing.base,
    borderRadius: componentSizes.button.borderRadius,
    minHeight: componentSizes.touchTarget.min,
  },
  checkAvailabilityButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  checkAvailabilityText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: fp(15),
  },
  availabilityBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: componentSizes.button.borderRadius,
    borderWidth: 1,
  },
  availabilityAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  availabilityUnavailable: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  availabilityText: {
    fontSize: fp(13),
    fontWeight: '500',
    color: '#374151',
  },
  durationGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  durationOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: componentSizes.button.borderRadius,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    minHeight: componentSizes.touchTarget.min,
    justifyContent: 'center',
  },
  durationOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  durationText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: fp(14),
  },
  durationTextActive: {
    color: '#2563eb',
  },
  mapContainer: {
    height: hp(28),
    borderRadius: wp(3),
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapLoadingText: {
    fontSize: fp(13),
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  myLocationBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  mapHint: {
    fontSize: fp(12),
    color: '#6b7280',
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  textareaContainer: {
    position: 'relative',
  },
  textareaIcon: {
    position: 'absolute',
    left: spacing.base,
    top: spacing.base,
    zIndex: 1,
  },
  textarea: {
    paddingLeft: wp(12),
    paddingRight: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(3),
    fontSize: fp(14),
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: hp(12),
  },
  savedAddress: {
    flexDirection: 'row',
    padding: spacing.base,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: componentSizes.button.borderRadius,
    gap: spacing.md,
  },
  addressIcon: {
    width: componentSizes.touchTarget.min,
    height: componentSizes.touchTarget.min,
    backgroundColor: '#eff6ff',
    borderRadius: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressTitle: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(16),
    marginBottom: spacing.xs,
  },
  addressText: {
    color: '#6b7280',
    fontSize: fp(14),
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: componentSizes.card.borderRadius,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: spacing.xl,
  },
  caregiverCard: {
    backgroundColor: '#eff6ff',
    borderRadius: componentSizes.button.borderRadius,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  caregiverName: {
    fontSize: fp(18),
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing.xs,
  },
  caregiverRole: {
    fontSize: fp(14),
    color: '#2563eb',
    fontWeight: '500',
  },
  summaryTitle: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(16),
    marginBottom: spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: fp(14),
  },
  summaryValue: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(14),
    textAlign: 'right',
  },
  summaryValueLocation: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(14),
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    color: '#111827',
    fontWeight: '600',
    fontSize: fp(16),
  },
  totalValue: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: fp(16),
  },
  paymentTitle: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(16),
    marginBottom: spacing.md,
  },
  paymentOption: {
    padding: spacing.base,
    borderRadius: componentSizes.button.borderRadius,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: componentSizes.touchTarget.min,
  },
  paymentOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  paymentIcon: {
    fontSize: fp(24),
  },
  paymentTextContainer: {
    flexDirection: 'column',
  },
  paymentText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: fp(16),
  },
  paymentTextDisabled: {
    color: '#9ca3af',
  },
  paymentUnavailable: {
    color: '#ef4444',
    fontSize: fp(12),
    marginTop: spacing.xs / 2,
  },
  paymentOptionDisabled: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: spacing.xl,
  },
  continueButton: {
    backgroundColor: '#2563eb',
    paddingVertical: spacing.base,
    borderRadius: componentSizes.button.borderRadius,
    alignItems: 'center',
    minHeight: componentSizes.touchTarget.min,
    justifyContent: 'center',
    ...shadows.md,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: fp(16),
  },
});