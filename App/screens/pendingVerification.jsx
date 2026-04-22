import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

export default function PendingVerification({ onBackToLogin, onApproved, userType } = {}) {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Check approval status every 10 seconds
    const checkApprovalStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userDataStr = await AsyncStorage.getItem('userData');
        
        if (!token || !userDataStr) return;

        const userData = JSON.parse(userDataStr);
        
        // Make API call to check current user status
        const response = await axios.get(`${API_URL}/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log('Approval check response:', response.data.userData);

        // If user is now approved, redirect to dashboard
        if (response.data.userData.isApproved) {
          console.log('User approved! Redirecting to dashboard...');
          // Update local storage
          const updatedUserData = { ...userData, isApproved: true };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          
          Alert.alert(
            'Account Approved!',
            'Your account has been approved by admin. Welcome to Nursify!',
            [
              {
                text: 'Go to Dashboard',
                onPress: () => onApproved?.(updatedUserData)
              }
            ]
          );
        }
      } catch (error) {
        console.log('Error checking approval status:', error);
      }
    };

    // Check immediately on mount
    checkApprovalStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkApprovalStatus, 10000);

    return () => clearInterval(interval);
  }, [onApproved]);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        Alert.alert('Error', 'Please login again');
        onBackToLogin?.();
        return;
      }

      const userData = JSON.parse(userDataStr);
      
      const response = await axios.get(`${API_URL}/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.userData.isApproved) {
        const updatedUserData = {
          ...userData,
          isApproved: true,
          userType: response.data.userData.userType
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
        
        console.log('Showing approval alert, userData:', updatedUserData);
        
        // Immediately redirect without alert to make it smoother
        onApproved?.(updatedUserData);
      } else {
        Alert.alert(
          'Status Update',
          'Your account is still pending approval. Please check back later.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error checking status:', error);
      Alert.alert('Error', 'Failed to check approval status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#2563eb', '#14b8a6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nursify</Text>
          <Text style={styles.headerSubtitle}>Healthcare Platform</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2" />
                <Path
                  d="M12 2v4m0 12v4M2 12h4m12 0h4M6.34 6.34l2.83 2.83m5.66 5.66l2.83 2.83M6.34 17.66l2.83-2.83m5.66-5.66l2.83-2.83"
                  stroke="#fff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.title}>Verification Pending</Text>
            <Text style={styles.subtitle}>
              Your {userType || 'account'} application has been submitted successfully!
            </Text>
            <Text style={styles.message}>
              Our admin team is currently reviewing your documents and credentials. This process typically takes 24-48 hours.
            </Text>
            <Text style={styles.message}>
              You will receive an email notification once your account has been approved.
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoIconContainer}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2" />
                <Path
                  d="M12 16v-4m0-4h.01"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>What happens next?</Text>
              <Text style={styles.infoText}>
                • Admin reviews your documents{'\n'}
                • Verification of credentials{'\n'}
                • Email notification sent{'\n'}
                • Access granted to your dashboard
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleCheckStatus}
            activeOpacity={0.8}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Check Approval Status</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBackToLogin}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginTop: 40,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoIconContainer: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  secondaryButtonText: {
    color: '#2563eb',
    color: '#3b82f6',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
