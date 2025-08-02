import React, { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, getProfile } from '../lib/api';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getProfile();
          setUser(userData);
        } catch (error) {
          console.log('Token validation failed, clearing storage');
          setUser(null);
          localStorage.removeItem('token');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const register = async (email, password, fullName, role) => {
    try {
      const response = await apiRegister(email, password, fullName, role);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const registerStore = async (storeData) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/register-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Store registration failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { token, user: userData } = await apiLogin(email, password);
      localStorage.setItem('token', token);
      setUser(userData);
      return userData; // Return success
    } catch (error) {
      console.error('Login error:', error);
      // Throw the error message for the form to catch
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    registerStore,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
