import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/components.css';
import { HomePage, NutritionHistoryPage } from './pages';
import { ModernAuth } from './components/auth';
import { EnhancedImageUpload } from './components/food';
import FoodAnalysisResult from './components/food/FoodAnalysisResult';
import ErrorNotification from './components/ui/ErrorNotification';
import { AuthProvider, useAuth } from './context/AuthContext';
import { foodService } from './services/foodService';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { dashboardService } from './services/dashboardService';
import { nutritionService } from './services/nutritionService';


// Main App Component Content
function AppContent() {
    const { verifyToken } = useAuth();
    const [currentView, setCurrentView] = useState('home');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');
    const [uploadedImage, setUploadedImage] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [nutritionData, setNutritionData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthPage, setShowAuthPage] = useState(false);
    const [errorType, setErrorType] = useState('error');
    const [ingredientCounts, setIngredientCounts] = useState({}); // Store ingredient counts by date
    const [showError, setShowError] = useState(false);

    useEffect(() => {
        // Check if user is authenticated on app load
        const token = localStorage.getItem('token');
        const currentUser = localStorage.getItem('user');
        
        console.log('🔐 Authentication check on app load:');
        console.log('  Token exists:', !!token);
        console.log('  User data exists:', !!currentUser);
        
        // Check if user was redirected due to session expiry
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('session_expired')) {
            showErrorMessage('Your session has expired. Please log in again.', 'warning');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (token && currentUser) {
            try {
                const parsedUser = JSON.parse(currentUser);
                console.log('✅ Restoring authentication for user:', parsedUser.username || parsedUser.email);
                
                setIsAuthenticated(true);
                setUser(parsedUser);
                
                // Only redirect to dashboard if not coming from a session expiry
                if (!urlParams.get('session_expired')) {
                    setCurrentView('dashboard');
                    
                    // Preload dashboard data after authentication check
                    setTimeout(() => {
                        loadDashboardData().catch(error => {
                            console.warn('Failed to preload dashboard data:', error);
                            // Don't logout on dashboard load failure, just show warning
                        });
                    }, 100); // Small delay to ensure state is set
                }
            } catch (error) {
                console.error('❌ Failed to parse user data, clearing auth:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            console.log('❌ No valid authentication found');
        }

        // Temporary localStorage clear for debugging
        if (window.location.search.includes('clearStorage')) {
            localStorage.clear();
            window.location.href = '/';
        }
    }, []);

    const loadDashboardData = async() => {
        try {
            // Verify token before making API calls
            const isTokenValid = await verifyToken();
            if (!isTokenValid) {
                console.warn('⚠️ Token verification failed, redirecting to login');
                handleLogout();
                return;
            }
            
            setIsLoading(true);
            const overview = await dashboardService.getOverview();
            const stats = await dashboardService.getStats();
            setDashboardData({ overview, stats });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            
            // If it's a 401 error, token is expired
            if (error.response?.status === 401) {
                console.warn('🔐 Dashboard API returned 401, token expired');
                handleLogout();
            } else {
                showErrorMessage('Failed to load dashboard data: ' + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadNutritionData = async() => {
        try {
            setIsLoading(true);
            const history = await nutritionService.getNutritionHistory(30);
            const dailySummary = await nutritionService.getDailySummary();
            
            let dashboardOverview = dashboardData?.overview;
            if (!dashboardOverview) {
                try {
                    dashboardOverview = await dashboardService.getOverview();
                } catch (error) {
                    console.warn('Could not load dashboard overview for recent analyses:', error);
                }
            }
            
            const historyData = {
                recent_analyses: dashboardOverview?.recent_analyses || 
                               dailySummary?.food_analyses || 
                               history.food_analyses || 
                               [],
                nutrition_history: history.nutrition_history || [],
                summary: history.summary || {},
                user_goals: history.user_goals || {}
            };
            
            setNutritionData({ history: historyData, dailySummary });
            
            // Load ingredient counts for the SAME data that's rendered in UI
            const dataToRender = historyData.recent_analyses || 
                               historyData.nutrition_history || 
                               (Array.isArray(historyData) ? historyData : []);
            
            await loadIngredientCounts(dataToRender);
            
        } catch (error) {
            console.error('Failed to load nutrition data:', error);
            showErrorMessage('Failed to load nutrition data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadIngredientCounts = async(nutritionHistory) => {
        try {
            const counts = {};
            
            // Load real ingredient counts from session data
            for (const entry of nutritionHistory) {
                if (entry.session_id) {
                    try {
                        // Use the existing foodService to get session data
                        const sessionData = await foodService.getAnalysisResult(entry.session_id);
                        
                        if (sessionData && sessionData.analysis_result && sessionData.analysis_result.detected_foods) {
                            const count = sessionData.analysis_result.detected_foods.length;
                            counts[entry.session_id] = count;
                        } else {
                            counts[entry.session_id] = 1;
                        }
                    } catch (error) {
                        console.warn(`Failed to load ingredient count for session ${entry.session_id}:`, error);
                        counts[entry.session_id] = 1; // Fallback
                    }
                }
            }
            
            setIngredientCounts(counts);
            
        } catch (error) {
            console.error('Failed to load ingredient counts:', error);
            // Set fallback counts for all entries
            const fallbackCounts = {};
            nutritionHistory.forEach(entry => {
                if (entry.session_id) {
                    fallbackCounts[entry.session_id] = 1;
                }
            });
            setIngredientCounts(fallbackCounts);
        }
    };

    const loadUserData = async() => {
        try {
            setIsLoading(true);
            const profileResponse = await userService.getProfile();
            
            const userData = profileResponse.user || profileResponse;
            const userStats = profileResponse.stats || {};
            const userPreferences = profileResponse.preferences || {};
            
            setUserData({
                id: userData.id,
                username: userData.username,
                email: userData.email,
                full_name: userData.full_name,
                created_at: userData.created_at,
                updated_at: userData.updated_at,
                date_of_birth: userData.date_of_birth,
                gender: userData.gender,
                height: userData.height,
                weight: userData.weight,
                activity_level: userData.activity_level,
                daily_calorie_goal: userData.daily_calorie_goal,
                stats: userStats,
                preferences: userPreferences
            });
        } catch (error) {
            console.error('Failed to load user data:', error);
            showErrorMessage('Failed to load user data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginRequired = () => {
        setShowAuthPage(true);
        showErrorMessage('Please login to access this feature', 'auth');
    };

    const navigateToView = (view) => {
        const protectedRoutes = ['dashboard', 'analyze', 'result', 'history', 'profile'];
        
        if (protectedRoutes.includes(view) && !isAuthenticated) {
            handleLoginRequired();
            return;
        }
        
        setCurrentView(view);
        setError('');
        setShowError(false);
        
        // Load data specific to the view
        if (view === 'dashboard') {
            loadDashboardData();
        } else if (view === 'analyze') {
            // Preload dashboard data for analyze view to ensure stats are available
            if (!dashboardData) {
                loadDashboardData();
            }
        } else if (view === 'history') {
            loadNutritionData();
        }
    };

    const showErrorMessage = (message, type = 'error') => {
        setError(message);
        setErrorType(type);
        setShowError(true);
        
        setTimeout(() => {
            setShowError(false);
        }, 5000);
    };

    const handleImageUpload = async(file, stayInCurrentView = false) => {
        if (!isAuthenticated) {
            handleLoginRequired();
            return;
        }
        
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage(imageUrl);
            // Only redirect to analyze if not staying in current view (for dashboard)
            if (!stayInCurrentView) {
                setCurrentView('analyze');
            }
        }
    };

    const handleAnalyzeFood = async(formData) => {
        if (!isAuthenticated) {
            handleLoginRequired();
            return;
        }
        
        setIsAnalyzing(true);
        setError('');

        try {
            console.log('🔍 Starting AI Analysis...');
            const result = await foodService.analyzeFood(formData);
            console.log('✅ Analysis completed:', result);
            
            let analysisData = null;
            
            if (result.analysis_result) {
                analysisData = result.analysis_result;
            } else if (result.detected_foods) {
                analysisData = result;
            } else {
                analysisData = {
                    detected_foods: result.foods || [],
                    total_nutrition: result.nutrition || {},
                    confidence_overall: result.confidence || 0,
                    session_id: result.session_id
                };
            }
            
            const completeAnalysisResult = {
                session_id: analysisData.session_id || result.session_id,
                detected_foods: analysisData.detected_foods || [],
                total_nutrition: analysisData.total_nutrition || {},
                confidence_overall: analysisData.confidence_overall || analysisData.confidence || 0,
                status: 'completed',
                ...analysisData
            };
            
            setAnalysisResult(completeAnalysisResult);
            navigateToView('result');
        } catch (error) {
            showErrorMessage('Analysis failed: ' + error.message);
            console.error('❌ Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEditFood = async(foodId, updateData) => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.updateDetectedFood(sessionId, foodId, updateData);
                const updatedResult = await foodService.getAnalysisResult(sessionId);
                setAnalysisResult(updatedResult);
            }
        } catch (error) {
            showErrorMessage('Failed to update food: ' + error.message);
        }
    };

    const handleRemoveFood = async(foodId) => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.removeDetectedFood(sessionId, foodId);
                const updatedResult = await foodService.getAnalysisResult(sessionId);
                setAnalysisResult(updatedResult);
            }
        } catch (error) {
            showErrorMessage('Failed to remove food: ' + error.message);
        }
    };

    const handleConfirmAnalysis = async() => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.confirmAnalysis(sessionId);
                showErrorMessage('Analysis saved to your diary!', 'info');
                setCurrentView('dashboard');
                setAnalysisResult(null);
                setUploadedImage(null);
                
                // Refresh dashboard data to show updated stats
                loadDashboardData();
            }
        } catch (error) {
            showErrorMessage('Failed to save analysis: ' + error.message);
        }
    };

    const handleNewAnalysis = () => {
        setCurrentView('dashboard');
        setAnalysisResult(null);
        setUploadedImage(null);
        setError('');
        
        // Refresh dashboard data to show updated stats
        loadDashboardData();
    };

    const handleLogin = async (emailOrToken, passwordOrUserData) => {
        try {
            let token, userData;
            
            if (typeof passwordOrUserData === 'string') {
                // Login with email and password
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: emailOrToken,
                        password: passwordOrUserData
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                token = data.access_token;
                userData = data.user;
            } else {
                // Auto-login with token (for registration auto-login)
                token = emailOrToken;
                userData = passwordOrUserData; // In this case, second parameter contains user data object
            }

            // Store auth data
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setIsAuthenticated(true);
            setUser(userData);
            setShowAuthPage(false);
            setCurrentView('dashboard'); // Redirect to dashboard after login
            
            // Preload dashboard data after successful login
            try {
                await loadDashboardData();
            } catch (error) {
                console.warn('Failed to preload dashboard data:', error);
            }
            
            showErrorMessage(`Welcome back, ${userData.username || userData.full_name}!`, 'info');
        } catch (error) {
            console.error('Login error:', error);
            showErrorMessage(error.message || 'Login failed');
            throw error;
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView('home'); // Redirect to home after logout
        setAnalysisResult(null);
        setUploadedImage(null);
        setDashboardData(null);
        setNutritionData(null);
        setUserData(null);
        showErrorMessage('Logged out successfully', 'info');
    };

    const renderHeader = () => {
        if (currentView === 'home') return null; // HomePage has its own nav

        return (
            <header className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
                <nav className="bg-white bg-opacity-90 backdrop-blur-md border border-gray-200 border-opacity-20 rounded-full px-6 py-3 shadow-xl">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <div className="flex items-center">
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="3" fill="white" />
                                </svg>
                                <span className="text-lg font-bold">NutriChef</span>
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center space-x-6">
                            <button
                                onClick={() => navigateToView('dashboard')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'dashboard' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => navigateToView('analyze')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'analyze' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Analyze
                            </button>
                            <button
                                onClick={() => navigateToView('history')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'history' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                History
                            </button>
                        </nav>

                        {/* Mobile Menu - Only show if authenticated */}
                        {isAuthenticated && (
                            <div className="md:hidden flex items-center space-x-2">
                                <div className="flex items-center space-x-1 text-xs">
                                    <button
                                        onClick={() => navigateToView('dashboard')}
                                        className={`p-2 rounded-full ${
                                            currentView === 'dashboard' 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'text-gray-600'
                                        }`}
                                        title="Dashboard"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => navigateToView('analyze')}
                                        className={`p-2 rounded-full ${
                                            currentView === 'analyze' 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'text-gray-600'
                                        }`}
                                        title="Analyze"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => navigateToView('history')}
                                        className={`p-2 rounded-full ${
                                            currentView === 'history' 
                                                ? 'bg-emerald-100 text-emerald-600' 
                                                : 'text-gray-600'
                                        }`}
                                        title="History"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* User Menu */}
                        <div className="flex items-center space-x-3">
                            {isAuthenticated ? (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700 font-medium hidden sm:block">
                                        {user?.full_name || user?.username}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAuthPage(true)}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
                                >
                                    Login
                                </button>
                            )}
                        </div>
                    </div>
                </nav>
            </header>
        );
    };

    const renderMainContent = () => {
        switch (currentView) {
            case 'home':
                return (
                    <HomePage
                        onImageUpload={handleImageUpload}
                        onAnalyze={handleAnalyzeFood}
                        isAnalyzing={isAnalyzing}
                        analysisResult={analysisResult}
                        onLoginRequired={handleLoginRequired}
                        isAuthenticated={isAuthenticated}
                    />
                );

            case 'analyze':
                return (
                    <section id="analyze-section" className="py-20 pt-24">
{/* Dashboard View with Food Analysis Data */}
                            {dashboardData && (
                                <div className="dashboard-view">
                                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                                        <div className="dashboard-header flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900">Your Nutrition Dashboard</h2>
                                            <button 
                                                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                                onClick={() => {
                                                    setDashboardData(null);
                                                    loadDashboardData();
                                                }}
                                                disabled={isLoading}
                                            >
                                                🔄 Refresh
                                            </button>
                                        </div>

                                        {isLoading ? (
                                            <div className="flex justify-center items-center py-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                                <p className="ml-3 text-gray-600">Loading dashboard...</p>
                                            </div>
                                        ) : (
                                            <div className="dashboard-content">
                                                {/* Today's Overview */}
                                                <div className="mb-8">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Overview</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="bg-red-50 rounded-xl p-4 text-center">
                                                            <div className="text-2xl mb-2">🔥</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {dashboardData.overview?.today_nutrition?.calories || 0}
                                                            </div>
                                                            <div className="text-sm text-gray-600">Calories</div>
                                                            <div className="text-xs text-gray-500">
                                                                Goal: {dashboardData.overview?.today_nutrition?.goal || 2000}
                                                            </div>
                                                        </div>

                                                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                                                            <div className="text-2xl mb-2">🥩</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {Math.round(dashboardData.overview?.today_nutrition?.protein || 0)}g
                                                            </div>
                                                            <div className="text-sm text-gray-600">Protein</div>
                                                        </div>

                                                        <div className="bg-yellow-50 rounded-xl p-4 text-center">
                                                            <div className="text-2xl mb-2">🍞</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {Math.round(dashboardData.overview?.today_nutrition?.carbs || 0)}g
                                                            </div>
                                                            <div className="text-sm text-gray-600">Carbs</div>
                                                        </div>

                                                        <div className="bg-green-50 rounded-xl p-4 text-center">
                                                            <div className="text-2xl mb-2">🥑</div>
                                                            <div className="text-2xl font-bold text-gray-900">
                                                                {Math.round(dashboardData.overview?.today_nutrition?.fat || 0)}g
                                                            </div>
                                                            <div className="text-sm text-gray-600">Fat</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Today's Summary */}
                                                <div className="mb-8">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
                                                    {dashboardData.overview?.today_nutrition ? (
                                                        <div className="bg-gray-50 rounded-xl p-6">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="text-center">
                                                                    <span className="block text-sm text-gray-600">Calories:</span>
                                                                    <span className="block text-xl font-bold text-gray-900">
                                                                        {Math.round(dashboardData.overview.today_nutrition.calories || 0)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="block text-sm text-gray-600">Protein:</span>
                                                                    <span className="block text-xl font-bold text-gray-900">
                                                                        {Math.round(dashboardData.overview.today_nutrition.protein || 0)}g
                                                                    </span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="block text-sm text-gray-600">Carbs:</span>
                                                                    <span className="block text-xl font-bold text-gray-900">
                                                                        {Math.round(dashboardData.overview.today_nutrition.carbs || 0)}g
                                                                    </span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="block text-sm text-gray-600">Fat:</span>
                                                                    <span className="block text-xl font-bold text-gray-900">
                                                                        {Math.round(dashboardData.overview.today_nutrition.fat || 0)}g
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                                                            <div className="text-4xl mb-2">🍽️</div>
                                                            <p className="text-gray-600">No nutrition data for today</p>
                                                            <p className="text-sm text-gray-500">Start analyzing food to see your daily summary!</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Weekly Stats */}
                                                <div className="mb-8">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-white border rounded-xl p-4 text-center">
                                                            <div className="text-sm text-gray-600">Weekly Average</div>
                                                            <div className="text-xl font-bold text-gray-900">
                                                                {Math.round(dashboardData.overview?.week_average?.calories || 0)} cal/day
                                                            </div>
                                                        </div>
                                                        <div className="bg-white border rounded-xl p-4 text-center">
                                                            <div className="text-sm text-gray-600">Activity Level</div>
                                                            <div className="text-xl font-bold text-gray-900 capitalize">
                                                                {dashboardData.overview?.activity_level || 'moderate'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                    </section>
                );

            case 'result':
                return (
                    <div className="min-h-screen bg-white pt-24 pb-12">
                        <div className="max-w-6xl mx-auto px-6">
                            <FoodAnalysisResult
                                analysisResult={analysisResult}
                                onEditFood={handleEditFood}
                                onRemoveFood={handleRemoveFood}
                                onConfirm={handleConfirmAnalysis}
                                onNewAnalysis={handleNewAnalysis}
                            />
                            <div className="text-center mt-8">
                                <p className="text-gray-600 text-sm">
                                    Review your analysis above and confirm to save it to your nutrition diary
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <div className="min-h-screen bg-white pt-24">
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
                            {/* History View with Food Analysis Data */}
                            {isAuthenticated && (
                                <div className="history-view">
                                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                                        <div className="history-header flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900">Nutrition History</h2>
                                            <button 
                                                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                                onClick={() => {
                                                    setNutritionData(null);
                                                    loadNutritionData();
                                                }}
                                                disabled={isLoading}
                                            >
                                                🔄 Refresh
                                            </button>
                                        </div>

                                        {isLoading ? (
                                            <div className="flex justify-center items-center py-12">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                                <p className="ml-3 text-gray-600">Loading history...</p>
                                            </div>
                                        ) : nutritionData ? (
                                            <div className="history-content">
                                                {/* Recent Food Analyses */}
                                                <div className="mb-8">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Food Analyses</h3>
                                                    {(
                                                        nutritionData.history?.recent_analyses?.length > 0 || 
                                                        nutritionData.history?.nutrition_history?.length > 0 ||
                                                        (Array.isArray(nutritionData.history) && nutritionData.history.length > 0)
                                                    ) ? (
                                                        <div className="bg-white border rounded-xl overflow-hidden">
                                                            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-700">
                                                                <div>Food Name</div>
                                                                <div>Ingredients</div>
                                                                <div>Total Calories</div>
                                                                <div>Actions</div>
                                                            </div>
                                                            {(
                                                                nutritionData.history?.recent_analyses || 
                                                                nutritionData.history?.nutrition_history || 
                                                                (Array.isArray(nutritionData.history) ? nutritionData.history : [])
                                                            ).map((analysis, index) => (
                                                                <div key={analysis.id || index} className="grid grid-cols-4 gap-4 p-4 border-t border-gray-100">
                                                                    <div className="font-medium text-gray-900">
                                                                        {analysis.detected_foods?.map(food => food.name).join(', ') || 
                                                                         analysis.food_names?.join(', ') ||
                                                                         analysis.food_name || 
                                                                         'Unknown Food'}
                                                                    </div>
                                                                    <div className="text-gray-600">
                                                                        {(() => {
                                                                            // Use session_id as key to get per-session ingredient count
                                                                            const sessionKey = analysis.session_id;
                                                                            const count = ingredientCounts[sessionKey];
                                                                            
                                                                            if (count !== undefined && count !== null) {
                                                                                return count === 0 ? "No ingredients" : 
                                                                                       count === 1 ? "1 ingredient" : 
                                                                                       `${count} ingredients`;
                                                                            }
                                                                            
                                                                            // Loading state while fetching session data
                                                                            if (sessionKey && Object.keys(ingredientCounts).length === 0) {
                                                                                return "Loading...";
                                                                            }
                                                                            
                                                                            // Fallback
                                                                            return "1 ingredient";
                                                                        })()}
                                                                    </div>
                                                                    <div className="text-gray-900">
                                                                        {Math.round(
                                                                            analysis.total_nutrition?.calories ||
                                                                            analysis.total_estimated_calories || 
                                                                            analysis.total_calories || 
                                                                            analysis.calories || 0
                                                                        )} cal
                                                                    </div>
                                                                    <div>
                                                                        <button 
                                                                            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                                                                            onClick={async () => {
                                                                                try {
                                                                                    // Fetch complete analysis result from backend
                                                                                    const sessionId = analysis.session_id || analysis.id;
                                                                                    if (sessionId) {
                                                                                        const data = await foodService.getAnalysisResult(sessionId);
                                                                                        if (data && data.analysis_result) {
                                                                                            // Use the complete analysis result from backend
                                                                                            const completeAnalysisResult = {
                                                                                                session_id: data.analysis_result.session_id,
                                                                                                status: data.analysis_result.status,
                                                                                                main_food: data.analysis_result.main_food,
                                                                                                detected_foods: data.analysis_result.detected_foods,
                                                                                                total_nutrition: data.analysis_result.total_nutrition,
                                                                                                confidence_overall: data.analysis_result.confidence_overall,
                                                                                                additional_notes: data.analysis_result.notes || `Analysis from ${new Date(data.analysis_result.created_at || Date.now()).toLocaleDateString()}`,
                                                                                                image_filename: data.analysis_result.image_filename
                                                                                            };
                                                                                            
                                                                                            console.log('Complete Analysis Result from Backend:', completeAnalysisResult);
                                                                                            setAnalysisResult(completeAnalysisResult);
                                                                                            setCurrentView('result');
                                                                                            return;
                                                                                        }
                                                                                    }
                                                                                    
                                                                                    // Fallback to constructed data if API call fails
                                                                                    const analysisResult = {
                                                                                        session_id: analysis.session_id || analysis.id,
                                                                                        status: 'completed',
                                                                                        main_food: {
                                                                                            name: analysis.main_food?.name || analysis.food_name || 'Unknown Dish',
                                                                                            description: analysis.main_food?.description || analysis.description || 'No description available',
                                                                                            confidence: analysis.confidence_overall || analysis.confidence || 0.8
                                                                                        },
                                                                                        detected_foods: analysis.detected_foods?.length > 0 
                                                                                            ? analysis.detected_foods.map(food => ({
                                                                                                id: food.id,
                                                                                                name: food.name || food.ingredient_name || 'Unknown Ingredient',
                                                                                                category: food.category || food.ingredient_category || 'General',
                                                                                                estimated_portion: food.portion || food.estimated_portion || 100,
                                                                                                portion_unit: food.unit || food.portion_unit || 'grams',
                                                                                                confidence: food.confidence || food.confidence_score || 0.8,
                                                                                                nutrition: food.nutrition || {
                                                                                                    calories: food.calories || 0,
                                                                                                    protein: food.protein || 0,
                                                                                                    carbs: food.carbs || 0,
                                                                                                    fat: food.fat || 0,
                                                                                                    fiber: food.fiber || 0,
                                                                                                    sugar: food.sugar || 0,
                                                                                                    sodium: food.sodium || 0
                                                                                                }
                                                                                            }))
                                                                                            : [
                                                                                                {
                                                                                                    id: 1,
                                                                                                    name: analysis.main_food?.name || analysis.food_name || 'Main Ingredient',
                                                                                                    category: 'Main Food',
                                                                                                    estimated_portion: 100,
                                                                                                    portion_unit: 'grams',
                                                                                                    confidence: analysis.confidence_overall || analysis.confidence || 0.8,
                                                                                                    nutrition: {
                                                                                                        calories: analysis.total_calories || analysis.calories || 0,
                                                                                                        protein: analysis.total_protein || analysis.protein || 0,
                                                                                                        carbs: analysis.total_carbs || analysis.carbs || 0,
                                                                                                        fat: analysis.total_fat || analysis.fat || 0,
                                                                                                        fiber: analysis.total_fiber || analysis.fiber || 0,
                                                                                                        sugar: analysis.total_sugar || analysis.sugar || 0,
                                                                                                        sodium: analysis.total_sodium || analysis.sodium || 0
                                                                                                    }
                                                                                                }
                                                                                            ],
                                                                                        total_nutrition: analysis.total_nutrition || {
                                                                                            calories: analysis.total_calories || analysis.calories || 0,
                                                                                            protein: analysis.total_protein || analysis.protein || 0,
                                                                                            carbs: analysis.total_carbs || analysis.carbs || 0,
                                                                                            fat: analysis.total_fat || analysis.fat || 0,
                                                                                            fiber: analysis.total_fiber || analysis.fiber || 0,
                                                                                            sugar: analysis.total_sugar || analysis.sugar || 0,
                                                                                            sodium: analysis.total_sodium || analysis.sodium || 0
                                                                                        },
                                                                                        confidence_overall: analysis.confidence_overall || analysis.confidence || 0.8,
                                                                                        additional_notes: analysis.notes || `Analysis from ${new Date(analysis.created_at || Date.now()).toLocaleDateString()}`,
                                                                                        image_filename: analysis.image_filename
                                                                                    };
                                                                                    
                                                                                    console.log('Fallback Analysis Result:', analysisResult);
                                                                                    setAnalysisResult(analysisResult);
                                                                                    setCurrentView('result');
                                                                                } catch (error) {
                                                                                    console.error('Error fetching complete analysis:', error);
                                                                                    showErrorMessage('Failed to load analysis details');
                                                                                }
                                                                            }}
                                                                        >
                                                                            View Analysis
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                                                            <div className="text-4xl mb-2">📷</div>
                                                            <p className="text-gray-600">No food analyses yet</p>
                                                            <p className="text-sm text-gray-500">Start analyzing food to see your analysis history!</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Nutrition History */}
                                                <div className="mb-8">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Nutrition History (Last 30 Days)</h3>
                                                    {nutritionData.history?.nutrition_history?.length > 0 ? (
                                                        <div className="space-y-4">
                                                            {nutritionData.history.nutrition_history.map((entry, index) => (
                                                                <div key={index} className="bg-white border rounded-xl p-6">
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="text-lg font-semibold text-gray-900">
                                                                            {new Date(entry.date).toLocaleDateString()}
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                        <div className="text-center">
                                                                            <span className="block text-sm text-gray-600">Calories:</span>
                                                                            <span className="block text-xl font-bold text-gray-900">
                                                                                {Math.round(entry.total_calories || 0)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="block text-sm text-gray-600">Protein:</span>
                                                                            <span className="block text-xl font-bold text-gray-900">
                                                                                {Math.round(entry.total_protein || 0)}g
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="block text-sm text-gray-600">Carbs:</span>
                                                                            <span className="block text-xl font-bold text-gray-900">
                                                                                {Math.round(entry.total_carbs || 0)}g
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <span className="block text-sm text-gray-600">Fat:</span>
                                                                            <span className="block text-xl font-bold text-gray-900">
                                                                                {Math.round(entry.total_fat || 0)}g
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                                                            <div className="text-4xl mb-2">📋</div>
                                                            <p className="text-gray-600">No nutrition history available</p>
                                                            <p className="text-sm text-gray-500">Start analyzing food to build your nutrition history!</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Summary Stats */}
                                                {nutritionData.history?.summary && (
                                                    <div className="mb-8">
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="bg-white border rounded-xl p-4 text-center">
                                                                <span className="block text-sm text-gray-600">Total Days:</span>
                                                                <span className="block text-xl font-bold text-gray-900">
                                                                    {nutritionData.history.summary.total_days}
                                                                </span>
                                                            </div>
                                                            <div className="bg-white border rounded-xl p-4 text-center">
                                                                <span className="block text-sm text-gray-600">Average Calories:</span>
                                                                <span className="block text-xl font-bold text-gray-900">
                                                                    {Math.round(nutritionData.history.summary.avg_calories || 0)} cal/day
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                                                <div className="text-4xl mb-2">📊</div>
                                                <p className="text-gray-600">No nutrition data available</p>
                                                <p className="text-sm text-gray-500">Start analyzing food to see your nutrition history.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'dashboard':
                return (
                    <div className="min-h-screen bg-gray-50 pt-24">
 


                        {/* Dashboard Content */}
                        <div className="max-w-7xl mx-auto px-6 py-8">
                            {/* Upload/Analysis Section */}
                            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                                <div className="text-center mb-8">
                                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                                        Quick Food Analysis
                                    </h1>
                                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                                        Upload a photo of your meal for instant nutritional analysis. 
                                        Click "Analyze with AI" to get detailed nutrition information.
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-3xl p-8">
                                    <EnhancedImageUpload
                                        onImageUpload={(file) => handleImageUpload(file, true)}
                                        onAnalyze={handleAnalyzeFood}
                                        isAnalyzing={isAnalyzing}
                                        analysisResult={analysisResult}
                                        onLoginRequired={handleLoginRequired}
                                    />
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Total Analysis</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {dashboardData?.stats?.total_analyses || '0'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Total Calories</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {dashboardData?.stats?.total_calories ? 
                                                    Math.round(dashboardData.stats.total_calories) : '0'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Last Analysis</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {dashboardData?.stats?.last_analysis_time || 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <HomePage
                        onLoginRequired={handleLoginRequired}
                        isAuthenticated={isAuthenticated}
                    />
                );
        }
    };

    return (
        <div className="App bg-white min-h-screen">
            {renderHeader()}
            {renderMainContent()}

            {/* Auth Modal */}
            {showAuthPage && (
                <ModernAuth
                    onLogin={handleLogin}
                    onClose={() => setShowAuthPage(false)}
                    setError={showErrorMessage}
                />
            )}

            {/* Error Notification */}
            <ErrorNotification
                message={error}
                type={errorType}
                onClose={() => setShowError(false)}
                isVisible={showError}
            />
        </div>
    );
}

// Main App wrapper
function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
