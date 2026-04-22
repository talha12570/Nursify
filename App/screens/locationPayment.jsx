import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
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
  const isPostServicePayment = bookingData?.status === 'completed_confirmed';

  // ── Mastercard card form state ────────────────────────────────────────────
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryInput, setExpiryInput] = useState(''); // "MM/YY" display
  const [cvv, setCvv] = useState('');
  const [cardErrors, setCardErrors] = useState({});

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

  // ── Card helpers ────────────────────────────────────────────────────────────
  const formatCardDisplay = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (text) => {
    setCardNumber(formatCardDisplay(text));
    setCardErrors((e) => ({ ...e, cardNumber: '' }));
  };

  const handleExpiryChange = (text) => {
    // Auto-insert slash: "12/27"
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    const formatted = cleaned.length > 2
      ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
      : cleaned;
    setExpiryInput(formatted);
    setCardErrors((e) => ({ ...e, expiry: '' }));
  };

  const detectCardBrand = (num) => {
    const cleaned = num.replace(/\s/g, '');
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^4/.test(cleaned)) return 'visa';
    return 'unknown';
  };

  const luhnCheck = (num) => {
    const cleaned = num.replace(/\s/g, '');
    let sum = 0, isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let d = parseInt(cleaned[i], 10);
      if (isEven) { d *= 2; if (d > 9) d -= 9; }
      sum += d; isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  const validateCardForm = () => {
    const errors = {};
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!cleanCard || cleanCard.length < 13) errors.cardNumber = 'Enter a valid card number.';
    else if (!luhnCheck(cleanCard)) errors.cardNumber = 'Card number is invalid.';
    else if (detectCardBrand(cleanCard) !== 'mastercard') errors.cardNumber = 'Only Mastercard cards are accepted.';
    if (!cardholderName.trim()) errors.cardholderName = 'Enter the name on your card.';
    const expiryParts = expiryInput.split('/');
    if (!expiryInput || expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      errors.expiry = 'Enter expiry as MM/YY.';
    } else {
      const month = parseInt(expiryParts[0], 10);
      const year  = parseInt(`20${expiryParts[1]}`, 10);
      const now   = new Date();
      if (month < 1 || month > 12) errors.expiry = 'Invalid month.';
      else if (new Date(year, month - 1) < new Date(now.getFullYear(), now.getMonth())) {
        errors.expiry = 'Card has expired.';
      }
    }
    if (!cvv || cvv.length < 3) errors.cvv = 'Enter a valid CVV.';
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Payment handlers ────────────────────────────────────────────────────────
  const handleMastercardPayment = async () => {
    if (!validateCardForm()) return;
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      const expiryParts = expiryInput.split('/');

      const response = await axios.post(
        `${API_URL}/payment/mastercard/initiate`,
        {
          bookingId: bookingData._id,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiryMonth: expiryParts[0],
          expiryYear: `20${expiryParts[1]}`,
          cvv,
          cardholderName: cardholderName.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          '✅ Payment Successful',
          `Mastercard payment confirmed!\nTransaction ID: ${response.data.transactionId}\nCard: ${response.data.maskedCard}`,
          [{ text: 'Continue', onPress: () => onComplete?.(response.data.booking) }]
        );
      }
    } catch (error) {
      console.error('[Mastercard] Payment error:', error);
      const msg = error.response?.data?.message || 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (paymentMethod === 'card') {
      return handleMastercardPayment();
    }
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await axios.put(
        `${API_URL}/patient/bookings/${bookingData._id}`,
        { paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Payment recorded successfully.',
          [{ text: 'OK', onPress: () => onComplete?.(response.data.booking) }]
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
            <Text style={styles.headerTitle}>{isPostServicePayment ? 'Service Payment' : 'Confirm Payment'}</Text>
            <Text style={styles.headerSubtitle}>
              {isPostServicePayment ? 'Pay after service completion' : 'Select payment method'}
            </Text>
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
          <Text style={styles.successText}>
            {isPostServicePayment ? `Service completed with ${caregiverName}` : `Approved by ${caregiverName}`}
          </Text>
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
            { id: 'card', name: 'Mastercard', icon: null, available: true },
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
                    'This payment method is not yet available. Please use Cash on Service or Mastercard.',
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
                {method.id === 'card' ? (
                  <View style={styles.mastercardLogo}>
                    <View style={[styles.mcCircle, { backgroundColor: '#EB001B', marginRight: -8 }]} />
                    <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', opacity: 0.9 }]} />
                  </View>
                ) : (
                  <Text style={styles.paymentIcon}>{method.icon}</Text>
                )}
                <View style={styles.paymentTextContainer}>
                  <Text style={[
                    styles.paymentText,
                    !method.available && styles.paymentTextDisabled
                  ]}>{method.name}</Text>
                  {method.id === 'card' && (
                    <Text style={styles.paymentSubtitle}>Debit / Credit Card</Text>
                  )}
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

          {/* ── Mastercard Card Form ────────────────────────────────── */}
          {paymentMethod === 'card' && (
            <View style={styles.cardForm}>
              <View style={styles.cardFormHeader}>
                <View style={styles.mastercardLogoBig}>
                  <View style={[styles.mcCircleBig, { backgroundColor: '#EB001B', marginRight: -14 }]} />
                  <View style={[styles.mcCircleBig, { backgroundColor: '#F79E1B', opacity: 0.9 }]} />
                </View>
                <Text style={styles.cardFormTitle}>Enter Card Details</Text>
              </View>

              {/* Card Number */}
              <View style={styles.cardFieldGroup}>
                <Text style={styles.cardLabel}>Card Number</Text>
                <TextInput
                  style={[styles.cardInput, cardErrors.cardNumber && styles.cardInputError]}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#9ca3af"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  keyboardType="numeric"
                  maxLength={19}
                  returnKeyType="next"
                />
                {cardErrors.cardNumber ? (
                  <Text style={styles.fieldError}>{cardErrors.cardNumber}</Text>
                ) : null}
              </View>

              {/* Cardholder Name */}
              <View style={styles.cardFieldGroup}>
                <Text style={styles.cardLabel}>Name on Card</Text>
                <TextInput
                  style={[styles.cardInput, cardErrors.cardholderName && styles.cardInputError]}
                  placeholder="e.g. Ali Hassan"
                  placeholderTextColor="#9ca3af"
                  value={cardholderName}
                  onChangeText={(t) => { setCardholderName(t); setCardErrors((e) => ({ ...e, cardholderName: '' })); }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
                {cardErrors.cardholderName ? (
                  <Text style={styles.fieldError}>{cardErrors.cardholderName}</Text>
                ) : null}
              </View>

              {/* Expiry + CVV row */}
              <View style={styles.cardRow}>
                <View style={[styles.cardFieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.cardLabel}>Expiry</Text>
                  <TextInput
                    style={[styles.cardInput, cardErrors.expiry && styles.cardInputError]}
                    placeholder="MM/YY"
                    placeholderTextColor="#9ca3af"
                    value={expiryInput}
                    onChangeText={handleExpiryChange}
                    keyboardType="numeric"
                    maxLength={5}
                    returnKeyType="next"
                  />
                  {cardErrors.expiry ? (
                    <Text style={styles.fieldError}>{cardErrors.expiry}</Text>
                  ) : null}
                </View>

                <View style={[styles.cardFieldGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.cardLabel}>CVV</Text>
                  <TextInput
                    style={[styles.cardInput, cardErrors.cvv && styles.cardInputError]}
                    placeholder="•••"
                    placeholderTextColor="#9ca3af"
                    value={cvv}
                    onChangeText={(t) => { setCvv(t.replace(/\D/g, '').slice(0, 4)); setCardErrors((e) => ({ ...e, cvv: '' })); }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    returnKeyType="done"
                  />
                  {cardErrors.cvv ? (
                    <Text style={styles.fieldError}>{cardErrors.cvv}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.secureNote}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </Svg>
                <Text style={styles.secureNoteText}>Secured by Mastercard Payment Gateway</Text>
              </View>
            </View>
          )}
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
            <Text style={styles.confirmButtonText}>
              {paymentMethod === 'card' ? 'Pay with Mastercard' : 'Confirm Cash Payment'}
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
  paymentSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 1,
  },
  mastercardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    height: 28,
    justifyContent: 'center',
  },
  mcCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  // Card form
  cardForm: {
    backgroundColor: '#f8faff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    padding: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  cardFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  mastercardLogoBig: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircleBig: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cardFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardFieldGroup: {
    marginBottom: 16,
  },
  cardLabel: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 6,
  },
  cardInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
    letterSpacing: 1,
  },
  cardInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  secureNoteText: {
    color: '#6b7280',
    fontSize: 12,
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
