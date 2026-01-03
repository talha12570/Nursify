import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { otpAPI, setAuthToken } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @param {Object} props
 * @param {(token: string, userData: any) => void} [props.onVerify]
 * @param {() => void} [props.onBack]
 * @param {string} [props.email]
 * @param {string} [props.phoneNumber]
 */
export default function OTPVerification({ onVerify, onBack, email, phoneNumber = '+92 300 1234567' } = {}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!otp.every(digit => digit !== '')) {
      Alert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    const otpString = otp.join('');
    setLoading(true);

    try {
      const response = await otpAPI.verifyOTP(email, otpString);

      // Save token and user data
      if (response.token) {
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        setAuthToken(response.token);
      }

      setLoading(false);

      // Check if user needs approval (nurse/caretaker)
      if (response.requiresApproval) {
        // Redirect to pending verification screen
        Alert.alert(
          'Email Verified!',
          'Your account is awaiting admin approval.',
          [
            {
              text: 'OK',
              onPress: () => {
                onVerify?.('pending', response.user);
              },
            },
          ]
        );
      } else {
        // Patient or approved user - go to dashboard
        Alert.alert(
          'Success',
          response.message,
          [
            {
              text: 'OK',
              onPress: () => {
                onVerify?.(response.token, response.user);
              },
            },
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      console.error('OTP verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid OTP. Please try again.'
      );
    }
  };

  const handleResend = async () => {
    setLoading(true);

    try {
      const response = await otpAPI.resendOTP(email);
      
      setLoading(false);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);

      Alert.alert('Success', response.message || 'OTP has been resent to your email');
    } catch (error) {
      setLoading(false);
      console.error('Resend OTP error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to resend OTP. Please try again.'
      );
    }
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={['#2563eb', '#14b8a6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </Svg>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
        <Text style={styles.headerSubtitle}>
          We've sent a code to {email || phoneNumber}
        </Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(index, text)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled
                ]}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendButton}>Resend Code</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={!isComplete || loading}
            style={[
              styles.verifyButton,
              (!isComplete || loading) && styles.verifyButtonDisabled
            ]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Didn't receive the code? </Text>
            <TouchableOpacity>
              <Text style={styles.helpLink}>Change number</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingTop: 48,
    paddingBottom: 80,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 16,
  },
  content: {
    flex: 1,
    marginTop: -48,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    marginTop: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    color: '#4b5563',
    fontSize: 14,
  },
  timerHighlight: {
    color: '#2563eb',
    fontWeight: '600',
  },
  resendButton: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  verifyButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  verifyButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  helpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  helpText: {
    color: '#6b7280',
    fontSize: 14,
  },
  helpLink: {
    color: '#2563eb',
    fontWeight: '500',
    fontSize: 14,
  },
});