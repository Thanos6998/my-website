export const getSessionId = () => {
  let sessionId = localStorage.getItem('gupt_kura_session_id');
  if (!sessionId) {
    const deviceId = localStorage.getItem('gupt_kura_device_id') || generateDeviceId();
    localStorage.setItem('gupt_kura_device_id', deviceId);
    return null;
  }
  return sessionId;
};

export const setSessionId = (sessionId) => {
  localStorage.setItem('gupt_kura_session_id', sessionId);
};

export const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getDeviceId = () => {
  let deviceId = localStorage.getItem('gupt_kura_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('gupt_kura_device_id', deviceId);
  }
  return deviceId;
};

export const getSafeMode = () => {
  const safeMode = localStorage.getItem('gupt_kura_safe_mode');
  return safeMode === null ? true : safeMode === 'true';
};

export const setSafeMode = (value) => {
  localStorage.setItem('gupt_kura_safe_mode', value.toString());
};

export const getAgeVerified = () => {
  return sessionStorage.getItem('gupt_kura_age_verified') === 'true';
};

export const setAgeVerified = (value) => {
  sessionStorage.setItem('gupt_kura_age_verified', value.toString());
};