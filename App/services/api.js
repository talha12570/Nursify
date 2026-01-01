import axios from 'axios';
import { API_URL } from '../config/api';

// Update this with your server URL - Now managed in config/api.js

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
        },
        timeout: 60000, // 60 seconds for file upload
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
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      // Handle 403 status codes for verification/approval flows
      if (error.response?.status === 403 && error.response?.data) {
        const data = error.response.data;
        // If it's a verification or approval requirement, return it as valid response
        if (data.requiresVerification || data.requiresApproval) {
          return data;
        }
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
      const response = await api.get('/patient/caregivers/search', {
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
