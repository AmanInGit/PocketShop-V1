/**
 * Business Landing Page
 * 
 * Dedicated landing page for businesses/vendors with login and register functionality.
 * This is the page that users navigate to when clicking Business section.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { Loader2 } from 'lucide-react';
import Logo from '@/features/common/components/Logo';

const BusinessLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const [footerAccordions, setFooterAccordions] = useState({
    platform: false,
    resources: false,
    company: false,
  });
  
  // Scroll to top when component mounts (fixes issue where page shows content from previous scroll position)
  useEffect(() => {
    // Scroll to top immediately when page loads
    // Use multiple methods for maximum browser compatibility
    window.scrollTo(0, 0);
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, []);

  // Redirect based on onboarding status if already logged in
  useEffect(() => {
    let isMounted = true;
    
    const checkAndRedirect = async () => {
      if (loading) {
        return;
      }

      if (!user) {
        return;
      }

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!isMounted) return;
        
        if (session?.user?.email && !session.user.email_confirmed_at) {
          console.log('Email not confirmed, staying on page');
          return;
        }
        
        const { getOnboardingRedirectPath } = await import('@/features/common/utils/onboardingCheck');
        const redirectPath = await getOnboardingRedirectPath(user.id);
        
        if (!isMounted) return;
        
        if (window.location.pathname !== redirectPath) {
          console.log('Redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
        }
      } catch (err) {
        console.error('Error checking session/onboarding:', err);
        // Do not send to onboarding on error – user may not be logged in. Stay on page or go to login.
        if (isMounted && window.location.pathname === ROUTES.BUSINESS) {
          // Stay on business page so they can click Sign In or Get Started
        }
      }
    };

    const timer = setTimeout(() => {
      checkAndRedirect();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    navigate(ROUTES.REGISTER);
  };

  const handleSignInClick = () => {
    navigate(ROUTES.LOGIN);
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-transparent backdrop-blur-md border-b border-white/10 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/">
              <Logo size="md" />
            </Link>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={handleSignInClick}
                className="bg-white/10 hover:bg-white/20 text-white px-3 md:px-6 py-1.5 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors border border-white/30"
              >
                Sign In
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white px-3 md:px-6 py-1.5 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 py-20 md:pt-28 lg:pt-32 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Empower Your{' '}
              <span className="text-pink-500">Business</span>
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Join thousands of businesses using PocketShop to reach more
              customers, track sales, and grow with data-driven insights.
            </p>
          </div>

          {/* Before/After Comparison */}
          <div className="mb-16">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Before - Darker, Desaturated Glass Card */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-400 mb-6">Before</h3>
                <div className="bg-purple-900/20 backdrop-blur-md rounded-xl p-8 border border-purple-800/30 shadow-lg">
                  <ul className="space-y-4 text-white/70 text-left">
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>Relied on "data-blind" intuition for big decisions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>Manual, cumbersome order tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>Verbal orders prone to miscommunication and errors</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>Customers left waiting with no order status</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>Static menus that are hard to update</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-700 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                      <span>High costs and complex training for other "solutions"</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* After - Brighter Glass Card with Pink Border */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-pink-500 mb-6">After</h3>
                <div className="bg-purple-800/25 backdrop-blur-md rounded-xl p-8 border border-pink-500/50 shadow-lg relative">
                  <ul className="space-y-4 text-white text-left">
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>Data-driven decision-making with an AI-powered engine</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>A smart dashboard with live, real-time orders</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>Customers place their own accurate, customized digital orders</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>Customers track their order status in real-time</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>Dynamic menu customization from your dashboard</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-pink-500 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                      <span>A lightweight, cost-effective platform with no new hardware needed</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* Feature 1 - Orders */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Order Management</h3>
              <p className="text-white/70 text-sm">
                Manage all your orders in one place with real-time updates
                and notifications.
              </p>
            </div>

            {/* Feature 2 - Analytics */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analytics</h3>
              <p className="text-white/70 text-sm">
                Get insights into your sales, customer behavior, and business
                performance.
              </p>
            </div>

            {/* Feature 3 - Menu */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Menu Management</h3>
              <p className="text-white/70 text-sm">
                Easily create and update your menu with photos, descriptions,
                and pricing.
              </p>
            </div>

            {/* Feature 4 - Payments */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="w-12 h-12 bg-yellow-500/30 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-yellow-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Payments</h3>
              <p className="text-white/70 text-sm">
                Secure payment processing with multiple payment options for
                your customers.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-12 border border-pink-500/30 mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Get Started for Free
            </h2>
            <p className="text-white/80 mb-8 text-lg">
              No credit card required. Start growing your business today.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg"
              >
                Sign Up Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black/60 backdrop-blur-md border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12">
            {/* Left Section - Brand Info */}
            <div className="lg:col-span-2">
              <Logo size="lg" />
              <p className="text-white/80 text-lg font-medium mt-4 mb-3">
                Empower Your Business
              </p>
              <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
                Join thousands of businesses using PocketShop to reach more customers, 
                track sales, and grow with data-driven insights.
              </p>
              
              {/* Social Media Icons - No Dark Boxes */}
              <div className="flex gap-4 justify-center md:justify-start mb-8 md:mb-0">
                <a
                  href="#"
                  className="group transition-all duration-300 hover:scale-110"
                >
                  <svg 
                    className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-300" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="group transition-all duration-300 hover:scale-110"
                >
                  <svg 
                    className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-300" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.317 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="#"
                  className="group transition-all duration-300 hover:scale-110"
                >
                  <svg 
                    className="w-6 h-6 text-white/70 group-hover:text-white transition-colors duration-300" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Section - Navigation Links */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 md:mt-0">
              {/* Platform */}
              <div>
                <button
                  onClick={() => setFooterAccordions(prev => ({ ...prev, platform: !prev.platform }))}
                  className="md:pointer-events-none w-full md:w-auto flex items-center justify-between md:justify-start mb-4"
                >
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide relative inline-block">
                    Platform
                    <span className="hidden md:block absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></span>
                  </h4>
                  <svg 
                    className={`md:hidden w-5 h-5 text-white transition-transform ${footerAccordions.platform ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <ul className={`space-y-3 mt-6 ${footerAccordions.platform ? 'block' : 'hidden md:block'}`}>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Order Management
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Order Management
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Analytics
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Analytics
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Menu Management
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Menu Management
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <Link 
                      to={ROUTES.HELP_CENTER}
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Payments
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Payments
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <button
                  onClick={() => setFooterAccordions(prev => ({ ...prev, resources: !prev.resources }))}
                  className="md:pointer-events-none w-full md:w-auto flex items-center justify-between md:justify-start mb-4"
                >
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide relative inline-block">
                    Resources
                    <span className="hidden md:block absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></span>
                  </h4>
                  <svg 
                    className={`md:hidden w-5 h-5 text-white transition-transform ${footerAccordions.resources ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <ul className={`space-y-3 mt-6 ${footerAccordions.resources ? 'block' : 'hidden md:block'}`}>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Help Center
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Help Center
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <Link 
                      to={ROUTES.DOCUMENTATION}
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Documentation
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Documentation
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to={ROUTES.BLOG}
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Blog
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Blog
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Community
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Community
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <button
                  onClick={() => setFooterAccordions(prev => ({ ...prev, company: !prev.company }))}
                  className="md:pointer-events-none w-full md:w-auto flex items-center justify-between md:justify-start mb-4"
                >
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide relative inline-block">
                    Company
                    <span className="hidden md:block absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></span>
                  </h4>
                  <svg 
                    className={`md:hidden w-5 h-5 text-white transition-transform ${footerAccordions.company ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <ul className={`space-y-3 mt-6 ${footerAccordions.company ? 'block' : 'hidden md:block'}`}>
                  <li>
                    <Link
                      to="/"
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        For Customers
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        For Customers
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="/about-us"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        About Us
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        About Us
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Privacy Policy
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Privacy Policy
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#" 
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        Terms of Service
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Terms of Service
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Section */}
          <div className="border-t border-white/10 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/60 text-sm text-center md:text-left mb-4 md:mb-0">
                © 2026 PocketShop. All rights reserved.
              </p>
              <p className="text-white/60 text-sm text-center md:text-right">
                Made with <span className="text-pink-500">❤️</span> for local businesses
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BusinessLandingPage;

