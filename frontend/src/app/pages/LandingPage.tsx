/**
 * Landing Page Component
 * 
 * Main landing page inspired by magicpin design with split Customer/Business view.
 * Features a modern design with dark blue/purple theme and city silhouettes.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, X, Lock } from 'lucide-react';
import { ROUTES, storefrontPath } from '@/constants/routes';
import { useBestOffer } from '@/hooks/useBestOffer';
import { OffersCarousel } from '@/components/marketing/OffersCarousel';
import { GOOGLE_MAPS_LIBRARIES } from '@/constants/maps';
import { useLoadScript } from '@react-google-maps/api';
import Logo from '@/features/common/components/Logo';
import LocationDetector, { LocationDetectorRef } from '@/features/common/components/LocationDetector';
import PlacesAutocomplete from '@/features/common/components/PlacesAutocomplete';

// Category card images (from assets - uses your transparent PNGs)
import imgQuickBites from '@/assets/images/categories/quick-bites.png';
import imgFineDining from '@/assets/images/categories/fine-dining.png';
import imgFashion from '@/assets/images/categories/fashion.png';
import imgSalons from '@/assets/images/categories/salons.png';
import imgMedicare from '@/assets/images/categories/medicare.png';
import imgLocalStores from '@/assets/images/categories/local-stores.png';

const CATEGORY_IMAGES = {
  fashion: imgFashion,
  salons: imgSalons,
  quickBites: imgQuickBites,
  medicare: imgMedicare,
  fineDining: imgFineDining,
  localStores: imgLocalStores,
} as const;

const LandingPage: React.FC = () => {
  const [searchLocation, setSearchLocation] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const desktopLocationBtnRef = useRef<LocationDetectorRef>(null);
  const mobileLocationBtnRef = useRef<LocationDetectorRef>(null);
  const [footerAccordions, setFooterAccordions] = useState({
    platform: false,
    resources: false,
    company: false,
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const navigate = useNavigate();
  const { landingOffers, isLoading: bestOfferLoading } = useBestOffer();

  const clearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchLocation('');
    setUserLocation(null);
  };

  // Load Google Maps script with Places library
  const { isLoaded: isMapsLoaded, loadError: mapsLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      // If deferredPrompt is not available, show a message or fallback
      alert('The app can be installed from your browser menu (usually in the address bar).');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  const handleBusinessClick = () => {
    // Take users to register so they sign up first; no redirect to onboarding without account
    navigate(ROUTES.REGISTER);
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Open role selection so users can choose Customer vs Business
    setShowRoleSelector(true);
  };

  // Handle location detection
  const handleLocationDetected = (location: { latitude: number; longitude: number; address?: string }) => {
    // TODO: Integrate backend geolocation coordinates API for persistent, server-verified location data.
    setUserLocation({ latitude: location.latitude, longitude: location.longitude });
    if (location.address) {
      setSearchLocation(location.address);
    } else {
      // Reverse geocode could be added here to get address from coordinates
      setSearchLocation(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
    }
  };

  // Handle place selection from autocomplete
  const handlePlaceSelected = (place: { address: string; latitude: number; longitude: number }) => {
    // TODO: Connect search query flow to backend API to return live vendors/deals for this selected location.
    setSearchLocation(place.address);
    setUserLocation({ latitude: place.latitude, longitude: place.longitude });
  };

  const mapsUnavailable = Boolean(mapsLoadError);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 relative overflow-hidden">
      {/* Rich City Skyline Background with Labels */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full"
          viewBox="0 0 1400 900"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Building 1 - Fashion Store */}
          <rect x="50" y="550" width="100" height="350" fill="#6366f1" rx="4" />
          <rect x="70" y="570" width="60" height="80" fill="#818cf8" opacity="0.6" />
          <rect x="70" y="680" width="60" height="80" fill="#818cf8" opacity="0.6" />
          <text x="75" y="820" fill="#c4b5fd" fontSize="14" fontWeight="bold" transform="rotate(-90 75 820)">FASHION</text>
          
          {/* Building 2 - Restaurant */}
          <rect x="180" y="480" width="120" height="420" fill="#7c3aed" rx="4" />
          <rect x="200" y="500" width="30" height="40" fill="#a78bfa" opacity="0.7" />
          <rect x="245" y="500" width="30" height="40" fill="#a78bfa" opacity="0.7" />
          <rect x="200" y="560" width="30" height="40" fill="#a78bfa" opacity="0.7" />
          <rect x="245" y="560" width="30" height="40" fill="#a78bfa" opacity="0.7" />
          <text x="240" y="850" fill="#c4b5fd" fontSize="16" fontWeight="bold">RESTAURANT</text>
          
          {/* Building 3 - Gym */}
          <rect x="340" y="520" width="90" height="380" fill="#4f46e5" rx="4" />
          <rect x="355" y="540" width="60" height="100" fill="#6366f1" opacity="0.5" />
          <text x="365" y="850" fill="#c4b5fd" fontSize="14" fontWeight="bold">GOLD GYM</text>
          
          {/* Building 4 - Big Store */}
          <rect x="470" y="450" width="140" height="450" fill="#5b21b6" rx="4" />
          <rect x="490" y="470" width="40" height="50" fill="#8b5cf6" opacity="0.6" />
          <rect x="545" y="470" width="40" height="50" fill="#8b5cf6" opacity="0.6" />
          <rect x="600" y="470" width="40" height="50" fill="#8b5cf6" opacity="0.6" />
          <rect x="490" y="540" width="40" height="50" fill="#8b5cf6" opacity="0.6" />
          <rect x="545" y="540" width="40" height="50" fill="#8b5cf6" opacity="0.6" />
          <text x="535" y="840" fill="#c4b5fd" fontSize="18" fontWeight="bold">BIG MART</text>
          
          {/* Building 5 - Beauty Salon */}
          <rect x="650" y="580" width="80" height="320" fill="#6d28d9" rx="4" />
          <rect x="665" y="600" width="50" height="70" fill="#9333ea" opacity="0.6" />
          <text x="670" y="850" fill="#c4b5fd" fontSize="12" fontWeight="bold">BEAUTY</text>
          <text x="670" y="870" fill="#c4b5fd" fontSize="12" fontWeight="bold">SALON</text>
          
          {/* Building 6 - Medical */}
          <rect x="770" y="540" width="100" height="360" fill="#4338ca" rx="4" />
          <rect x="785" y="560" width="70" height="90" fill="#6366f1" opacity="0.5" />
          <text x="805" y="850" fill="#c4b5fd" fontSize="14" fontWeight="bold">MEDICARE</text>
          
          {/* Building 7 - Cafe */}
          <rect x="910" y="560" width="110" height="340" fill="#5b21b6" rx="4" />
          <rect x="930" y="580" width="35" height="45" fill="#8b5cf6" opacity="0.6" />
          <rect x="975" y="580" width="35" height="45" fill="#8b5cf6" opacity="0.6" />
          <text x="955" y="850" fill="#c4b5fd" fontSize="15" fontWeight="bold">CAFE</text>
          
          {/* Building 8 - Electronics */}
          <rect x="1060" y="500" width="130" height="400" fill="#4c1d95" rx="4" />
          <rect x="1080" y="520" width="45" height="55" fill="#7c3aed" opacity="0.6" />
          <rect x="1135" y="520" width="45" height="55" fill="#7c3aed" opacity="0.6" />
          <rect x="1080" y="590" width="45" height="55" fill="#7c3aed" opacity="0.6" />
          <text x="1115" y="840" fill="#c4b5fd" fontSize="16" fontWeight="bold">ELECTRONICS</text>
          
          {/* Additional smaller buildings for depth */}
          <rect x="1250" y="620" width="60" height="280" fill="#6366f1" rx="3" />
          <rect x="1330" y="600" width="70" height="300" fill="#7c3aed" rx="3" />
        </svg>
      </div>

      {/* Header - Magicpin Style: Clean and Simple */}
      {mapsUnavailable && (
        <div className="relative z-20 mx-auto max-w-3xl px-4 pt-24 text-center text-sm text-amber-100 bg-amber-900/40 border border-amber-400/30 rounded-lg py-2">
          Location search is limited. Maps could not be loaded
          {mapsLoadError?.message ? `: ${mapsLoadError.message}` : '.'}
        </div>
      )}

      <header className="fixed top-0 w-full z-50 bg-purple-900/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Top Bar - Logo and Sign In (Mobile First) */}
          <div className="flex items-center justify-between h-14 md:h-20 py-2">
            {/* Left Side - Logo */}
            <div className="flex items-center gap-2">
              <Logo size="md" />
              {/* Mobile Hamburger Menu - Only show on mobile, next to logo */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white/90 hover:text-white p-1.5"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="/about-us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                About us
              </a>
              <Link
                to={ROUTES.CUSTOMER_HOME}
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                Order
              </Link>
              <Link
                to="/business"
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                For Business
              </Link>
              <Link
                to={ROUTES.BLOG}
                className="text-white/90 hover:text-white text-sm font-medium transition-colors"
              >
                Blog
              </Link>
            </nav>

            {/* Right Side - Sign In Button (Magicpin Style: Simple Pink Button) */}
            <button
              onClick={handleLoginClick}
              className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg"
            >
              Sign In
            </button>
          </div>

          {/* Mobile Navigation Menu - Slide Down */}
          {mobileMenuOpen && (
            <nav className="md:hidden border-t border-white/10 animate-in slide-in-from-top duration-200">
              <div className="flex flex-col py-3 space-y-1">
                <a
                  href="/about-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors px-4 py-2.5 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About us
                </a>
                <Link
                  to={ROUTES.CUSTOMER_HOME}
                  className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors px-4 py-2.5 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Order
                </Link>
                <Link
                  to="/business"
                  className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors px-4 py-2.5 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  For Business
                </Link>
                <Link
                  to={ROUTES.BLOG}
                  className="text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors px-4 py-2.5 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                {isMobileViewport && (
                  <button
                    onClick={handleInstallApp}
                    className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors px-4 py-2.5 rounded-lg text-left"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install as App</span>
                  </button>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Role Selection Modal for Sign In */}
      {showRoleSelector && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setShowRoleSelector(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-white/15 shadow-2xl p-6 sm:p-7 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">Sign in to PocketShop</h2>
                <p className="mt-1 text-sm text-white/70">
                  Choose whether you&apos;re a customer or a business. Each has its own account and dashboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleSelector(false)}
                className="rounded-full p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRoleSelector(false);
                  navigate(ROUTES.CUSTOMER_AUTH);
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-white text-slate-900 px-4 py-3.5 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-sm font-bold">
                  C
                </span>
                <div className="flex-1 text-left">
                  <div>Continue as Customer</div>
                  <p className="text-xs sm:text-[13px] font-normal text-slate-600">
                    Track orders, save details and discover local offers.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRoleSelector(false);
                  navigate(ROUTES.LOGIN);
                }}
                className="w-full flex items-center gap-3 rounded-xl bg-purple-600/90 px-4 py-3.5 text-sm sm:text-base font-semibold text-white shadow-md hover:bg-purple-600 hover:shadow-lg transition-all"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/80 text-white text-sm font-bold">
                  B
                </span>
                <div className="flex-1 text-left">
                  <div>Continue as Business</div>
                  <p className="text-xs sm:text-[13px] font-normal text-purple-100/80">
                    Sign in to your vendor dashboard and manage orders.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Magicpin Style: Prominent Search */}
      <section className="relative z-10 pt-20 md:pt-24 pb-12 md:pb-16 lg:pt-28 lg:pb-24">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Main Headline - Better Mobile Spacing */}
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 md:mb-4 leading-tight">
              India's <span className="text-pink-500">1st</span> Offline Commerce
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white/90">
              Platform for Going Out
            </p>
          </div>

          {/* Unified Search Bar - Cleaner and less bulky */}
          <div className="max-w-3xl mx-auto mb-8 md:mb-12">
            {/* Desktop Search Bar */}
            <div className="hidden md:flex bg-white rounded-xl p-1 shadow-2xl items-center">
              {/* Location Section - Interactive with LocationDetector */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-r border-gray-200">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div 
                  className="flex flex-col min-w-[140px] cursor-pointer flex-1" 
                  onClick={() => desktopLocationBtnRef.current?.triggerDetection()}
                >
                  <span className="text-xs text-gray-500">Location</span>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {searchLocation || 'Detect Location'}
                  </span>
                </div>
                {searchLocation && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                    aria-label="Clear location"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Hidden LocationDetector for Desktop */}
              <div className="hidden">
                <LocationDetector
                  ref={desktopLocationBtnRef}
                  onLocationDetected={handleLocationDetected}
                />
              </div>
              
              {/* Main Search Input - Autocomplete */}
              <div className="flex items-center gap-3 px-4 py-3.5 flex-1">
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <PlacesAutocomplete
                  // TODO: Hook this search input to backend query endpoint once API is available.
                  onPlaceSelected={handlePlaceSelected}
                  initialLocation={userLocation || undefined}
                  className="flex-1"
                  isLoaded={isMapsLoaded}
                />
              </div>
            </div>

            {/* Mobile Search Bar - Magicpin Style: Large, Clean, Prominent */}
            <div className="md:hidden bg-white rounded-xl p-3 shadow-2xl border border-gray-100">
              {/* Location Section - Top Row */}
              <div 
                className="flex items-center gap-2.5 px-2 py-2.5 mb-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 rounded-t-lg transition-colors"
                onClick={() => mobileLocationBtnRef.current?.triggerDetection()}
              >
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-gray-500 font-medium">Location</span>
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    {searchLocation || 'Detect Location'}
                  </span>
                </div>
                {searchLocation ? (
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Clear location"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
              
              {/* Hidden LocationDetector for Mobile */}
              <div className="hidden">
                <LocationDetector
                  // TODO: Use coordinate lookup API to enrich and validate detected mobile location.
                  ref={mobileLocationBtnRef}
                  onLocationDetected={handleLocationDetected}
                />
              </div>
              
              {/* Main Search Input - Autocomplete - Large and Prominent */}
              <div className="flex items-center gap-3 px-2">
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <PlacesAutocomplete
                  onPlaceSelected={handlePlaceSelected}
                  initialLocation={userLocation || undefined}
                  className="flex-1 text-base"
                  placeholder="Search for places, cuisines, and more..."
                  isLoaded={isMapsLoaded}
                />
              </div>
            </div>
          </div>

          {/* Category Cards - Available first, then Coming Soon. Soft shadows, slideable on mobile */}
          <div className="w-full max-w-7xl mx-auto mb-12 md:mb-16 px-3 sm:px-4 lg:px-8">
            <div className="flex gap-3 md:gap-5 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-2 snap-x snap-mandatory md:snap-none -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 touch-pan-x">
            {/* Quick Bites - Available, first */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`${ROUTES.SHOPS}?category=quick-bites`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`${ROUTES.SHOPS}?category=quick-bites`)}
              className="snap-start shrink-0 bg-white rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer group hover:scale-[1.02] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1"
            >
              <span className="inline-flex items-center self-start rounded-full bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Going Out
              </span>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={CATEGORY_IMAGES.quickBites} alt="Quick Bites" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-sm md:text-base">Quick Bites</p>
              </div>
            </div>

            {/* Fine Dining - Available, second */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`${ROUTES.SHOPS}?category=fine-dining`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`${ROUTES.SHOPS}?category=fine-dining`)}
              className="snap-start shrink-0 bg-white rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer group hover:scale-[1.02] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1"
            >
              <span className="inline-flex items-center self-start rounded-full bg-emerald-500 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Going Out
              </span>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden">
                  <img src={CATEGORY_IMAGES.fineDining} alt="Fine Dining" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-sm md:text-base">Fine Dining</p>
              </div>
            </div>

            {/* Fashion - Locked */}
            <div className="snap-start shrink-0 bg-white/60 rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1 relative cursor-not-allowed opacity-80">
              <span className="inline-flex items-center self-start rounded-full bg-gray-400 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Coming Soon
              </span>
              <div className="absolute top-2 right-2 z-10">
                <Lock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden grayscale opacity-70">
                  <img src={CATEGORY_IMAGES.fashion} alt="Fashion" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-600 text-sm md:text-base">Fashion</p>
              </div>
            </div>

            {/* Salon - Locked */}
            <div className="snap-start shrink-0 bg-white/60 rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1 relative cursor-not-allowed opacity-80">
              <span className="inline-flex items-center self-start rounded-full bg-gray-400 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Coming Soon
              </span>
              <div className="absolute top-2 right-2 z-10">
                <Lock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden grayscale opacity-70">
                  <img src={CATEGORY_IMAGES.salons} alt="Salons" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-600 text-sm md:text-base">Salons</p>
              </div>
            </div>

            {/* Medicare - Locked */}
            <div className="snap-start shrink-0 bg-white/60 rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1 relative cursor-not-allowed opacity-80">
              <span className="inline-flex items-center self-start rounded-full bg-gray-400 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Coming Soon
              </span>
              <div className="absolute top-2 right-2 z-10">
                <Lock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden grayscale opacity-70">
                  <img src={CATEGORY_IMAGES.medicare} alt="Medicare" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-600 text-sm md:text-base">Medicare</p>
              </div>
            </div>

            {/* Local Stores - Locked */}
            <div className="snap-start shrink-0 bg-white/60 rounded-2xl p-4 md:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col min-w-[130px] md:min-w-[160px] md:flex-1 relative cursor-not-allowed opacity-80">
              <span className="inline-flex items-center self-start rounded-full bg-gray-400 text-white text-[10px] font-semibold px-2.5 py-0.5 mb-3">
                Coming Soon
              </span>
              <div className="absolute top-2 right-2 z-10">
                <Lock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-center mb-3 flex-1 flex items-center justify-center min-h-[88px] sm:min-h-[100px]">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto flex items-center justify-center overflow-hidden grayscale opacity-70">
                  <img src={CATEGORY_IMAGES.localStores} alt="Local Stores" className="max-w-full max-h-full w-auto h-auto object-contain object-center" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-600 text-sm md:text-base">Local Stores</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smooth Curve Separator */}
      <div className="relative z-10 -mt-16">
        <svg
          className="w-full h-20"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0 C240 100 480 50 720 40 C960 30 1200 70 1440 0 L1440 100 L0 100 Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Promotional Banner Section - Best landing offers from opted-in vendors */}
      {!bestOfferLoading && landingOffers.length > 0 && (
        <section className="relative z-10 bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {landingOffers.length === 1 ? (
              <div className="relative bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl p-7 sm:p-10 md:p-12 border-2 border-purple-100 shadow-xl">
                <div className="flex flex-col md:grid md:grid-cols-2 gap-8 items-center">
                  <div className="text-center md:text-left">
                    <div className="inline-block bg-white rounded-2xl p-3 shadow-md mb-3">
                      {landingOffers[0].vendorLogoUrl ? (
                        <img
                          src={landingOffers[0].vendorLogoUrl}
                          alt={landingOffers[0].vendorName}
                          className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                          <span className="text-white text-lg md:text-xl font-bold">
                            {landingOffers[0].vendorName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-1">{landingOffers[0].vendorName}</h3>
                    <p className="text-gray-600 text-xs md:text-sm">Featured Partner</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-2 leading-tight">
                      {landingOffers[0].offer.type === 'flat' ? (
                        <>Flat <span className="text-pink-600">₹{landingOffers[0].offer.value}</span> off</>
                      ) : (
                        <>
                          {landingOffers[0].offer.value}% off
                          {landingOffers[0].offer.max_discount ? <span className="text-pink-600"> up to ₹{landingOffers[0].offer.max_discount}</span> : null}
                        </>
                      )}
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mb-4">
                      on purchase above ₹{landingOffers[0].offer.min_order.toLocaleString('en-IN')}
                    </p>
                    <Link
                      to={storefrontPath(landingOffers[0].vendorId)}
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      Explore now
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <OffersCarousel landingOffers={landingOffers} variant="landing" />
            )}
          </div>
        </section>
      )}

      {/* Split View - Customer & Business Sections */}
      <section className="relative z-10 py-20 md:py-24 bg-black/30 backdrop-blur-xl">
        {/* Decorative background bars behind cards */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="mx-auto flex h-full max-w-6xl gap-4 px-4">
            <div className="hidden md:block h-full w-16 rounded-3xl bg-gradient-to-b from-purple-500/50 via-purple-700/30 to-transparent" />
            <div className="hidden md:block h-full w-10 rounded-3xl bg-gradient-to-b from-purple-400/40 via-purple-600/20 to-transparent" />
            <div className="ml-auto flex h-full gap-4">
              <div className="h-full w-10 rounded-3xl bg-gradient-to-b from-purple-400/40 via-purple-600/20 to-transparent" />
              <div className="h-full w-16 rounded-3xl bg-gradient-to-b from-purple-500/50 via-purple-700/30 to-transparent" />
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <p className="text-xs md:text-sm font-semibold tracking-[0.2em] text-purple-200/80 uppercase">
              Choose your journey
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Built for shoppers and local businesses
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
            {/* Customer Section */}
            <div className="group relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/60 via-fuchsia-500/40 to-indigo-500/40 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl p-7 sm:p-8 border border-white/15 shadow-[0_18px_45px_rgba(15,23,42,0.6)] flex flex-col h-full">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-purple-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-200">
                      Customer section
                    </span>
                    <h3 className="mt-3 text-2xl md:text-3xl font-bold text-white leading-tight">
                      Find Amazing Local Deals
                    </h3>
                  </div>
                </div>

                {/* Customer Icon */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/30 rounded-2xl flex items-center justify-center shadow-inner">
                    <svg
                      className="w-9 h-9 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-white/70 max-w-xs">
                    Discover nearby places to eat and hang out, with rewards every time you step out.
                  </p>
                </div>

                {/* Customer Benefits */}
                <ul className="space-y-3 text-sm sm:text-base text-white/90 flex-1">
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-xs text-purple-100">
                      •
                    </span>
                    <span>Exclusive offers from local favourites</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-xs text-purple-100">
                      •
                    </span>
                    <span>Automatic cashback rewards on every visit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-xs text-purple-100">
                      •
                    </span>
                    <span>Smart discovery for cafes, quick bites & more</span>
                  </li>
                </ul>

                <button className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(168,85,247,0.6)] transition-all duration-200 hover:shadow-[0_16px_40px_rgba(168,85,247,0.8)] hover:-translate-y-0.5 w-full">
                  Start Shopping
                </button>
              </div>
            </div>

            {/* Business Section */}
            <div className="group relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-400/70 via-indigo-500/60 to-sky-500/50 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
              <div className="relative bg-gradient-to-br from-purple-600/40 via-purple-800/40 to-slate-900/60 backdrop-blur-2xl rounded-3xl p-7 sm:p-8 border border-purple-300/40 shadow-[0_18px_45px_rgba(15,23,42,0.8)] flex flex-col h-full">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-purple-900/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-100">
                      Business section
                    </span>
                    <h3 className="mt-3 text-2xl md:text-3xl font-bold text-white leading-tight">
                      Grow Your Local Business
                    </h3>
                  </div>
                  <span className="hidden md:inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
                    For cafes, restaurants & salons
                  </span>
                </div>

                {/* Business Icon - Storefront/Growth Icon */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-500/40 rounded-2xl flex items-center justify-center shadow-inner">
                    <svg
                      className="w-9 h-9 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-purple-50/80 max-w-xs">
                    Turn every table or storefront into a smart, QR-powered sales engine.
                  </p>
                </div>

                {/* Business Features */}
                <ul className="space-y-3 text-sm sm:text-base text-white/95 flex-1">
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-xs text-emerald-100">
                      •
                    </span>
                    <span>Reach more nearby customers without extra ad spend</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-xs text-emerald-100">
                      •
                    </span>
                    <span>Run targeted offers that actually drive footfall</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-xs text-emerald-100">
                      •
                    </span>
                    <span>Track sales, repeat visits and campaign ROI in one place</span>
                  </li>
                </ul>

                <button
                  onClick={handleBusinessClick}
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white/90 px-6 py-3 text-sm font-semibold text-purple-800 shadow-[0_10px_30px_rgba(15,23,42,0.8)] transition-all duration-200 hover:bg-white hover:-translate-y-0.5 w-full"
                >
                  Get Started
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
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
                Discover Local, Shop Offline
              </p>
              <p className="text-white/60 text-sm leading-relaxed max-w-md mb-6">
                Find trusted nearby deals, compare offers quickly, and step out with a clear plan that saves you money on every visit.
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
                        Local Stores
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Local Stores
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
                        Nearby Deals
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Nearby Deals
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
                        Categories
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        Categories
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
                        QR Scanner
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        QR Scanner
                      </span>
                      <span className="absolute bottom-0 left-0 h-0.5 bg-pink-500 w-0 
                                       transition-all duration-300 group-hover:w-full"></span>
                    </a>
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
                    <Link 
                      to={ROUTES.HELP_CENTER}
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
                    </Link>
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
                      to="/business"
                      className="footer-link group relative inline-block text-white/70 text-sm
                                 transition-all duration-300 hover:text-white"
                    >
                      <span className="relative z-10 inline-block transition-transform duration-300 
                                       group-hover:-translate-y-1 group-hover:opacity-0">
                        For Business
                      </span>
                      <span className="absolute left-0 top-0 opacity-0 translate-y-1 transition-all duration-300 
                                       group-hover:opacity-100 group-hover:translate-y-0 text-white z-10">
                        For Business
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

export default LandingPage;

