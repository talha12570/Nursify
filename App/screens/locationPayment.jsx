import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

/**
 * @param {Object} props
 * @param {Object} [props.bookingData] - The approved booking data object
 * @param {() => void} [props.onBack]
 * @param {(booking: Object) => void} [props.onComplete]
 */
export default function LocationPayment({ bookingData, onBack, onComplete } = {}) {
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

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

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await axios.put(
        `${API_URL}/patient/bookings/${bookingData._id}`,
        {
          paymentMethod,
          status: 'confirmed' // Update status to confirmed after payment selection
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Your booking is now confirmed!',
          [
            {
              text: 'OK',
              onPress: () => onComplete?.(response.data.booking)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to confirm booking. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const caregiver = bookingData?.caregiver || {};
  const caregiverName = caregiver.fullName || 'Caregiver';

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
            <Text style={styles.headerTitle}>Confirm Payment</Text>
            <Text style={styles.headerSubtitle}>Select payment method</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Badge */}
        <View style={styles.successBadge}>
          <View style={styles.successIcon}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </Svg>
          </View>
          <Text style={styles.successText}>Approved by {caregiverName}</Text>
        </View>

        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Booking Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Type</Text>
            <Text style={styles.summaryValue}>{bookingData?.serviceType || 'N/A'}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatDate(bookingData?.date)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{bookingData?.time || 'N/A'}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{getDurationLabel(bookingData?.duration)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValueLocation} numberOfLines={2}>
              {bookingData?.location || 'N/A'}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              Rs. {bookingData?.amount ? bookingData.amount.toLocaleString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {[
            { id: 'jazzcash', name: 'JazzCash', icon: '💳', available: false },
            { id: 'easypaisa', name: 'Easypaisa', icon: '💰', available: false },
            { id: 'card', name: 'Credit/Debit Card', icon: '💳', available: false },
            { id: 'cash', name: 'Cash on Service', icon: '💵', available: true }
          ].map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => {
                if (method.available) {
                  setPaymentMethod(method.id);
                } else {
                  Alert.alert(
                    'Payment Method Not Available',
                    'This payment method is not yet available. Please use Cash on Service.',
                    [{ text: 'OK' }]
                  );
                }
              }}
              style={[
                styles.paymentOption,
                paymentMethod === method.id && styles.paymentOptionActive,
                !method.available && styles.paymentOptionDisabled
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <View style={styles.paymentTextContainer}>
                  <Text style={[
                    styles.paymentText,
                    !method.available && styles.paymentTextDisabled
                  ]}>{method.name}</Text>
                  {!method.available && (
                    <Text style={styles.paymentUnavailable}>Not Available</Text>
                  )}
                </View>
              </View>
              {paymentMethod === method.id && (
                <View style={styles.checkmark}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </Svg>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleConfirmBooking}
          disabled={submitting}
          style={[
            styles.confirmButton,
            submitting && styles.confirmButtonDisabled
          ]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Payment & Book</Text>
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
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 16,
    margin: 24,
    marginBottom: 16,
  },
  successIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    flex: 1,
    color: '#166534',
    fontWeight: '600',
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  cardTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  summaryValue: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'right',
  },
  summaryValueLocation: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  totalValue: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
  },
  textareaContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  textareaIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  textarea: {
    paddingLeft: 48,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 90,
  },
  savedAddress: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    gap: 12,
  },
  addressIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressTitle: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 4,
  },
  addressText: {
    color: '#6b7280',
    fontSize: 14,
  },
  paymentOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    fontSize: 24,
  },
  paymentTextContainer: {
    flexDirection: 'column',
  },
  paymentText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  paymentTextDisabled: {
    color: '#9ca3af',
  },
  paymentUnavailable: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  paymentOptionDisabled: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  checkmark: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 24,
  },
  confirmButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
