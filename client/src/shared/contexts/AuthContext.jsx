import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from '../../core/config/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => localStorage.getItem('token'));
  // FIX: If there's no token at all, skip the loading state entirely.
  // Previously loading always started as `true`, which combined with the axios
  // interceptor doing window.location.href='/login' caused a redirect on first open.
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/api/auth/me');
        const userData = response.data.user || response.data;
        setUser(userData);
      } catch (error) {
        if (error.response && [401, 403].includes(error.response.status)) {
          // Token invalid/expired — clear silently, let user stay on current page
          clearAuth();
        }
        // Network errors etc: keep token, user might be offline
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, clearAuth]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    clearAuth();
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user || response.data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
