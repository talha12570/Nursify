import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, StyleSheet, Dimensions, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

/**
 * @param {Object} props
 * @param {any} [props.navigation]
 * @param {() => void} [props.onGetStarted]
 * @param {() => void} [props.onLogin]
 * @param {() => void} [props.onCaregiverView]
 */
export default function SplashScreen({ navigation, onGetStarted, onLogin, onCaregiverView } = {}) {
  const pulseAnim1 = React.useRef(new Animated.Value(1)).current;
  const pulseAnim2 = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Pulse animation for background circles
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, {
          toValue: 1.3,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse1.start();
    setTimeout(() => pulse2.start(), 300);

    return () => {
      pulse1.stop();
      pulse2.stop();
    };
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      console.log('Navigate to onboarding');
    }
  };

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      console.log('Navigate to login');
    }
  };

  const handlePatientView = () => {
    // Navigate to patient dashboard
    console.log('Navigate to patient dashboard');
  };

  const handleCaregiverView = () => {
    if (onCaregiverView) {
      onCaregiverView();
    } else {
      console.log('Navigate to caregiver dashboard');
    }
  };

  const handleAdminView = () => {
    // Navigate to admin dashboard
    console.log('Navigate to admin dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#2563eb', '#14b8a6', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContainer}>
            
            {/* Animated Background Circles */}
            <Animated.View 
              style={[
                styles.circle1,
                {
                  transform: [{ scale: pulseAnim1 }],
                  opacity: 0.3,
                }
              ]}
            />
            <Animated.View 
              style={[
                styles.circle2,
                {
                  transform: [{ scale: pulseAnim2 }],
                  opacity: 0.3,
                }
              ]}
            />

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../logo.jpg')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Nursify</Text>
            <Text style={styles.subtitle}>
              Your trusted on-demand caregiving and nursing service platform
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleGetStarted}
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Access for Demo */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Quick Demo Access</Text>
              
              <View style={styles.demoButtonRow}>
                <TouchableOpacity
                  onPress={handlePatientView}
                  style={styles.demoButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.demoButtonText}>👤 Patient View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCaregiverView}
                  style={styles.demoButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.demoButtonText}>💼 Caregiver View</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  circle1: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 128,
    height: 128,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 64,
  },
  circle2: {
    position: 'absolute',
    bottom: 80,
    right: 40,
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 80,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 48,
    paddingHorizontal: 16,
    lineHeight: 26,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#2563eb',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  demoSection: {
    marginTop: 48,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: 400,
  },
  demoTitle: {
    color: '#dbeafe',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  demoButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  demoButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  demoButtonFull: {
    width: '100%',
  },
  demoButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
});