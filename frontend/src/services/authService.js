import api from './api';

// Authentication service
export const authService = {
    // Login user
    login: async(username, password) => {
        try {
            const response = await api.post('/auth/login', {
                username,
                password
            });

            const { access_token, user } = response.data;

            // Store token in localStorage
            localStorage.setItem('authToken', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            return { user, token: access_token };
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Login failed');
        }
    },

    // Register new user
    register: async(userData) => {
        try {
            const response = await api.post('/auth/register', userData);

            const { access_token, user } = response.data;

            // Store token in localStorage
            localStorage.setItem('authToken', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            return { user, token: access_token };
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Registration failed');
        }
    },

    // Logout user
    logout: async() => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Continue with logout even if API call fails
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    },

    // Get current user from localStorage
    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('authToken');
        const user = authService.getCurrentUser();
        return !!(token && user);
    },

    // Get auth token
    getToken: () => {
        return localStorage.getItem('authToken');
    },

    // Refresh token (if needed)
    refreshToken: async() => {
        try {
            const response = await api.post('/auth/refresh');
            const { access_token } = response.data;

            localStorage.setItem('authToken', access_token);
            return access_token;
        } catch (error) {
            // If refresh fails, logout user
            authService.logout();
            throw new Error('Session expired. Please login again.');
        }
    },

    // Forgot password
    forgotPassword: async(email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to send reset email');
        }
    },

    // Reset password
    resetPassword: async(token, newPassword) => {
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                password: newPassword
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to reset password');
        }
    },

    // Change password
    changePassword: async(currentPassword, newPassword) => {
        try {
            const response = await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to change password');
        }
    }
};

export default authService;