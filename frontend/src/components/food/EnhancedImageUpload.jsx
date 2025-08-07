import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ProgressBar from '../ui/ProgressBar';
import AuthGuard from '../auth/AuthGuard';
import './EnhancedImageUpload.css';

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
      <div className="enhanced-image-upload">
        <div className="upload-header">
          <h2>📷 Food Analysis</h2>
          <p>Upload an image to analyze nutritional content with AI</p>
        </div>

        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={`dropzone ${isDragActive ? 'active' : ''} ${isAnalyzing ? 'disabled' : ''}`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div className="image-preview">
              <img src={preview} alt="Food preview" />
              <button 
                type="button" 
                className="clear-image-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                disabled={isAnalyzing}
              >
                ❌ Remove
              </button>
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="upload-icon">📸</div>
              <p>
                {isDragActive 
                  ? "Drop the image here..." 
                  : "Drag & drop an image here, or click to select"
                }
              </p>
              <small>Supports: JPG, PNG, WebP (max 16MB)</small>
            </div>
          )}
        </div>

        {/* Analysis Options */}
        {selectedFile && (
          <div className="analysis-options">
            <div className="form-group">
              <label htmlFor="mealType">🍽️ Meal Type:</label>
              <select 
                id="mealType"
                value={mealType} 
                onChange={(e) => setMealType(e.target.value)}
                disabled={isAnalyzing}
              >
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">☀️ Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="snack">🍪 Snack</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">📝 Notes (optional):</label>
              <textarea 
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information about this meal..."
                disabled={isAnalyzing}
                rows={3}
              />
            </div>

            <button 
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedFile}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  🤖 Analyze with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {isAnalyzing && (
          <ProgressBar 
            progress={analysisProgress}
            message={progressMessage}
            isVisible={true}
          />
        )}

        {/* Analysis Stage Indicator */}
        {isAnalyzing && (
          <div className="analysis-stages">
            <div className={`stage ${analysisStage === 'uploading' ? 'active' : analysisProgress > 15 ? 'complete' : ''}`}>
              📤 Uploading
            </div>
            <div className={`stage ${analysisStage === 'analyzing' ? 'active' : analysisProgress > 35 ? 'complete' : ''}`}>
              🤖 AI Analysis
            </div>
            <div className={`stage ${analysisStage === 'processing' ? 'active' : analysisProgress > 60 ? 'complete' : ''}`}>
              🍽️ Food ID
            </div>
            <div className={`stage ${analysisStage === 'calculating' ? 'active' : analysisProgress > 80 ? 'complete' : ''}`}>
              📊 Nutrition
            </div>
            <div className={`stage ${analysisStage === 'complete' ? 'active complete' : ''}`}>
              ✅ Complete
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default EnhancedImageUpload;
