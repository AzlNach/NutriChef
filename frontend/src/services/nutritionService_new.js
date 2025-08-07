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
    }
};

export default nutritionService;