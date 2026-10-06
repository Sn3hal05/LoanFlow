import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('loanflow_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('loanflow_token') || null);
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);

  // Fetch current user and demo accounts on load
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (token) {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('loanflow_user', JSON.stringify(res.data));
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
        logout();
      } finally {
        setLoading(false);
      }

      // Fetch demo accounts for 1-click switcher
      try {
        const demoRes = await api.get('/auth/demo-accounts');
        setDemoAccounts(demoRes.data);
      } catch (err) {
        console.error('Failed to fetch demo accounts:', err);
      }
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, ...userData } = res.data;
    localStorage.setItem('loanflow_token', newToken);
    localStorage.setItem('loanflow_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token: newToken, ...userData } = res.data;
    localStorage.setItem('loanflow_token', newToken);
    localStorage.setItem('loanflow_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('loanflow_token');
    localStorage.removeItem('loanflow_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (email, password = 'password123') => {
    return await login(email, password);
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    loading,
    demoAccounts,
    login,
    register,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
