import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

/**
 * @param {Object} props
 * @param {Object} [props.bookingData] - The booking data object
 * @param {() => void} [props.onBack]
 * @param {(booking: Object) => void} [props.onApproved]
 * @param {() => void} [props.onRejected]
 */
export default function PendingApproval({ bookingData, onBack, onApproved, onRejected } = {}) {
  const [checking, setChecking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('pending');

  useEffect(() => {
    // Poll for booking status every 5 seconds
    const interval = setInterval(() => {
      checkBookingStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [bookingData]);

  const checkBookingStatus = async () => {
    if (!bookingData?._id) return;

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_URL}/patient/bookings/${bookingData._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const status = response.data.booking.status;
        setBookingStatus(status);

        if (status === 'approved') {
          // Booking approved - navigate to payment confirmation
          Alert.alert(
            'Booking Approved!',
            'The caregiver has accepted your booking request. Please proceed to confirm your payment method.',
            [
              {
                text: 'Continue',
                onPress: () => onApproved?.(response.data.booking)
              }
            ]
          );
        } else if (status === 'rejected') {
          // Booking rejected
          Alert.alert(
            'Booking Declined',
            'Unfortunately, the caregiver is not available for this booking. You can try booking with another caregiver.',
            [
              {
                text: 'Find Another',
                onPress: () => onRejected?.()
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              
              await axios.delete(
                `${API_URL}/patient/bookings/${bookingData._id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              );

              Alert.alert('Cancelled', 'Your booking request has been cancelled.');
              onBack?.();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
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

  const caregiver = bookingData?.caregiver || {};
  const caregiverName = caregiver.fullName || 'Caregiver';

  return (
    <LinearGradient
      colors={['#1824b6', '#3caea8']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Loading Icon */}
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>

          {/* Status Message */}
          <Text style={styles.title}>Waiting for Approval</Text>
          <Text style={styles.subtitle}>
            Your booking request has been sent to {caregiverName}. You'll be notified once they respond.
          </Text>

          {/* Booking Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Request Details</Text>
            
            {/* Caregiver Info */}
            <View style={styles.caregiverSection}>
              <LinearGradient
                colors={['#3b82f6', '#14b8a6']}
                style={styles.caregiverAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {caregiverName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.caregiverInfo}>
                <Text style={styles.caregiverName}>{caregiverName}</Text>
                <Text style={styles.caregiverRole}>
                  {caregiver.userType === 'nurse' ? 'Registered Nurse' : 'Healthcare Professional'}
                </Text>
              </View>
            </View>

            {/* Service Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </Svg>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{bookingData?.serviceType || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </Svg>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(bookingData?.date)} at {bookingData?.time || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Svg>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{getDurationLabel(bookingData?.duration)}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </Svg>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {bookingData?.location || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Estimated Amount</Text>
              <Text style={styles.amountValue}>
                Rs. {bookingData?.amount ? bookingData.amount.toLocaleString() : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Info Message */}
          <View style={styles.infoCard}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
              <Circle cx={12} cy={12} r={10} />
              <Path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
            </Svg>
            <Text style={styles.infoText}>
              You will be notified once the caregiver accepts or declines your request. This usually takes a few minutes.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={handleCancelBooking}
              style={styles.cancelButton}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </Svg>
              <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  loadingCircle: {
    width: 96,
    height: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 320,
    lineHeight: 24,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
  },
  caregiverSection: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 16,
  },
  caregiverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  caregiverInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  caregiverName: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  caregiverRole: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  detailValue: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
    marginTop: 2,
  },
  amountSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  amountValue: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 20,
  },
  infoCard: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#1e40af',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 448,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});
