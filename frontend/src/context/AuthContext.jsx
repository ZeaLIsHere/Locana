import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('locana_token');
    const savedUser = localStorage.getItem('locana_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));

      // Fetch latest profile to verify token and sync loyalty points
      fetchProfile(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken) => {
    try {
      const response = await fetch(apiUrl('/api/auth/profile'), {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const profileData = await response.json();
        setUser(profileData);
        localStorage.setItem('locana_user', JSON.stringify(profileData));
      } else {
        // Token might have expired or is invalid
        logout();
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ identifier, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal. Periksa kembali email dan password.');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('locana_token', data.token);
      localStorage.setItem('locana_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (payload) => {
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal. Coba lagi.');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('locana_token', data.token);
      localStorage.setItem('locana_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('locana_token');
    localStorage.removeItem('locana_user');
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
