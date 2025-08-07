import React from 'react';
import { authService } from '../../services/authService';
import './AuthGuard.css';

const AuthGuard = ({ children, onLoginRequired }) => {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return (
      <div className="auth-required-overlay">
        <div className="auth-required-content">
          <div className="auth-icon">🔒</div>
          <h3>Authentication Required</h3>
          <p>You need to login to access this feature</p>
          <div className="auth-actions">
            <button 
              className="btn-primary" 
              onClick={onLoginRequired}
            >
              Login Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
