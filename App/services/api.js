import axios from 'axios';
import { API_URL, NETWORK_CONFIG, HEALTH_CHECK_URL } from '../config/api';

// ═══════════════════════════════════════════════════════════════════
// AXIOS INSTANCE WITH NGROK SUPPORT
// ═══════════════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // CRITICAL: Skip ngrok browser warning
    'Accept': 'application/json',
  },
  timeout: NETWORK_CONFIG?.timeout?.default || 15000,
});

// ═══════════════════════════════════════════════════════════════════
// REQUEST INTERCEPTOR - Add ngrok headers to ALL requests
// ═══════════════════════════════════════════════════════════════════

api.interceptors.request.use(
  (config) => {
    // Ensure ngrok header is present on every request
    config.headers['ngrok-skip-browser-warning'] = 'true';
    
    // Log request in development
    if (__DEV__) {
      console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════
// RESPONSE INTERCEPTOR - Handle errors consistently
// ═══════════════════════════════════════════════════════════════════

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`📥 [API] Response ${response.status} from ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Detailed error logging
    if (error.response) {
      // Server responded with error status
      console.error(`❌ [API] Server Error ${error.response.status}:`, error.response.data?.message || error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('❌ [API] No response from server. Check:');
      console.error('   1. Is the server running?');
      console.error('   2. Is ngrok tunnel active?');
      console.error('   3. Is the ngrok URL current?');
    } else {
      console.error('❌ [API] Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK - Verify backend connectivity
// ═══════════════════════════════════════════════════════════════════

export const checkBackendConnection = async () => {
  try {
    console.log('🔍 [API] Checking backend connectivity...');
    const response = await axios.get(HEALTH_CHECK_URL || `${API_URL}/health`, {
      timeout: NETWORK_CONFIG?.timeout?.health || 5000,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    console.log('✅ [API] Backend is reachable');
    return { connected: true, data: response.data };
  } catch (error) {
    console.error('❌ [API] Backend NOT reachable:', error.message);
    return { 
      connected: false, 
      error: error.message,
      suggestion: 'Please ensure:\n1. Server is running\n2. Ngrok tunnel is active\n3. You have internet connection'
    };
  }
};

// ═══════════════════════════════════════════════════════════════════
// RETRY HELPER - Automatic retry with exponential backoff
// ═══════════════════════════════════════════════════════════════════

const withRetry = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.log(`🔄 [API] Retry ${attempt}/${maxAttempts} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Auth API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    try {
      // Create FormData for multipart/form-data upload
      const formData = new FormData();

      // Add text fields
      formData.append('fullName', userData.name);
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      formData.append('phone', userData.phone);
      formData.append('userType', userData.userType);
      formData.append('cnicNumber', userData.cnicNumber);

      // Add specialty if provided
      if (userData.specialty) {
        formData.append('specialty', userData.specialty);
      }

      // Add license number if provided
      if (userData.licenseNumber) {
        formData.append('licenseNumber', userData.licenseNumber);
      }

      // Add image files (React Native format)
      if (userData.cnicFront) {
        const filename = userData.cnicFront.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('cnicFront', {
          uri: userData.cnicFront,
          name: filename || 'cnicFront.jpg',
          type: type,
        });
      }

      if (userData.cnicBack) {
        const filename = userData.cnicBack.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('cnicBack', {
          uri: userData.cnicBack,
          name: filename || 'cnicBack.jpg',
          type: type,
        });
      }

      if (userData.licensePhoto) {
        const filename = userData.licensePhoto.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('licensePhoto', {
          uri: userData.licensePhoto,
          name: filename || 'licensePhoto.jpg',
          type: type,
        });
      }

      if (userData.experienceLetter) {
        const filename = userData.experienceLetter.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('experienceLetter', {
          uri: userData.experienceLetter,
          name: filename || 'experienceLetter.jpg',
          type: type,
        });
      }

      if (userData.experienceImage) {
        const filename = userData.experienceImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('experienceImage', {
          uri: userData.experienceImage,
          name: filename || 'experienceImage.jpg',
          type: type,
        });
      }

      if (userData.professionalImage) {
        const filename = userData.professionalImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('professionalImage', {
          uri: userData.professionalImage,
          name: filename || 'professionalImage.jpg',
          type: type,
        });
      }

      if (userData.medicalRecord) {
        const filename = userData.medicalRecord.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('medicalRecord', {
          uri: userData.medicalRecord,
          name: filename || 'medicalRecord.jpg',
          type: type,
        });
      }

      console.log('[api] Sending registration with FormData');
      console.log('[api] API URL:', `${API_URL}/auth/register`);
      console.log('[api] FormData has images:', {
        cnicFront: !!userData.cnicFront,
        cnicBack: !!userData.cnicBack,
        licensePhoto: !!userData.licensePhoto,
        experienceLetter: !!userData.experienceLetter,
        experienceImage: !!userData.experienceImage,
        professionalImage: !!userData.professionalImage,
        medicalRecord: !!userData.medicalRecord,
      });

      // Send as multipart/form-data
      const response = await axios.post(`${API_URL}/auth/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true', // Skip ngrok browser warning page
        },
        timeout: 120000, // 120 seconds for file upload (multiple images to Cloudinary)
        transformRequest: (data, headers) => {
          // Let axios handle FormData transformation
          return data;
        },
      });

      console.log('[api] Registration successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[api] Registration error:', error.message);
      if (error.response) {
        console.error('[api] Response error:', error.response.data);
        console.error('[api] Status:', error.response.status);
        throw error.response.data;
      } else if (error.request) {
        console.error('[api] No response received from server');
        console.error('[api] Check if server is running at:', API_URL);
        throw { message: 'Network Error: Could not connect to server. Please check if the server is running.' };
      } else {
        console.error('[api] Error setting up request:', error.message);
        throw { message: error.message };
      }
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      console.log('[api] Login attempt for:', email);
      console.log('[api] API URL:', API_URL);
      const response = await api.post('/auth/login', { email, password });
      console.log('[api] Login successful');
      return response.data;
    } catch (error) {
      console.error('[api] Login error:', error.message);
      
      // Handle 403 status codes for verification/approval flows
      if (error.response?.status === 403 && error.response?.data) {
        const data = error.response.data;
        // If it's a verification or approval requirement, return it as valid response
        if (data.requiresVerification || data.requiresApproval) {
          return data;
        }
      }
      
      // Network errors
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        console.error('[api] Network error - cannot reach server');
        throw { 
          message: 'Cannot connect to server. Please check:\n\n1. Server is running\n2. Phone and computer are on same WiFi\n3. Server IP is correct in config' 
        };
      }
      
      throw error.response?.data || error;
    }
  },

  // Get current user
  getUser: async (token) => {
    try {
      const response = await api.get('/auth/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Forgot Password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset Password
  resetPassword: async (email, otp, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { email, otp, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// OTP API
export const otpAPI = {
  // Verify OTP
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/otp/verify', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resend OTP
  resendOTP: async (email) => {
    try {
      const response = await api.post('/otp/resend', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Send verification OTP
  sendVerificationOTP: async (email) => {
    try {
      const response = await api.post('/otp/send-verification', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify 2FA OTP
  verify2FA: async (email, otp) => {
    try {
      const response = await api.post('/otp/2fa/verify', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Patient API
export const patientAPI = {
  // Get dashboard data
  getDashboard: async () => {
    try {
      const response = await api.get('/patient/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get quick services
  getServices: async () => {
    try {
      const response = await api.get('/patient/services');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get nearby caregivers
  getNearbyCaregivers: async (params) => {
    try {
      const response = await api.get('/patient/caregivers/nearby', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Search caregivers
  searchCaregivers: async (searchQuery, page = 1) => {
    try {
      const response = await api.get('/patient/nurses/search', {
        params: { query: searchQuery, page }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get featured caregivers
  getFeaturedCaregivers: async (userType = null, limit = 5) => {
    try {
      const params = { limit };
      if (userType) params.userType = userType;
      const response = await api.get('/patient/caregivers/featured', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get caregiver profile
  getCaregiverProfile: async (id) => {
    try {
      const response = await api.get(`/patient/caregivers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Set auth token for authenticated requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
