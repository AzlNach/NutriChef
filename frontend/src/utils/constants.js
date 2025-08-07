// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      PROFILE: '/auth/profile'
    },
    FOOD: {
      ANALYZE: '/food/analyze',
      HISTORY: '/food/history',
      DETAILS: '/food/details'
    },
    NUTRITION: {
      HISTORY: '/nutrition/history',
      SUMMARY: '/nutrition/summary'
    },
    USER: {
      PROFILE: '/user/profile',
      UPDATE: '/user/update'
    }
  }
};

// File upload configuration
export const UPLOAD_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ACCEPTED_FORMATS: '.jpg,.jpeg,.png,.webp'
};

// UI Constants
export const UI_CONFIG = {
  NAVBAR_SCROLL_THRESHOLD: 0.9, // 90% of viewport height
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 300
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    UNAUTHORIZED: 'You are not authorized to access this resource.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.'
  },
  FILE: {
    INVALID_TYPE: 'File type not supported. Please use JPEG, PNG, or WebP.',
    TOO_LARGE: 'File size too large. Maximum size is 5MB.',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.'
  },
  GENERIC: 'Something went wrong. Please try again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN: 'Successfully logged in!',
    LOGOUT: 'Successfully logged out!',
    REGISTER: 'Account created successfully!'
  },
  FOOD: {
    ANALYZE: 'Food analysis completed!',
    SAVE: 'Food analysis saved to history!'
  },
  PROFILE: {
    UPDATE: 'Profile updated successfully!'
  }
};
