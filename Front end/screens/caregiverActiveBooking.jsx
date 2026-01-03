import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

/**
 * @param {Object} props
 * @param {Object} props.bookingData - The confirmed booking data
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onComplete]
 */
export default function CaregiverActiveBooking({ bookingData: initialBooking, onBack, onComplete } = {}) {
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

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
        `${API_URL}/caregiver/bookings?status=${booking.status}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const updatedBooking = response.data.bookings.find(b => b._id === booking._id);
        if (updatedBooking) {
          setBooking(updatedBooking);
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
        setBooking(response.data.booking);
        
        const messages = {
          'on_the_way': 'Status updated: On the Way',
          'arrived': 'Status updated: Arrived at Location',
          'service_started': 'Service Started Successfully',
          'service_completed': 'Service Marked as Completed'
        };

        Alert.alert('Success', messages[newStatus] || 'Status updated');

        // If service completed, notify to go back after a delay
        if (newStatus === 'service_completed') {
          setTimeout(() => {
            Alert.alert(
              'Service Completed',
              'Waiting for patient confirmation.',
              [{ text: 'OK', onPress: () => onComplete?.() }]
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

  const getStatusInfo = () => {
    const statusMap = {
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
  const patient = booking?.patient || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            isLast={true}
          />
        </View>

        {/* Action Button */}
        {statusInfo.nextAction && (
          <TouchableOpacity 
            style={[styles.actionButton, updating && styles.actionButtonDisabled]}
            onPress={() => handleUpdateStatus(statusInfo.nextAction)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>{statusInfo.nextLabel}</Text>
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
  actionButtonText: {
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
    flexDirection: 'row',
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
    marginLeft: 12,
  },
});
