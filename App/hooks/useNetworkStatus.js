/**
 * Network Connectivity Check Hook
 * 
 * Use this hook to check if the backend is reachable
 * before allowing users to use the app.
 */

import { useState, useEffect, useCallback } from 'react';
import { checkBackendConnection } from '../services/api';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(null); // null = checking
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await checkBackendConnection();
      setIsConnected(result.connected);
      
      if (!result.connected) {
        setError(result.suggestion || 'Cannot connect to server');
      }
      
      setLastChecked(new Date());
    } catch (err) {
      setIsConnected(false);
      setError(err.message || 'Connection check failed');
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isChecking,
    error,
    lastChecked,
    retry: checkConnection,
  };
};

export default useNetworkStatus;
