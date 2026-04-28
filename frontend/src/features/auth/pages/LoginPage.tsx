/**
 * Vendor Authentication Page
 * 
 * Combined login and register page for vendors with tab switching.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { signInWithGoogle } from '@/features/auth/services/authService';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Home,
  LogIn,
  UserPlus,
  AlertCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { preloadDashboardOverview, preloadOnboardingStage } from '@/utils/preloaders';
import logoImage from '@/assets/images/logo.png';
import '@/assets/styles/VendorAuth.css';

type Mode = 'register' | 'login';

interface RegisterFormData {
  businessName: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobileNumber: string;
}

interface EmailFormData {
  email: string;
  password: string;
}

interface FormErrors {
  [key: string]: string | boolean;
}

interface VendorAuthProps {
  mode?: Mode;
}

const VendorAuth: React.FC<VendorAuthProps> = ({ mode: initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // CRITICAL: loading MUST be destructured from useAuth()
  const { signUp, signIn, loading } = useAuth();
  
  // Defensive check: ensure loading is defined (safety fallback)
  const safeLoading = typeof loading !== 'undefined' ? loading : false;
  
  // Determine initial mode from prop or URL
  const getInitialMode = (): Mode => {
    if (initialMode) return initialMode;
    const path = window.location.pathname;
    if (path === ROUTES.REGISTER) return 'register';
    return 'login';
  };
  
  const [mode, setMode] = useState<Mode>(getInitialMode());
  
  // Sync mode with URL changes
  useEffect(() => {
    const path = window.location.pathname;
    if (path === ROUTES.REGISTER && mode !== 'register') {
      setMode('register');
    } else if (path === ROUTES.LOGIN && mode !== 'login') {
      setMode('login');
    }
  }, [mode]);

  // Helper function to determine redirect path after login
  const getRedirectPath = async (userId: string): Promise<string> => {
    // Check if we have a "from" location in state (from ProtectedRoute redirect)
    const from = (location.state as any)?.from?.pathname;
    
    // If "from" exists and is a valid protected route, use it
    if (from && from !== ROUTES.LOGIN && from !== ROUTES.REGISTER) {
      // Preload dashboard overview if redirecting to dashboard (lighter preload)
      if (from.startsWith(ROUTES.VENDOR_DASHBOARD)) {
        preloadDashboardOverview().catch(console.error);
      }
      return from;
    }

    // Otherwise, check onboarding status and redirect accordingly
    try {
      const { getOnboardingRedirectPath } = await import('@/features/common/utils/onboardingCheck');
      const redirectPath = await getOnboardingRedirectPath(userId);
      
      // Preload the target route based on redirect path
      if (redirectPath.startsWith(ROUTES.VENDOR_DASHBOARD)) {
        // Onboarding complete - preload only critical dashboard overview (lighter)
        // Full dashboard will load on demand
        preloadDashboardOverview().catch(console.error);
      } else if (redirectPath.startsWith(ROUTES.VENDOR_ONBOARDING)) {
        // Onboarding incomplete - preload onboarding stage 1
        preloadOnboardingStage(1).catch(console.error);
      }
      
      return redirectPath;
    } catch (err) {
      console.error('Error getting redirect path:', err);
      // Default to onboarding if error - preload stage 1
      preloadOnboardingStage(1).catch(console.error);
      return ROUTES.VENDOR_ONBOARDING_STAGE_1;
    }
  };
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Register form state
  const [registerFormData, setRegisterFormData] = useState<RegisterFormData>({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobileNumber: ''
  });

  // Login form state
  const [emailFormData, setEmailFormData] = useState<EmailFormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState(
    'A confirmation email has been sent to your inbox. Please check your inbox and confirm your email to continue.'
  );

  const resetRegisterFlow = () => {
    setRegisterStep(1);
    setErrors({});
    setEmailSent(false);
    setRegisterSuccessMessage(
      'A confirmation email has been sent to your inbox. Please check your inbox and confirm your email to continue.'
    );
  };

  const validateRegisterForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!registerFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!registerFormData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\+?[1-9]\d{0,15}$/.test(registerFormData.mobileNumber.replace(/\s/g, ''))) {
      newErrors.mobileNumber = 'Please enter a valid mobile number';
    }

    if (!registerFormData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!registerFormData.password) {
      newErrors.password = 'Password is required';
    } else if (registerFormData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!registerFormData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (registerFormData.password !== registerFormData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegisterStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!registerFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registerFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!registerFormData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\+?[1-9]\d{0,15}$/.test(registerFormData.mobileNumber.replace(/\s/g, ''))) {
      newErrors.mobileNumber = 'Please enter a valid mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailLogin = (): boolean => {
    const newErrors: FormErrors = {};

    if (!emailFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(emailFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!emailFormData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setEmailSent(false);

    try {
      console.log('[Register] Starting registration for:', registerFormData.email);
      
      const { data, error } = await signUp(
        registerFormData.email,
        registerFormData.password,
        {
          full_name: registerFormData.businessName,
          mobile_number: registerFormData.mobileNumber,
          role: 'vendor'
        }
      );

      if (error) {
        console.error('[Register] Registration error:', error);
        const errorMessage = String(error.message || '').toLowerCase();

        if (errorMessage.includes('email rate limit exceeded')) {
          setRegisteredEmail(registerFormData.email);
          setRegisterSuccessMessage(
            'A confirmation email was already sent recently. Please check your inbox and confirm your email before trying again.'
          );
          setEmailSent(true);
          setIsSubmitting(false);
          return;
        }

        setErrors({ submit: error.message });
        setIsSubmitting(false);
        return;
      }

      // Store registration data in localStorage for later use
      if (registerFormData.businessName && registerFormData.mobileNumber) {
        localStorage.setItem('pendingVendorProfile', JSON.stringify({
          businessName: registerFormData.businessName,
          mobileNumber: registerFormData.mobileNumber,
          email: registerFormData.email,
        }));
      }

      if (data?.user) {
        console.log('[Register] User created:', data.user.id, 'Email confirmed:', data.user.email_confirmed_at);
        
        // Supabase returns a null session when email confirmation is pending.
        // Treat that as a successful registration and show confirmation UI.
        const isConfirmationPending = !data.session || !data.user.email_confirmed_at;
        if (isConfirmationPending) {
          // Email confirmation required - show confirmation UI
          setRegisteredEmail(registerFormData.email);
          setRegisterSuccessMessage(
            'A confirmation email has been sent to your inbox. Please check your inbox and confirm your email to continue.'
          );
          setEmailSent(true);
          // Clear form data
          setRegisterFormData({
            businessName: '',
            email: '',
            password: '',
            confirmPassword: '',
            mobileNumber: ''
          });
          setIsSubmitting(false);
          return;
        } else {
          // User is already confirmed, redirect using same logic as login
          console.log('[Register] User already confirmed, redirecting...');
          const redirectPath = await getRedirectPath(data.user.id);
          console.log('[Register] Redirecting to:', redirectPath);
          // Preload is already handled in getRedirectPath
          navigate(redirectPath, { replace: true });
        }
      } else {
        // No user data but no error - usually means confirmation email sent
        console.log('[Register] No user data, assuming email sent');
        setRegisteredEmail(registerFormData.email);
        setRegisterSuccessMessage(
          'A confirmation email has been sent to your inbox. Please check your inbox and confirm your email to continue.'
        );
        setEmailSent(true);
        // Clear form data
        setRegisterFormData({
          businessName: '',
          email: '',
          password: '',
          confirmPassword: '',
          mobileNumber: ''
        });
      }
    } catch (err: any) {
      console.error('[Register] Unexpected error:', err);
      setErrors({ submit: err.message || 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailLogin()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await signIn(emailFormData.email, emailFormData.password);

      if (error) {
        setErrors({ submit: error.message });
      } else if (data?.user) {
        // Get redirect path (checks location state first, then onboarding status)
        // Preload is already handled in getRedirectPath
        const redirectPath = await getRedirectPath(data.user.id);
        console.log('Redirecting after login to:', redirectPath);
        navigate(redirectPath, { replace: true });
      } else {
        // Fallback redirect - preload onboarding stage 1
        preloadOnboardingStage(1).catch(console.error);
        navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1, { replace: true });
      }
    } catch (err) {
      console.error('Error during login:', err);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrors({ submit: error.message });
        setGoogleLoading(false);
      }
      // OAuth redirect will be handled by onAuthStateChange in AuthContext
      // The redirect happens automatically after successful OAuth
    } catch (err: any) {
      setErrors({ submit: err.message || 'An unexpected error occurred. Please try again.' });
      setGoogleLoading(false);
    }
  };

  // Don't show full screen loading - only show on button if submitting
  // Allow user to see the form even while checking auth

  const handleRegisterNextStep = () => {
    if (validateRegisterStep1()) {
      setRegisterStep(2);
    }
  };

  const handleRegisterBackStep = () => {
    setRegisterStep(1);
  };

  return (
    <div className="vendor-auth">
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-container">
            {/* Header */}
            <header className="auth-header">
              <Link to={ROUTES.HOME} className="header-logo" aria-label="Go to home">
                <img src={logoImage} alt="PocketShop Logo" className="logo-icon" />
                <span className="logo-text">PocketShop</span>
              </Link>

              <div className="auth-header-actions">
                <Link to={ROUTES.HOME} className="back-link">
                  <Home className="back-icon" />
                  Home
                </Link>
                <Link to={ROUTES.BUSINESS} className="back-link">
                  <ArrowLeft className="back-icon" />
                  Back
                </Link>
              </div>
            </header>

            {/* Form */}
            <div className="auth-content auth-content--left">
              <div className="auth-card auth-card--light">
                {/* Mode Toggle */}
                <div className="mode-toggle">
                  <button
                    type="button"
                    className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('login');
                      navigate(ROUTES.LOGIN);
                      resetRegisterFlow();
                    }}
                  >
                    <LogIn className="mode-icon" />
                    Login
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${mode === 'register' ? 'active' : ''}`}
                    onClick={() => {
                      setMode('register');
                      navigate(ROUTES.REGISTER);
                      resetRegisterFlow();
                    }}
                  >
                    <UserPlus className="mode-icon" />
                    Register
                  </button>
                </div>

                <div className="card-header">
                  <h1 className="card-title">
                    {mode === 'register' ? 'Sign up' : 'Welcome back'}
                  </h1>
                  <p className="card-subtitle">
                    {mode === 'register'
                      ? 'Create your vendor account to start selling on PocketShop.'
                      : 'Sign in to your vendor account.'}
                  </p>
                </div>

                {(location.state as any)?.message === 'confirm_email' && (
                  <div className="confirm-email-banner">
                    Please confirm your email before continuing. Check your inbox and click the confirmation link.
                  </div>
                )}

                {/* Google OAuth Button - Only show on Login, not Register */}
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || isSubmitting}
                    className="btn btn-google"
                  >
                    {googleLoading ? (
                      <>
                        <Loader2 className="btn-icon spinning" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </>
                    )}
                  </button>
                )}

                {/* Divider - Only show on Login */}
                {mode === 'login' && (
                  <div className="divider">
                    <span>or</span>
                  </div>
                )}

                {mode === 'register' && emailSent && registeredEmail && (
                  <div
                    className="register-success-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="register-success-title"
                  >
                    <div className="register-success-modal__backdrop" onClick={() => setEmailSent(false)} />
                    <div className="register-success-modal__content">
                      <div className="register-success-modal__icon">
                        <Mail />
                      </div>
                      <h2 id="register-success-title" className="register-success-modal__title">
                        Confirmation Email Sent
                      </h2>
                      <p className="register-success-modal__text">
                        {registerSuccessMessage} <strong>{registeredEmail}</strong>.
                      </p>
                      <div className="register-success-modal__actions">
                        <button
                          type="button"
                          className="btn submit-btn register-success-modal__secondary"
                          onClick={() => setEmailSent(false)}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary submit-btn register-success-modal__primary"
                          onClick={() => {
                            setEmailSent(false);
                            setMode('login');
                            navigate(ROUTES.LOGIN, {
                              state: { message: 'confirm_email' },
                            });
                          }}
                        >
                          Go to Login
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Register Form */}
                {mode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="auth-form">
                    <div className="step-indicator">
                      <div className={`step-dot ${registerStep === 1 ? 'active' : ''}`}>1</div>
                      <div className="step-line" />
                      <div className={`step-dot ${registerStep === 2 ? 'active' : ''}`}>2</div>
                    </div>
                    <p className="step-caption">
                      {registerStep === 1
                        ? 'Step 1 of 2 — Email & mobile'
                        : 'Step 2 of 2 — Business & password'}
                    </p>

                    {registerStep === 1 && (
                      <>
                        <div className="form-group">
                          <label htmlFor="email" className="form-label">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={registerFormData.email}
                            onChange={handleRegisterInputChange}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            placeholder="Enter your email"
                            autoComplete="email"
                          />
                          {errors.email && (
                            <div className="form-error">
                              <AlertCircle className="error-icon" />
                              {errors.email}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label htmlFor="mobileNumber" className="form-label">
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            id="mobileNumber"
                            name="mobileNumber"
                            value={registerFormData.mobileNumber}
                            onChange={handleRegisterInputChange}
                            className={`form-input ${errors.mobileNumber ? 'error' : ''}`}
                            placeholder="Enter your mobile number"
                            autoComplete="tel"
                          />
                          {errors.mobileNumber && (
                            <div className="form-error">
                              <AlertCircle className="error-icon" />
                              {errors.mobileNumber}
                            </div>
                          )}
                        </div>

                        {errors.submit && (
                          <div className={errors.success ? 'submit-success' : 'submit-error'}>
                            {!errors.success && <AlertCircle className="error-icon" />}
                            {errors.submit}
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn btn-primary btn-lg submit-btn"
                          onClick={handleRegisterNextStep}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="btn-icon spinning" />
                              Checking...
                            </>
                          ) : (
                            <>
                              <UserPlus className="btn-icon" />
                              Continue
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {registerStep === 2 && (
                      <>
                        <div className="form-group">
                          <label htmlFor="businessName" className="form-label">
                            Business Name *
                          </label>
                          <input
                            type="text"
                            id="businessName"
                            name="businessName"
                            value={registerFormData.businessName}
                            onChange={handleRegisterInputChange}
                            className={`form-input ${errors.businessName ? 'error' : ''}`}
                            placeholder="Enter your business name"
                          />
                          {errors.businessName && (
                            <div className="form-error">
                              <AlertCircle className="error-icon" />
                              {errors.businessName}
                            </div>
                          )}
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="password" className="form-label">
                              Password *
                            </label>
                            <div className="password-input">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={registerFormData.password}
                                onChange={handleRegisterInputChange}
                                className={`form-input ${errors.password ? 'error' : ''}`}
                                placeholder="Create a password"
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff /> : <Eye />}
                              </button>
                            </div>
                            <p className="helper-text">At least 6 characters.</p>
                            {errors.password && (
                              <div className="form-error">
                                <AlertCircle className="error-icon" />
                                {errors.password}
                              </div>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                              Confirm Password *
                            </label>
                            <div className="password-input">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={registerFormData.confirmPassword}
                                onChange={handleRegisterInputChange}
                                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff /> : <Eye />}
                              </button>
                            </div>
                            {errors.confirmPassword && (
                              <div className="form-error">
                                <AlertCircle className="error-icon" />
                                {errors.confirmPassword}
                              </div>
                            )}
                          </div>
                        </div>

                        {errors.submit && (
                          <div className={errors.success ? 'submit-success' : 'submit-error'}>
                            {!errors.success && <AlertCircle className="error-icon" />}
                            {errors.submit}
                          </div>
                        )}

                        <div className="step-actions">
                          <button
                            type="button"
                            className="btn step-back-link"
                            onClick={handleRegisterBackStep}
                            disabled={isSubmitting}
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary btn-lg submit-btn"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="btn-icon spinning" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <UserPlus className="btn-icon" />
                                Register
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}

                {/* Login Forms */}
                {mode === 'login' && (
                  <>
                    <form onSubmit={handleEmailLoginSubmit} className="auth-form">
                        <div className="form-group">
                          <label htmlFor="email" className="form-label">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={emailFormData.email}
                            onChange={handleEmailInputChange}
                            className={`form-input ${errors.email ? 'error' : ''}`}
                            placeholder="Enter your email"
                            autoComplete="email"
                          />
                          {errors.email && (
                            <div className="form-error">
                              <AlertCircle className="error-icon" />
                              {errors.email}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label htmlFor="password" className="form-label">
                            Password
                          </label>
                          <div className="password-input">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              id="password"
                              name="password"
                              value={emailFormData.password}
                              onChange={handleEmailInputChange}
                              className={`form-input ${errors.password ? 'error' : ''}`}
                              placeholder="Enter your password"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                          </div>
                          {errors.password && (
                            <div className="form-error">
                              <AlertCircle className="error-icon" />
                              {errors.password}
                            </div>
                          )}
                        </div>

                        {errors.submit && (
                          <div className="submit-error">
                            <AlertCircle className="error-icon" />
                            {errors.submit}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn btn-primary btn-lg submit-btn"
                        disabled={isSubmitting || safeLoading || googleLoading}
                        >
                          {isSubmitting || safeLoading ? (
                            <>
                              <Loader2 className="btn-icon spinning" />
                              Signing In...
                            </>
                          ) : (
                            <>
                              <LogIn className="btn-icon" />
                              Sign In
                            </>
                          )}
                        </button>
                      </form>

                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right" aria-hidden="true" />
      </div>
    </div>
  );
};

export default VendorAuth;

