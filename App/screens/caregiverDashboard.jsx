import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, Image, Modal, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, SERVER_CONFIG } from '../config/api';
import testServerConnection from '../config/testConnection';

/**
 * @param {Object} props
 * @param {() => void} [props.onViewJobDetails]
 * @param {(booking: Object) => void} [props.onViewActiveBooking]
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onLogout]
 * @param {() => void} [props.onSetProfile]
 * @param {() => void} [props.onViewProfile]
 */
export default function CaregiverDashboard({ onViewJobDetails, onViewActiveBooking, onBack, onLogout, onSetProfile, onViewProfile } = {}) {
  const [activeTab, setActiveTab] = useState('home');
  const [isAvailable, setIsAvailable] = useState(true);
  const [userName, setUserName] = useState('Caregiver');
  const [userRole, setUserRole] = useState('Healthcare Professional');
  const [professionalImage, setProfessionalImage] = useState(null);
  const [userType, setUserType] = useState('caretaker');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [jobRequests, setJobRequests] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ total: 0, jobs: 0, hours: 0 });
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [weekEarnings, setWeekEarnings] = useState({ total: 0, jobs: 0, hours: 0 });
  const [monthEarnings, setMonthEarnings] = useState({ total: 0, jobs: 0, hours: 0 });

  useEffect(() => {
    loadUserData();
    fetchUserProfile(); // Fetch fresh data from backend
    fetchJobRequests(true); // Show loading spinner on initial load
    fetchActiveBookings();
    fetchEarnings();
    fetchConfirmedBookings();

    // Auto-refresh job requests every 5 seconds to show new bookings
    const interval = setInterval(() => {
      fetchJobRequests(); // No loading spinner on auto-refresh
      fetchActiveBookings();
      fetchEarnings();
      fetchConfirmedBookings();
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.fullName || 'Caregiver');
        setUserType(user.userType || 'caretaker');
        setUserEmail(user.email || '');
        setUserPhone(user.phone || 'N/A');
        
        // Set availability status from user data
        if (typeof user.isAvailable === 'boolean') {
          setIsAvailable(user.isAvailable);
        }
        
        // Set role based on user type
        if (user.userType === 'nurse') {
          if (user.licenseNumber && user.licenseNumber.includes('RN')) {
            setUserRole('Registered Nurse (RN)');
          } else if (user.licenseNumber && user.licenseNumber.includes('LPN')) {
            setUserRole('Licensed Practical Nurse (LPN)');
          } else {
            setUserRole('Registered Nurse');
          }
        } else {
          setUserRole('Medical Caregiver');
        }
        
        // Set professional image if available
        if (user.professionalImage) {
          setProfessionalImage(user.professionalImage);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/caregiver/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.profile) {
        const profile = response.data.profile;
        
        // Update state with fresh data
        if (typeof profile.isAvailable === 'boolean') {
          setIsAvailable(profile.isAvailable);
        }
        
        // Update AsyncStorage with latest profile data
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          user.isAvailable = profile.isAvailable !== undefined ? profile.isAvailable : true;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchJobRequests = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) {
        setLoading(true);
      }
      
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found');
        setLoading(false);
        return;
      }

      // Fetch pending booking requests
      const response = await axios.get(`${API_URL}/caregiver/bookings?status=pending`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setJobRequests(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching job requests:', error);
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch confirmed and in-progress bookings
      const statuses = ['confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed'];
      const requests = statuses.map(status => 
        axios.get(`${API_URL}/caregiver/bookings?status=${status}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      const responses = await Promise.all(requests);
      const allActiveBookings = responses.flatMap(res => res.data.success ? res.data.bookings : []);
      
      setActiveBookings(allActiveBookings);
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const [todayRes, weekRes, monthRes] = await Promise.all([
        axios.get(`${API_URL}/caregiver/earnings?period=today`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/caregiver/earnings?period=week`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/caregiver/earnings?period=month`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (todayRes.data.success) setEarnings(todayRes.data.earnings);
      if (weekRes.data.success) setWeekEarnings(weekRes.data.earnings);
      if (monthRes.data.success) setMonthEarnings(monthRes.data.earnings);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  const fetchConfirmedBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await axios.get(`${API_URL}/caregiver/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const bookings = response.data.bookings || [];
        setAllBookings(bookings);
        
        // Get only upcoming confirmed bookings for home tab
        const upcoming = bookings.filter(booking => {
          const bookingDate = new Date(booking.date);
          return bookingDate >= new Date() && booking.status === 'confirmed';
        });
        setConfirmedBookings(upcoming.slice(0, 3)); // Show only first 3
      }
    } catch (error) {
      console.error('Error fetching confirmed bookings:', error);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.put(
        `${API_URL}/caregiver/bookings/${bookingId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Booking request accepted! Patient will proceed to payment.');
        fetchJobRequests(); // Refresh the list
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept booking');
    }
  };

  const handleRejectBooking = async (bookingId) => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this booking request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              
              const response = await axios.put(
                `${API_URL}/caregiver/bookings/${bookingId}/reject`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              );

              if (response.data.success) {
                Alert.alert('Success', 'Booking request rejected');
                fetchJobRequests(); // Refresh the list
              }
            } catch (error) {
              console.error('Error rejecting booking:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to reject booking');
            }
          }
        }
      ]
    );
  };

  const handleAvailabilityToggle = async (newValue) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      // Optimistically update UI
      setIsAvailable(newValue);

      console.log('Updating availability to:', newValue);
      console.log('API URL:', `${API_URL}/caregiver/availability`);

      // Update backend with timeout
      const response = await axios.put(
        `${API_URL}/caregiver/availability`,
        { isAvailable: newValue },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data.success) {
        // Update local storage
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          user.isAvailable = newValue;
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
        
        console.log(`✅ Availability updated: ${newValue ? 'ONLINE - Visible to patients' : 'OFFLINE - Hidden from patients'}`);
        
        Alert.alert(
          '✅ Success', 
          newValue 
            ? '🟢 You are now ONLINE\n\n• Visible to all patients\n• Will receive job requests\n• Patients can book your services' 
            : '🔴 You are now OFFLINE\n\n• Invisible to patients\n• Will not receive job requests\n• Can still manage active bookings'
        );
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
      
      // Revert on error
      setIsAvailable(!newValue);
      
      // Better error message
      let errorMessage = 'Failed to update availability status';
      
      if (error.message === 'Network Error' || error.message.includes('Network request failed')) {
        errorMessage = `Cannot connect to server at ${SERVER_CONFIG.ip}\n\nMake sure:\n• Device is on same WiFi as computer\n• Server is running\n• IP address is correct`;
        
        Alert.alert(
          '❌ Connection Error', 
          errorMessage,
          [
            {
              text: 'Test Connection',
              onPress: async () => {
                const result = await testServerConnection();
                Alert.alert(
                  result.success ? '✅ Connection Test' : '❌ Connection Test',
                  result.message + '\n\nServer: ' + SERVER_CONFIG.ip + ':' + SERVER_CONFIG.port
                );
              }
            },
            { text: 'OK' }
          ]
        );
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - Server took too long to respond';
        Alert.alert('⏱️ Timeout Error', errorMessage);
      } else {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getDurationLabel = (duration) => {
    const labels = {
      'hourly': 'Hourly',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly'
    };
    return labels[duration] || duration;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'confirmed': 'Confirmed',
      'on_the_way': 'On the Way',
      'arrived': 'Arrived',
      'service_started': 'In Progress',
      'service_completed': 'Completed',
      'completed_confirmed': 'Finished'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'confirmed': { backgroundColor: '#d1fae5' },
      'on_the_way': { backgroundColor: '#dbeafe' },
      'arrived': { backgroundColor: '#e9d5ff' },
      'service_started': { backgroundColor: '#fef3c7' },
      'service_completed': { backgroundColor: '#d1fae5' },
      'completed_confirmed': { backgroundColor: '#d1fae5' }
    };
    return colors[status] || { backgroundColor: '#e5e7eb' };
  };

  console.log('Current activeTab:', activeTab);

  return (
    <LinearGradient
      colors={['#1824b6', '#3caea8']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {activeTab === 'home' && (
          <>
            {/* Header */}
            <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                {onBack && (
                  <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </Svg>
                  </TouchableOpacity>
                )}
                {professionalImage ? (
                  <Image 
                    source={{ uri: professionalImage }} 
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </Svg>
                  </View>
                )}
                <View style={styles.headerUserInfo}>
                  <Text style={styles.welcomeText}>Welcome Back</Text>
                  <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">{userName}</Text>
                  <Text style={styles.roleText} numberOfLines={1} ellipsizeMode="tail">{userRole}</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.iconButton} 
                  activeOpacity={0.7}
                  onPress={async () => {
                    const result = await testServerConnection();
                    Alert.alert(
                      result.success ? '✅ Server Connected' : '❌ Connection Failed',
                      result.message + '\n\n' + 
                      'Server: ' + SERVER_CONFIG.ip + ':' + SERVER_CONFIG.port +
                      (result.details.suggestion ? '\n\n💡 ' + result.details.suggestion : '')
                    );
                  }}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={() => setShowProfileModal(true)}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={onLogout}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* Availability Toggle */}
            <View style={styles.availabilityCard}>
              <View style={styles.availabilityContent}>
                <View style={styles.availabilityText}>
                  <Text style={styles.availabilityTitle}>Availability Status</Text>
                  <Text style={styles.availabilitySubtitle}>
                    {isAvailable ? 'You are accepting jobs' : 'You are not accepting jobs'}
                  </Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={handleAvailabilityToggle}
                  trackColor={{ false: '#9ca3af', true: '#22c55e' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </View>

          {/* Earnings Summary */}
          <View style={styles.earningsContainer}>
            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <Text style={styles.earningsTitle}>Today's Earnings</Text>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </Svg>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Earned</Text>
                  <Text style={styles.statValue}>Rs. {earnings.total.toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Jobs</Text>
                  <Text style={styles.statValue}>{earnings.jobs}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Hours</Text>
                  <Text style={styles.statValue}>{earnings.hours}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Active Services */}
          {activeBookings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Services</Text>
                <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.badgeText}>{activeBookings.length} Active</Text>
                </View>
              </View>

              <View style={styles.jobsList}>
                {activeBookings.map((booking) => (
                  <TouchableOpacity 
                    key={booking._id} 
                    style={[styles.jobCard, styles.activeJobCard]}
                    onPress={() => onViewActiveBooking?.(booking)}
                  >
                    <View style={styles.jobHeader}>
                      <View>
                        <Text style={styles.jobPatient}>
                          {booking.patient?.fullName || 'Patient'}
                        </Text>
                        <View style={[styles.serviceTag, { backgroundColor: '#dbeafe' }]}>
                          <Text style={[styles.serviceText, { color: '#1e40af' }]}>
                            {booking.serviceType}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, getStatusColor(booking.status)]}>
                        <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
                      </View>
                    </View>

                    <View style={styles.jobDetails}>
                      <View style={styles.detailRow}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </Svg>
                        <Text style={styles.detailText}>{formatDate(booking.date)} • {booking.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </Svg>
                        <Text style={styles.detailText} numberOfLines={1}>{booking.location}</Text>
                      </View>
                      <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Amount:</Text>
                        <Text style={styles.amountValue}>Rs. {booking.amount?.toLocaleString() || 'N/A'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Job Requests */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Job Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{jobRequests.length} New</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading job requests...</Text>
              </View>
            ) : jobRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No job requests available at the moment</Text>
              </View>
            ) : (
              <View style={styles.jobsList}>
                {jobRequests.map((job) => (
                  <View key={job._id} style={styles.jobCard}>
                    {/* Header */}
                    <View style={styles.jobHeader}>
                      <View>
                        <Text style={styles.jobPatient}>
                          {job.patient?.fullName || 'Patient'}
                        </Text>
                        <View style={styles.serviceTag}>
                          <Text style={styles.serviceText}>{job.serviceType}</Text>
                        </View>
                      </View>
                      <Text style={styles.jobPayment}>
                        Rs. {job.amount ? job.amount.toLocaleString() : 'N/A'}
                      </Text>
                    </View>

                    {/* Details */}
                    <View style={styles.jobDetails}>
                      <View style={styles.detailRow}>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </Svg>
                        <Text style={styles.detailText}>
                          {formatDate(job.date)} at {job.time} • {getDurationLabel(job.duration)}
                        </Text>
                      </View>
                      {job.location && (
                        <View style={styles.detailRow}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                            <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </Svg>
                          <Text style={styles.detailText} numberOfLines={1}>{job.location}</Text>
                        </View>
                      )}
                      {job.patient?.phone && (
                        <View style={styles.detailRow}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                            <Path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </Svg>
                          <Text style={styles.detailText}>{job.patient.phone}</Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={styles.jobActions}>
                      <TouchableOpacity 
                        style={styles.declineButton} 
                        activeOpacity={0.8}
                        onPress={() => handleRejectBooking(job._id)}
                      >
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.acceptButton} 
                        activeOpacity={0.8}
                        onPress={() => handleAcceptBooking(job._id)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Upcoming Bookings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {confirmedBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No upcoming bookings</Text>
              </View>
            ) : (
              <View style={styles.bookingsList}>
                {confirmedBookings.map((booking) => (
                  <TouchableOpacity
                    key={booking._id}
                    style={styles.bookingCard}
                    activeOpacity={0.7}
                    onPress={() => onViewActiveBooking?.(booking)}
                  >
                    <LinearGradient
                      colors={['#dbeafe', '#ccfbf1']}
                      style={styles.bookingIcon}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </Svg>
                    </LinearGradient>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingPatient}>{booking.patient?.fullName || 'Patient'}</Text>
                      <Text style={styles.bookingService}>{booking.serviceType}</Text>
                      <Text style={styles.bookingDetails}>
                        {formatDate(booking.date)} • {booking.time} • {booking.location}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.quickActionsCard}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity style={styles.quickActionButton} activeOpacity={0.7}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.quickActionText}>View Earnings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickActionButton, { backgroundColor: '#f0fdfa' }]} activeOpacity={0.7}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </Svg>
                  <Text style={styles.quickActionText}>My Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <>
              <View style={styles.header}>
                <Text style={[styles.nameText, { fontSize: 24, marginBottom: 8 }]}>My Bookings</Text>
              </View>
              <View style={styles.section}>
                {allBookings.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </Svg>
                    <Text style={styles.emptyText}>No bookings yet</Text>
                  </View>
                ) : (
                  <View style={styles.jobsList}>
                    {allBookings.map((booking) => (
                      <TouchableOpacity 
                        key={booking._id} 
                        style={styles.jobCard}
                        onPress={() => {
                          if (booking.status === 'pending') {
                            // Pending booking - no action
                          } else if (['confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed'].includes(booking.status)) {
                            onViewActiveBooking?.(booking);
                          }
                        }}
                      >
                        <View style={styles.jobHeader}>
                          <View>
                            <Text style={styles.jobPatient}>{booking.patient?.fullName || 'Patient'}</Text>
                            <View style={styles.serviceTag}>
                              <Text style={styles.serviceText}>{booking.serviceType}</Text>
                            </View>
                          </View>
                          <View style={[styles.statusBadge, getStatusColor(booking.status)]}>
                            <Text style={styles.statusText}>{getStatusLabel(booking.status)}</Text>
                          </View>
                        </View>
                        <View style={styles.jobDetails}>
                          <View style={styles.detailRow}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                              <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </Svg>
                            <Text style={styles.detailText}>{formatDate(booking.date)} • {booking.time}</Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                              <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <Path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </Svg>
                            <Text style={styles.detailText} numberOfLines={1}>{booking.location}</Text>
                          </View>
                          <View style={styles.amountRow}>
                            <Text style={styles.amountLabel}>Amount:</Text>
                            <Text style={styles.amountValue}>Rs. {booking.amount?.toLocaleString() || 'N/A'}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <>
              <View style={styles.header}>
                <Text style={[styles.nameText, { fontSize: 24, marginBottom: 8 }]}>My Earnings</Text>
              </View>
              
              {earnings.total === 0 && weekEarnings.total === 0 && monthEarnings.total === 0 ? (
                <View style={styles.section}>
                  <View style={styles.emptyContainer}>
                    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </Svg>
                    <Text style={[styles.emptyText, { fontSize: 16, fontWeight: '600', marginTop: 12 }]}>No Earnings Yet</Text>
                    <Text style={[styles.emptyText, { marginTop: 4 }]}>Complete services to start earning</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.earningsCard}>
                    <Text style={[styles.earningsTitle, { marginBottom: 16 }]}>Today</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Earned</Text>
                        <Text style={styles.statValue}>Rs. {earnings.total.toLocaleString()}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Jobs</Text>
                        <Text style={styles.statValue}>{earnings.jobs}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Hours</Text>
                        <Text style={styles.statValue}>{earnings.hours}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.earningsCard, { marginTop: 16 }]}>
                    <Text style={[styles.earningsTitle, { marginBottom: 16 }]}>This Week</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Earned</Text>
                        <Text style={styles.statValue}>Rs. {weekEarnings.total.toLocaleString()}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Jobs</Text>
                        <Text style={styles.statValue}>{weekEarnings.jobs}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Hours</Text>
                        <Text style={styles.statValue}>{weekEarnings.hours}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.earningsCard, { marginTop: 16 }]}>
                    <Text style={[styles.earningsTitle, { marginBottom: 16 }]}>This Month</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Earned</Text>
                        <Text style={styles.statValue}>Rs. {monthEarnings.total.toLocaleString()}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Jobs</Text>
                        <Text style={styles.statValue}>{monthEarnings.jobs}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Hours</Text>
                        <Text style={styles.statValue}>{monthEarnings.hours}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <View style={styles.headerLeft}>
                    {professionalImage ? (
                      <Image source={{ uri: professionalImage }} style={styles.profileImage} />
                    ) : (
                      <View style={styles.profileImagePlaceholder}>
                        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </Svg>
                      </View>
                    )}
                    <View style={styles.headerUserInfo}>
                      <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">{userName}</Text>
                      <Text style={styles.roleText} numberOfLines={1} ellipsizeMode="tail">{userRole}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.quickActionsCard}>
                  <TouchableOpacity 
                    style={styles.profileMenuItem}
                    activeOpacity={0.7}
                    onPress={onViewProfile}
                  >
                    <View style={styles.menuItemIcon}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </Svg>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>View Profile</Text>
                      <Text style={styles.menuItemDescription}>See your profile information</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </Svg>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.profileMenuItem}
                    activeOpacity={0.7}
                    onPress={onSetProfile}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#fef3c7' }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </Svg>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>Edit Profile</Text>
                      <Text style={styles.menuItemDescription}>Update your profile details</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </Svg>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.profileMenuItem}
                    activeOpacity={0.7}
                    onPress={onLogout}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#fee2e2' }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </Svg>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>Logout</Text>
                      <Text style={styles.menuItemDescription}>Sign out of your account</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Profile Modal */}
        <Modal
          visible={showProfileModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowProfileModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.profileMenuContainer}>
                <View style={styles.profileMenuHeader}>
                  <Text style={styles.profileMenuTitle}>Profile Menu</Text>
                  <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.closeButton}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </Svg>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.profileMenuBody}>
                  {/* View Profile Button */}
                  <TouchableOpacity 
                    style={styles.profileMenuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowProfileModal(false);
                      setTimeout(() => {
                        if (onViewProfile) {
                          onViewProfile();
                        }
                      }, 300);
                    }}
                  >
                    <View style={styles.menuItemIcon}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </Svg>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>View Profile</Text>
                      <Text style={styles.menuItemDescription}>See your profile information</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </Svg>
                  </TouchableOpacity>

                  {/* Set Profile Button */}
                  <TouchableOpacity 
                    style={styles.profileMenuItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowProfileModal(false);
                      setTimeout(() => {
                        if (onSetProfile) {
                          onSetProfile();
                        }
                      }, 300);
                    }}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#fef3c7' }]}>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </Svg>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>Set Profile</Text>
                      <Text style={styles.menuItemDescription}>Edit your profile details</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => {
            console.log('Switching to home tab');
            setActiveTab('home');
          }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'home' ? "#2563eb" : "#9ca3af"} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </Svg>
            <Text style={activeTab === 'home' ? styles.navTextActive : styles.navText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => {
            console.log('Switching to bookings tab');
            setActiveTab('bookings');
          }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'bookings' ? "#2563eb" : "#9ca3af"} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </Svg>
            <Text style={activeTab === 'bookings' ? styles.navTextActive : styles.navText}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => {
            console.log('Switching to earnings tab');
            setActiveTab('earnings');
          }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'earnings' ? "#2563eb" : "#9ca3af"} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
            <Text style={activeTab === 'earnings' ? styles.navTextActive : styles.navText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} activeOpacity={0.7} onPress={() => {
            console.log('Switching to profile tab');
            setActiveTab('profile');
          }}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={activeTab === 'profile' ? "#2563eb" : "#9ca3af"} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </Svg>
            <Text style={activeTab === 'profile' ? styles.navTextActive : styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerUserInfo: {
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  nameText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  roleText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  availabilityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityText: {
    flex: 1,
  },
  availabilityTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  availabilitySubtitle: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  earningsContainer: {
    paddingHorizontal: 24,
    marginTop: -24,
    marginBottom: 24,
  },
  earningsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  earningsTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 20,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  jobsList: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeJobCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  jobPatient: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  serviceTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  serviceText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '500',
  },
  jobPayment: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  jobDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#6b7280',
    fontSize: 14,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  amountLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  amountValue: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  jobActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  bookingsList: {
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingPatient: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  bookingService: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 8,
  },
  bookingDetails: {
    color: '#9ca3af',
    fontSize: 12,
  },
  quickActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  quickActionText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
  },
  bottomNav: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navTextActive: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '500',
  },
  navText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileMenuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  profileMenuBody: {
    padding: 12,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
});