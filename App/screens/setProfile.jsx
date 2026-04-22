import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';
import { wp, hp, fp, spacing, componentSizes } from '../utils/responsive';

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onSaved]
 */
export default function SetProfile({ onBack, onSaved } = {}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    workExperience: '',
    about: '',
    education: '',
    institution: '',
    licenseType: '',
    hourlyRate: '',
    dailyRate: '',
    weeklyRate: '',
    monthlyRate: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(`${API_URL}/caregiver/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.profile) {
        const profile = response.data.profile;
        setProfileData({
          workExperience: profile.workExperience || '',
          about: profile.about || '',
          education: profile.education || '',
          institution: profile.institution || '',
          licenseType: profile.licenseType || '',
          hourlyRate: profile.hourlyRate ? String(profile.hourlyRate) : '',
          dailyRate: profile.dailyRate ? String(profile.dailyRate) : '',
          weeklyRate: profile.weeklyRate ? String(profile.weeklyRate) : '',
          monthlyRate: profile.monthlyRate ? String(profile.monthlyRate) : '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // If profile doesn't exist yet, keep the empty form
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!profileData.about.trim()) {
      Alert.alert('Validation Error', 'Please write something about yourself');
      return false;
    }

    if (!profileData.workExperience.trim()) {
      Alert.alert('Validation Error', 'Please enter your work experience');
      return false;
    }

    if (!profileData.institution.trim()) {
      Alert.alert('Validation Error', 'Please enter your institution details');
      return false;
    }

    if (!profileData.licenseType.trim()) {
      Alert.alert('Validation Error', 'Please specify your license type');
      return false;
    }

    // At least one rate should be provided
    if (!profileData.hourlyRate && !profileData.dailyRate && !profileData.weeklyRate && !profileData.monthlyRate) {
      Alert.alert('Validation Error', 'Please set at least one service rate');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');

      // Convert rate strings to numbers
      const payload = {
        workExperience: profileData.workExperience.trim(),
        about: profileData.about.trim(),
        education: profileData.education.trim(),
        institution: profileData.institution.trim(),
        licenseType: profileData.licenseType.trim(),
        hourlyRate: profileData.hourlyRate ? parseFloat(profileData.hourlyRate) : null,
        dailyRate: profileData.dailyRate ? parseFloat(profileData.dailyRate) : null,
        weeklyRate: profileData.weeklyRate ? parseFloat(profileData.weeklyRate) : null,
        monthlyRate: profileData.monthlyRate ? parseFloat(profileData.monthlyRate) : null,
      };

      const response = await axios.put(
        `${API_URL}/caregiver/profile`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onSaved) {
                onSaved();
              } else if (onBack) {
                onBack();
              }
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About *</Text>
            <Text style={styles.sectionDescription}>Write a brief description about yourself</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Tell patients about your experience, skills, and what makes you a great caregiver..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={profileData.about}
              onChangeText={(value) => handleInputChange('about', value)}
            />
          </View>

          {/* Work Experience */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience *</Text>
            <Text style={styles.sectionDescription}>Enter number of years (e.g., 5, 10, 15)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter years of experience"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={profileData.workExperience}
              onChangeText={(value) => handleInputChange('workExperience', value.replace(/[^0-9]/g, ''))}
            />
            {profileData.workExperience && (
              <Text style={styles.previewText}>
                Will display as: {profileData.workExperience} {parseInt(profileData.workExperience) === 1 ? 'year' : 'years'}
              </Text>
            )}
          </View>

          {/* Education */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.sectionDescription}>Your highest education level or relevant qualifications</Text>
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Bachelor of Science in Nursing"
              placeholderTextColor="#9ca3af"
              value={profileData.education}
              onChangeText={(value) => handleInputChange('education', value)}
            />
          </View>

          {/* Institution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Institution *</Text>
            <Text style={styles.sectionDescription}>College, University, or Hospital name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Aga Khan University Hospital"
              placeholderTextColor="#9ca3af"
              value={profileData.institution}
              onChangeText={(value) => handleInputChange('institution', value)}
            />
          </View>

          {/* License Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>License Type *</Text>
            <Text style={styles.sectionDescription}>E.g., RN (Registered Nurse), LPN, CNA</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your license type"
              placeholderTextColor="#9ca3af"
              value={profileData.licenseType}
              onChangeText={(value) => handleInputChange('licenseType', value)}
            />
          </View>

          {/* Service Rates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Rates *</Text>
            <Text style={styles.sectionDescription}>Set at least one rate (in PKR)</Text>
            
            <View style={styles.ratesGrid}>
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Hourly Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>Rs.</Text>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={profileData.hourlyRate}
                    onChangeText={(value) => handleInputChange('hourlyRate', value)}
                  />
                </View>
              </View>

              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Daily Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>Rs.</Text>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={profileData.dailyRate}
                    onChangeText={(value) => handleInputChange('dailyRate', value)}
                  />
                </View>
              </View>

              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Weekly Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>Rs.</Text>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={profileData.weeklyRate}
                    onChangeText={(value) => handleInputChange('weeklyRate', value)}
                  />
                </View>
              </View>

              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>Monthly Rate</Text>
                <View style={styles.rateInputContainer}>
                  <Text style={styles.currencySymbol}>Rs.</Text>
                  <TextInput
                    style={styles.rateInput}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={profileData.monthlyRate}
                    onChangeText={(value) => handleInputChange('monthlyRate', value)}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.requiredNote}>
            <Text style={styles.requiredNoteText}>* Required fields</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Save Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fp(14),
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: componentSizes.touchTarget.min,
    height: componentSizes.touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fp(18),
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fp(14),
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: fp(12),
    color: '#6b7280',
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(3),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fp(14),
    color: '#111827',
  },
  textArea: {
    minHeight: hp(15),
    paddingTop: spacing.sm,
  },
  ratesGrid: {
    gap: spacing.sm,
  },
  rateItem: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(3),
    padding: spacing.md,
  },
  rateLabel: {
    fontSize: fp(12),
    fontWeight: '500',
    color: '#374151',
    marginBottom: spacing.xs,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: fp(16),
    fontWeight: '600',
    color: '#2563eb',
    marginRight: spacing.xs,
  },
  rateInput: {
    flex: 1,
    fontSize: fp(16),
    fontWeight: '600',
    color: '#111827',
    padding: 0,
  },
  requiredNote: {
    backgroundColor: '#fef3c7',
    borderRadius: wp(2),
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  requiredNoteText: {
    fontSize: fp(12),
    color: '#92400e',
    fontWeight: '500',
  },
  previewText: {
    marginTop: spacing.xs,
    fontSize: fp(11),
    color: '#2563eb',
    fontStyle: 'italic',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingVertical: spacing.md,
    borderRadius: wp(3),
    alignItems: 'center',
    minHeight: componentSizes.touchTarget.min,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: fp(14),
    fontWeight: '600',
  },
});
