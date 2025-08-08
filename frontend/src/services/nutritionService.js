import api from './api';

// Nutrition tracking service
export const nutritionService = {
    // Get nutrition history
    getNutritionHistory: async(days = 30, startDate = null, endDate = null) => {
        try {
            const params = {};

            if (startDate && endDate) {
                params.start_date = startDate;
                params.end_date = endDate;
            } else {
                params.days = days;
            }

            const response = await api.get('/nutrition/history', { params });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get nutrition history');
        }
    },

    // Get daily nutrition summary
    getDailySummary: async(date = null) => {
        try {
            const params = {};
            if (date) {
                params.date = date;
            }

            const response = await api.get('/nutrition/daily-summary', { params });
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get daily summary');
        }
    },

    // Get nutrition goals
    getNutritionGoals: async() => {
        try {
            const response = await api.get('/nutrition/goals');
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get nutrition goals');
        }
    },

    // Update nutrition goals
    updateNutritionGoals: async(goals) => {
        try {
            const response = await api.put('/nutrition/goals', goals);
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to update nutrition goals');
        }
    },

    // Get ingredient count for a specific date by querying all sessions for that day
    getIngredientCountByDate: async(date) => {
        try {
            console.log(`🌐 API call: /nutrition/ingredients-count/${date}`);
            const response = await api.get(`/nutrition/ingredients-count/${date}`);
            console.log(`📨 API response for ${date}:`, response.data);
            return response.data;
        } catch (error) {
            // If endpoint doesn't exist or fails, return fallback
            console.error(`❌ API error for ${date}:`, error.response?.data || error.message);
            console.warn('Ingredient count endpoint not available:', error.message);
            return { count: 1 };
        }
    }
};

export default nutritionService;