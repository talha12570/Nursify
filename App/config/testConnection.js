import axios from 'axios';
import { API_URL } from './api';

/**
 * Test server connectivity
 * Returns { success: boolean, message: string, details: any }
 */
export const testServerConnection = async () => {
  try {
    console.log('Testing connection to:', API_URL);
    
    const startTime = Date.now();
    const response = await axios.get(`${API_URL}/auth`, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const endTime = Date.now();
    
    return {
      success: true,
      message: `Server reachable! Response time: ${endTime - startTime}ms`,
      details: {
        status: response.status,
        responseTime: endTime - startTime,
        url: API_URL
      }
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    
    let message = 'Cannot connect to server';
    let details = { url: API_URL };
    
    if (error.code === 'ECONNREFUSED') {
      message = '❌ Server not running or wrong IP address';
      details.suggestion = 'Check if server is running on ' + API_URL;
    } else if (error.code === 'ETIMEDOUT') {
      message = '❌ Connection timeout - Server unreachable';
      details.suggestion = 'Check if device is on same WiFi network';
    } else if (error.message === 'Network request failed' || error.message.includes('Network Error')) {
      message = '❌ Network Error - Device cannot reach server';
      details.suggestion = 'Ensure device is on same WiFi as computer (not mobile data)';
    } else if (error.response) {
      // Server responded but with error
      message = `✅ Server reachable! (HTTP ${error.response.status})`;
      return { success: true, message, details: { status: error.response.status, url: API_URL } };
    } else {
      message = '❌ Unknown error: ' + error.message;
    }
    
    return {
      success: false,
      message,
      details
    };
  }
};

export default testServerConnection;
