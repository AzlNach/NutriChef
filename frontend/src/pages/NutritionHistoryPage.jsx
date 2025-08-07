import React, { useState, useEffect } from 'react';
import { nutritionService } from '../services/nutritionService';

const NutritionHistoryPage = ({ isAuthenticated, onLoginRequired }) => {
  const [nutritionHistory, setNutritionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDateRange, setSelectedDateRange] = useState('7');
  const itemsPerPage = 5; // 5 items per page as requested

  useEffect(() => {
    if (isAuthenticated) {
      loadNutritionHistory();
    }
  }, [isAuthenticated, selectedDateRange]);

  const loadNutritionHistory = async () => {
    try {
      setLoading(true);
      const data = await nutritionService.getNutritionHistory(parseInt(selectedDateRange));
      setNutritionHistory(data.history || []);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(nutritionHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = nutritionHistory.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please login to view your nutrition history</p>
          <button
            onClick={onLoginRequired}
            className="btn-custom px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
            style={{
              color: '#090909',
              background: '#e8e8e8',
              border: '1px solid #e8e8e8',
              boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff'
            }}
          >
            Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Nutrition History
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track your nutrition journey and analyze your eating patterns over time
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Showing {currentItems.length} of {nutritionHistory.length} entries
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="typing-indicator">
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              <div className="typing-circle"></div>
              <div className="typing-shadow"></div>
              <div className="typing-shadow"></div>
              <div className="typing-shadow"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading History</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadNutritionHistory}
              className="btn-custom px-4 py-2 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              style={{
                color: '#090909',
                background: '#e8e8e8',
                border: '1px solid #e8e8e8',
                boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff'
              }}
            >
              Try Again
            </button>
          </div>
        ) : nutritionHistory.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No History Found</h3>
            <p className="text-gray-600 mb-6">
              Start analyzing your food to build your nutrition history
            </p>
            <button className="btn-custom px-6 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              style={{
                color: '#090909',
                background: '#e8e8e8',
                border: '1px solid #e8e8e8',
                boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff'
              }}
            >
              Analyze Your First Meal
            </button>
          </div>
        ) : (
          <>
            {/* Recent Food Analyses */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Food Analyses</h2>
              <div className="space-y-4">
                {currentItems.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Food Image */}
                      <div className="lg:w-48 flex-shrink-0">
                        {entry.image_url ? (
                          <img
                            src={entry.image_url}
                            alt="Food analysis"
                            className="w-full h-40 lg:h-32 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-full h-40 lg:h-32 bg-gray-100 rounded-xl flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {entry.main_food?.name || 'Food Analysis'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(entry.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="mt-2 sm:mt-0">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              {entry.meal_type || 'Meal'}
                            </span>
                          </div>
                        </div>

                        {/* Food Description */}
                        {entry.main_food?.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {entry.main_food.description}
                          </p>
                        )}

                        {/* Nutrition Summary */}
                        {entry.total_nutrition && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                              <div className="text-lg font-bold text-gray-900">
                                {Math.round(entry.total_nutrition.calories || 0)}
                              </div>
                              <div className="text-xs text-gray-500">Calories</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                              <div className="text-lg font-bold text-gray-900">
                                {Math.round(entry.total_nutrition.protein || 0)}g
                              </div>
                              <div className="text-xs text-gray-500">Protein</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                              <div className="text-lg font-bold text-gray-900">
                                {Math.round(entry.total_nutrition.carbohydrates || 0)}g
                              </div>
                              <div className="text-xs text-gray-500">Carbs</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-xl">
                              <div className="text-lg font-bold text-gray-900">
                                {Math.round(entry.total_nutrition.fat || 0)}g
                              </div>
                              <div className="text-xs text-gray-500">Fat</div>
                            </div>
                          </div>
                        )}

                        {/* Detected Foods Count */}
                        {entry.detected_foods && entry.detected_foods.length > 0 && (
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            {entry.detected_foods.length} food item{entry.detected_foods.length !== 1 ? 's' : ''} detected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NutritionHistoryPage;
