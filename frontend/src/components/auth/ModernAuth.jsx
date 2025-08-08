import React, { useState, useEffect } from 'react';
import './ModernAuth.css';

const ModernAuth = ({ onLogin, onClose, setError }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    acceptTerms: false
  });

  useEffect(() => {
    // Load particles.js script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
    script.onload = () => {
      if (window.particlesJS) {
        window.particlesJS('particles-js', {
          particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#d4d4d8" },
            shape: { type: "circle" },
            opacity: { value: 0.4, random: false },
            size: { value: 3, random: true },
            line_linked: {
              enable: true,
              distance: 150,
              color: "#a1a1aa",
              opacity: 0.3,
              width: 1
            },
            move: {
              enable: true,
              speed: 2,
              direction: "none",
              random: false,
              straight: false,
              out_mode: "out",
              bounce: false
            }
          },
          interactivity: {
            detect_on: "canvas",
            events: {
              onhover: { enable: true, mode: "repulse" },
              onclick: { enable: true, mode: "push" },
              resize: true
            },
            modes: {
              repulse: { distance: 100, duration: 0.4 },
              push: { particles_nb: 4 }
            }
          },
          retina_detect: true
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        // Login logic
        await onLogin(formData.email, formData.password);
      } else {
        // Register logic
        if (!formData.acceptTerms) {
          setError('Please accept the terms and conditions');
          setIsLoading(false);
          return;
        }
        
        // Call register API
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            full_name: formData.fullName,
            email: formData.email,
            password: formData.password
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Auto login after successful registration
        await onLogin(data.access_token, data.user);
      }
    } catch (error) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      password: '',
      acceptTerms: false
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="max-w-4xl w-full bg-white backdrop-blur-lg rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 flex flex-col md:flex-row">
        {/* Dark Particles Visualization Column */}
        <div className="md:w-1/2 h-72 md:h-auto relative bg-gradient-to-br from-neutral-900 to-neutral-800" id="particles-container">
          <div id="particles-js"></div>
          <div className="absolute top-6 left-6 z-10">
            <span className="px-3 py-1 bg-neutral-700/80 rounded-full text-xs text-neutral-300 mb-3 inline-block">
              NETWORK
            </span>
            <h2 className="heading-font text-3xl text-white">
              {isLogin ? 'Welcome' : 'Join Our'}
            </h2>
            <h2 className="heading-font text-3xl text-white">
              {isLogin ? 'Back' : 'Community'}
            </h2>
            <div className="h-1 w-16 bg-neutral-400 mt-3 rounded-full"></div>
          </div>
          <div className="absolute bottom-6 left-6 bg-neutral-800/80 backdrop-blur-sm rounded-lg px-4 py-3 z-10 border border-neutral-700">
            <div className="text-xs text-neutral-400 mb-1">Active Members</div>
            <div className="heading-font text-lg text-neutral-200">12,847</div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-neutral-300 transition-colors z-20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Light Sign Up/Login Form Column */}
        <div className="md:w-1/2 p-8 bg-white">
          <div>
            <span className="px-3 py-1 bg-neutral-100 rounded-full text-xs text-neutral-500 mb-4 inline-block">
              {isLogin ? 'SIGN IN' : 'GET STARTED'}
            </span>
            <h3 className="heading-font text-2xl text-neutral-800 mb-2">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h3>
            <p className="text-neutral-500 text-sm mb-8">
              {isLogin 
                ? 'Access your nutrition dashboard and continue your journey'
                : 'Join thousands of professionals in our growing network'
              }
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-2 tracking-wide">
                      USERNAME
                    </label>
                    <input 
                      type="text" 
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition text-sm" 
                      placeholder="john_doe"
                      required={!isLogin}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-2 tracking-wide">
                      FULL NAME
                    </label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition text-sm" 
                      placeholder="John Doe"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2 tracking-wide">
                  EMAIL ADDRESS
                </label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition text-sm" 
                  placeholder="john@company.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2 tracking-wide">
                  PASSWORD
                </label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 transition text-sm" 
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {!isLogin && (
                <div className="flex items-start">
                  <input 
                    type="checkbox" 
                    id="terms" 
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="w-4 h-4 bg-neutral-50 border border-neutral-300 rounded mt-0.5"
                  />
                  <label htmlFor="terms" className="ml-3 text-xs text-neutral-500 leading-relaxed">
                    I agree to the <span className="text-neutral-700 underline">Terms of Service</span> and <span className="text-neutral-700 underline">Privacy Policy</span>
                  </label>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full px-6 py-3 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-400 text-white rounded-lg transition heading-font text-sm flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
              <p className="text-xs text-neutral-500">
                {isLogin ? "Don't have an account?" : 'Already have an account?'} 
                <button 
                  onClick={toggleMode}
                  className="text-neutral-700 hover:text-neutral-800 underline transition ml-1"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernAuth;
