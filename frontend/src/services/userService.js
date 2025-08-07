import api from './api';

// User management service
export const userService = {
    // Get user profile
    getProfile: async() => {
        try {
            const response = await api.get('/users/profile');
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get profile');
        }
    },

    // Update user profile
    updateProfile: async(profileData) => {
        try {
            const response = await api.put('/users/profile', profileData);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to update profile');
        }
    },

    // Change password
    changePassword: async(currentPassword, newPassword) => {
        try {
            const response = await api.post('/users/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to change password');
        }
    },

    // Delete account
    deleteAccount: async(password) => {
        try {
            const response = await api.delete('/users/delete-account', {
                data: { password }
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to delete account');
        }
    },

    // Get user preferences
    getPreferences: async() => {
        try {
            const response = await api.get('/users/preferences');
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get preferences');
        }
    },

    // Update user preferences
    updatePreferences: async(preferences) => {
        try {
            const response = await api.put('/users/preferences', preferences);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to update preferences');
        }
    }
};

export default userService;