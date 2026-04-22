import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';
import ReviewSubmission from './reviewSubmission';
import NurseTracking from './tracking';
import useLocation from '../hooks/useLocation';

/**
 * @param {Object} props
 * @param {Object} props.bookingData - The confirmed booking data
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onComplete]
 * @param {() => void} [props.onCancelled]
 */
export default function PatientServiceTracking({ bookingData: initialBooking, onBack, onComplete, onCancelled } = {}) {
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewScreen, setShowReviewScreen] = useState(false);

  // Patient's own GPS location (for the map)
  const { location: patientLocation } = useLocation({
    autoRequest: true,
    watch: true,
    watchTimeIntervalMs: 1000,
    watchDistanceIntervalM: 1,
  });

  useEffect(() => {
    // Poll for status updates every 3 seconds
    const interval = setInterval(() => {
      fetchBookingStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [booking?._id]);

  const fetchBookingStatus = async () => {
    try {
      if (!booking?._id) return;

      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(
        `${API_URL}/patient/bookings/${booking._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const fetchedBooking = response.data.booking;
        setBooking(fetchedBooking);
        
        // Log when booking reaches completed_confirmed
        if (fetchedBooking.status === 'completed_confirmed') {
          console.log('Booking is completed_confirmed:', {
            patientReviewSubmitted: fetchedBooking.patientReviewSubmitted,
            _id: fetchedBooking._id
          });
        }
      }
    } catch (error) {
      console.error('Error fetching booking status:', error);
    }
  };

  const handleConfirmCompletion = async () => {
    Alert.alert(
      'Confirm Service Completion',
      'Are you satisfied with the service provided? This action will mark the service as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setConfirming(true);
              const token = await AsyncStorage.getItem('authToken');

              const response = await axios.put(
                `${API_URL}/patient/bookings/${booking._id}/confirm-completion`,
                {},
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
              );

              if (response.data.success) {
                const updatedBooking = response.data.booking;
                setBooking(updatedBooking);
                
                console.log('Booking after confirmation:', {
                  status: updatedBooking.status,
                  patientReviewSubmitted: updatedBooking.patientReviewSubmitted,
                  _id: updatedBooking._id
                });
                
                Alert.alert(
                  'Service Completed!',
                  'Thank you for confirming. Please proceed to payment.',
                  [
                    {
                      text: 'OK',
                      onPress: () => onComplete?.(updatedBooking)
                    }
                  ]
                );
              }
            } catch (error) {
              console.error('Error confirming completion:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to confirm completion');
            } finally {
              setConfirming(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelBooking = async () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const token = await AsyncStorage.getItem('authToken');

              const response = await axios.put(
                `${API_URL}/patient/bookings/${booking._id}/cancel`,
                {
                  reason: 'Cancelled by patient before caregiver started travel'
                },
                {
                  headers: { Authorization: `Bearer ${token}` }
                }
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
        }
      ]
    );
  };

  // Show review screen if triggered
  if (showReviewScreen) {
    return (
      <ReviewSubmission
        bookingId={booking._id}
        userType="patient"
        onBack={() => {
          setShowReviewScreen(false);
          // Refresh booking data
          fetchBookingStatus();
        }}
        onComplete={() => {
          // Stay on tracking and refresh after review submission.
          setShowReviewScreen(false);
          fetchBookingStatus();
        }}
      />
    );
  }

  const getStatusInfo = () => {
    const statusMap = {
      'confirmed': {
        label: 'Booking Confirmed',
        description: 'Waiting for caregiver to start',
        color: '#10b981',
        progress: 0
      },
      'on_the_way': {
        label: 'Caregiver is On the Way',
        description: 'Your caregiver is coming to your location',
        color: '#3b82f6',
        progress: 20
      },
      'arrived': {
        label: 'Caregiver Has Arrived',
        description: 'Your caregiver has reached your location',
        color: '#8b5cf6',
        progress: 40
      },
      'service_started': {
        label: 'Service in Progress',
        description: 'Your service has started',
        color: '#f59e0b',
        progress: 60
      },
      'service_completed': {
        label: 'Service Completed',
        description: 'Please confirm the service completion',
        color: '#059669',
        progress: 80
      },
      'completed_confirmed': {
        label: 'Service Fully Completed',
        description: 'Thank you for using our service',
        color: '#10b981',
        progress: 100
      }
    };

    return statusMap[booking?.status] || statusMap['confirmed'];
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

  const formatTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
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

  const statusInfo = getStatusInfo();
  const caregiver = booking?.caregiver || {};

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
        <Text style={styles.headerTitle}>Track Service</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live Nurse Tracking Map (on_the_way / arrived) ────────────────── */}
        {(booking?.status === 'on_the_way' || booking?.status === 'arrived') && (
          <NurseTracking
            bookingId={booking._id}
            patientLocation={patientLocation}
            nurseInfo={{
              name:  booking?.caregiver?.fullName,
              photo: booking?.caregiver?.professionalImage,
            }}
            onArrived={() => fetchBookingStatus()}
          />
        )}

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusLabel}>{statusInfo.label}</Text>
              <Text style={styles.statusDescription}>{statusInfo.description}</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${statusInfo.progress}%`, backgroundColor: statusInfo.color }]} />
            </View>
            <Text style={styles.progressText}>{statusInfo.progress}%</Text>
          </View>
        </View>

        {/* Caregiver Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Caregiver</Text>
          <View style={styles.caregiverInfo}>
            {caregiver.professionalImage ? (
              <Image 
                source={{ uri: caregiver.professionalImage }} 
                style={styles.caregiverImage}
              />
            ) : (
              <View style={styles.caregiverImagePlaceholder}>
                <Text style={styles.caregiverInitials}>
                  {caregiver.fullName?.charAt(0) || 'C'}
                </Text>
              </View>
            )}
            <View style={styles.caregiverDetails}>
              <Text style={styles.caregiverName}>{caregiver.fullName || 'N/A'}</Text>
              <Text style={styles.caregiverPhone}>{caregiver.phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Type</Text>
            <Text style={styles.infoValue}>{booking?.serviceType || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(booking?.date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{booking?.time || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{getDurationLabel(booking?.duration)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={[styles.infoValue, styles.locationValue]} numberOfLines={2}>
              {booking?.location || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Amount</Text>
            <Text style={styles.amountValue}>
              Rs. {booking?.amount ? booking.amount.toLocaleString() : 'N/A'}
            </Text>
          </View>
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
          />
          <TimelineItem 
            label="Confirmed by You" 
            time={formatTime(booking?.completedConfirmedAt)}
            completed={!!booking?.completedConfirmedAt}
            isLast={true}
          />
        </View>

        {/* Confirm Button */}
        {booking?.status === 'confirmed' && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={handleCancelBooking}
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
          <TouchableOpacity 
            style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
            onPress={handleConfirmCompletion}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Service Completed & Proceed to Payment</Text>
            )}
          </TouchableOpacity>
        )}

        {booking?.status === 'completed_confirmed' && (
          <View style={styles.completedCard}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Svg>
            <Text style={styles.completedText}>Service Completed Successfully!</Text>
            
            {/* Debug: Log booking data */}
            {console.log('Patient Booking Review Debug:', {
              bookingId: booking._id,
              status: booking.status,
              patientReviewSubmitted: booking.patientReviewSubmitted,
              hasFlag: booking.hasOwnProperty('patientReviewSubmitted'),
              shouldShowButton: booking.patientReviewSubmitted !== true
            })}
            
            {/* Review Button - Show if review NOT submitted (handles undefined/null as false) */}
            {booking.patientReviewSubmitted !== true && (
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={() => {
                  console.log('Review button pressed for booking:', booking._id);
                  setShowReviewScreen(true);
                }}
              >
                <Text style={styles.reviewButtonText}>⭐ Rate Your Caregiver</Text>
              </TouchableOpacity>
            )}
            
            {booking.patientReviewSubmitted === true && (
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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 40,
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
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caregiverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  caregiverImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  caregiverInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6b7280',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  caregiverPhone: {
    fontSize: 14,
    color: '#6b7280',
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
  confirmButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
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
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
