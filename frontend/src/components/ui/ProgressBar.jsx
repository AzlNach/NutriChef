import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ progress, message, isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="progress-bar-container">
      <div className="progress-message">
        <span className="progress-icon">🤖</span>
        {message || 'Processing...'}
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      <div className="progress-text">
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default ProgressBar;
