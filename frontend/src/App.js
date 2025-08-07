import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/components.css';
import { HomePage, AuthPage, NutritionHistoryPage } from './pages';
import { FoodAnalysisResult } from './components/food';
import { ErrorNotification } from './components/ui';
import { AuthProvider } from './context/AuthContext';
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
    const [showAuthPage, setShowAuthPage] = useState(false);
    const [errorType, setErrorType] = useState('error');
    const [showError, setShowError] = useState(false);

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
            console.error('Failed to load dashboard data:', error);
            showErrorMessage('Failed to load dashboard data: ' + error.message);
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
        } catch (error) {
            console.error('Failed to load nutrition data:', error);
            showErrorMessage('Failed to load nutrition data: ' + error.message);
        } finally {
            setIsLoading(false);
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
    };

    const showErrorMessage = (message, type = 'error') => {
        setError(message);
        setErrorType(type);
        setShowError(true);
        
        setTimeout(() => {
            setShowError(false);
        }, 5000);
    };

    const handleImageUpload = async(file) => {
        if (!isAuthenticated) {
            handleLoginRequired();
            return;
        }
        
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImage(imageUrl);
            setCurrentView('analyze');
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
                setCurrentView('home');
                setAnalysisResult(null);
                setUploadedImage(null);
            }
        } catch (error) {
            showErrorMessage('Failed to save analysis: ' + error.message);
        }
    };

    const handleNewAnalysis = () => {
        setCurrentView('home');
        setAnalysisResult(null);
        setUploadedImage(null);
        setError('');
    };

    const handleLogin = (userData) => {
        setIsAuthenticated(true);
        setUser(userData);
        setShowAuthPage(false);
        setCurrentView('home');
        showErrorMessage('Welcome back!', 'info');
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
        showErrorMessage('Logged out successfully', 'info');
    };

    const renderHeader = () => {
        if (currentView === 'home') return null; // HomePage has its own nav

        return (
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <button
                                onClick={() => setCurrentView('home')}
                                className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700"
                            >
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="12" cy="12" r="3" fill="white" />
                                </svg>
                                <span className="text-xl font-bold">FoodVision</span>
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex space-x-8">
                            <button
                                onClick={() => setCurrentView('home')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'home' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Home
                            </button>
                            <button
                                onClick={() => navigateToView('analyze')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'analyze' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Analyze
                            </button>
                            <button
                                onClick={() => navigateToView('history')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'history' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                History
                            </button>
                            <button
                                onClick={() => navigateToView('dashboard')}
                                className={`text-sm font-medium transition-colors ${
                                    currentView === 'dashboard' 
                                        ? 'text-emerald-600' 
                                        : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                Dashboard
                            </button>
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700">
                                        Hello, {user?.full_name || user?.username}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="text-sm text-gray-500 hover:text-gray-700"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAuthPage(true)}
                                    className="btn-custom bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
                                >
                                    Login
                                </button>
                            )}
                        </div>
                    </div>
                </div>
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
                    <section id="analyze-section" className="py-20">
                    <div className="max-w-4xl mx-auto px-6">
                        <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Upload Your Food Photo
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Get instant nutritional analysis by uploading a photo of your meal. 
                            Our AI will identify ingredients and provide detailed nutrition information.
                        </p>
                        </div>

                    </div>
                    </section>
                );

            case 'result':
                return (
                    <div className="min-h-screen bg-white py-12">
                        <div className="max-w-6xl mx-auto px-6">
                            <FoodAnalysisResult
                                analysisResult={analysisResult}
                                onEditFood={handleEditFood}
                                onRemoveFood={handleRemoveFood}
                                onConfirm={handleConfirmAnalysis}
                            />
                            <div className="text-center mt-8">
                                <button
                                    onClick={handleNewAnalysis}
                                    className="btn-custom bg-gray-200 text-gray-900 px-6 py-3 rounded-xl mr-4"
                                >
                                    Analyze Another
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <NutritionHistoryPage
                        isAuthenticated={isAuthenticated}
                        onLoginRequired={handleLoginRequired}
                    />
                );

            case 'dashboard':
                return (
                    <div className="min-h-screen bg-white py-12">
                        <div className="max-w-7xl mx-auto px-6">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                                    Dashboard
                                </h1>
                                <p className="text-lg text-gray-600">
                                    Your nutrition overview and insights
                                </p>
                            </div>
                            {/* Dashboard content would go here */}
                            <div className="bg-gray-50 rounded-2xl p-8 text-center">
                                <h3 className="text-xl font-medium text-gray-900 mb-4">
                                    Dashboard Coming Soon
                                </h3>
                                <p className="text-gray-600">
                                    We're working on your personalized nutrition dashboard
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default:
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
        }
    };

    return (
        <AuthProvider>
            <div className="App bg-white min-h-screen">
                {renderHeader()}
                {renderMainContent()}

                {/* Auth Modal */}
                {showAuthPage && (
                    <AuthPage
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
        </AuthProvider>
    );
}

export default App;
