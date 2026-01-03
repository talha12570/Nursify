import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

/**
 * @param {Object} props
 * @param {() => void} [props.onComplete]
 */
export default function Onboarding({ onComplete } = {}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Find Caregivers Near You',
      description: 'Connect with verified caregivers and professional nurses in your area instantly',
      gradient: ['#eff6ff', '#f0fdfa'],
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      title: 'Book Qualified Nurses',
      description: 'Access skilled healthcare professionals for home care, hospital assistance, and specialized nursing',
      gradient: ['#f0fdfa', '#f0fdf4'],
      iconBg: '#ccfbf1',
      iconColor: '#0d9488',
      iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    },
    {
      title: 'Secure & Verified Healthcare',
      description: 'All healthcare providers are background-checked, certified, and verified for your safety',
      gradient: ['#f0fdf4', '#eff6ff'],
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Skip Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Illustration Circle */}
        <LinearGradient
          colors={slide.gradient}
          style={styles.illustrationCircle}
        >
          <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={slide.iconColor} strokeWidth={2}>
              <Path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d={slide.iconPath}
              />
            </Svg>
          </View>
        </LinearGradient>

        {/* Text Content */}
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottom}>
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          onPress={handleNext}
          style={styles.nextButton}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide < slides.length - 1 ? 'Next' : 'Get Started'}
          </Text>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
            <Path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9 5l7 7-7 7"
            />
          </Svg>
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: '#6b7280',
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  illustrationCircle: {
    width: 256,
    height: 256,
    borderRadius: 128,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 400,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  description: {
    color: '#4b5563',
    textAlign: 'center',
    maxWidth: 400,
    fontSize: 16,
    lineHeight: 24,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: '#2563eb',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#d1d5db',
  },
  nextButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});