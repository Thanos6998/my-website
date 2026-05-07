import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const ADMIN_USERNAME = 'Santoshi@60poudel';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkAuth = () => {
    try {
      const userData = localStorage.getItem('gupt_kura_user');
      if (userData) {
        const parsed = JSON.parse(userData);
        const isExpired = Date.now() - parsed.createdAt > SESSION_DURATION;
        
        if (isExpired) {
          logout();
        } else {
          setUser({
            name: parsed.name,
            age: parsed.age,
            role: parsed.name === ADMIN_USERNAME ? 'admin' : 'user',
            createdAt: parsed.createdAt
          });
          setIsOnboarded(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const checkExpiry = () => {
    const userData = localStorage.getItem('gupt_kura_user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (Date.now() - parsed.createdAt > SESSION_DURATION) {
          logout();
        }
      } catch (error) {
        logout();
      }
    }
  };

  const onboard = (name, age) => {
    // Validation
    const trimmedName = name.trim();
    const numAge = parseInt(age);

    if (!trimmedName || trimmedName.length === 0) {
      throw new Error('Name is required');
    }

    if (isNaN(numAge) || numAge < 10 || numAge > 99) {
      throw new Error('Age must be between 10 and 99');
    }

    const userData = {
      name: trimmedName,
      age: numAge,
      createdAt: Date.now()
    };

    localStorage.setItem('gupt_kura_user', JSON.stringify(userData));
    
    setUser({
      name: trimmedName,
      age: numAge,
      role: trimmedName === ADMIN_USERNAME ? 'admin' : 'user',
      createdAt: userData.createdAt
    });
    setIsOnboarded(true);
  };

  const logout = () => {
    // Clear all localStorage
    localStorage.removeItem('gupt_kura_user');
    localStorage.removeItem('gupt_kura_session_id');
    localStorage.removeItem('gupt_kura_device_id');
    localStorage.removeItem('gupt_kura_safe_mode');
    localStorage.removeItem('gupt_kura_welcomed');
    localStorage.removeItem('admin_token');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    setUser(null);
    setIsOnboarded(false);
  };

  const value = {
    user,
    isOnboarded,
    loading,
    onboard,
    logout,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};