import axios from 'axios';
import { getSessionId, getDeviceId, setSessionId } from './session';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
});

// Add session ID to all requests
api.interceptors.request.use(async (config) => {
  let sessionId = getSessionId();
  
  // Create session if not exists
  if (!sessionId) {
    try {
      const deviceId = getDeviceId();
      const response = await axios.post(`${API}/auth/session`, { device_id: deviceId });
      sessionId = response.data.id;
      setSessionId(sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }
  
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }
  
  return config;
});

export default api;