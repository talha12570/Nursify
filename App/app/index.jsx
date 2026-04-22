import { useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from "../screens/splash";
import Onboarding from "../screens/obnboarding";
import SignUp from "../screens/signup";
import Login from "../screens/login";
import OTPVerification from "../screens/otp";
import PendingVerification from "../screens/pendingVerification";
import PatientDashboard from "../screens/patientdashboard";
import ProfileDetail from "../screens/profileDetail";
import BookingFlow from "../screens/bookingflow";
import PendingApproval from "../screens/pendingApproval";
import LocationPayment from "../screens/locationPayment";
import BookingConfirmation from "../screens/bookingconfirmation";
import PatientServiceTracking from "../screens/patientServiceTracking";
import UserProfile from "../screens/userProfile";
import CaregiverDashboard from "../screens/caregiverDashboard";
import CaregiverActiveBooking from "../screens/caregiverActiveBooking";
import CaregiverProfile from "../screens/caregiverProfile";
import SetProfile from "../screens/setProfile";
import ForgotPassword from "../screens/forgotPassword";
import ResetPassword from "../screens/resetPassword";

export default function Index() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [userType, setUserType] = useState('patient'); // 'patient' or 'caregiver'
  const [userEmail, setUserEmail] = useState(''); // Store email for OTP verification

  // Navigation helper to track history
  const navigateTo = (screen) => {
    setNavigationHistory([...navigationHistory, currentScreen]);
    setCurrentScreen(screen);
  };

  // Go back to previous screen
  const goBack = () => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(navigationHistory.slice(0, -1));
      setCurrentScreen(previousScreen);
    }
  };

  if (currentScreen === 'splash') {
    return <SplashScreen 
      onGetStarted={() => navigateTo('onboarding')}
      onLogin={() => navigateTo('login')}
      onCaregiverView={() => navigateTo('caregiverDashboard')}
    />;
  }

  if (currentScreen === 'onboarding') {
    return <Onboarding onComplete={() => navigateTo('signup')} />;
  }

  if (currentScreen === 'signup') {
    return <SignUp 
      onSignUp={(email, type) => {
        setUserEmail(email);
        setUserType(type || 'patient');
        navigateTo('otp');
      }} 
      onSwitchToLogin={() => {
        // Check if previous screen is login, otherwise navigate to login
        if (navigationHistory.length > 0 && navigationHistory[navigationHistory.length - 1] === 'login') {
          goBack();
        } else {
          navigateTo('login');
        }
      }}
      onBack={() => goBack()}
    />;
  }

  if (currentScreen === 'login') {
    return <Login 
      onLogin={(email, type, token, userData) => {
        setUserEmail(email);
        setUserType(type || 'patient');
        
        // If token and userData are provided, user is verified and logged in directly
        if (token && userData) {
          // Navigate directly to appropriate dashboard
          if (type === 'nurse' || type === 'caretaker') {
            setCurrentScreen('caregiverDashboard');
          } else {
            setCurrentScreen('dashboard');
          }
        } else {
          // Otherwise, go to OTP screen
          navigateTo('otp');
        }
      }}
      onVerificationNeeded={(email, type) => {
        setUserEmail(email);
        setUserType(type || 'patient');
        // If email is 'pending', go to pending verification
        if (email === 'pending') {
          navigateTo('pendingVerification');
        } else {
          navigateTo('otp');
        }
      }}
      onSwitchToSignUp={() => {
        // Check if previous screen is signup, otherwise navigate to signup
        if (navigationHistory.length > 0 && navigationHistory[navigationHistory.length - 1] === 'signup') {
          goBack();
        } else {
          navigateTo('signup');
        }
      }}
      onForgotPassword={() => navigateTo('forgotPassword')}
      onBack={() => goBack()}
    />;
  }

  if (currentScreen === 'forgotPassword') {
    return <ForgotPassword 
      onForgotPasswordSuccess={(email) => {
        setUserEmail(email);
        navigateTo('resetPassword');
      }}
      onBackToLogin={() => goBack()}
    />;
  }

  if (currentScreen === 'resetPassword') {
    return <ResetPassword 
      email={userEmail}
      onResetSuccess={() => setCurrentScreen('login')}
      onBackToLogin={() => goBack()}
    />;
  }

  if (currentScreen === 'otp') {
    return <OTPVerification 
      email={userEmail}
      onVerify={(token, userData) => {
        // If token is 'pending', show pending verification screen
        if (token === 'pending') {
          navigateTo('pendingVerification');
        } else if (userType === 'caregiver' || userType === 'nurse' || userType === 'caretaker') {
          setCurrentScreen('caregiverDashboard');
        } else {
          setCurrentScreen('dashboard');
        }
      }} 
      onBack={() => goBack()}
      phoneNumber="+92 300 1234567"
    />;
  }

  if (currentScreen === 'pendingVerification') {
    return <PendingVerification 
      userType={userType}
      onBackToLogin={() => goBack()}
      onApproved={(userData) => {
        // Redirect to appropriate dashboard based on user type
        if (userData.userType === 'nurse' || userData.userType === 'caretaker') {
          setUserType(userData.userType);
          setCurrentScreen('caregiverDashboard');
        } else {
          setUserType('patient');
          setCurrentScreen('dashboard');
        }
      }}
    />;
  }

  if (currentScreen === 'dashboard') {
    return <PatientDashboard 
      onViewProfile={(id) => {
        setSelectedCaregiverId(id);
        navigateTo('profile');
      }} 
      onOpenBooking={() => navigateTo('booking')}
      onTrackBooking={(booking) => {
        setBookingData(booking);
        navigateTo('serviceTracking');
      }}
      onOpenUserProfile={() => navigateTo('userProfile')}
      onLogout={async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        setNavigationHistory([]);
        setCurrentScreen('splash');
      }}
    />;
  }

  if (currentScreen === 'profile') {
    return <ProfileDetail 
      caregiverId={selectedCaregiverId}
      onBack={() => goBack()} 
      onBookNow={() => {
        // Keep the selected caregiver ID when moving to booking
        navigateTo('booking');
      }}
    />;
  }

  if (currentScreen === 'booking') {
    return <BookingFlow 
      caregiverId={selectedCaregiverId}
      onBack={() => goBack()} 
      onComplete={(booking) => {
        setBookingData(booking);
        navigateTo('pendingApproval');
      }}
    />;
  }

  if (currentScreen === 'pendingApproval') {
    return <PendingApproval 
      bookingData={bookingData}
      onApproved={(approvedBooking) => {
        if (approvedBooking) {
          setBookingData(approvedBooking);
        }
        navigateTo('serviceTracking');
      }}
      onRejected={() => {
        setNavigationHistory([]);
        setCurrentScreen('dashboard');
      }}
      onCancel={() => {
        setNavigationHistory([]);
        setCurrentScreen('dashboard');
      }}
    />;
  }

  if (currentScreen === 'payment') {
    return <LocationPayment 
      bookingData={bookingData}
      onBack={() => goBack()} 
      onComplete={(updatedBooking) => {
        setBookingData(updatedBooking);
        navigateTo('confirmation');
      }}
    />;
  }

  if (currentScreen === 'serviceTracking') {
    return <PatientServiceTracking 
      bookingData={bookingData}
      onBack={() => goBack()}
      onComplete={(updatedBooking) => {
        if (updatedBooking) {
          setBookingData(updatedBooking);
        }
        navigateTo('payment');
      }}
      onCancelled={() => {
        setNavigationHistory([]);
        setCurrentScreen('dashboard');
      }}
    />;
  }

  if (currentScreen === 'confirmation') {
    return <BookingConfirmation 
      bookingData={bookingData}
      onTrackBooking={() => goBack()}
      onBackHome={() => {
        setNavigationHistory([]);
        setCurrentScreen('dashboard');
      }}
    />;
  }

  if (currentScreen === 'userProfile') {
    return <UserProfile 
      onBack={() => goBack()}
    />;
  }

  if (currentScreen === 'caregiverDashboard') {
    return <CaregiverDashboard 
      onViewJobDetails={() => console.log('View job details')}
      onViewActiveBooking={(booking) => {
        setBookingData(booking);
        navigateTo('caregiverActiveBooking');
      }}
      onBack={() => {
        setNavigationHistory([]);
        setCurrentScreen('splash');
      }}
      onViewProfile={() => navigateTo('caregiverProfile')}
      onSetProfile={() => navigateTo('setProfile')}
      onLogout={async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        setNavigationHistory([]);
        setCurrentScreen('splash');
      }}
    />;
  }

  if (currentScreen === 'caregiverActiveBooking') {
    return <CaregiverActiveBooking 
      bookingData={bookingData}
      onBack={() => goBack()}
      onComplete={() => {
        setNavigationHistory([]);
        setCurrentScreen('caregiverDashboard');
      }}
      onCancelled={() => {
        setNavigationHistory([]);
        setCurrentScreen('caregiverDashboard');
      }}
    />;
  }

  if (currentScreen === 'caregiverProfile') {
    return <CaregiverProfile 
      onBack={() => goBack()}
      onEditProfile={() => navigateTo('setProfile')}
    />;
  }

  if (currentScreen === 'setProfile') {
    return <SetProfile 
      onBack={() => goBack()}
      onSaved={() => {
        setNavigationHistory([]);
        setCurrentScreen('caregiverProfile');
      }}
    />;
  }

  return <SplashScreen />;
}
