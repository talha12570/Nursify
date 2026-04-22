import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { authAPI } from '../services/api';

/**
 * @param {Object} props
 * @param {(email: string, userType: string) => void} [props.onSignUp]
 * @param {() => void} [props.onSwitchToLogin]
 * @param {() => void} [props.onBack]
 */
export default function SignUp({ onSignUp, onSwitchToLogin, onBack } = {}) {
  const [userType, setUserType] = useState('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cnicNumber: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cnicNumber: '',
    cnicFront: null,
    cnicBack: null,
    licenseNumber: '',
    licensePhoto: null,
    specialty: '',
    experienceLetter: null,
    medicalRecord: null,
    experienceImage: null,
    professionalImage: null
  });

  // Full name validation function
  const validateName = (name) => {
    if (!name.trim()) {
      return '';
    }
    const hasNumbers = /\d/.test(name);
    if (hasNumbers) {
      return 'Full name cannot contain numbers';
    }
    return '';
  };

  // Email validation function
  const validateEmail = (email) => {
    if (!email.trim()) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Phone validation function
  const validatePhone = (phone) => {
    if (!phone.trim()) {
      return '';
    }
    // Remove any non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
      return 'Phone number must be exactly 11 digits';
    }
    return '';
  };

  // Password validation function
  const validatePassword = (password) => {
    if (!password) {
      return '';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumber) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    return '';
  };

  // CNIC validation function
  const validateCNIC = (cnic) => {
    if (!cnic.trim()) {
      return '';
    }
    // Remove any non-digit characters for validation
    const digitsOnly = cnic.replace(/\D/g, '');
    if (digitsOnly.length !== 13) {
      return 'CNIC must be exactly 13 digits';
    }
    return '';
  };

  // Handle name change with validation
  const handleNameChange = (text) => {
    setFormData({ ...formData, name: text });
    const error = validateName(text);
    setErrors({ ...errors, name: error });
  };

  // Handle email change with validation
  const handleEmailChange = (text) => {
    setFormData({ ...formData, email: text });
    const error = validateEmail(text);
    setErrors({ ...errors, email: error });
  };

  // Handle phone change with validation
  const handlePhoneChange = (text) => {
    setFormData({ ...formData, phone: text });
    const error = validatePhone(text);
    setErrors({ ...errors, phone: error });
  };

  // Handle password change with validation
  const handlePasswordChange = (text) => {
    setFormData({ ...formData, password: text });
    const error = validatePassword(text);
    setErrors({ ...errors, password: error });
  };

  // Handle CNIC change with validation
  const handleCNICChange = (text) => {
    setFormData({ ...formData, cnicNumber: text });
    const error = validateCNIC(text);
    setErrors({ ...errors, cnicNumber: error });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (errors.name) {
      Alert.alert('Error', errors.name);
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (errors.email) {
      Alert.alert('Error', errors.email);
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (errors.phone) {
      Alert.alert('Error', errors.phone);
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (errors.password) {
      Alert.alert('Error', errors.password);
      return false;
    }
    if (!formData.cnicNumber.trim()) {
      Alert.alert('Error', 'Please enter your CNIC number');
      return false;
    }
    if (errors.cnicNumber) {
      Alert.alert('Error', errors.cnicNumber);
      return false;
    }
    
    // CNIC images only required for nurses and caretakers
    if (userType === 'nurse' || userType === 'caretaker') {
      if (!formData.cnicFront) {
        Alert.alert('Error', 'Please upload CNIC front image');
        return false;
      }
      if (!formData.cnicBack) {
        Alert.alert('Error', 'Please upload CNIC back image');
        return false;
      }
      if (!formData.professionalImage) {
        Alert.alert('Error', 'Please upload your professional personal image');
        return false;
      }
    }

    // Validate nurse-specific fields
    if (userType === 'nurse') {
      if (!formData.specialty.trim()) {
        Alert.alert('Error', 'Please enter your specialty');
        return false;
      }
      if (!formData.licenseNumber.trim()) {
        Alert.alert('Error', 'Please enter your license number');
        return false;
      }
      if (!formData.licensePhoto) {
        Alert.alert('Error', 'Please upload your license photo');
        return false;
      }
      if (!formData.experienceLetter) {
        Alert.alert('Error', 'Please upload your experience letter');
        return false;
      }
    }

    // Validate caretaker-specific fields
    if (userType === 'caretaker') {
      if (!formData.specialty.trim()) {
        Alert.alert('Error', 'Please enter your specialty');
        return false;
      }
      if (!formData.experienceImage) {
        Alert.alert('Error', 'Please upload your experience image');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData = {
        ...formData,
        userType: userType,
      };

      const response = await authAPI.register(userData);

      setLoading(false);

      Alert.alert(
        'Success',
        response.msg,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to OTP screen
              onSignUp?.(response.email, userType);
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#2563eb', '#14b8a6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </Svg>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join Nursify today</Text>
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            {/* User Type Selection */}
            <View style={styles.typeContainer}>
              <TouchableOpacity
                onPress={() => setUserType('patient')}
                style={[
                  styles.typeButton,
                  userType === 'patient' && styles.typeButtonActive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.typeButtonText,
                  userType === 'patient' && styles.typeButtonTextActive
                ]}>
                  Patient
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setUserType('caretaker')}
                style={[
                  styles.typeButton,
                  userType === 'caretaker' && styles.typeButtonActive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.typeButtonText,
                  userType === 'caretaker' && styles.typeButtonTextActive
                ]}>
                  Caretaker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setUserType('nurse')}
                style={[
                  styles.typeButton,
                  userType === 'nurse' && styles.typeButtonActive
                ]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.typeButtonText,
                  userType === 'nurse' && styles.typeButtonTextActive
                ]}>
                  Nurse
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[styles.inputContainer, errors.name ? styles.inputContainerError : null]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </Svg>
                <TextInput
                  value={formData.name}
                  onChangeText={handleNameChange}
                  placeholder="Enter your full name"
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.name ? (
                <View style={styles.errorContainer}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.errorText}>{errors.name}</Text>
                </View>
              ) : null}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[styles.inputContainer, errors.email ? styles.inputContainerError : null]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </Svg>
                <TextInput
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.email ? (
                <View style={styles.errorContainer}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputContainer, errors.phone ? styles.inputContainerError : null]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </Svg>
                <TextInput
                  value={formData.phone}
                  onChangeText={handlePhoneChange}
                  placeholder="03001234567"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.phone ? (
                <View style={styles.errorContainer}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.errorText}>{errors.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputContainer, errors.password ? styles.inputContainerError : null]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </Svg>
                <TextInput
                  value={formData.password}
                  onChangeText={handlePasswordChange}
                  placeholder="Create a strong password"
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
              {errors.password ? (
                <View style={styles.errorContainer}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* CNIC Number - Required for all users */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CNIC Number</Text>
              <View style={[styles.inputContainer, errors.cnicNumber ? styles.inputContainerError : null]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </Svg>
                <TextInput
                  value={formData.cnicNumber}
                  onChangeText={handleCNICChange}
                  placeholder="XXXXXXXXXXXXX"
                  keyboardType="numeric"
                  maxLength={15}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.cnicNumber ? (
                <View style={styles.errorContainer}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </Svg>
                  <Text style={styles.errorText}>{errors.cnicNumber}</Text>
                </View>
              ) : null}
            </View>

            {/* CNIC Images - Only for Nurses and Caretakers */}
            {(userType === 'nurse' || userType === 'caretaker') && (
            <>
              {/* CNIC Front Image */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CNIC Front Image</Text>
                <TouchableOpacity
                    onPress={async () => {
                      Alert.alert(
                        'Upload CNIC Front',
                        'Choose upload method',
                        [
                          {
                            text: 'Take Photo',
                            onPress: async () => {
                              const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicFront: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose from Gallery',
                            onPress: async () => {
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicFront: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose Document',
                            onPress: async () => {
                              const result = await DocumentPicker.getDocumentAsync({
                                type: ['image/*', 'application/pdf'],
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicFront: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                        ],
                      );
                    }}
                    style={styles.uploadButton}
                    activeOpacity={0.8}
                  >
                    {formData.cnicFront ? (
                      <Image source={{ uri: formData.cnicFront }} style={styles.uploadedImage} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </Svg>
                        <Text style={styles.uploadText}>Upload CNIC Front</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* CNIC Back Image */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CNIC Back Image</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      Alert.alert(
                        'Upload CNIC Back',
                        'Choose upload method',
                        [
                          {
                            text: 'Take Photo',
                            onPress: async () => {
                              const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicBack: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose from Gallery',
                            onPress: async () => {
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicBack: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose Document',
                            onPress: async () => {
                              const result = await DocumentPicker.getDocumentAsync({
                                type: ['image/*', 'application/pdf'],
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, cnicBack: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                        ],
                      );
                    }}
                    style={styles.uploadButton}
                    activeOpacity={0.8}
                  >
                    {formData.cnicBack ? (
                      <Image source={{ uri: formData.cnicBack }} style={styles.uploadedImage} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </Svg>
                        <Text style={styles.uploadText}>Upload CNIC Back</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              
              {/* Professional Personal Image for Nurses and Caretakers */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Professional Personal Image</Text>
                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      'Upload Professional Image',
                      'Choose upload method',
                      [
                        {
                          text: 'Take Photo',
                          onPress: async () => {
                            const result = await ImagePicker.launchCameraAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, professionalImage: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Choose from Gallery',
                          onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, professionalImage: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                      ],
                    );
                  }}
                  style={styles.uploadButton}
                  activeOpacity={0.8}
                >
                  {formData.professionalImage ? (
                    <Image source={{ uri: formData.professionalImage }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </Svg>
                      <Text style={styles.uploadText}>Upload Professional Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
            )}

            {/* Specialty for Caretaker and Nurse */}
            {(userType === 'caretaker' || userType === 'nurse') && (
              <View style={styles.inputGroup}>
                  <Text style={styles.label}>Specialty</Text>
                  <View style={styles.inputContainer}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </Svg>
                    <TextInput
                      value={formData.specialty}
                      onChangeText={(text) => setFormData({ ...formData, specialty: text })}
                      placeholder="e.g., ICU Care, Elderly Care"
                      style={styles.input}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
            )}

            {/* Experience Image (Only for Caretakers) */}
            {userType === 'caretaker' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Experience Image</Text>
                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      'Upload Experience Letter',
                      'Choose upload method',
                      [
                        {
                          text: 'Take Photo',
                          onPress: async () => {
                            const result = await ImagePicker.launchCameraAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, experienceImage: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Choose from Gallery',
                          onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, experienceImage: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Choose Document',
                          onPress: async () => {
                            const result = await DocumentPicker.getDocumentAsync({
                              type: ['image/*', 'application/pdf'],
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, experienceImage: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                      ],
                    );
                  }}
                  style={styles.uploadButton}
                  activeOpacity={0.8}
                >
                  {formData.experienceImage ? (
                    <Image source={{ uri: formData.experienceImage }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </Svg>
                      <Text style={styles.uploadText}>Upload Experience Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* License Fields (Only for Nurses) */}
            {userType === 'nurse' && (
              <>
                {/* License Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>License Number</Text>
                  <View style={styles.inputContainer}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} style={styles.inputIcon}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </Svg>
                    <TextInput
                      value={formData.licenseNumber}
                      onChangeText={(text) => setFormData({ ...formData, licenseNumber: text })}
                      placeholder="Enter nursing license number"
                      style={styles.input}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {/* License Photo */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>License Photo</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      Alert.alert(
                        'Upload License Photo',
                        'Choose upload method',
                        [
                          {
                            text: 'Take Photo',
                            onPress: async () => {
                              const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, licensePhoto: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose from Gallery',
                            onPress: async () => {
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                quality: 1,
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, licensePhoto: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Choose Document',
                            onPress: async () => {
                              const result = await DocumentPicker.getDocumentAsync({
                                type: ['image/*', 'application/pdf'],
                              });
                              if (!result.canceled) {
                                setFormData({ ...formData, licensePhoto: result.assets[0].uri });
                              }
                            },
                          },
                          {
                            text: 'Cancel',
                            style: 'cancel',
                          },
                        ],
                      );
                    }}
                    style={styles.uploadButton}
                    activeOpacity={0.8}
                  >
                    {formData.licensePhoto ? (
                      <Image source={{ uri: formData.licensePhoto }} style={styles.uploadedImage} />
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                          <Path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </Svg>
                        <Text style={styles.uploadText}>Upload License Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Experience Letter */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Experience Letter</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: ['image/*', 'application/pdf'],
                      });
                      if (!result.canceled) {
                        setFormData({ ...formData, experienceLetter: result.assets[0].uri });
                      }
                    }}
                    style={styles.uploadButton}
                    activeOpacity={0.8}
                  >
                    <View style={styles.uploadPlaceholder}>
                      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </Svg>
                      <Text style={styles.uploadText}>
                        {formData.experienceLetter ? '✓ Document Uploaded' : 'Upload Experience Letter'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Medical Record Upload for Patients (Optional) */}
            {userType === 'patient' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Medical Record (Optional)</Text>
                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      'Upload Medical Record',
                      'Choose upload method',
                      [
                        {
                          text: 'Take Photo',
                          onPress: async () => {
                            const result = await ImagePicker.launchCameraAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, medicalRecord: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Choose from Gallery',
                          onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              quality: 1,
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, medicalRecord: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Choose Document',
                          onPress: async () => {
                            const result = await DocumentPicker.getDocumentAsync({
                              type: ['image/*', 'application/pdf'],
                            });
                            if (!result.canceled) {
                              setFormData({ ...formData, medicalRecord: result.assets[0].uri });
                            }
                          },
                        },
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                      ],
                    );
                  }}
                  style={styles.uploadButton}
                  activeOpacity={0.8}
                >
                  {formData.medicalRecord ? (
                    <Image source={{ uri: formData.medicalRecord }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </Svg>
                      <Text style={styles.uploadText}>Upload Medical Record</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.signUpButtonText}>Create Account</Text>
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

            {/* Login Link */}
            <View style={styles.loginLinkContainer}>
              <Text style={styles.loginLinkText}>Already have an account? </Text>
              <TouchableOpacity onPress={onSwitchToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
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
    position: 'absolute',
    top: 48,
    left: 16,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  formContainer: {
    flex: 1,
    marginTop: -48,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: '#2563eb',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeButtonText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#2563eb',
  },
  inputGroup: {
    marginBottom: 16,
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
  inputContainerError: {
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
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
  signUpButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  signUpButtonText: {
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
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    color: '#4b5563',
    fontSize: 14,
  },
  loginLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  uploadedImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
});