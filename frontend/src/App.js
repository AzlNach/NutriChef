import React, { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/food/ImageUpload';
import EnhancedImageUpload from './components/food/EnhancedImageUpload';
import FoodAnalysisResult from './components/food/FoodAnalysisResult';
import AuthGuard from './components/auth/AuthGuard';
import ErrorNotification from './components/ui/ErrorNotification';
import { foodService } from './services/foodService';
import { authService } from './services/authService';
import { userService } from './services/userService';
import { dashboardService } from './services/dashboardService';
import { nutritionService } from './services/nutritionService';

function App() {
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
    const [showAuthRequired, setShowAuthRequired] = useState(false);
    const [errorType, setErrorType] = useState('error');
    const [showError, setShowError] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedUserData, setEditedUserData] = useState({});

    useEffect(() => {
        // Check if user is authenticated on app load
        const authenticated = authService.isAuthenticated();
        const currentUser = authService.getCurrentUser();
        setIsAuthenticated(authenticated);
        setUser(currentUser);
    }, []);

    const loadDashboardData = async() => {
        try {
            setIsLoading(true);
            const overview = await dashboardService.getOverview();
            const stats = await dashboardService.getStats();
            console.log('Dashboard Overview:', overview);
            console.log('Dashboard Stats:', stats);
            setDashboardData({ overview, stats });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError('Failed to load dashboard data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadNutritionData = async() => {
        try {
            setIsLoading(true);
            const history = await nutritionService.getNutritionHistory(30);
            const dailySummary = await nutritionService.getDailySummary();
            
            // Also get dashboard data for recent analyses if not already loaded
            let dashboardOverview = dashboardData?.overview;
            if (!dashboardOverview) {
                try {
                    dashboardOverview = await dashboardService.getOverview();
                } catch (error) {
                    console.warn('Could not load dashboard overview for recent analyses:', error);
                }
            }
            
            console.log('Nutrition History Response:', history);
            console.log('Daily Summary Response:', dailySummary);
            console.log('Dashboard Overview for Recent Analyses:', dashboardOverview);
            
            // FIX: Structure nutrition data properly for Recent Food Analyses
            const historyData = {
                // Get recent_analyses from dashboard overview data, fallback to daily summary food_analyses
                recent_analyses: dashboardOverview?.recent_analyses || 
                               dailySummary?.food_analyses || 
                               history.food_analyses || 
                               [],
                nutrition_history: history.nutrition_history || [],
                summary: history.summary || {},
                user_goals: history.user_goals || {}
            };
            
            setNutritionData({ history: historyData, dailySummary });
        } catch (error) {
            console.error('Failed to load nutrition data:', error);
            setError('Failed to load nutrition data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserData = async() => {
        try {
            setIsLoading(true);
            // Get user profile data
            const profileResponse = await userService.getProfile();
            console.log('Profile Response:', profileResponse);
            
            // FIX: Properly extract user data from response
            const userData = profileResponse.user || profileResponse;
            const userStats = profileResponse.stats || {};
            const userPreferences = profileResponse.preferences || {};
            
            // Structure the data properly for frontend
            setUserData({
                // User basic info - ensure all fields are accessible
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
                // Additional data
                stats: userStats,
                preferences: userPreferences
            });
        } catch (error) {
            console.error('Failed to load user data:', error);
            setError('Failed to load user data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && currentView === 'dashboard' && !dashboardData) {
            loadDashboardData();
        }
        if (isAuthenticated && currentView === 'history' && !nutritionData) {
            loadNutritionData();
        }
        if (isAuthenticated && currentView === 'profile' && !userData) {
            loadUserData();
        }
    }, [currentView, isAuthenticated, dashboardData, nutritionData, userData]);

    // Authentication flow handlers
    const handleLoginRequired = () => {
        setShowAuthRequired(true);
        setCurrentView('login');
        setError('Please login to access this feature');
        setErrorType('auth');
        setShowError(true);
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            setShowError(false);
        }, 5000);
    };

    const enforceAuthentication = (targetView) => {
        if (!isAuthenticated) {
            handleLoginRequired();
            return false;
        }
        return true;
    };

    const navigateToView = (view) => {
        // Protected routes that require authentication
        const protectedRoutes = ['dashboard', 'analyze', 'result', 'history', 'profile'];
        
        if (protectedRoutes.includes(view)) {
            if (!enforceAuthentication(view)) {
                return;
            }
        }
        
        setCurrentView(view);
        setError('');
        setShowError(false);
        setShowAuthRequired(false);
    };

    const showErrorMessage = (message, type = 'error') => {
        setError(message);
        setErrorType(type);
        setShowError(true);
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            setShowError(false);
        }, 5000);
    };

    const handleImageUpload = async(file) => {
        // Check authentication first
        if (!enforceAuthentication('analyze')) {
            return;
        }
        
        // Store the uploaded image for preview only
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage(imageUrl);
            setCurrentView('analyze');
        }
    };

    const handleAnalyzeFood = async(formData) => {
        // Double-check authentication before analysis
        if (!enforceAuthentication('analyze')) {
            return;
        }
        
        setIsAnalyzing(true);
        setError('');

        try {
            console.log('🔍 Starting Gemini AI Analysis...');
            const result = await foodService.analyzeFood(formData);
            console.log('✅ Analysis completed:', result);
            console.log('Analysis Result Structure:', JSON.stringify(result, null, 2));
            
            // FIX: Handle analysis result structure properly
            let analysisData = null;
            
            if (result.analysis_result) {
                // Backend returns result.analysis_result structure
                analysisData = result.analysis_result;
            } else if (result.detected_foods) {
                // Direct structure
                analysisData = result;
            } else {
                // Fallback structure
                analysisData = {
                    detected_foods: result.foods || [],
                    total_nutrition: result.nutrition || {},
                    confidence_overall: result.confidence || 0,
                    session_id: result.session_id
                };
            }
            
            // Ensure data structure is complete
            const completeAnalysisResult = {
                session_id: analysisData.session_id || result.session_id,
                detected_foods: analysisData.detected_foods || [],
                total_nutrition: analysisData.total_nutrition || {},
                confidence_overall: analysisData.confidence_overall || analysisData.confidence || 0,
                status: 'completed',
                ...analysisData
            };
            
            console.log('🔍 Processed Analysis Result:', completeAnalysisResult);
            setAnalysisResult(completeAnalysisResult);
            navigateToView('result');
        } catch (error) {
            setError('Analysis failed: ' + error.message);
            console.error('❌ Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAnalyzeImage = async() => {
        if (!uploadedImage) return;

        setIsAnalyzing(true);
        setError('');

        try {
            // Create FormData with the uploaded image
            const formData = new FormData();
            const imageBlob = await fetch(uploadedImage).then(r => r.blob());
            formData.append('image', imageBlob, 'uploaded-image.jpg');

            const result = await foodService.analyzeFood(formData);
            setAnalysisResult(result);
            setCurrentView('result');
        } catch (error) {
            setError('Analysis failed: ' + error.message);
            console.error('Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEditFood = async(foodId, updateData) => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.updateDetectedFood(sessionId, foodId, updateData);
                // Refresh analysis result
                const updatedResult = await foodService.getAnalysisResult(sessionId);
                setAnalysisResult(updatedResult);
            }
        } catch (error) {
            setError('Failed to update food: ' + error.message);
        }
    };

    const handleRemoveFood = async(foodId) => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.removeDetectedFood(sessionId, foodId);
                // Refresh analysis result
                const updatedResult = await foodService.getAnalysisResult(sessionId);
                setAnalysisResult(updatedResult);
            }
        } catch (error) {
            setError('Failed to remove food: ' + error.message);
        }
    };

    const handleConfirmAnalysis = async() => {
        try {
            const sessionId = analysisResult && analysisResult.session_id;
            if (sessionId) {
                await foodService.confirmAnalysis(sessionId);
                alert('Analysis saved to your diary!');
                setCurrentView('home');
                setAnalysisResult(null);
                setUploadedImage(null);
            }
        } catch (error) {
            setError('Failed to save analysis: ' + error.message);
        }
    };

    const handleNewAnalysis = () => {
        setCurrentView('home');
        setAnalysisResult(null);
        setUploadedImage(null);
        setError('');
    };

    const handleLogin = async(credentials) => {
        try {
            const result = await authService.login(credentials.username, credentials.password);
            setIsAuthenticated(true);
            setUser(result.user);
            setError('');
            setCurrentView('home');
        } catch (error) {
            setError('Login failed: ' + error.message);
        }
    };

    const handleRegister = async(userData) => {
        try {
            const result = await authService.register(userData);
            setIsAuthenticated(true);
            setUser(result.user);
            setError('');
            setCurrentView('home');
        } catch (error) {
            setError('Registration failed: ' + error.message);
        }
    };

    const handleLogout = () => {
        authService.logout();
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView('home');
        setAnalysisResult(null);
        setUploadedImage(null);
        setDashboardData(null);
        setNutritionData(null);
        setUserData(null);
    };

    // FIX 8: Profile edit functionality
    const handleEditProfile = () => {
        setIsEditingProfile(true);
        setEditedUserData({
            full_name: userData?.full_name || '',
            date_of_birth: userData?.date_of_birth || '',
            gender: userData?.gender || '',
            height: userData?.height || '',
            weight: userData?.weight || '',
            activity_level: userData?.activity_level || '',
            daily_calorie_goal: userData?.daily_calorie_goal || ''
        });
    };

    const handleSaveProfile = async () => {
        try {
            setIsLoading(true);
            
            // FIX: Clean data before sending - convert empty strings to null for dates
            const cleanedData = { ...editedUserData };
            if (cleanedData.date_of_birth === '') {
                cleanedData.date_of_birth = null;
            }
            if (cleanedData.height === '') {
                cleanedData.height = null;
            }
            if (cleanedData.weight === '') {
                cleanedData.weight = null;
            }
            if (cleanedData.daily_calorie_goal === '') {
                cleanedData.daily_calorie_goal = null;
            }
            
            // Call userService to update profile
            const updatedProfile = await userService.updateProfile(cleanedData);
            
            // Update local user data
            setUserData(prevData => ({
                ...prevData,
                ...cleanedData
            }));
            
            setIsEditingProfile(false);
            showErrorMessage('Profile updated successfully!', 'info');
        } catch (error) {
            console.error('Failed to update profile:', error);
            showErrorMessage('Failed to update profile: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        setEditedUserData({});
    };

    const handleProfileFieldChange = (field, value) => {
        setEditedUserData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle view analysis details from recent analyses
    const handleViewAnalysisDetails = async (sessionId) => {
        try {
            setIsLoading(true);
            console.log(`🔍 Loading analysis details for session: ${sessionId}`);
            
            // Use the foodService to get complete analysis result
            const response = await foodService.getAnalysisResult(sessionId);
            
            if (response.success && response.analysis_result) {
                console.log('✅ Analysis result loaded:', response.analysis_result);
                setAnalysisResult(response.analysis_result);
                setCurrentView('result');
            } else {
                throw new Error('Analysis result not found');
            }
        } catch (error) {
            console.error('❌ Failed to load analysis details:', error);
            setError('Failed to load analysis details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="App">
            {/* Header */}
            <header className="app-header">
                <div className="header-container">
                    <div className="logo-section">
                        <div className="logo-icon">🍽️</div>
                        <h1 className="app-title">FoodVision</h1>
                        <span className="app-subtitle">AI-Powered Diet Tracking</span>
                    </div>

                    <nav className="nav-section">
                        <button 
                            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
                            onClick={() => navigateToView('home')}
                        >
                            <span className="nav-icon">🏠</span>
                            Home
                        </button>

                        {isAuthenticated && (
                            <>
                                <button 
                                    className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
                                    onClick={() => navigateToView('dashboard')}
                                >
                                    <span className="nav-icon">📊</span>
                                    Dashboard
                                </button>

                                <button 
                                    className={`nav-button ${currentView === 'analyze' ? 'active' : ''}`}
                                    onClick={() => navigateToView('analyze')}
                                >
                                    <span className="nav-icon">🔍</span>
                                    Analyze Food
                                </button>

                                <button 
                                    className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
                                    onClick={() => navigateToView('history')}
                                >
                                    <span className="nav-icon">📋</span>
                                    History
                                </button>

                                <button 
                                    className={`nav-button ${currentView === 'profile' ? 'active' : ''}`}
                                    onClick={() => navigateToView('profile')}
                                >
                                    <span className="nav-icon">👤</span>
                                    Profile
                                </button>
                            </>
                        )}
                    </nav>

                    <div className="user-section">
                        {isAuthenticated ? (
                            <div className="user-menu">
                                <span className="user-greeting">
                                    Hello, {(user && user.username) || 'User'}
                                </span>
                                <button className="logout-button" onClick={handleLogout}>
                                    <span className="nav-icon">🚪</span>
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <button 
                                    className="auth-button login"
                                    onClick={() => setCurrentView('login')}
                                >
                                    Login
                                </button>
                                <button 
                                    className="auth-button register"
                                    onClick={() => setCurrentView('register')}
                                >
                                    Register
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                <div className="container">
                    {/* Error Message */}
                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                            <button className="error-close" onClick={() => setError('')}>
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Home View */}
                    {currentView === 'home' && (
                        <div className="home-view">
                            <div className="hero-section">
                                <h2 className="hero-title">Analyze Your Food with AI</h2>
                                <p className="hero-description">
                                    Upload a photo of your meal and get instant nutritional analysis powered by advanced AI technology.
                                </p>
                            </div>


                            {/* Features Section */}
                            <div className="features-section">
                                <h3 className="features-title">Why Choose FoodVision?</h3>
                                <div className="features-grid">
                                    <div className="feature-card">
                                        <div className="feature-icon">🔍</div>
                                        <h4>AI-Powered Analysis</h4>
                                        <p>Advanced computer vision to identify foods and estimate portions</p>
                                    </div>
                                    <div className="feature-card">
                                        <div className="feature-icon">📊</div>
                                        <h4>Detailed Nutrition</h4>
                                        <p>Complete nutritional breakdown including calories, macros, and vitamins</p>
                                    </div>
                                    <div className="feature-card">
                                        <div className="feature-icon">📱</div>
                                        <h4>Easy to Use</h4>
                                        <p>Simply snap a photo and get instant results</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Enhanced Analyze View */}
                    {currentView === 'analyze' && (
                        <div className="analyze-view">
                            <EnhancedImageUpload
                                onImageUpload={handleImageUpload}
                                onAnalyze={handleAnalyzeFood}
                                isAnalyzing={isAnalyzing}
                                onLoginRequired={handleLoginRequired}
                            />
                        </div>
                    )}

                    {/* Analysis Result View */}
                    {currentView === 'result' && analysisResult && (
                        <div className="result-view">
                            <div className="result-header">
                                <h2 className="result-title">Analysis Result</h2>
                                <div className="result-actions">
                                    <button 
                                        className="action-button secondary"
                                        onClick={handleNewAnalysis}
                                    >
                                        New Analysis
                                    </button>
                                </div>
                            </div>

                            <FoodAnalysisResult 
                                analysisResult={analysisResult}
                                onEditFood={handleEditFood}
                                onRemoveFood={handleRemoveFood}
                                onConfirm={handleConfirmAnalysis}
                                onNewAnalysis={handleNewAnalysis}
                                isAuthenticated={isAuthenticated}
                            />
                        </div>
                    )}

                    {/* Login View */}
                    {currentView === 'login' && (
                        <div className="auth-view">
                            <div className="auth-card">
                                <h2 className="auth-title">Welcome Back</h2>
                                <p className="auth-subtitle">Sign in to track your nutrition</p>

                                <form 
                                    className="auth-form"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        handleLogin({
                                            username: formData.get('username'),
                                            password: formData.get('password')
                                        });
                                    }}
                                >
                                    <div className="form-group">
                                        <label htmlFor="username">Username</label>
                                        <input 
                                            type="text"
                                            id="username"
                                            name="username"
                                            required 
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="password">Password</label>
                                        <input 
                                            type="password"
                                            id="password"
                                            name="password"
                                            required 
                                            className="form-input"
                                        />
                                    </div>

                                    <button type="submit" className="auth-submit">
                                        Sign In
                                    </button>
                                </form>

                                <p className="auth-switch">
                                    Don't have an account?{' '}
                                    <button 
                                        className="link-button"
                                        onClick={() => setCurrentView('register')}
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Register View */}
                    {currentView === 'register' && (
                        <div className="auth-view">
                            <div className="auth-card">
                                <h2 className="auth-title">Create Account</h2>
                                <p className="auth-subtitle">Join FoodVision today</p>

                                <form 
                                    className="auth-form"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        handleRegister({
                                            username: formData.get('username'),
                                            email: formData.get('email'),
                                            password: formData.get('password')
                                        });
                                    }}
                                >
                                    <div className="form-group">
                                        <label htmlFor="reg-username">Username</label>
                                        <input 
                                            type="text"
                                            id="reg-username"
                                            name="username"
                                            required 
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="reg-email">Email</label>
                                        <input 
                                            type="email"
                                            id="reg-email"
                                            name="email"
                                            required 
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="reg-password">Password</label>
                                        <input 
                                            type="password"
                                            id="reg-password"
                                            name="password"
                                            required 
                                            className="form-input"
                                        />
                                    </div>

                                    <button type="submit" className="auth-submit">
                                        Create Account
                                    </button>
                                </form>

                                <p className="auth-switch">
                                    Already have an account?{' '}
                                    <button 
                                        className="link-button"
                                        onClick={() => setCurrentView('login')}
                                    >
                                        Sign in
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dashboard View */}
                    {currentView === 'dashboard' && isAuthenticated && (
                        <div className="dashboard-view">
                            <div className="dashboard-header">
                                <h2 className="dashboard-title">Your Nutrition Dashboard</h2>
                                <button 
                                    className="refresh-button"
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
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading dashboard...</p>
                                </div>
                            ) : dashboardData ? (
                                <div className="dashboard-content">
                                    {/* Today's Overview */}
                                    <div className="dashboard-section">
                                        <h3>Today's Overview</h3>
                                        <div className="overview-cards">
                                            <div className="overview-card calories">
                                                <div className="card-icon">🔥</div>
                                                <div className="card-content">
                                                    <div className="card-value">
                                                        {dashboardData.overview.today_nutrition?.calories || 0}
                                                    </div>
                                                    <div className="card-label">Calories</div>
                                                    <div className="card-goal">
                                                        Goal: {dashboardData.overview.today_nutrition?.goal || 2000}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="overview-card protein">
                                                <div className="card-icon">🥩</div>
                                                <div className="card-content">
                                                    <div className="card-value">
                                                        {Math.round(dashboardData.overview.today_nutrition?.protein || 0)}g
                                                    </div>
                                                    <div className="card-label">Protein</div>
                                                </div>
                                            </div>

                                            <div className="overview-card carbs">
                                                <div className="card-icon">🍞</div>
                                                <div className="card-content">
                                                    <div className="card-value">
                                                        {Math.round(dashboardData.overview.today_nutrition?.carbs || 0)}g
                                                    </div>
                                                    <div className="card-label">Carbs</div>
                                                </div>
                                            </div>

                                            <div className="overview-card fat">
                                                <div className="card-icon">🥑</div>
                                                <div className="card-content">
                                                    <div className="card-value">
                                                        {Math.round(dashboardData.overview.today_nutrition?.fat || 0)}g
                                                    </div>
                                                    <div className="card-label">Fat</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Today's Summary - Moved from History */}
                                    <div className="dashboard-section">
                                        <h3>Today's Summary</h3>
                                        {dashboardData.overview.today_nutrition ? (
                                            <div className="summary-cards">
                                                <div className="summary-item">
                                                    <span className="summary-label">Calories:</span>
                                                    <span className="summary-value">
                                                        {Math.round(dashboardData.overview.today_nutrition.calories || 0)}
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Protein:</span>
                                                    <span className="summary-value">
                                                        {Math.round(dashboardData.overview.today_nutrition.protein || 0)}g
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Carbs:</span>
                                                    <span className="summary-value">
                                                        {Math.round(dashboardData.overview.today_nutrition.carbs || 0)}g
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Fat:</span>
                                                    <span className="summary-value">
                                                        {Math.round(dashboardData.overview.today_nutrition.fat || 0)}g
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-icon">�</div>
                                                <p>No nutrition data for today</p>
                                                <p>Start analyzing food to see your daily summary!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Weekly Stats */}
                                    <div className="dashboard-section">
                                        <h3>Summary Statistics</h3>
                                        <div className="stats-grid">
                                            <div className="stat-card">
                                                <div className="stat-label">Weekly Average</div>
                                                <div className="stat-value">
                                                    {Math.round(dashboardData.overview.week_average?.calories || 0)} cal/day
                                                </div>
                                            </div>
                                            <div className="stat-card">
                                                <div className="stat-label">Activity Level</div>
                                                <div className="stat-value">
                                                    {dashboardData.overview.activity_level || 'moderate'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="dashboard-placeholder">
                                    <div className="placeholder-icon">📊</div>
                                    <p>No dashboard data available</p>
                                    <p>Start analyzing food to see your nutrition dashboard.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History View */}
                    {currentView === 'history' && isAuthenticated && (
                        <div className="history-view">
                            <div className="history-header">
                                <h2 className="history-title">Nutrition History</h2>
                                <button 
                                    className="refresh-button"
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
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading history...</p>
                                </div>
                            ) : nutritionData ? (
                                <div className="history-content">
                                    {/* Recent Food Analyses - FIX 7: Display from food_analysis_sessions with foods and ingredients */}
                                    <div className="history-section">
                                        <h3>Recent Food Analyses</h3>
                                        {(
                                            // FIX: Use recent_analyses from food_analysis_sessions
                                            nutritionData.history?.recent_analyses?.length > 0 || 
                                            nutritionData.history?.food_analyses?.length > 0
                                        ) ? (
                                            <div className="recent-analyses-table">
                                                <div className="table-header">
                                                    <div className="header-cell">Food Name</div>
                                                    <div className="header-cell">Ingredients</div>
                                                    <div className="header-cell">Total Calories</div>
                                                    <div className="header-cell">Date</div>
                                                    <div className="header-cell">Actions</div>
                                                </div>
                                                {(
                                                    // FIX 7: Use proper food analysis data from sessions
                                                    nutritionData.history?.recent_analyses || 
                                                    nutritionData.history?.food_analyses || []
                                                ).map((analysis, index) => (
                                                    <div key={analysis.session_id || analysis.id || index} className="table-row">
                                                        <div className="table-cell">
                                                            {/* FIX 7: Display main food name from foods table */}
                                                            {analysis.food_name || 
                                                             analysis.main_food?.name ||
                                                             analysis.detected_foods?.[0]?.name || 
                                                             'Unknown Food'}
                                                        </div>
                                                        <div className="table-cell">
                                                            {/* FIX: Proper handling of ingredients - prevent map error */}
                                                            {(() => {
                                                                // Handle different ingredient data structures safely
                                                                if (analysis.ingredient_name) {
                                                                    return `${analysis.ingredient_name} (${analysis.estimated_portion || 0}${analysis.portion_unit || 'g'})`;
                                                                } else if (analysis.ingredients) {
                                                                    // Check if ingredients is already a string (from GROUP_CONCAT)
                                                                    if (typeof analysis.ingredients === 'string') {
                                                                        return analysis.ingredients;
                                                                    } else if (Array.isArray(analysis.ingredients)) {
                                                                        return analysis.ingredients.map(ing => 
                                                                            typeof ing === 'string' ? ing : (ing.name || ing)
                                                                        ).join(', ');
                                                                    } else {
                                                                        // If ingredients is not string or array, convert to string
                                                                        return String(analysis.ingredients);
                                                                    }
                                                                } else if (analysis.detected_foods && Array.isArray(analysis.detected_foods)) {
                                                                    return analysis.detected_foods.map(food => food.name || 'Unknown ingredient').join(', ');
                                                                }
                                                                return 'No ingredients listed';
                                                            })()}
                                                        </div>
                                                        <div className="table-cell">
                                                            {Math.round(
                                                                analysis.total_estimated_calories ||
                                                                analysis.calories ||
                                                                analysis.total_nutrition?.calories ||
                                                                analysis.total_calories || 0
                                                            )} cal
                                                        </div>
                                                        <div className="table-cell">
                                                            {analysis.created_at ? 
                                                                new Date(analysis.created_at).toLocaleDateString() : 
                                                                'Unknown'
                                                            }
                                                        </div>
                                                        <div className="table-cell">
                                                            <button 
                                                                className="view-analysis-btn"
                                                                onClick={() => handleViewAnalysisDetails(analysis.session_id || analysis.id)}
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-icon">📷</div>
                                                <p>No food analyses yet</p>
                                                <p>Start analyzing food to see your analysis history!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Nutrition History */}
                                    <div className="history-section">
                                        <h3>Daily Nutrition History (Last 30 Days)</h3>
                                        {nutritionData.history?.nutrition_history?.length > 0 ? (
                                            <div className="history-list">
                                                {nutritionData.history.nutrition_history.map((entry, index) => (
                                                    <div key={index} className="history-entry">
                                                        <div className="entry-date">
                                                            {new Date(entry.date).toLocaleDateString()}
                                                        </div>
                                                        <div className="entry-nutrition">
                                                            <div className="nutrition-item">
                                                                <span className="nutrition-label">Calories:</span>
                                                                <span className="nutrition-value">
                                                                    {Math.round(entry.total_calories || 0)}
                                                                </span>
                                                            </div>
                                                            <div className="nutrition-item">
                                                                <span className="nutrition-label">Protein:</span>
                                                                <span className="nutrition-value">
                                                                    {Math.round(entry.total_protein || 0)}g
                                                                </span>
                                                            </div>
                                                            <div className="nutrition-item">
                                                                <span className="nutrition-label">Carbs:</span>
                                                                <span className="nutrition-value">
                                                                    {Math.round(entry.total_carbs || 0)}g
                                                                </span>
                                                            </div>
                                                            <div className="nutrition-item">
                                                                <span className="nutrition-label">Fat:</span>
                                                                <span className="nutrition-value">
                                                                    {Math.round(entry.total_fat || 0)}g
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-icon">📋</div>
                                                <p>No nutrition history available</p>
                                                <p>Start analyzing food to build your nutrition history!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Summary Stats */}
                                    {nutritionData.history?.summary && (
                                        <div className="history-section">
                                            <h3>Summary</h3>
                                            <div className="summary-stats">
                                                <div className="stat-item">
                                                    <span className="stat-label">Total Days:</span>
                                                    <span className="stat-value">
                                                        {nutritionData.history.summary.total_days}
                                                    </span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Average Calories:</span>
                                                    <span className="stat-value">
                                                        {Math.round(nutritionData.history.summary.avg_calories || 0)} cal/day
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="history-placeholder">
                                    <div className="placeholder-icon">📋</div>
                                    <p>No nutrition history available</p>
                                    <p>Start analyzing food to build your nutrition history!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Profile View - FIX 8: Add edit functionality */}
                    {currentView === 'profile' && isAuthenticated && (
                        <div className="profile-view">
                            <div className="profile-header">
                                <h2 className="profile-title">User Profile</h2>
                                <div className="profile-actions">
                                    {!isEditingProfile ? (
                                        <>
                                            <button 
                                                className="edit-profile-button"
                                                onClick={handleEditProfile}
                                                disabled={isLoading}
                                            >
                                                ✏️ Edit Profile
                                            </button>
                                            <button 
                                                className="refresh-button"
                                                onClick={() => {
                                                    setUserData(null);
                                                    loadUserData();
                                                }}
                                                disabled={isLoading}
                                            >
                                                🔄 Refresh
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                className="save-profile-button"
                                                onClick={handleSaveProfile}
                                                disabled={isLoading}
                                            >
                                                💾 Save Changes
                                            </button>
                                            <button 
                                                className="cancel-edit-button"
                                                onClick={handleCancelEdit}
                                                disabled={isLoading}
                                            >
                                                ❌ Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading profile...</p>
                                </div>
                            ) : userData ? (
                                <div className="profile-content">
                                    {/* FIX 8: Enhanced user info with edit capability */}
                                    <div className="user-info">
                                        <h3>Account Information</h3>
                                        
                                        {/* Non-editable fields */}
                                        <div className="info-group">
                                            <label>Username:</label>
                                            <span>{userData.username || 'Not available'}</span>
                                        </div>
                                        <div className="info-group">
                                            <label>Email:</label>
                                            <span>{userData.email || 'Not available'}</span>
                                        </div>
                                        <div className="info-group">
                                            <label>Member since:</label>
                                            <span>{userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'Not available'}</span>
                                        </div>
                                        
                                        {/* Editable fields - FIX 8 */}
                                        <div className="info-group">
                                            <label>Full Name:</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="text"
                                                    value={editedUserData.full_name || ''}
                                                    onChange={(e) => handleProfileFieldChange('full_name', e.target.value)}
                                                    placeholder="Enter your full name"
                                                />
                                            ) : (
                                                <span>{userData.full_name || 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Date of Birth:</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="date"
                                                    value={editedUserData.date_of_birth || ''}
                                                    onChange={(e) => handleProfileFieldChange('date_of_birth', e.target.value)}
                                                />
                                            ) : (
                                                <span>{userData.date_of_birth || 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Gender:</label>
                                            {isEditingProfile ? (
                                                <select
                                                    value={editedUserData.gender || ''}
                                                    onChange={(e) => handleProfileFieldChange('gender', e.target.value)}
                                                >
                                                    <option value="">Select gender</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            ) : (
                                                <span>{userData.gender || 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Height (cm):</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="number"
                                                    value={editedUserData.height || ''}
                                                    onChange={(e) => handleProfileFieldChange('height', e.target.value)}
                                                    placeholder="Enter height in cm"
                                                    min="50"
                                                    max="300"
                                                />
                                            ) : (
                                                <span>{userData.height ? `${userData.height} cm` : 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Weight (kg):</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="number"
                                                    value={editedUserData.weight || ''}
                                                    onChange={(e) => handleProfileFieldChange('weight', e.target.value)}
                                                    placeholder="Enter weight in kg"
                                                    min="20"
                                                    max="500"
                                                    step="0.1"
                                                />
                                            ) : (
                                                <span>{userData.weight ? `${userData.weight} kg` : 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Activity Level:</label>
                                            {isEditingProfile ? (
                                                <select
                                                    value={editedUserData.activity_level || ''}
                                                    onChange={(e) => handleProfileFieldChange('activity_level', e.target.value)}
                                                >
                                                    <option value="">Select activity level</option>
                                                    <option value="sedentary">Sedentary (little/no exercise)</option>
                                                    <option value="light">Light (exercise 1-3 days/week)</option>
                                                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                                                    <option value="active">Active (exercise 6-7 days/week)</option>
                                                    <option value="very_active">Very Active (intense exercise/sports)</option>
                                                </select>
                                            ) : (
                                                <span>{userData.activity_level || 'Not provided'}</span>
                                            )}
                                        </div>
                                        
                                        <div className="info-group">
                                            <label>Daily Calorie Goal:</label>
                                            {isEditingProfile ? (
                                                <input
                                                    type="number"
                                                    value={editedUserData.daily_calorie_goal || ''}
                                                    onChange={(e) => handleProfileFieldChange('daily_calorie_goal', e.target.value)}
                                                    placeholder="Enter daily calorie goal"
                                                    min="800"
                                                    max="5000"
                                                />
                                            ) : (
                                                <span>{userData.daily_calorie_goal ? `${userData.daily_calorie_goal} calories` : 'Not set'}</span>
                                            )}
                                        </div>
                                        
                                        {userData.stats && (
                                            <div className="info-group">
                                                <label>Total Analyses:</label>
                                                <span>{userData.stats.total_analyses || 0}</span>
                                            </div>
                                        )}
                                    </div>

                                    {userData.preferences && Object.keys(userData.preferences).length > 0 && (
                                        <div className="user-preferences">
                                            <h3>Preferences</h3>
                                            <div className="preferences-list">
                                                {Object.entries(userData.preferences).map(([key, value]) => (
                                                    <div key={key} className="preference-item">
                                                        <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                                                        <span>
                                                            {(() => {
                                                                // FIX: Properly format different value types for display
                                                                if (typeof value === 'boolean') {
                                                                    return value ? 'Yes' : 'No';
                                                                } else if (typeof value === 'object' && value !== null) {
                                                                    // Handle nested objects without causing React error
                                                                    if (Array.isArray(value)) {
                                                                        return value.join(', ');
                                                                    } else {
                                                                        // Convert object to user-friendly display
                                                                        return Object.entries(value)
                                                                            .map(([k, v]) => `${k}: ${v}`)
                                                                            .join(', ');
                                                                    }
                                                                } else {
                                                                    return String(value);
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="placeholder">
                                    <div className="placeholder-icon">👤</div>
                                    <p>No profile data available</p>
                                    <p>Please try refreshing the page.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="app-footer">
                <div className="footer-container">
                    <div className="footer-section">
                        <h4>FoodVision</h4>
                        <p>AI-powered nutrition tracking for a healthier lifestyle.</p>
                    </div>
                    <div className="footer-section">
                        <h4>Features</h4>
                        <ul>
                            <li>Food Recognition</li>
                            <li>Nutrition Analysis</li>
                            <li>Diet Tracking</li>
                        </ul>
                    </div>
                    <div className="footer-section">
                        <h4>Support</h4>
                        <ul>
                            <li>Help Center</li>
                            <li>Contact Us</li>
                            <li>Privacy Policy</li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 FoodVision. All rights reserved.</p>
                </div>
            </footer>

            {/* Error Notification */}
            <ErrorNotification
                message={error}
                type={errorType}
                isVisible={showError}
                onClose={() => setShowError(false)}
            />
        </div>
    );
}

export default App;
