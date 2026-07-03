import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); 

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await api.me();
      if (currentUser && currentUser.email) {
          setUser(currentUser);
          setIsAuthenticated(true);
      } else {
          setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      const res = await api.login(email, password);
      const user = res.user;
      localStorage.setItem('crm_user', JSON.stringify(user));
      if (res.token) {
        localStorage.setItem('crm_token', res.token);
      }
      setUser(user);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      return user;
    } catch (error) {
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const googleLogin = async (token) => {
    try {
      setIsLoadingAuth(true);
      const res = await api.loginWithGoogle(token);
      const user = res.user;
      localStorage.setItem('crm_user', JSON.stringify(user));
      if (res.token) {
        localStorage.setItem('crm_token', res.token);
      }
      setUser(user);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      return user;
    } catch (error) {
      setIsLoadingAuth(false);
      throw error;
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    
    if (shouldRedirect) {
      window.location.href = '/login';
    } else {
      // Do nothing more
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      googleLogin,
      logout,
      navigateToLogin,
      checkAppState
    }}>
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
