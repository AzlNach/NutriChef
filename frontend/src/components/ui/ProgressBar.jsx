import React from 'react';

const ProgressBar = ({ progress, message, isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-md border border-gray-200 border-opacity-30 rounded-2xl p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="flex-1">
          <p className="text-gray-900 font-medium text-sm">
            {message || 'Processing...'}
          </p>
          <p className="text-gray-600 text-xs">
            Please wait while we analyze your food
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-emerald-600">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
          </div>
        </div>
        
        {/* Pulse effect on progress bar */}
        <div 
          className="absolute top-0 h-3 bg-emerald-400 rounded-full opacity-30 animate-pulse"
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      
      {/* Progress stages indicator */}
      <div className="flex justify-between mt-4 text-xs">
        <span className={`transition-colors duration-300 ${progress >= 20 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
          Upload
        </span>
        <span className={`transition-colors duration-300 ${progress >= 40 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
          Analysis
        </span>
        <span className={`transition-colors duration-300 ${progress >= 70 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
          Processing
        </span>
        <span className={`transition-colors duration-300 ${progress >= 100 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
          Complete
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
