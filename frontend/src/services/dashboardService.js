import api from './api';

// Dashboard service
export const dashboardService = {
    // Get dashboard overview
    getOverview: async() => {
        try {
            const response = await api.get('/dashboard/overview');
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get dashboard overview');
        }
    },

    // Get dashboard stats
    getStats: async() => {
        try {
            const response = await api.get('/dashboard/stats');
            return response.data;
        } catch (error) {
            throw new Error((error.response && error.response.data && error.response.data.error) || 'Failed to get dashboard stats');
        }
    }
};

export default dashboardService;