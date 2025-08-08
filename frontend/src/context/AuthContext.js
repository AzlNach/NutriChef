import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { storage } from '../utils/helpers';
import { API_CONFIG } from '../utils/constants';

// Auth context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
        loading: false
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        loading: false
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null
};

// Helper function to check server connectivity
const checkServerConnectivity = async (token) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing auth on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('token'); // JWT tokens are strings, not JSON
      const user = storage.get('user'); // User data is JSON
      
      if (token && user) {
        // Verify token with server
        checkServerConnectivity(token).then(isValid => {
          if (isValid) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN,
              payload: { token, user }
            });
          } else {
            // Server is down or token is invalid, logout
            logout();
          }
        });
      }
    } catch (error) {
      console.error('Error loading auth data from localStorage:', error);
      // Clear corrupted localStorage data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  // Periodic server check for authenticated users
  useEffect(() => {
    let intervalId;

    if (state.isAuthenticated && state.token) {
      intervalId = setInterval(async () => {
        const isServerUp = await checkServerConnectivity(state.token);
        if (!isServerUp) {
          dispatch({
            type: AUTH_ACTIONS.SET_ERROR,
            payload: 'Server connection lost. You have been logged out.'
          });
          logout();
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.isAuthenticated, state.token]);

  // Auth actions
  const login = (token, user) => {
    storage.set('token', token);
    storage.set('user', user);
    dispatch({
      type: AUTH_ACTIONS.LOGIN,
      payload: { token, user }
    });
  };

  const logout = () => {
    storage.remove('token');
    storage.remove('user');
    dispatch({
      type: AUTH_ACTIONS.LOGOUT
    });
  };

  const setLoading = (loading) => {
    dispatch({
      type: AUTH_ACTIONS.SET_LOADING,
      payload: loading
    });
  };

  const setError = (error) => {
    dispatch({
      type: AUTH_ACTIONS.SET_ERROR,
      payload: error
    });
  };

  // Verify current token
  const verifyToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    return await checkServerConnectivity(token);
  };

  const value = {
    ...state,
    login,
    logout,
    setLoading,
    setError,
    verifyToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
