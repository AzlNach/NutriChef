import React, { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/food/ImageUpload';
import FoodAnalysisResult from './components/food/FoodAnalysisResult';
import { foodService } from './services/foodService';
import { authService } from './services/authService';
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
            setDashboardData({ overview, stats });
        } catch (error) {
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
            setNutritionData({ history, dailySummary });
        } catch (error) {
            setError('Failed to load nutrition data: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserData = async() => {
        try {
            setIsLoading(true);
            const userInfo = await authService.getUserInfo();
            setUserData(userInfo);
        } catch (error) {
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

    const handleImageUpload = async(file) => {
        // Store the uploaded image for preview only
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage(imageUrl);
            setCurrentView('analyze');
        }
    };

    const handleAnalyzeFood = async(formData) => {
        setIsAnalyzing(true);
        setError('');

        try {
            console.log('🔍 Starting Gemini AI Analysis...');
            const result = await foodService.analyzeFood(formData);
            console.log('✅ Analysis completed:', result);
            setAnalysisResult(result);
            setCurrentView('result');
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
                            onClick={() => setCurrentView('home')}
                        >
                            <span className="nav-icon">🏠</span>
                            Home
                        </button>

                        {isAuthenticated && (
                            <>
                                <button 
                                    className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('dashboard')}
                                >
                                    <span className="nav-icon">📊</span>
                                    Dashboard
                                </button>

                                <button 
                                    className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('history')}
                                >
                                    <span className="nav-icon">📋</span>
                                    History
                                </button>

                                <button 
                                    className={`nav-button ${currentView === 'profile' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('profile')}
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

                            <div className="upload-section">
                                <ImageUpload 
                                    onImageUpload={handleImageUpload}
                                    onAnalyze={handleAnalyzeFood}
                                    isAnalyzing={isAnalyzing}
                                />
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

                    {/* Analyze View */}
                    {currentView === 'analyze' && uploadedImage && (
                        <div className="analyze-view">
                            <div className="analyze-header">
                                <h2 className="analyze-title">Ready to Analyze</h2>
                                <p className="analyze-subtitle">Your image has been uploaded successfully</p>
                            </div>

                            <div className="image-preview-section">
                                <div className="image-preview">
                                    <img 
                                        src={uploadedImage}
                                        alt="Uploaded food"
                                        className="preview-image"
                                    />
                                </div>

                                <div className="analyze-actions">
                                    <button 
                                        className="action-button secondary"
                                        onClick={handleNewAnalysis}
                                    >
                                        Upload Different Image
                                    </button>
                                    <button 
                                        className="action-button primary analyze-btn"
                                        onClick={handleAnalyzeImage}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <span className="loading-spinner"></span>
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>🔍 Analyze Food</>
                                        )}
                                    </button>
                                </div>
                            </div>
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
                                    {isAuthenticated && (
                                        <button 
                                            className="action-button primary"
                                            onClick={handleConfirmAnalysis}
                                        >
                                            Save to Diary
                                        </button>
                                    )}
                                </div>
                            </div>

                            <FoodAnalysisResult 
                                result={analysisResult}
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

                                    {/* Recent Analyses */}
                                    <div className="dashboard-section">
                                        <h3>Recent Food Analyses</h3>
                                        {dashboardData.overview.recent_analyses?.length > 0 ? (
                                            <div className="recent-analyses">
                                                {dashboardData.overview.recent_analyses.map((analysis) => (
                                                    <div key={analysis.id} className="analysis-item">
                                                        <div className="analysis-info">
                                                            <div className="analysis-filename">
                                                                📷 {analysis.image_filename || 'Food Analysis'}
                                                            </div>
                                                            <div className="analysis-calories">
                                                                {Math.round(analysis.total_estimated_calories || 0)} calories
                                                            </div>
                                                            <div className="analysis-date">
                                                                {new Date(analysis.created_at).toLocaleDateString()}
                                                            </div>
                                                            <div className="analysis-confidence">
                                                                {Math.round((analysis.confidence_score || 0) * 100)}% confidence
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-icon">📷</div>
                                                <p>No food analyses yet</p>
                                                <p>Upload your first food photo to get started!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Weekly Stats */}
                                    <div className="dashboard-section">
                                        <h3>Weekly Stats</h3>
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
                                    {/* Daily Summary */}
                                    {nutritionData.dailySummary && (
                                        <div className="daily-summary">
                                            <h3>Today's Summary</h3>
                                            <div className="summary-cards">
                                                <div className="summary-item">
                                                    <span className="summary-label">Calories:</span>
                                                    <span className="summary-value">
                                                        {Math.round(nutritionData.dailySummary.daily_summary?.total_calories || 0)}
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Protein:</span>
                                                    <span className="summary-value">
                                                        {Math.round(nutritionData.dailySummary.daily_summary?.total_protein || 0)}g
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Carbs:</span>
                                                    <span className="summary-value">
                                                        {Math.round(nutritionData.dailySummary.daily_summary?.total_carbs || 0)}g
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Fat:</span>
                                                    <span className="summary-value">
                                                        {Math.round(nutritionData.dailySummary.daily_summary?.total_fat || 0)}g
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Nutrition History */}
                                    <div className="history-section">
                                        <h3>Last 30 Days</h3>
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

                    {/* Profile View */}
                    {currentView === 'profile' && isAuthenticated && (
                        <div className="profile-view">
                            <div className="profile-header">
                                <h2 className="profile-title">User Profile</h2>
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
                            </div>

                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading profile...</p>
                                </div>
                            ) : userData ? (
                                <div className="profile-content">
                                    <div className="user-info">
                                        <h3>Account Information</h3>
                                        <div className="info-group">
                                            <label>Username:</label>
                                            <span>{userData.username}</span>
                                        </div>
                                        <div className="info-group">
                                            <label>Email:</label>
                                            <span>{userData.email}</span>
                                        </div>
                                        <div className="info-group">
                                            <label>Member since:</label>
                                            <span>{new Date(userData.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {userData.preferences && (
                                        <div className="user-preferences">
                                            <h3>Preferences</h3>
                                            <div className="preferences-list">
                                                {Object.entries(userData.preferences).map(([key, value]) => (
                                                    <div key={key} className="preference-item">
                                                        <label>{key}:</label>
                                                        <span>{value}</span>
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
        </div>
    );
}

export default App;
