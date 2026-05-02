/**
 * Auth Route Guard Component
 *
 * Redirects authenticated users away from auth pages (login/register).
 * Uses a strict validation order so redirect is never based on stale cache:
 *   1. Not logged in → show login/register.
 *   2. Logged in but email not confirmed → show login/register (do not send to onboarding/dashboard).
 *   3. Logged in and email confirmed → get redirect path from DB (always validate, no cache) → redirect.
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ROUTES } from '@/constants/routes';
import { LoadingScreen } from '@/features/common/components/LoadingScreen';
import { getOnboardingRedirectPath } from '@/features/common/utils/onboardingCheck';

interface AuthRouteGuardProps {
  children: React.ReactNode;
}

/** Supabase user can have email_confirmed_at (optional). OAuth users are treated as confirmed. */
function isEmailConfirmed(session: {
  user?: {
    email?: string | null;
    email_confirmed_at?: string | null;
    identities?: Array<{ provider?: string }>;
  };
} | null): boolean {
  if (!session?.user?.email) return false;
  if (session.user.email_confirmed_at) return true;
  // OAuth (e.g. Google) users are considered confirmed; Supabase may not set email_confirmed_at for them
  const hasOAuthIdentity = session.user.identities?.some(
    (i) => i.provider === 'google' || i.provider === 'apple' || i.provider === 'github'
  );
  return !!hasOAuthIdentity;
}

export const AuthRouteGuard: React.FC<AuthRouteGuardProps> = ({ children }) => {
  const { user, loading, session } = useAuth();
  const location = useLocation();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  const safeLoading = typeof loading !== 'undefined' ? loading : true;

  useEffect(() => {
    let mounted = true;

    const checkAndRedirect = async () => {
      if (safeLoading) return;
      if (!user || !session) {
        if (mounted) {
          setRedirectPath(null);
          setCheckingOnboarding(false);
        }
        return;
      }

      // If the current session is not a vendor, DO NOT force a redirect.
      // This allows “Continue as Business” to open vendor login/signup UI even
      // when a customer session exists (user can switch accounts by logging in as vendor).
      if (user.role !== 'vendor') {
        if (mounted) {
          setRedirectPath(null);
          setCheckingOnboarding(false);
        }
        return;
      }

      // Step 2: Email not confirmed → do not redirect; let them see login/register (e.g. "confirm your email")
      if (!isEmailConfirmed(session)) {
        if (mounted) {
          setRedirectPath(null);
          setCheckingOnboarding(false);
        }
        return;
      }

      // Step 3: Email confirmed → always validate from DB (no cache) so redirect is correct
      setCheckingOnboarding(true);
      try {
        const path = await getOnboardingRedirectPath(user.id, session.user);
        if (mounted) setRedirectPath(path);
      } catch (err) {
        console.error('[AuthRouteGuard] Error determining redirect path:', err);
        if (mounted) setRedirectPath(ROUTES.VENDOR_DASHBOARD);
      } finally {
        if (mounted) setCheckingOnboarding(false);
      }
    };

    checkAndRedirect();

    return () => {
      mounted = false;
    };
  }, [user, session, safeLoading]);

  if (safeLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  if (user && session && checkingOnboarding) {
    return <LoadingScreen message="Redirecting..." />;
  }

    // If user is authenticated and we have a redirect path, redirect away from auth pages
    if (user && session && redirectPath) {
      // Check if we have a "from" location in state (from ProtectedRoute redirect)
      // If so, redirect there instead (but only if it's a valid protected route)
      const from = (location.state as any)?.from?.pathname;
      const finalRedirectPath = from && from !== ROUTES.LOGIN && from !== ROUTES.REGISTER 
        ? from 
        : redirectPath;

      return <Navigate to={finalRedirectPath} replace />;
    }

  // User is not authenticated, allow access to auth pages
  return <>{children}</>;
};
