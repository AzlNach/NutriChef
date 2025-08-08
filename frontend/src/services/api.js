import axios from 'axios';

// API base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            console.warn('🔐 401 Unauthorized - Token may be expired');
            
            // Only auto-logout for specific endpoints or if explicitly unauthorized
            if (error.config.url?.includes('/auth/') || 
                error.response.data?.error?.toLowerCase().includes('token')) {
                
                console.log('🚪 Auto-logout due to token issue');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Use a more gentle redirect approach
                if (window.location.pathname !== '/') {
                    window.location.href = '/?session_expired=true';
                }
            } else {
                console.log('⚠️ 401 error but not forcing logout - may be temporary');
            }
        }
        return Promise.reject(error);
    }
);

export default api;