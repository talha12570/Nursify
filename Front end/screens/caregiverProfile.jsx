import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onEditProfile]
 */
export default function CaregiverProfile({ onBack, onEditProfile } = {}) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
    fetchProfileData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const user = JSON.parse(userDataString);
        setUserData(user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(`${API_URL}/caregiver/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setProfileData(response.data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 404) {
        // Profile not created yet
        Alert.alert(
          'Profile Not Set',
          'You haven\'t set up your profile yet. Would you like to set it up now?',
          [
            { text: 'Later', style: 'cancel', onPress: onBack },
            { text: 'Set Profile', onPress: onEditProfile }
          ]
        );
      }
    } finally {
      setLoading(false);
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

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.emptyContainer}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
            <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </Svg>
          <Text style={styles.emptyTitle}>Profile Not Set</Text>
          <Text style={styles.emptyText}>Set up your profile to let patients know more about you</Text>
          <TouchableOpacity style={styles.setProfileButton} onPress={onEditProfile}>
            <Text style={styles.setProfileButtonText}>Set Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
            <Text style={styles.backButtonAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {userData?.professionalImage ? (
            <Image source={{ uri: userData.professionalImage }} style={styles.headerImage} />
          ) : (
            <View style={styles.headerImagePlaceholder}>
              <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </Svg>
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </Svg>
          </TouchableOpacity>

          {/* Edit Button */}
          <TouchableOpacity style={styles.editButton} onPress={onEditProfile}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </Svg>
          </TouchableOpacity>

          {/* Verified Badge */}
          {userData?.verified && (
            <View style={styles.verifiedBadge}>
              <Svg width={16} height={16} viewBox="0 0 20 20" fill="#ffffff">
                <Path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </Svg>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Name & Role */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.name}>{userData?.fullName || 'Caregiver'}</Text>
              <Text style={styles.role}>{profileData.licenseType || 'Healthcare Professional'}</Text>
            </View>
          </View>

          {/* Service Rates */}
          <View style={styles.ratesSection}>
            <Text style={styles.sectionTitle}>Service Rates</Text>
            <View style={styles.ratesGrid}>
              {profileData.hourlyRate && (
                <View style={styles.rateCard}>
                  <Text style={styles.rateLabel}>Hourly</Text>
                  <Text style={styles.rateValue}>Rs. {profileData.hourlyRate}</Text>
                </View>
              )}
              {profileData.dailyRate && (
                <View style={styles.rateCard}>
                  <Text style={styles.rateLabel}>Daily</Text>
                  <Text style={styles.rateValue}>Rs. {profileData.dailyRate}</Text>
                </View>
              )}
              {profileData.weeklyRate && (
                <View style={styles.rateCard}>
                  <Text style={styles.rateLabel}>Weekly</Text>
                  <Text style={styles.rateValue}>Rs. {profileData.weeklyRate}</Text>
                </View>
              )}
              {profileData.monthlyRate && (
                <View style={styles.rateCard}>
                  <Text style={styles.rateLabel}>Monthly</Text>
                  <Text style={styles.rateValue}>Rs. {profileData.monthlyRate}</Text>
                </View>
              )}
            </View>
          </View>

          {/* About */}
          {profileData.about && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.aboutText}>{profileData.about}</Text>
            </View>
          )}

          {/* Work Experience */}
          {profileData.workExperience && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </Svg>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Work Experience</Text>
                  <Text style={styles.infoText}>
                    {profileData.workExperience} {parseInt(profileData.workExperience) === 1 ? 'year' : 'years'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Education */}
          {profileData.education && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </Svg>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Education</Text>
                  <Text style={styles.infoText}>{profileData.education}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Institution */}
          {profileData.institution && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </Svg>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Institution</Text>
                  <Text style={styles.infoText}>{profileData.institution}</Text>
                </View>
              </View>
            </View>
          )}

          {/* License Type */}
          {profileData.licenseType && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </Svg>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>License Type</Text>
                  <Text style={styles.infoText}>{profileData.licenseType}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  setProfileButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  setProfileButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonAltText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
    backgroundColor: '#f3f4f6',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  verifiedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  role: {
    fontSize: 18,
    color: '#6b7280',
  },
  ratesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rateCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
  },
  rateLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  section: {
    marginBottom: 24,
  },
  aboutText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
});
