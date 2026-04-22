import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

/**
 * @param {Object} props
 * @param {Object} [props.bookingData] - The booking data object
 * @param {() => void} [props.onTrackBooking]
 * @param {() => void} [props.onBackHome]
 */
export default function BookingConfirmation({ bookingData, onTrackBooking, onBackHome } = {}) {
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get caregiver initials
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}` 
      : `${parts[0][0]}${parts[0][1] || ''}`;
  };

  // Get duration label
  const getDurationLabel = (duration) => {
    const labels = {
      'hourly': 'Per Hour',
      'daily': 'Per Day',
      'weekly': 'Per Week',
      'monthly': 'Per Month'
    };
    return labels[duration] || duration;
  };

  // Get payment method label
  const getPaymentLabel = (method) => {
    const labels = {
      'cash': 'Cash on Service',
      'jazzcash': 'JazzCash',
      'easypaisa': 'Easypaisa',
      'card': 'Credit/Debit Card'
    };
    return labels[method] || method;
  };

  // Extract data with fallbacks
  const caregiver = bookingData?.caregiver || {};
  const caregiverName = caregiver.fullName || 'Caregiver';
  const caregiverRole = caregiver.userType === 'nurse' ? 'Registered Nurse' : 'Healthcare Professional';
  const serviceType = bookingData?.serviceType || 'N/A';
  const bookingDate = formatDate(bookingData?.date);
  const bookingTime = bookingData?.time || 'N/A';
  const duration = getDurationLabel(bookingData?.duration);
  const location = bookingData?.location || 'N/A';
  const amount = bookingData?.amount || 0;
  const paymentMethod = getPaymentLabel(bookingData?.paymentMethod);
  const bookingId = bookingData?._id ? `BK-${bookingData._id.slice(-8).toUpperCase()}` : 'N/A';
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
          {/* Success Animation */}
          <View style={styles.successCircle}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </Svg>
          </View>

          {/* Success Message */}
          <Text style={styles.title}>Booking Completed!</Text>
          <Text style={styles.subtitle}>
            Your booking has been successfully completed. Thank you for using our service.
          </Text>

          {/* Booking Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Booking Details</Text>
            
            {/* Caregiver Info */}
            <View style={styles.caregiverSection}>
              <LinearGradient
                colors={['#3b82f6', '#14b8a6']}
                style={styles.caregiverAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>{getInitials(caregiverName)}</Text>
              </LinearGradient>
              <View style={styles.caregiverInfo}>
                <Text style={styles.caregiverName}>{caregiverName}</Text>
                <Text style={styles.caregiverRole}>{caregiverRole}</Text>
                <View style={styles.rating}>
                  <Text style={styles.star}>★</Text>
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
            </View>

            {/* Service Details */}
            <View style={styles.detailsSection}>
              {/* Service Type */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: '#eff6ff' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </Svg>
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{serviceType}</Text>
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: '#f0fdfa' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </Svg>
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date & Time</Text>
                  <Text style={styles.detailValue}>{bookingDate} at {bookingTime}</Text>
                </View>
              </View>

              {/* Duration */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{duration}</Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.detailRow}>
                <View style={[styles.iconContainer, { backgroundColor: '#faf5ff' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </Svg>
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{location}</Text>
                </View>
              </View>
            </View>

            {/* Payment */}
            <View style={styles.paymentSection}>
              <View style={styles.paymentLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#fff7ed' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                </View>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={styles.paymentMethod}>{paymentMethod}</Text>
                </View>
              </View>
              <Text style={styles.totalAmount}>Rs. {amount.toLocaleString()}</Text>
            </View>
          </View>

          {/* Booking Reference */}
          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>Booking Reference</Text>
            <Text style={styles.referenceNumber}>{bookingId}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={onBackHome}
              style={styles.trackButton}
              activeOpacity={0.8}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </Svg>
              <Text style={styles.trackButtonText}>Back to Home</Text>
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
  successCircle: {
    width: 96,
    height: 96,
    backgroundColor: '#22c55e',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#4b5563',
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
    marginBottom: 24,
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
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  star: {
    color: '#fbbf24',
    fontSize: 14,
  },
  ratingText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  paymentMethod: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  totalAmount: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 20,
  },
  referenceCard: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  referenceLabel: {
    color: '#1d4ed8',
    fontSize: 14,
    marginBottom: 4,
  },
  referenceNumber: {
    color: '#1e3a8a',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 2,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 448,
    gap: 12,
  },
  trackButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  trackButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  homeButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  homeButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});
