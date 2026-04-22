import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config/api';

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]
 */
export default function UserProfile({ onBack } = {}) {
  const [userData, setUserData] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {cd
    try {
      const data = await AsyncStorage.getItem('userData');
      console.log('Raw userData from AsyncStorage:', data);
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('Parsed userData:', parsedData);
        setUserData(parsedData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(`${API_URL}/patient/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setFavorites(response.data.favorites);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleFavoritesPress = () => {
    setShowFavorites(true);
    fetchFavorites();
  };
  const bookingHistory = [
    {
      id: '1',
      caregiver: 'Sarah Ahmed',
      service: 'ICU Care',
      date: 'Nov 20, 2024',
      status: 'completed',
      amount: 'Rs. 3,200'
    },
    {
      id: '2',
      caregiver: 'Dr. Ali Khan',
      service: 'Elderly Care',
      date: 'Nov 15, 2024',
      status: 'completed',
      amount: 'Rs. 1,600'
    },
    {
      id: '3',
      caregiver: 'Fatima Malik',
      service: 'Wound Care',
      date: 'Nov 10, 2024',
      status: 'completed',
      amount: 'Rs. 2,400'
    }
  ];

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
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </Svg>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </Svg>
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{userData?.fullName || 'User'}</Text>
                <Text style={styles.profilePhone}>{userData?.phone || 'N/A'}</Text>
                <Text style={styles.profileEmail}>{userData?.email || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>12</Text>
                  <Text style={styles.statLabel}>Bookings</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>5</Text>
                  <Text style={styles.statLabel}>Saved</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>4.8</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu Options */}
          <View style={styles.menuContainer}>
            <View style={styles.menuCard}>
              <TouchableOpacity 
                style={[styles.menuItem, styles.menuBorder]} 
                activeOpacity={0.7}
                onPress={() => setShowPersonalInfo(true)}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#eff6ff' }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </Svg>
                  </View>
                  <Text style={styles.menuText}>Personal Information</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, styles.menuBorder]} 
                activeOpacity={0.7}
                onPress={handleFavoritesPress}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#f0fdfa' }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </Svg>
                  </View>
                  <Text style={styles.menuText}>Saved Caregivers</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, styles.menuBorder]} activeOpacity={0.7}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </Svg>
                  </View>
                  <Text style={styles.menuText}>Support Center</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.menuItem, styles.menuBorder]} activeOpacity={0.7}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#faf5ff' }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </Svg>
                  </View>
                  <Text style={styles.menuText}>Language (English)</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#fff7ed' }]}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </Svg>
                  </View>
                  <Text style={styles.menuText}>Settings</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
                  <Path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* Booking History */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Bookings</Text>
            <View style={styles.historyCard}>
              {bookingHistory.map((booking, index) => (
                <View 
                  key={booking.id}
                  style={[
                    styles.historyItem,
                    index !== bookingHistory.length - 1 && styles.historyBorder
                  ]}
                >
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={styles.historyCaregiver}>{booking.caregiver}</Text>
                      <Text style={styles.historyService}>{booking.service}</Text>
                    </View>
                    <Text style={styles.historyAmount}>{booking.amount}</Text>
                  </View>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyDate}>{booking.date}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </Svg>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Personal Information Modal */}
        <Modal
          visible={showPersonalInfo}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPersonalInfo(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Personal Information</Text>
                <TouchableOpacity onPress={() => setShowPersonalInfo(false)}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </Svg>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{userData?.fullName || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userData?.email || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{userData?.phone || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>User Type</Text>
                  <Text style={styles.infoValue}>{userData?.userType || 'Patient'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Account Status</Text>
                  <Text style={styles.infoValue}>
                    {userData?.isVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Favorites Modal */}
        <Modal
          visible={showFavorites}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFavorites(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Saved Caregivers</Text>
                <TouchableOpacity onPress={() => setShowFavorites(false)}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </Svg>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {loadingFavorites ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading favorites...</Text>
                  </View>
                ) : favorites.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2}>
                      <Path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </Svg>
                    <Text style={styles.emptyText}>No saved caregivers yet</Text>
                    <Text style={styles.emptySubtext}>
                      Save your favorite caregivers to quickly access them later
                    </Text>
                  </View>
                ) : (
                  favorites.map((fav) => (
                    <View key={fav.id} style={styles.favoriteCard}>
                      <Image 
                        source={{ uri: fav.image }} 
                        style={styles.favoriteImage}
                      />
                      <View style={styles.favoriteInfo}>
                        <Text style={styles.favoriteName}>{fav.name}</Text>
                        <Text style={styles.favoriteRole}>{fav.role}</Text>
                        <Text style={styles.favoriteSpecialty}>{fav.specialization}</Text>
                        <View style={styles.favoriteRating}>
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth={2}>
                            <Path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </Svg>
                          <Text style={styles.favoriteRatingText}>{fav.rating}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    paddingTop: 48,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  backText: {
    color: '#ffffff',
    fontSize: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profilePhone: {
    color: '#bfdbfe',
    fontSize: 16,
    marginBottom: 2,
  },
  profileEmail: {
    color: '#bfdbfe',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginTop: -48,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  statValue: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  historyContainer: {
    paddingHorizontal: 24,
  },
  historyTitle: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItem: {
    padding: 16,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyCaregiver: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  historyService: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  historyAmount: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    color: '#9ca3af',
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  infoItem: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  favoriteCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  favoriteImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  favoriteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  favoriteRole: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 2,
  },
  favoriteSpecialty: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  favoriteRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});