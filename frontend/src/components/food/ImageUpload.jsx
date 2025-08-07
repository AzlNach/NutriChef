import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ProgressBar from '../ui/ProgressBar';
import './ImageUpload.css';

const ImageUpload = ({ onImageUpload, onAnalyze, isAnalyzing = false, uploadedFile = null, isAuthenticated = false, onLoginRequired }) => {
  const [preview, setPreview] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    // Check authentication first
    if (!isAuthenticated) {
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

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
  }, [onImageUpload, isAuthenticated, onLoginRequired]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 16777216, // 16MB
    disabled: isAnalyzing
  });

  const handleAnalyze = async () => {
    if (!isAuthenticated) {
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

    if (selectedFile && onAnalyze) {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('meal_type', mealType);
      if (notes) formData.append('notes', notes);
      
      try {
        console.log('🔍 Triggering Gemini AI Analysis...');
        
        // Simulate progress for better UX
        setAnalysisProgress(0);
        setProgressMessage('Preparing image for analysis...');
        
        setTimeout(() => {
          setAnalysisProgress(25);
          setProgressMessage('Sending to Gemini AI...');
        }, 500);
        
        setTimeout(() => {
          setAnalysisProgress(50);
          setProgressMessage('AI is analyzing food items...');
        }, 1500);
        
        setTimeout(() => {
          setAnalysisProgress(75);
          setProgressMessage('Calculating nutrition data...');
        }, 3000);
        
        setTimeout(() => {
          setAnalysisProgress(90);
          setProgressMessage('Finalizing results...');
        }, 4000);
        
        await onAnalyze(formData);
        
        setAnalysisProgress(100);
        setProgressMessage('Analysis complete!');
        
        // Reset progress after completion
        setTimeout(() => {
          setAnalysisProgress(0);
          setProgressMessage('');
        }, 1000);
        
      } catch (error) {
        console.error('❌ Analysis failed:', error);
        setAnalysisProgress(0);
        setProgressMessage('');
      }
    }
  };

  const clearImage = () => {
    setPreview(null);
    setSelectedFile(null);
    setNotes('');
  };

  return (
    <div className="image-upload-container">
      {/* Authentication Notice */}
      {!isAuthenticated && (
        <div className="auth-notice">
          <div className="auth-notice-icon">🔐</div>
          <div className="auth-notice-content">
            <h3>Login Required</h3>
            <p>Please login to your account before uploading food images for analysis.</p>
            <button 
              className="auth-notice-button"
              onClick={onLoginRequired}
            >
              Login Now
            </button>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <>
          <div className="meal-type-selector">
            <label htmlFor="meal-type">Meal Type:</label>
            <select
              id="meal-type"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              disabled={isAnalyzing}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {/* Progress Bar */}
          {isAnalyzing && (
            <ProgressBar 
              progress={analysisProgress}
              message={progressMessage}
              isVisible={isAnalyzing}
            />
          )}

          {!preview ? (
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''} ${isAnalyzing ? 'loading' : ''}`}
            >
              <input {...getInputProps()} />
              {isAnalyzing ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>🤖 Gemini AI is analyzing your food...</p>
                </div>
              ) : isDragActive ? (
                <p>Drop the food image here...</p>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📸</div>
                  <p>Drag & drop a food image here, or click to select</p>
                  <small>Supports JPG, PNG, WebP up to 16MB</small>
                </div>
              )}
            </div>
          ) : (
            <div className="preview-container">
              <img src={preview} alt="Food preview" className="preview-image" />
              <div className="preview-actions">
                <button 
                  onClick={handleAnalyze}
                  className="analyze-button"
                  disabled={isAnalyzing || !selectedFile}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="spinner-small"></div>
                      🤖 Analyzing with Gemini...
                    </>
                  ) : (
                    <>
                      🔍 Analyze with Gemini AI
                    </>
                  )}
                </button>
                <button 
                  onClick={clearImage} 
                  className="clear-button"
                  disabled={isAnalyzing}
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}

          <div className="notes-section">
            <label htmlFor="notes">Notes (optional):</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about this meal..."
              disabled={isAnalyzing}
              rows={3}
            />
          </div>

          <div className="upload-tips">
            <h4>📝 Tips for better analysis:</h4>
            <ul>
              <li>Ensure good lighting</li>
              <li>Include all food items in frame</li>
              <li>Avoid shadows or glare</li>
              <li>Take photo from above when possible</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ImageUpload;
