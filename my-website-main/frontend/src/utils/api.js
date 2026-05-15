import axios from 'axios';
import { getSessionId, getDeviceId, setSessionId } from './session';

const BACKEND_URL = 'http://127.0.0.1:8000';
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
      const response = await axios.post(`${API}/auth/session`, {
        device_id: deviceId,
      });
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

// ========================
// ROOMS API
// FIX: export functions that unwrap .data so callers get the array/object directly
// ========================

export const getRooms = async () => {
  const res = await api.get('/rooms');
  return res.data; // returns the array directly
};

export const createRoom = async (name, emoji = '💬') => {
  const res = await api.post('/rooms/create', { name, emoji });
  return res.data;
};

export const getRoomMessages = async (roomId) => {
  const res = await api.get(`/rooms/${roomId}/messages`);
  return res.data;
};

export default api;