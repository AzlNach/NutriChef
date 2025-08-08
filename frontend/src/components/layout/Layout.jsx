import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/layout/Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigation items
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Analyze', path: '/analyze' },
    { name: 'History', path: '/history' },
    { name: 'Dashboard', path: '/dashboard' }
  ];

  const handleMenuClick = (item) => {
    handleNavigation(item.path);
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/');
  };

  const handleBrandClick = () => {
    navigate('/');
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-container">
          {/* Logo */}
          <div className="header-brand">
            <button 
              className="brand-logo clickable-brand" 
              onClick={handleBrandClick}
            >
              <svg className="logo-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="white" />
              </svg>
              <div className="brand-text">
                <h1 className="brand-title">NutriChef</h1>
                <span className="brand-subtitle">AI-Powered Nutrition Analysis</span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item)}
                className={`nav-link ${
                  isActivePath(item.path) ? 'nav-link-active' : ''
                }`}
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-button md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="mobile-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* User Menu */}
          <div className="user-menu">
            {user ? (
              <div className="profile-section">
                <div className="user-info-text">
                  <span className="user-name-display">{user.full_name || user.username}</span>
                  <span className="user-role-display">Member</span>
                </div>
                <div className="profile-dropdown" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="profile-button"
                  >
                    <img
                      className="profile-avatar"
                      src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=10b981&color=fff`}
                      alt="User profile"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=10b981&color=fff`;
                      }}
                    />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {profileOpen && (
                    <div className="dropdown-menu">
                      <div className="dropdown-header">
                        <p className="dropdown-name">{user.full_name || user.username}</p>
                        <p className="dropdown-email">{user.email}</p>
                      </div>
                      <button 
                        onClick={() => {
                          handleNavigation('/profile');
                          setProfileOpen(false);
                        }}
                        className="dropdown-item"
                      >
                        <span className="dropdown-icon">👤</span>
                        Profile
                      </button>
                      <button 
                        onClick={() => {
                          handleNavigation('/settings');
                          setProfileOpen(false);
                        }}
                        className="dropdown-item"
                      >
                        <span className="dropdown-icon">⚙️</span>
                        Settings
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="dropdown-item logout-item"
                      >
                        <span className="dropdown-icon">🚪</span>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="auth-buttons">
                <button
                  onClick={() => handleNavigation('/login')}
                  className="login-button"
                >
                  Login
                </button>
                <button
                  onClick={() => handleNavigation('/register')}
                  className="register-button"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-nav">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item)}
                className={`mobile-nav-link ${
                  isActivePath(item.path) ? 'mobile-nav-link-active' : ''
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="app-main">
        <div className="main-container">
          {children}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <svg className="footer-logo-icon" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="white" />
              </svg>
              <div className="footer-text">
                <h3 className="footer-title">NutriChef</h3>
                <p className="footer-tagline">AI-Powered Nutrition Analysis</p>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-section">
                <h4>Features</h4>
                <ul>
                  <li><a href="#analyze">Food Analysis</a></li>
                  <li><a href="#nutrition">Nutrition Tracking</a></li>
                  <li><a href="#history">Analysis History</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Support</h4>
                <ul>
                  <li><a href="#help">Help Center</a></li>
                  <li><a href="#contact">Contact</a></li>
                  <li><a href="#docs">Documentation</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Company</h4>
                <ul>
                  <li><a href="#about">About</a></li>
                  <li><a href="#privacy">Privacy</a></li>
                  <li><a href="#terms">Terms</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 NutriChef. All rights reserved.</p>
            <div className="footer-meta">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
