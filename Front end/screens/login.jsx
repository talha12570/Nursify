import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { authAPI, setAuthToken } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @param {Object} props
 * @param {(email: string) => void} [props.onLogin]
 * @param {(email: string) => void} [props.onVerificationNeeded]
 * @param {() => void} [props.onSwitchToSignUp]
 * @param {() => void} [props.onForgotPassword]
 */
export default function Login({ onLogin, onVerificationNeeded, onSwitchToSignUp, onForgotPassword } = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);

      setLoading(false);

      // Check if email verification is needed - automatically redirect to OTP
      if (response.requiresVerification) {
        onVerificationNeeded?.(response.email, response.userType);
        Alert.alert(
          'Verification Required',
          'OTP has been sent to your email. Please verify to continue.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if approval is needed
      if (response.requiresApproval) {
        Alert.alert(
          'Approval Pending',
          response.message,
          [
            { 
              text: 'OK',
              onPress: () => {
                // Redirect to pending verification screen
                onVerificationNeeded?.('pending', response.userType);
              }
            }
          ]
        );
        return;
      }

      // Check if OTP is needed for login - automatically redirect to OTP
      if (response.requiresLoginOtp) {
        onLogin?.(response.email, response.userType);
        Alert.alert(
          'OTP Sent',
          'Verification code has been sent to your email.',
          [{ text: 'OK' }]
        );
        return;
      }

      // If token is returned directly (verified user logging in)
      if (response.token && response.user) {
        // Save token and user data
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        setAuthToken(response.token);
        
        // Redirect directly to dashboard
        onLogin?.(response.user.email, response.user.userType, response.token, response.user);
      }
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid email or password'
      );
    }
  };

  return (
    <LinearGradient
      colors={['#1824b6', '#3caea8']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#1824b6" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </Svg>
            </View>
            <Text style={styles.headerTitle}>Welcome Back</Text>
            <Text style={styles.headerSubtitle}>Sign in to continue to Nursify</Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email or Phone</Text>
                <View style={styles.inputContainer}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </Svg>
                  <TextInput
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="Enter email or phone number"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </Svg>
                  <TextInput
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.inputWithButton]}
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                      {showPassword ? (
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity onPress={onForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Buttons */}
              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </Svg>
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#000000">
                    <Path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                  </Svg>
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </TouchableOpacity>
              </View>

              {/* Sign Up Link */}
              <View style={styles.signUpLinkContainer}>
                <Text style={styles.signUpLinkText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onSwitchToSignUp} activeOpacity={0.7}>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  header: {
    paddingTop: 64,
    paddingBottom: 96,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    marginTop: -48,
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#374151',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputWithButton: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontWeight: '500',
    fontSize: 14,
  },
  signInButton: {
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
  signInButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  signInButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  signUpLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpLinkText: {
    color: '#6b7280',
    fontSize: 14,
  },
  signUpLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
});
