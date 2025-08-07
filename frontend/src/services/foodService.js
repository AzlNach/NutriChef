import api from './api';

// Food analysis service
export const foodService = {
    // Analyze food image
    analyzeFood: async(formData) => {
        try {
            const response = await api.post('/food/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 60000, // 60 seconds for analysis
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Food analysis failed');
        }
    },

    // Get analysis result by session ID
    getAnalysisResult: async(sessionId) => {
        try {
            const response = await api.get(`/food/session/${sessionId}`);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get analysis result');
        }
    },

    // Update detected food information
    updateDetectedFood: async(sessionId, foodId, updateData) => {
        try {
            const response = await api.put(`/food/session/${sessionId}/food/${foodId}`, updateData);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to update food information');
        }
    },

    // Remove detected food
    removeDetectedFood: async(sessionId, foodId) => {
        try {
            const response = await api.delete(`/food/session/${sessionId}/food/${foodId}`);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to remove food');
        }
    },


    // Search foods in database
    searchFoods: async(query, limit = 20) => {
        try {
            const response = await api.get('/food/search', {
                params: { query, limit }
            });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Food search failed');
        }
    },

    // Get food details
    getFoodDetails: async(foodId) => {
        try {
            const response = await api.get(`/food/${foodId}`);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get food details');
        }
    },

    // Add custom food
    addCustomFood: async(foodData) => {
        try {
            const response = await api.post('/food/custom', foodData);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to add custom food');
        }
    }
};

export default foodService;