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
 * @param {string} [props.caregiverId]
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onBookNow]
 */
export default function ProfileDetail({ caregiverId, onBack, onBookNow } = {}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [caregiver, setCaregiver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (caregiverId) {
      fetchCaregiverDetails();
      checkIfFavorite();
      fetchReviews();
    }
  }, [caregiverId]);

  const fetchCaregiverDetails = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_URL}/patient/caregivers/detail/${caregiverId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setCaregiver(response.data.caregiver);
      }
    } catch (error) {
      console.error('Error fetching caregiver details:', error);
      Alert.alert('Error', 'Failed to load caregiver details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/patient/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const isFav = response.data.favorites.some(fav => fav.id === caregiverId);
        setIsFavorite(isFav);
      }
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_URL}/review/user/${caregiverId}?page=1&limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Format reviews for display
        const formattedReviews = response.data.reviews.map(review => ({
          id: review._id,
          name: review.reviewer?.fullName || 'Anonymous',
          rating: review.rating,
          date: formatReviewDate(review.createdAt),
          comment: review.reviewText || 'No comment provided'
        }));
        setReviews(formattedReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const formatReviewDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const toggleFavorite = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/patient/favorites/${caregiverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
        Alert.alert('Success', 'Removed from favorites');
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/patient/favorites`,
          { caregiverId },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setIsFavorite(true);
        Alert.alert('Success', 'Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update favorites');
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

  if (!caregiver) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Caregiver not found</Text>
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
          <Image source={{ uri: caregiver.image }} style={styles.headerImage} />
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </Svg>
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={toggleFavorite}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : '#111827'} strokeWidth={2}>
              <Path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </Svg>
          </TouchableOpacity>

          {/* Verified Badge */}
          {caregiver.verified && (
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
              <Text style={styles.name}>{caregiver.fullName || caregiver.name}</Text>
              <Text style={styles.role}>{caregiver.licenseType || caregiver.userType === 'nurse' ? 'Registered Nurse' : 'Healthcare Professional'}</Text>
            </View>
            <View style={styles.headerRight}>
              {caregiver.hourlyRate && (
                <Text style={styles.price}>Rs. {caregiver.hourlyRate}/hr</Text>
              )}
              <Text style={styles.availability}>{caregiver.isAvailable ? 'Available' : 'Not Available'}</Text>
            </View>
          </View>

          {/* Service Rates */}
          {(caregiver.hourlyRate || caregiver.dailyRate || caregiver.weeklyRate || caregiver.monthlyRate) && (
            <View style={styles.ratesSection}>
              <Text style={styles.sectionTitle}>Service Rates</Text>
              <View style={styles.ratesGrid}>
                {caregiver.hourlyRate && (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateLabel}>Hourly</Text>
                    <Text style={styles.rateValue}>Rs. {caregiver.hourlyRate}</Text>
                  </View>
                )}
                {caregiver.dailyRate && (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateLabel}>Daily</Text>
                    <Text style={styles.rateValue}>Rs. {caregiver.dailyRate}</Text>
                  </View>
                )}
                {caregiver.weeklyRate && (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateLabel}>Weekly</Text>
                    <Text style={styles.rateValue}>Rs. {caregiver.weeklyRate}</Text>
                  </View>
                )}
                {caregiver.monthlyRate && (
                  <View style={styles.rateCard}>
                    <Text style={styles.rateLabel}>Monthly</Text>
                    <Text style={styles.rateValue}>Rs. {caregiver.monthlyRate}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth={2}>
                <Path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </Svg>
              <Text style={styles.statValue}>{caregiver.rating || '5.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            {caregiver.workExperience && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </Svg>
                  <Text style={styles.statValue}>
                    {caregiver.workExperience} {parseInt(caregiver.workExperience) === 1 ? 'year' : 'years'}
                  </Text>
                  <Text style={styles.statLabel}>Experience</Text>
                </View>
              </>
            )}
            {caregiver.licenseType && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </Svg>
                  <Text style={styles.statValue}>{caregiver.licenseType}</Text>
                  <Text style={styles.statLabel}>License</Text>
                </View>
              </>
            )}
          </View>

          {/* About */}
          {caregiver.about && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.aboutText}>{caregiver.about}</Text>
            </View>
          )}

          {/* Education & Institution */}
          {(caregiver.education || caregiver.institution) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Education & Credentials</Text>
              {caregiver.education && (
                <View style={styles.infoRow}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </Svg>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Education</Text>
                    <Text style={styles.infoText}>{caregiver.education}</Text>
                  </View>
                </View>
              )}
              {caregiver.institution && (
                <View style={styles.infoRow}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
                    <Path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </Svg>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Institution / Hospital</Text>
                    <Text style={styles.infoText}>{caregiver.institution}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Services */}
          {caregiver.services && caregiver.services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              <View style={styles.servicesGrid}>
                {caregiver.services.map((service, index) => (
                  <View key={index} style={styles.serviceChip}>
                    <Text style={styles.serviceText}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Contact Information section removed as per requirements */}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews ({caregiver.totalReviews || 0})</Text>
              {reviews.length > 0 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {reviewsLoading ? (
              <View style={styles.reviewsLoading}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
              </View>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewLeft}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{review.name.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={styles.reviewName}>{review.name}</Text>
                        <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth={2}>
                        <Path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </Svg>
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <Text style={styles.emptyReviewsText}>No reviews yet</Text>
                <Text style={styles.emptyReviewsSubtext}>Be the first to review this caregiver</Text>
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Book Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bookButton} onPress={onBookNow} activeOpacity={0.8}>
          <Text style={styles.bookButtonText}>Book Now</Text>
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
  backButtonAlt: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonAltText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  headerImage: {
    width: '100%',
    height: '100%',
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
  favoriteButton: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#6b7280',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  availability: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  ratesSection: {
    marginBottom: 24,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  serviceText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  languagesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  languageText: {
    color: '#9333ea',
    fontSize: 14,
    fontWeight: '500',
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  certificationText: {
    fontSize: 15,
    color: '#111827',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  reviewsLoadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});