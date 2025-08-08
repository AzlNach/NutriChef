import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ProgressBar from '../ui/ProgressBar';
import AuthGuard from '../auth/AuthGuard';

const EnhancedImageUpload = ({ onImageUpload, onAnalyze, isAnalyzing = false, onLoginRequired }) => {
  const [preview, setPreview] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [analysisStage, setAnalysisStage] = useState('idle'); // idle, uploading, analyzing, processing, complete

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
      
      // Store the file for analysis
      setSelectedFile(file);
      
      // Also call onImageUpload if provided (for backward compatibility)
      if (onImageUpload) {
        onImageUpload(file);
      }
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 16777216, // 16MB
    disabled: isAnalyzing
  });

  const simulateProgressStages = () => {
    const stages = [
      { stage: 'uploading', progress: 15, message: '📤 Uploading image to server...' },
      { stage: 'analyzing', progress: 35, message: '🤖 Gemini AI analyzing food items...' },
      { stage: 'processing', progress: 60, message: '🍽️ Identifying food components...' },
      { stage: 'calculating', progress: 80, message: '📊 Calculating nutrition data...' },
      { stage: 'finalizing', progress: 95, message: '✨ Finalizing analysis results...' },
      { stage: 'complete', progress: 100, message: '✅ Analysis complete!' }
    ];

    stages.forEach((stageData, index) => {
      setTimeout(() => {
        setAnalysisStage(stageData.stage);
        setAnalysisProgress(stageData.progress);
        setProgressMessage(stageData.message);
      }, (index + 1) * 1200); // 1.2 seconds between stages
    });
  };

  const handleAnalyze = async () => {
    if (selectedFile && onAnalyze) {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('meal_type', mealType);
      if (notes) formData.append('notes', notes);
      
      try {
        console.log('🔍 Starting Enhanced Analysis...');
        
        // Start progress simulation
        setAnalysisStage('uploading');
        setAnalysisProgress(0);
        setProgressMessage('🚀 Preparing for analysis...');
        
        simulateProgressStages();
        
        await onAnalyze(formData);
        
        // Reset progress after completion
        setTimeout(() => {
          setAnalysisProgress(0);
          setProgressMessage('');
          setAnalysisStage('idle');
        }, 2000);
        
      } catch (error) {
        console.error('❌ Enhanced Analysis error:', error);
        setAnalysisStage('idle');
        setAnalysisProgress(0);
        setProgressMessage('');
        throw error;
      }
    }
  };

  const clearImage = () => {
    setPreview(null);
    setSelectedFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  return (
    <AuthGuard onLoginRequired={onLoginRequired}>
      <div className="w-full max-w-4xl mx-auto">
        {/* Modern Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 border-opacity-30 rounded-full mb-6">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">AI-Powered Analysis</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
            Analyze Your Food with AI
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload an image to get instant nutritional analysis with detailed ingredient breakdown
          </p>
        </div>

        {/* Modern Glass Card Container */}
        <div className="bg-white bg-opacity-90 backdrop-blur-md border border-gray-200 border-opacity-30 rounded-3xl p-8 shadow-xl">
          
          {/* Enhanced Dropzone */}
          <div 
            {...getRootProps()} 
            className={`
              relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
              ${isDragActive 
                ? 'border-emerald-400 bg-emerald-50 bg-opacity-50 scale-[1.02]' 
                : 'border-gray-300 bg-gray-50 bg-opacity-50 hover:border-emerald-300 hover:bg-emerald-50 hover:bg-opacity-30'
              }
              ${isAnalyzing ? 'cursor-not-allowed opacity-60' : ''}
              ${preview ? 'border-emerald-300 bg-emerald-50 bg-opacity-30' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {preview ? (
              <div className="relative p-6">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <img 
                      src={preview} 
                      alt="Food preview" 
                      className="max-w-full max-h-72 object-contain rounded-xl shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-xl flex items-center justify-center">
                      <button 
                        type="button" 
                        className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform scale-90 group-hover:scale-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearImage();
                        }}
                        disabled={isAnalyzing}
                      >
                        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Image
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">Image ready for analysis</p>
                    <p className="text-xs text-gray-500">Click to change image or scroll down to analyze</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? "Drop your image here" : "Upload Food Image"}
                    </p>
                    <p className="text-gray-600">
                      Drag & drop or click to select your food photo
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded-full">JPG</span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full">PNG</span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full">WebP</span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full">Max 16MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Options */}
          {selectedFile && (
            <div className="mt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meal Type Selection */}
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Meal Type</span>
                  </label>
                  <select 
                    value={mealType} 
                    onChange={(e) => setMealType(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900"
                  >
                    <option value="breakfast">🌅 Breakfast</option>
                    <option value="lunch">☀️ Lunch</option>
                    <option value="dinner">🌙 Dinner</option>
                    <option value="snack">🍪 Snack</option>
                  </select>
                </div>

                {/* Notes Section */}
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Notes (Optional)</span>
                  </label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional information about this meal..."
                    disabled={isAnalyzing}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-gray-900 resize-none"
                  />
                </div>
              </div>

              {/* Analyze Button */}
              <div className="flex justify-center pt-4">
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedFile}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-md flex items-center space-x-3"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isAnalyzing && (
            <div className="mt-8">
              <ProgressBar 
                progress={analysisProgress}
                message={progressMessage}
                isVisible={true}
              />
            </div>
          )}

          {/* Modern Analysis Stages */}
          {isAnalyzing && (
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
              <div className="flex justify-between items-center">
                {[
                  { stage: 'uploading', icon: '📤', label: 'Upload', progress: 15 },
                  { stage: 'analyzing', icon: '🤖', label: 'AI Analysis', progress: 35 },
                  { stage: 'processing', icon: '🍽️', label: 'Food ID', progress: 60 },
                  { stage: 'calculating', icon: '📊', label: 'Nutrition', progress: 80 },
                  { stage: 'complete', icon: '✅', label: 'Complete', progress: 100 }
                ].map((item, index) => (
                  <div key={item.stage} className="flex flex-col items-center space-y-2">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-300
                      ${analysisStage === item.stage 
                        ? 'bg-emerald-500 text-white shadow-lg scale-110' 
                        : analysisProgress > item.progress 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }
                    `}>
                      {analysisProgress > item.progress ? '✓' : item.icon}
                    </div>
                    <span className={`
                      text-xs font-medium transition-colors duration-300
                      ${analysisStage === item.stage 
                        ? 'text-emerald-600' 
                        : analysisProgress > item.progress 
                          ? 'text-green-600' 
                          : 'text-gray-400'
                      }
                    `}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default EnhancedImageUpload;
