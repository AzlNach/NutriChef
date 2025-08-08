import React from 'react';
import './ErrorNotification.css';

const ErrorNotification = ({ message, type = 'error', onClose, isVisible = false }) => {
  if (!isVisible || !message) return null;

  const getIcon = () => {
    switch (type) {
      case 'error': 
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning': 
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info': 
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'auth': 
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default: return '❌';
    }
  };

  const getClasses = () => {
    const baseClasses = "fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-lg border transform transition-all duration-300 ease-in-out";
    switch (type) {
      case 'error': return `${baseClasses} border-red-200`;
      case 'warning': return `${baseClasses} border-yellow-200`;
      case 'info': return `${baseClasses} border-blue-200`;
      case 'auth': return `${baseClasses} border-purple-200`;
      default: return `${baseClasses} border-red-200`;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'auth': return 'text-purple-600 bg-purple-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className={getClasses()}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 rounded-full p-2 ${getColorClasses()}`}>
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {message}
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="flex-shrink-0 ml-4 rounded-full p-1 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorNotification;
