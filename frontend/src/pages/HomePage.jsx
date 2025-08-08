import React, { useEffect } from 'react';

const HomePage = ({ 
  onLoginRequired, 
  isAuthenticated 
}) => {
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const logoText = document.getElementById('logo-text');
    const welcomeText = document.getElementById('welcome-text');

    // Fungsi untuk mengubah gaya navbar
    function changeNavbarStyle() {
      // Dapatkan posisi gulir saat ini
      const scrollPosition = window.scrollY;

      // Tentukan titik di mana perubahan harus terjadi.
      // Di sini, kita menggunakan 90vh (90% dari tinggi viewport),
      // yang berarti saat kita gulir hampir satu layar penuh, navbar akan berubah.
      const changePoint = window.innerHeight * 0.9;

      if (scrollPosition > changePoint) {
        // Ketika posisi gulir melewati titik perubahan,
        // ubah latar belakang navbar menjadi putih
        // dan warna teks menjadi hitam.
        if (navbar) {
          navbar.classList.add('bg-white', 'shadow-md');
          navbar.classList.remove('bg-transparent');
        }
        
        // Ubah warna teks navbar menjadi hitam
        if (logoText) {
          logoText.classList.remove('text-white');
          logoText.classList.add('text-black');
        }
        
        if (welcomeText) {
          welcomeText.classList.remove('text-white');
          welcomeText.classList.add('text-black');
        }
        
        navLinks.forEach(link => {
          link.classList.remove('text-white');
          link.classList.add('text-black');
        });
      } else {
        // Ketika posisi gulir berada di atas titik perubahan,
        // kembalikan navbar ke gaya transparan
        // dengan warna teks putih.
        if (navbar) {
          navbar.classList.remove('bg-white', 'shadow-md');
          navbar.classList.add('bg-transparent');
        }
        
        // Ubah warna teks navbar menjadi putih
        if (logoText) {
          logoText.classList.remove('text-black');
          logoText.classList.add('text-white');
        }
        
        if (welcomeText) {
          welcomeText.classList.remove('text-black');
          welcomeText.classList.add('text-white');
        }
        
        navLinks.forEach(link => {
          link.classList.remove('text-black');
          link.classList.add('text-white');
        });
      }
    }

    // Tambahkan event listener untuk mendengarkan peristiwa gulir
    window.addEventListener('scroll', changeNavbarStyle);

    // Panggil fungsi sekali saat halaman dimuat
    changeNavbarStyle();

    // Cleanup function
    return () => {
      window.removeEventListener('scroll', changeNavbarStyle);
    };
  }, []);

  // Fungsi untuk scroll ke section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Spline 3D Background */}
      <div className="fixed inset-0 z-0">
        <iframe 
          src="https://my.spline.design/thresholddarkambientui-v0gkZCfi6zXm69kE0wccy70f/" 
          frameBorder="0" 
          width="100%" 
          height="100%" 
          className="w-full h-full"
        />
      </div>

      {/* Glass Floating Navbar */}
      <nav id="navbar" className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-white bg-opacity-5 border-white border-opacity-10 border rounded-full px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="white" />
            </svg>
            <span id="logo-text" className="ml-2 text-sm font-medium text-white">FoodVision</span>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-xs text-gray-300 ml-8">
            <button 
              onClick={() => scrollToSection('features-section')} 
              className="nav-link transition-colors text-white"
            >
              Features
            </button>
            <button 
              onClick={() => scrollToSection('testimonials')} 
              className="nav-link transition-colors text-white"
            >
              Reviews
            </button>
            
            <button 
                  onClick={onLoginRequired}
                  className="nav-link transition-colors text-white"
                >
                  Login
              </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 pb-32 md:pt-40 md:pb-40 text-center min-h-screen">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 bg-white opacity-5 blur-[100px] rounded-full pointer-events-none" />
        
        <span className="px-3 py-1 text-xs font-medium text-white bg-white bg-opacity-10 backdrop-blur-sm rounded-full mb-8 border border-white border-opacity-20">
          AI Nutrition Studio
        </span>
        
        <h1 className="md:text-6xl max-w-4xl leading-tight text-4xl font-medium tracking-tighter text-white">
          Crafting nutritional awareness through AI-powered analysis
        </h1>
        
        <p className="md:text-xl max-w-2xl text-lg text-neutral-300 mt-6">
          We believe in the power of understanding your food. Clean insights, purposeful tracking, 
          and thoughtful nutrition guidance that speaks volumes.
        </p>
        
        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onLoginRequired}
            className="px-8 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Analyze Your Food
          </button>
          <button 
            onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 bg-white bg-opacity-10 backdrop-blur-sm text-white font-medium rounded-full hover:bg-opacity-20 transition-all duration-300 border border-white border-opacity-20"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Main Content Section - White Background */}
      <div className="relative z-10 bg-white">
        
        {/* Features Grid Section */}
        <section id="features-section" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Why Choose FoodVision
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Powerful AI-driven nutrition analysis designed for health-conscious individuals
              </p>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 h-[800px] lg:h-[600px]">
              {/* AI Analysis Card - Large */}
              <div className="col-span-2 md:col-span-2 lg:col-span-3 row-span-1">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl group h-full bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="p-8 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="font-serif text-xl lg:text-2xl font-medium leading-tight mb-4 text-gray-900">
                        AI-Powered
                        <span className="italic font-light text-blue-700"> Analysis</span>
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        Advanced computer vision technology identifies food items and calculates precise nutritional values instantly.
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Accuracy rate</span>
                          <span className="font-semibold text-blue-600">95%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Processing time</span>
                          <span className="font-semibold text-blue-600">&lt; 3s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutrition Tracking Card */}
              <div className="col-span-2 md:col-span-2 lg:col-span-2 row-span-1">
                <div className="h-full rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 p-6 lg:p-8 relative overflow-hidden shadow-2xl group">
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="px-3 py-1 bg-emerald-100 rounded-full text-xs font-medium text-emerald-700">
                          Track Everything
                        </div>
                      </div>
                      
                      <h3 className="font-serif text-xl lg:text-2xl font-medium leading-tight mb-4 text-gray-900">
                        Complete
                        <span className="italic font-light text-emerald-700"> Nutrition</span>
                      </h3>
                      
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span>Macro & Micronutrients</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span>Calorie Breakdown</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span>Vitamin Analysis</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          <span>Health Insights</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Card */}
              <div className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1">
                <div className="h-full rounded-3xl bg-white p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 group">
                  <div>
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="font-serif text-lg font-medium leading-tight mb-3 text-gray-900">
                      Privacy
                      <span className="italic font-light text-gray-600"> First</span>
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Your data stays secure with end-to-end encryption and local processing.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      GDPR Compliant
                    </div>
                  </div>
                </div>
              </div>

              {/* Speed Card */}
              <div className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1">
                <div className="h-full rounded-3xl bg-gradient-to-br from-orange-50 to-red-50 p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                  <div>
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-serif text-lg lg:text-xl font-medium leading-tight mb-3 text-gray-900">
                      Lightning
                      <span className="italic font-light text-orange-700"> Fast</span>
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Get instant results with our optimized AI models and cloud infrastructure.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">&lt;3s</div>
                      <div className="text-xs text-gray-500">Analysis time</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Card */}
              <div className="col-span-2 md:col-span-2 lg:col-span-2 row-span-1">
                <div className="h-full rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                  <div>
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <h3 className="font-serif text-lg lg:text-xl font-medium leading-tight mb-3 text-gray-900">
                      Developer
                      <span className="italic font-light text-purple-700"> Friendly</span>
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      RESTful API with comprehensive documentation for seamless integration.
                    </p>
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Open API
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-gray-900">
                Hearing From The People Who Matter <span className="inline-block">📝</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Real stories from real users who've transformed their nutrition journey.
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              {/* Testimonial 1 */}
              <div className="relative flex flex-col lg:flex-row bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition duration-300 ease-out">
                <div className="w-full lg:w-56 h-56 bg-gradient-to-br from-emerald-100 to-green-100 rounded-t-xl lg:rounded-t-none lg:rounded-l-xl flex items-center justify-center">
                  <svg className="w-20 h-20 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="p-6 flex flex-col justify-between grow">
                  <blockquote className="text-xl lg:text-2xl font-medium text-gray-900 leading-snug mb-4">
                    "FoodVision completely changed how I track my nutrition. The AI accuracy is incredible!"
                  </blockquote>
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-600 font-semibold">AF</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Alexandra Fisher</p>
                      <p className="text-sm text-gray-500">Nutritionist @ WellnessCorp</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="relative bg-gray-100 rounded-2xl p-8 lg:p-10 flex flex-col space-y-6 border border-gray-200 hover:border-gray-300 transition duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">DW</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">David Wang</p>
                    <p className="text-sm text-gray-500">Fitness Coach @ FitLife</p>
                  </div>
                </div>
                <blockquote className="text-lg lg:text-xl font-medium text-gray-800 leading-snug">
                  "The interface is beautifully designed and the insights help my clients understand their eating habits better."
                </blockquote>
                <div className="flex text-gray-400 space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Free to start - No credit card required
            </div>
            <h2 className="font-serif text-3xl font-medium mb-4 text-gray-900">Ready to Transform Your Nutrition?</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Join thousands of users who've discovered smarter eating with AI-powered food analysis.
            </p>
            <button 
              onClick={onLoginRequired}
              className="btn-custom px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              style={{
                color: '#090909',
                background: '#e8e8e8',
                border: '1px solid #e8e8e8',
                boxShadow: '6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff'
              }}
            >
              Start Your Journey Today
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" fill="white" />
                  </svg>
                  <span className="ml-2 text-lg font-semibold text-gray-900">FoodVision</span>
                </div>
                <p className="text-gray-600 text-sm">
                  AI-powered nutrition analysis for healthier living.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">API</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Pricing</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#" className="hover:text-gray-900 transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Support</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-gray-900 transition-colors">Terms</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
              <p>&copy; 2025 FoodVision. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
