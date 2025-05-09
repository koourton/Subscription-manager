import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      // Ensure the token is properly formatted in the Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Extract user info directly from the token
      try {
        // Decode the token to get user information
        const decoded = jwtDecode(token);
        console.log("Token decoded successfully:", decoded);
        
        // Get user data from the token claims
        const userData = {
          id: decoded.sub, // Flask-JWT-Extended puts user ID in 'sub' claim
          role: decoded.role,
          username: decoded.username,
          // We don't have email in the token, but we'll include it if we get it from the API
        };
        
        // Try to get additional user data from API
        try {
          const response = await api.get('/users/me');
          // Merge API data with token data
          Object.assign(userData, response.data);
        } catch (apiError) {
          console.log("Could not fetch additional user data from API", apiError);
          // Continue with just the token data
        }
        
        console.log("Setting user data:", userData);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (decodeError) {
        console.error("Failed to decode token:", decodeError);
        throw decodeError;
      }
    } catch (error) {
      console.error('Error in auth process:', error);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log(`Attempting login for user: ${username}`);
      const response = await api.post('/login', { username, password });
      console.log("Login response received:", response.status);
      
      const { access_token } = response.data;
      if (!access_token) {
        console.error("No token in response");
        return false;
      }
      
      console.log("Token received successfully");
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/register', userData);
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  // For debugging
  console.log("Auth context current state:", { isAuthenticated, user, loading });

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
