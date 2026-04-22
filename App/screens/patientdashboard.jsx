import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MapView, { Marker, Circle as MapCircle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { API_URL } from '../config/api';
import { MAP_DEFAULTS, GOOGLE_MAPS_API_KEY } from '../config/maps';
import useLocation from '../hooks/useLocation';
import { searchCaregiversWithinRadius, buildMapMarkers } from '../services/caregiverSearchService';
import NurseMapMarker from '../components/NurseMapMarker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_PIN_PRIMARY_COLOR = '#2B7A8E';
const ENABLE_GPS_MISMATCH_SIMULATION = false;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const offsetCoordinate = (lat, lng, distanceMeters, bearingDeg) => {
  const R = 6378137;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const angDist = distanceMeters / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) +
      Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
      Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { latitude: toDeg(lat2), longitude: toDeg(lng2) };
};

const distanceMetersBetween = (a, b) => {
  if (!a || !b) return null;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
};

/**
 * @param {Object} props
 * @param {(id: string) => void} [props.onViewProfile]
 * @param {() => void} [props.onOpenBooking]
 * @param {() => void} [props.onOpenUserProfile]
 * @param {() => void} [props.onLogout]
 * @param {(booking: Object) => void} [props.onTrackBooking]
 */
export default function PatientDashboard({ onViewProfile, onOpenBooking, onOpenUserProfile, onLogout, onTrackBooking } = {}) {
  const [activeTab, setActiveTab] = useState('home');
  const [userName, setUserName] = useState('Patient');
  const [greeting, setGreeting] = useState('Good Morning');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [caregivers, setCaregivers] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [searchRadius, setSearchRadius] = useState(null); // km, null = unknown
  const [locationError, setLocationError] = useState(null);
  const [loadedMarkerIds, setLoadedMarkerIds] = useState({});
  const mapRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchRequestSeqRef = useRef(0);
  const normalizedSearchQuery = searchQuery.trim();

  const simulatedMapMarkers = useMemo(() => {
    if (!ENABLE_GPS_MISMATCH_SIMULATION || !patientLocation || mapMarkers.length === 0) {
      return mapMarkers;
    }

    const base = mapMarkers[0];
    const seed = String(base.id || '0')
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const targetDistanceM = 50 + (seed % 11); // 50-60m
    const bearing = 25 + (seed % 130);

    const simulatedCoordinate = offsetCoordinate(
      patientLocation.lat,
      patientLocation.lng,
      targetDistanceM,
      bearing
    );

    return mapMarkers.map((marker, idx) =>
      idx === 0
        ? {
            ...marker,
            coordinate: simulatedCoordinate,
            simulatedDistanceM: targetDistanceM,
            isSimulatedPrimary: true,
          }
        : marker
    );
  }, [mapMarkers, patientLocation]);

  const patientMapCoordinate = patientLocation
    ? { latitude: patientLocation.lat, longitude: patientLocation.lng }
    : null;

  const primaryCaregiverMarker = simulatedMapMarkers.find((m) => m.isSimulatedPrimary) || null;
  const primaryCaregiverCoordinate = primaryCaregiverMarker?.coordinate || null;

  const simulatedDistanceM =
    distanceMetersBetween(patientMapCoordinate, primaryCaregiverCoordinate) || null;

  const distanceMidpoint =
    patientMapCoordinate && primaryCaregiverCoordinate
      ? {
          latitude: (patientMapCoordinate.latitude + primaryCaregiverCoordinate.latitude) / 2,
          longitude: (patientMapCoordinate.longitude + primaryCaregiverCoordinate.longitude) / 2,
        }
      : null;

  // ── GPS location hook ──────────────────────────────────────────────────────
  const {
    location: patientLocation,
    loading: locationLoading,
    permission: locationPermission,
    error: locationPermError,
    refresh: refreshLocation,
  } = useLocation({
    autoRequest: true,
    watch: true,
    watchTimeIntervalMs: 1000,
    watchDistanceIntervalM: 1,
  });
  

  useEffect(() => {
    loadUserData();
    updateGreeting();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Fetch caregivers whenever location becomes available (or on first load without location)
  useEffect(() => {
    if (!locationLoading && normalizedSearchQuery.length === 0) {
      // location is either resolved or denied — run the search
      fetchCaregivers(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationLoading, normalizedSearchQuery]);

  // Separate effect for auto-refresh based on active tab
  useEffect(() => {
    if (activeTab !== 'home' || normalizedSearchQuery.length > 0) return;

    // Auto-refresh caregivers every 15 seconds (distance calls are rate-limited)
    const interval = setInterval(() => {
      fetchCaregivers(false); // Silent refresh without loading spinner
    }, 15000);

    // Cleanup interval when leaving home tab or unmounting
    return () => clearInterval(interval);
  }, [activeTab, patientLocation, normalizedSearchQuery]); // re-run when location/search changes

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'home' || locationLoading || !patientLocation || normalizedSearchQuery.length > 0) return;

    const refreshTimer = setTimeout(() => {
      fetchCaregivers(false);
    }, 700);

    return () => clearTimeout(refreshTimer);
  }, [patientLocation?.lat, patientLocation?.lng, activeTab, locationLoading, normalizedSearchQuery]);

  useEffect(() => {
    if (activeTab !== 'home' || viewMode !== 'map' || !mapRef.current) return;

    const coordinates = simulatedMapMarkers
      .map((marker) => marker.coordinate)
      .filter((coord) => Number.isFinite(coord?.latitude) && Number.isFinite(coord?.longitude));

    if (patientLocation?.lat && patientLocation?.lng) {
      coordinates.push({ latitude: patientLocation.lat, longitude: patientLocation.lng });
    }

    if (coordinates.length === 0) return;

    const timer = setTimeout(() => {
      try {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 90, right: 70, bottom: 100, left: 70 },
          animated: true,
        });
      } catch (error) {
        console.warn('Map fit failed:', error?.message || error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [activeTab, viewMode, simulatedMapMarkers, patientLocation]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.fullName || 'Patient');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const fetchCaregivers = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        if (showLoadingSpinner) setLoading(false);
        return;
      }

      const { caregivers: results, radiusUsedM, locationAvailable } =
        await searchCaregiversWithinRadius(
          patientLocation, // null if GPS denied — service falls back to plain list
          {
            onRadiusChange: (km) => setSearchRadius(km),
          }
        );

      if (radiusUsedM) setSearchRadius(radiusUsedM / 1000);

      setCaregivers(results);
      setMapMarkers(buildMapMarkers(results));
      setLastUpdate(new Date());

      console.log(
        `[${new Date().toLocaleTimeString()}] Fetched ${results.length} caregivers` +
          (locationAvailable ? ` within ${radiusUsedM / 1000} km` : ' (no location)')
      );
    } catch (error) {
      console.error('Error fetching caregivers:', error);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const searchAvailableNurses = async (rawQuery) => {
    const trimmedQuery = (rawQuery || '').trim();

    if (!trimmedQuery) {
      searchRequestSeqRef.current += 1;
      setIsSearchMode(false);
      setSearchLoading(false);
      fetchCaregivers(false);
      return;
    }

    const requestSeq = ++searchRequestSeqRef.current;
    setIsSearchMode(true);
    setSearchLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setCaregivers([]);
        setMapMarkers([]);
        return;
      }

      const response = await axios.get(`${API_URL}/patient/nurses/search`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
        params: {
          query: trimmedQuery,
          limit: 20,
        },
      });

      if (requestSeq === searchRequestSeqRef.current) {
        const results = response.data?.nurses || [];
        setCaregivers(results);
        setMapMarkers(buildMapMarkers(results));
        setSearchRadius(null);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error searching available nurses:', error);
      if (requestSeq === searchRequestSeqRef.current) {
        setCaregivers([]);
        setMapMarkers([]);
      }
    } finally {
      if (requestSeq === searchRequestSeqRef.current) {
        setSearchLoading(false);
      }
    }
  };

  const handleSearchInputChange = (text) => {
    setSearchQuery(text);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!text.trim()) {
      searchAvailableNurses('');
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      searchAvailableNurses(text);
    }, 400);
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/patient/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserProfile(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.put(
        `${API_URL}/patient/bookings/${bookingId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        Alert.alert('Success', response.data.message || 'Booking cancelled successfully.', [
          {
            text: 'OK',
            onPress: () => {
              fetchBookings();
              setActiveTab('home');
            },
          },
        ]);
      } else {
        Alert.alert('Cancellation Failed', response.data.message || 'Unable to cancel booking right now.');
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || 'Unable to cancel booking right now.';
      Alert.alert('Cancellation Failed', errorMessage);
      console.error('Error cancelling booking:', error);
    }
  };

  const canPatientCancel = (status) => ['pending', 'approved', 'confirmed'].includes(status);

  const canTrackBooking = (status) =>
    ['approved', 'confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed'].includes(status);

  const formatBookingStatus = (status) => (status || '').replace(/_/g, ' ').toUpperCase();

  const dummyCaregivers = [
    {
      id: '1',
      name: 'Sarah Ahmed',
      role: 'Registered Nurse',
      specialization: 'ICU Care',
      rating: 4.9,
      reviews: 124,
      distance: '2.3 km',
      price: 'Rs. 800/hr',
      image: 'https://images.unsplash.com/photo-1643297653753-2d3f459edc6b?w=200',
      verified: true
    },
    {
      id: '2',
      name: 'Dr. Ali Khan',
      role: 'Medical Caregiver',
      specialization: 'Elderly Care',
      rating: 4.8,
      reviews: 98,
      distance: '3.1 km',
      price: 'Rs. 600/hr',
      image: 'https://images.unsplash.com/photo-1758654860020-36fa3fd0dd35?w=200',
      verified: true
    },
    {
      id: '3',
      name: 'Fatima Malik',
      role: 'Home Nurse',
      specialization: 'Wound Care',
      rating: 5.0,
      reviews: 156,
      distance: '1.8 km',
      price: 'Rs. 750/hr',
      image: 'https://images.unsplash.com/photo-1758691462477-976f771224d8?w=200',
      verified: true
    }
  ];

  const services = [
    { label: 'Home Caregiver', color: '#dbeafe', iconColor: '#2563eb', icon: 'home' },
    { label: 'Hospital Assistant', color: '#ccfbf1', iconColor: '#0d9488', icon: 'user' },
    { label: 'IV Therapy', color: '#dcfce7', iconColor: '#16a34a', icon: 'heart' },
    { label: 'Wound Care', color: '#f3e8ff', iconColor: '#9333ea', icon: 'message' }
  ];

  const renderServiceIcon = (icon, color) => {
    const icons = {
      home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    };
    
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
        <Path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </Svg>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#1824b6', '#3caea8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'home' && (
          <>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.userInfoContainer}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text 
                  style={styles.userName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {userName}
                </Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.headerButton}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={onOpenUserProfile}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.searchIcon}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </Svg>
              <TextInput
                placeholder="Search nurse name or specialty..."
                placeholderTextColor="#9ca3af"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchInputChange}
              />
            </View>
          </View>

          {/* Quick Services */}
          <View style={styles.servicesSection}>
            <View style={styles.servicesCard}>
              <Text style={styles.sectionTitle}>Quick Services</Text>
              <View style={styles.servicesGrid}>
                {services.map((service, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.serviceItem}
                    onPress={onOpenBooking}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                      {renderServiceIcon(service.icon, service.iconColor)}
                    </View>
                    <Text style={styles.serviceLabel}>{service.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Nearby Professionals */}
          <View style={styles.professionalsSection}>
            <View style={styles.professionalsHeader}>
              <View>
                <Text style={styles.professionalsTitle}>Nearby Professionals</Text>
                {isSearchMode && normalizedSearchQuery.length > 0 && (
                  <Text style={styles.radiusText}>
                    Search results for "{normalizedSearchQuery}" · {caregivers.length} found
                  </Text>
                )}
                {patientLocation && searchRadius && (
                  <Text style={styles.radiusText}>
                    Within {searchRadius} km · {caregivers.length} found
                  </Text>
                )}
                {locationPermission === 'denied' && (
                  <TouchableOpacity onPress={refreshLocation}>
                    <Text style={styles.locationDeniedText}>📍 Enable location for nearby results</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke={viewMode === 'list' ? '#ffffff' : '#6b7280'} strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                  onPress={() => setViewMode('map')}
                >
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                    stroke={viewMode === 'map' ? '#ffffff' : '#6b7280'} strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {(searchLoading || loading || (!isSearchMode && locationLoading)) ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>
                  {searchLoading
                    ? 'Searching available nurses...'
                    : (locationLoading ? 'Getting your location…' : 'Finding nearby caregivers…')}
                </Text>
              </View>
            ) : viewMode === 'map' ? (
              /* ── Map View ───────────────────────────────────────────── */
              <View style={styles.mapContainer}>
                {!patientLocation ? (
                  <View style={styles.mapNoResults}>
                    <Text style={styles.emptyText}>Waiting for your live GPS location...</Text>
                  </View>
                ) : (
                  <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    showsUserLocation
                    showsMyLocationButton
                    initialRegion={{
                      latitude: patientLocation.lat,
                      longitude: patientLocation.lng,
                      latitudeDelta: MAP_DEFAULTS.latitudeDelta,
                      longitudeDelta: MAP_DEFAULTS.longitudeDelta,
                    }}
                  >
                  {/* Search-radius circle */}
                  {patientLocation && searchRadius && (
                    <MapCircle
                      center={{ latitude: patientLocation.lat, longitude: patientLocation.lng }}
                      radius={searchRadius * 1000}
                      strokeWidth={1.5}
                      strokeColor="rgba(37,99,235,0.5)"
                      fillColor="rgba(37,99,235,0.08)"
                    />
                  )}

                  {patientMapCoordinate && (
                    <Marker
                      coordinate={patientMapCoordinate}
                      anchor={{ x: 0.5, y: 0.5 }}
                      title="Patient"
                      description="Patient live location"
                    >
                      <View style={styles.patientMarkerDot} />
                    </Marker>
                  )}

                  {patientMapCoordinate && primaryCaregiverCoordinate && (
                    <Polyline
                      coordinates={[patientMapCoordinate, primaryCaregiverCoordinate]}
                      strokeColor="#ef4444"
                      strokeWidth={2}
                      lineDashPattern={[6, 4]}
                    />
                  )}

                  {distanceMidpoint && simulatedDistanceM && (
                    <Marker coordinate={distanceMidpoint} anchor={{ x: 0.5, y: 1 }}>
                      <View style={styles.distanceChip}>
                        <Text style={styles.distanceChipText}>~{simulatedDistanceM} m</Text>
                      </View>
                    </Marker>
                  )}

                  {/* Caregiver markers */}
                  {simulatedMapMarkers.map((marker) => (
                    <Marker
                      key={marker.id}
                      coordinate={marker.coordinate}
                      anchor={{ x: 0.5, y: 1 }}
                      tracksViewChanges={!loadedMarkerIds[marker.id]}
                      title={marker.title}
                      description={marker.description}
                      onCalloutPress={() => onViewProfile?.(marker.id)}
                    >
                      <View style={styles.mapPinHost} collapsable={false}>
                        <NurseMapMarker
                          imageUri={marker.caregiver.image}
                          pinColor={MAP_PIN_PRIMARY_COLOR}
                          size={60}
                          onImageReady={() =>
                            setLoadedMarkerIds((prev) =>
                              prev[marker.id] ? prev : { ...prev, [marker.id]: true }
                            )
                          }
                        />
                      </View>
                    </Marker>
                  ))}
                  </MapView>
                )}
                {ENABLE_GPS_MISMATCH_SIMULATION && simulatedDistanceM && (
                  <View style={styles.mismatchWarningCard}>
                    <Text style={styles.mismatchWarningText}>
                      Location mismatch detected: actual ~1 m, GPS shows ~{simulatedDistanceM} m.
                    </Text>
                  </View>
                )}
                {mapMarkers.length === 0 && (
                  <View style={styles.mapNoResults}>
                    <Text style={styles.emptyText}>
                      {isSearchMode ? 'No available nurses found' : 'No nearby available caregivers found in this radius yet.'}
                    </Text>
                  </View>
                )}
              </View>
            ) : caregivers.length === 0 ? (
              /* ── Empty List ─────────────────────────────────────────── */
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {isSearchMode ? 'No available nurses found' : 'No caregivers available at the moment'}
                </Text>
              </View>
            ) : (
              /* ── List View ──────────────────────────────────────────── */
              <View style={styles.caregiversList}>
                {caregivers.map((caregiver) => (
                <TouchableOpacity
                  key={caregiver.id}
                  style={styles.caregiverCard}
                  onPress={() => onViewProfile?.(caregiver.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.caregiverContent}>
                    {/* Profile Image */}
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: caregiver.image }}
                        style={styles.profileImage}
                      />
                      {caregiver.verified && (
                        <View style={styles.verifiedBadge}>
                          <Svg width={12} height={12} viewBox="0 0 20 20" fill="#ffffff">
                            <Path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </Svg>
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.caregiverInfo}>
                      <Text style={styles.caregiverName}>{caregiver.name}</Text>
                      <Text style={styles.caregiverRole}>{caregiver.role}</Text>
                      <View style={styles.specializationBadge}>
                        <Text style={styles.specializationText}>{caregiver.specialization}</Text>
                      </View>
                      <View style={styles.availabilityBadge}>
                        <Text style={styles.availabilityText}>
                          {(caregiver.availabilityStatus || (caregiver.isAvailable ? 'available' : 'unavailable')).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.statsRow}>
                        <View style={styles.ratingContainer}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth={2}>
                            <Path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </Svg>
                          <Text style={styles.ratingText}>{caregiver.rating}</Text>
                          <Text style={styles.reviewsText}>({caregiver.reviews})</Text>
                        </View>
                        <View style={styles.distanceContainer}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                            <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </Svg>
                          <Text style={styles.distanceText}>
                            {caregiver.distanceLabel || caregiver.distance || 'N/A'}
                          </Text>
                        </View>
                        {caregiver.durationMin && (
                          <Text style={styles.durationText}>{caregiver.durationMin} min</Text>
                        )}
                      </View>
                    </View>

                    {/* Price & Favorite */}
                    <View style={styles.rightColumn}>
                      <TouchableOpacity style={styles.favoriteButton}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </Svg>
                      </TouchableOpacity>
                      <Text style={styles.priceText}>{caregiver.price}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
          </>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>My Bookings</Text>
            </View>

            {bookingsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading bookings...</Text>
              </View>
            ) : bookings.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </Svg>
                <Text style={styles.emptyStateTitle}>No Bookings Yet</Text>
                <Text style={styles.emptyStateText}>Book a caregiver to see your appointments here</Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={onOpenBooking}>
                  <Text style={styles.emptyStateButtonText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bookingsList}>
                {bookings.map((booking) => (
                  <View key={booking._id} style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingStatusBadge}>
                        <Text style={styles.bookingStatusText}>
                          {formatBookingStatus(booking.status)}
                        </Text>
                      </View>
                      <Text style={styles.bookingDate}>
                        {booking?.date ? new Date(booking.date).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <Text style={styles.bookingCaregiverName}>{booking?.caregiver?.fullName || 'Caregiver'}</Text>
                    <Text style={styles.bookingServiceType}>{booking.serviceType}</Text>
                    <View style={styles.bookingFooter}>
                      <Text style={styles.bookingTime}>{booking?.time || 'N/A'}</Text>
                      <Text style={styles.bookingAmount}>Rs. {booking.amount}</Text>
                    </View>
                    <View style={styles.bookingActions}>
                      {canTrackBooking(booking.status) && (
                        <TouchableOpacity
                          style={styles.trackBookingButton}
                          onPress={() => onTrackBooking?.(booking)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.trackBookingButtonText}>Track</Text>
                        </TouchableOpacity>
                      )}
                      {canPatientCancel(booking.status) && (
                        <TouchableOpacity
                          style={styles.cancelBookingButton}
                          onPress={() => handleCancelBooking(booking._id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.cancelBookingButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.bottomActionSpacer} />
          </View>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>My Profile</Text>
            </View>

            {userProfile ? (
              <View style={styles.profileContent}>
                <View style={styles.profileCard}>
                  <View style={styles.profileAvatar}>
                    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </Svg>
                  </View>
                  <Text style={styles.profileName}>{userProfile.fullName || 'Patient'}</Text>
                  <Text style={styles.profileEmail}>{userProfile.email}</Text>
                </View>

                <View style={styles.profileSection}>
                  <Text style={styles.profileSectionTitle}>Personal Information</Text>
                  <View style={styles.profileInfoCard}>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Phone</Text>
                      <Text style={styles.profileInfoValue}>{userProfile.phoneNumber || 'Not provided'}</Text>
                    </View>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Location</Text>
                      <Text style={styles.profileInfoValue}>{userProfile.location || 'Not set'}</Text>
                    </View>
                    <View style={styles.profileInfoRow}>
                      <Text style={styles.profileInfoLabel}>Account Type</Text>
                      <Text style={styles.profileInfoValue}>{userProfile.userType || 'Patient'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileActions}>
                  <TouchableOpacity style={styles.profileActionButton} onPress={onOpenUserProfile}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </Svg>
                    <Text style={styles.profileActionButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.profileActionButtonDanger} onPress={handleLogout}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </Svg>
                    <Text style={styles.profileActionButtonDangerText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            )}
            <View style={{ height: 100 }} />
          </View>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={activeTab === 'home' ? styles.navItemActive : styles.navItem}
            onPress={() => setActiveTab('home')}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'home' ? '#2563eb' : '#9ca3af'} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </Svg>
            <Text style={activeTab === 'home' ? styles.navTextActive : styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeTab === 'bookings' ? styles.navItemActive : styles.navItem}
            onPress={() => setActiveTab('bookings')}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'bookings' ? '#2563eb' : '#9ca3af'} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </Svg>
            <Text style={activeTab === 'bookings' ? styles.navTextActive : styles.navText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </Svg>
            <Text style={styles.navText}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeTab === 'profile' ? styles.navItemActive : styles.navItem}
            onPress={() => setActiveTab('profile')}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'profile' ? '#2563eb' : '#9ca3af'} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </Svg>
            <Text style={activeTab === 'profile' ? styles.navTextActive : styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1824b6',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  userName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  userInfoContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  lastUpdateText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    flexShrink: 0,
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    borderRadius: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  servicesSection: {
    paddingHorizontal: 24,
    marginTop: -24,
    marginBottom: 24,
  },
  servicesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceItem: {
    alignItems: 'center',
    gap: 8,
    width: '22%',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: {
    fontSize: 11,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 14,
  },
  professionalsSection: {
    paddingHorizontal: 24,
  },
  professionalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  professionalsTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  seeAllButton: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  caregiversList: {
    gap: 16,
  },
  caregiverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  caregiverContent: {
    flexDirection: 'row',
    gap: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  caregiverRole: {
    color: '#4b5563',
    fontSize: 14,
    marginBottom: 8,
  },
  specializationBadge: {
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  specializationText: {
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '500',
  },
  availabilityBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  availabilityText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
  },
  reviewsText: {
    color: '#6b7280',
    fontSize: 14,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: '#6b7280',
    fontSize: 14,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navItemActive: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  navTextActive: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    marginHorizontal: 24,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  tabContent: {
    flex: 1,
    padding: 24,
  },
  tabHeader: {
    paddingTop: 48,
    paddingBottom: 24,
  },
  tabTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bookingsList: {
    gap: 16,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingStatusBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookingStatusText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDate: {
    color: '#6b7280',
    fontSize: 14,
  },
  bookingCaregiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookingServiceType: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookingTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  bottomActionSpacer: {
    height: 160,
  },
  trackBookingButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackBookingButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBookingButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelBookingButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  profileContent: {
    gap: 24,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  profileSection: {
    gap: 12,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  profileInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  profileInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  profileActions: {
    gap: 12,
  },
  profileActionButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  profileActionButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  profileActionButtonDanger: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  profileActionButtonDangerText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── View mode toggle ────────────────────────────────────────────────────────
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    padding: 8,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#2563eb',
  },

  // ── Radius / location info ──────────────────────────────────────────────────
  radiusText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  locationDeniedText: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
  },

  // ── Map styles ──────────────────────────────────────────────────────────────
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 380,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  map: {
    flex: 1,
  },
  mapPinHost: {
    width: 44,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  patientMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  distanceChip: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  distanceChipText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '700',
  },
  mismatchWarningCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(254,242,242,0.96)',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mismatchWarningText: {
    color: '#991b1b',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapNoResults: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  // ── Duration pill ───────────────────────────────────────────────────────────
  durationText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 4,
  },
});