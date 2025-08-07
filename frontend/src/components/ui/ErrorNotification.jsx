import React from 'react';
import './ErrorNotification.css';

const ErrorNotification = ({ message, type = 'error', onClose, isVisible = false }) => {
  if (!isVisible || !message) return null;

  const getIcon = () => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'auth': return '🔒';
      default: return '❌';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': return 'Information';
      case 'auth': return 'Authentication Required';
      default: return 'Error';
    }
  };

  return (
    <div className={`error-notification ${type}`}>
      <div className="error-content">
        <div className="error-header">
          <span className="error-icon">{getIcon()}</span>
          <span className="error-title">{getTitle()}</span>
          {onClose && (
            <button className="error-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
        <div className="error-message">
          {message}
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
