/**
 * Customer Auth – email + password flow.
 * Used when customer taps Login on storefront or accesses profile.
 * Supports: Customer sign up / login and Continue as Guest.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Loader2, ChevronLeft, ShieldCheck } from 'lucide-react';
import Logo from '@/features/common/components/Logo';

const CUSTOMER_VIEW_AUTH_KEY = 'pocketshop_customer_view_auth';

/** Matches DB trigger / migration: stable unique placeholder for email-only accounts */
function syntheticCustomerMobile(userId: string): string {
  return `email:${userId.replace(/-/g, '')}`;
}

export default function CustomerAuth() {
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || '';
  const redirect = (() => {
    // Only allow customer-facing redirects.
    // Prevents accidental redirects into vendor onboarding after OTP.
    if (!rawRedirect) return ROUTES.CUSTOMER_HOME;

    const decoded = (() => {
      try {
        return decodeURIComponent(rawRedirect);
      } catch {
        return rawRedirect;
      }
    })();

    const candidate = decoded.startsWith('/') ? decoded : `/${decoded}`;
    if (candidate.includes('/vendor/')) return ROUTES.CUSTOMER_HOME;
    if (candidate.startsWith('vendor/')) return ROUTES.CUSTOMER_HOME;

    const allowedPrefixes = [
      ROUTES.CUSTOMER_HOME,
      ROUTES.CUSTOMER_PROFILE,
      ROUTES.SHOPS,
      '/storefront/',
      '/order-tracking/',
      '/order-feedback/',
      ROUTES.HOME,
    ];

    const isAllowed = allowedPrefixes.some((p) => candidate === p || candidate.startsWith(p));
    return isAllowed ? candidate : ROUTES.CUSTOMER_HOME;
  })();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localInfo, setLocalInfo] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const normalizeEmail = (email: string): string => email.trim().toLowerCase();
  const normalizedEmail = normalizeEmail(formData.email);
  const isValidEmail = (email: string): boolean => /\S+@\S+\.\S+/.test(email);

  useEffect(() => {
    // Skip auth page when customer is already signed in.
    if (authLoading) return;
    if (user?.role === 'customer') {
      localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '1');
      navigate(redirect, { replace: true });
    }
  }, [authLoading, user, navigate, redirect]);

  const ensureCustomerRole = async (userId: string) => {
    const { error } = await supabase.from('user_roles').upsert(
      { user_id: userId, role: 'customer' } as any,
      { onConflict: 'user_id' }
    );
    if (error && !String(error.message || '').includes('duplicate')) {
      console.warn('ensureCustomerRole:', error.message);
    }
  };

  const ensureCustomerProfile = async (
    authUser: { id: string; email?: string | null; user_metadata?: Record<string, any> | null },
    preferredName?: string
  ) => {
    const verifiedEmail = authUser.email?.trim().toLowerCase();
    if (!verifiedEmail) return;

    const synthetic = syntheticCustomerMobile(authUser.id);

    const { data: existing, error: existingError } = await supabase
      .from('customer_profiles')
      .select('id, email, mobile_number')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    if (existing?.id) {
      const emailMismatch = existing.email?.trim().toLowerCase() !== verifiedEmail;
      const mobile = (existing as { mobile_number?: string | null }).mobile_number?.trim() ?? '';
      const needsSynthetic = !mobile || mobile === '';

      const patch: Record<string, string> = {};
      if (emailMismatch) patch.email = verifiedEmail;
      if (needsSynthetic) patch.mobile_number = synthetic;

      if (Object.keys(patch).length > 0) {
        const { error: updateError } = await supabase
          .from('customer_profiles')
          .update(patch)
          .eq('id', existing.id);
        if (updateError) throw updateError;
      }
      await ensureCustomerRole(authUser.id);
      return;
    }

    const derivedName =
      preferredName?.trim() ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      verifiedEmail.split('@')[0] ||
      'Customer';

    const { error: upsertError } = await supabase.from('customer_profiles').upsert(
      {
        user_id: authUser.id,
        name: derivedName,
        email: verifiedEmail,
        mobile_number: synthetic,
      } as any,
      { onConflict: 'user_id' }
    );
    if (upsertError) throw upsertError;
    await ensureCustomerRole(authUser.id);
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLocalError(null);
    setLocalInfo(null);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const emailRedirectTo = `${window.location.origin}${ROUTES.CUSTOMER_AUTH}`;

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: formData.password,
          options: {
            emailRedirectTo,
            data: {
              role: 'customer',
              user_type: 'customer',
              full_name: formData.name.trim() || undefined,
            },
          },
        });

        if (error) {
          setLocalError(error.message || 'Sign up failed');
          return;
        }

        if (data.user && !data.session) {
          setLocalInfo('Please check your email to confirm your account');
          return;
        }

        localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '1');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLocalError('Authentication session not established. Please try logging in.');
          return;
        }
        await ensureCustomerProfile(session.user, formData.name);
        navigate(redirect);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: formData.password,
        });

        if (error) {
          setLocalError(error.message || 'Login failed');
          return;
        }

        localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '1');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLocalError('Authentication session not established. Please try again.');
          return;
        }
        await ensureCustomerProfile(session.user);
        navigate(redirect);
      }
    } catch (error: any) {
      setLocalError(error?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    localStorage.setItem(CUSTOMER_VIEW_AUTH_KEY, '0');
    navigate(redirect);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      {/* Header - mobile optimized, safe area for notched devices */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 pt-[env(safe-area-inset-top,0px)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 dark:active:bg-slate-700 touch-manipulation touch-target"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 flex justify-center">
            <Link to={ROUTES.HOME}>
              <Logo size="md" variant="light" />
            </Link>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 pb-8 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
          {isSignUp ? 'Create your account' : 'Sign in to continue'}
        </h1>
        <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
          {isSignUp
            ? 'Sign up with your email to track orders and save your details.'
            : 'Use your email and password to access your order history.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {localError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">
              {localError}
            </div>
          )}
          {localInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {localInfo}
            </div>
          )}

          {isSignUp && (
            <div>
              <Label htmlFor="name" className="text-gray-700">Name (optional)</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="pl-11 h-12 text-base"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-gray-700">Email Address</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className="pl-11 h-12 text-base"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-700">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              className="h-12 text-base"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 min-h-[48px] text-base font-semibold bg-orange-500 hover:bg-orange-600 active:scale-[0.99] touch-target"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSignUp ? 'Sign Up' : 'Log In'}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm text-gray-600 dark:text-slate-400 hover:underline mt-1"
            onClick={() => {
              setIsSignUp((prev) => !prev);
              setLocalError(null);
              setLocalInfo(null);
            }}
          >
            {isSignUp
              ? 'Already have an account? Log in'
              : "Don't have an account? Sign up"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 min-h-[48px] text-base touch-target"
            onClick={handleGuestContinue}
          >
            Continue as Guest
          </Button>
          <p className="text-center text-gray-500 text-xs mt-3">
            You can sign in later to track orders
          </p>
        </div>
      </main>
    </div>
  );
}

