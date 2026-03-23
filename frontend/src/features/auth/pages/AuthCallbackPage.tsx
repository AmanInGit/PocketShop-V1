/**
 * Auth Callback Page
 *
 * Handles OAuth (e.g. Google) return: waits for Supabase to establish the session
 * from the URL hash/query, then redirects to dashboard or onboarding.
 * Uses onAuthStateChange so we catch the session as soon as Supabase processes the OAuth callback.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { getOnboardingRedirectPath } from '@/features/common/utils/onboardingCheck';

const MAX_WAIT_MS = 15000; // OAuth code exchange can take a few seconds
const FALLBACK_POLL_MS = 500;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[] | null>(null);

  const AuthCallbackSkeleton = () => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-indigo-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          </div>

          <div className="mb-2">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-indigo-600/30 animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Signing you in...
          </p>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let hasRedirected = false;
    let hasFinalized = false;

    const isDev = import.meta.env.DEV;
    if (isDev) {
      console.log('[OAuth Callback] Page loaded', { hash: window.location.hash, query: window.location.search });
    }

    // Check if we have tokens in URL OR errors
    const hash = window.location.hash.substring(1); // Remove #
    const query = window.location.search.substring(1); // Remove ?
    const hasHash = window.location.hash && window.location.hash.length > 1;
    const hasQuery = window.location.search && window.location.search.length > 1;
    
    // Check for errors in URL (Supabase redirects with error params on failure)
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(query);
    const errorParam = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description') || '';
    const errorCode = hashParams.get('error_code') || queryParams.get('error_code') || '';
    
    // If URL contains error, show it immediately
    if (errorParam) {
      hasFinalized = true;
      if (isDev) {
        console.error('[OAuth Callback] Error:', errorParam, errorCode, decodeURIComponent(errorDescription));
      }
      let errorMessage: string;
      const details: string[] = [];
      if (errorCode === 'unexpected_failure' || errorDescription.includes('Unable to exchange')) {
        errorMessage = 'Unable to exchange OAuth code.';
        details.push(
          '1. Google Cloud Console: APIs & Services → Credentials → your OAuth 2.0 Client → Authorized redirect URIs must include exactly:',
          '   https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback',
          '   (Get project ref: Supabase → Project Settings → General → Reference ID.)',
          '2. Same OAuth client: copy Client ID and Client Secret into Supabase → Authentication → Providers → Google.',
          '3. Supabase → Authentication → URL Configuration: add to Redirect URLs:',
          '   ' + window.location.origin + ROUTES.AUTH_CALLBACK,
          '4. If you changed anything in Google, wait a minute and try again.'
        );
      } else {
        errorMessage = 'Authentication failed. ' + (decodeURIComponent(errorDescription) || errorParam);
      }
      if (mounted) {
        setError(errorMessage);
        setErrorDetails(details.length ? details : null);
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 8000);
        return;
      }
    }
    
    // Check if we have actual tokens (not just error params)
    const hasAccessToken = hashParams.has('access_token') || queryParams.has('access_token');
    const hasCode = hashParams.has('code') || queryParams.has('code');
    const hasTokens = hasAccessToken || hasCode;
    
    if (isDev) {
      console.log('[OAuth Callback] Has access_token:', hasAccessToken, 'Has code:', hasCode, 'Has tokens:', hasTokens);
    }

    const redirectToApp = async (userId: string) => {
      if (hasRedirected || !mounted) return;
      hasRedirected = true;
      if (isDev) console.log('[OAuth Callback] Redirecting user:', userId);
      try {
        const path = await getOnboardingRedirectPath(userId);
        if (isDev) console.log('[OAuth Callback] Redirect path:', path);
        if (mounted) navigate(path, { replace: true });
      } catch (err) {
        if (isDev) console.error('[OAuth Callback] Error getting redirect path:', err);
        if (mounted) navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1, { replace: true });
      }
    };

    const handleSession = (session: { user: { id: string } } | null) => {
      if (!mounted || !session?.user || hasRedirected) return;
      if (isDev) console.log('[OAuth Callback] Session found:', session.user.id);
      redirectToApp(session.user.id);
    };

    // 1. Listen for auth state changes – Supabase emits when it finishes processing OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (isDev) console.log('[OAuth Callback] Auth state change:', event, session?.user?.id);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session?.user) handleSession(session);
        }
      }
    );

    // 2. Manually trigger session recovery from URL
    const processUrlSession = async () => {
      try {
        // First, try getSession - Supabase should process URL automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (isDev) {
          console.log('[OAuth Callback] Initial getSession:', { hasSession: !!session?.user, userId: session?.user?.id, error: sessionError });
        }
        
        if (mounted && session?.user) {
          handleSession(session);
          return true;
        }
        
        // If we have hash tokens but no session, try manually parsing
        if (hasHash && !session && !errorParam) {
          if (isDev) console.log('[OAuth Callback] Attempting to parse hash tokens manually...');
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            if (isDev) console.log('[OAuth Callback] Found access_token in hash, setting session...');
            try {
              const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
              if (user && !userError) {
                if (isDev) console.log('[OAuth Callback] Got user from token:', user.id);
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: { session: newSession } } = await supabase.auth.getSession();
                if (mounted && newSession?.user) {
                  if (isDev) console.log('[OAuth Callback] Session established after manual token processing');
                  handleSession(newSession);
                  return true;
                }
              }
            } catch (parseErr) {
              if (isDev) console.error('[OAuth Callback] Error parsing tokens:', parseErr);
            }
          }
        }
        
        if (hasQuery && !session && !errorParam) {
          if (isDev) console.log('[OAuth Callback] Query code found, waiting for Supabase to exchange...');
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: { session: checkSession } } = await supabase.auth.getSession();
            if (mounted && checkSession?.user) {
              if (isDev) console.log('[OAuth Callback] Session found after code exchange');
              handleSession(checkSession);
              return true;
            }
          }
        }
        
        return false;
      } catch (err) {
        if (isDev) console.error('[OAuth Callback] Error processing URL session:', err);
        return false;
      }
    };
    
    processUrlSession();

    // 3. Fallback: poll in case auth state change doesn't fire (e.g. PKCE flow)
    const start = Date.now();
    let pollCount = 0;
    const poll = async () => {
      if (!mounted || Date.now() - start > MAX_WAIT_MS) {
        if (isDev) console.log('[OAuth Callback] Poll timeout reached');
        return;
      }
      pollCount++;
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && isDev) console.error('[OAuth Callback] Poll error:', sessionError);
      if (mounted && session?.user) {
        if (isDev) console.log('[OAuth Callback] Session found via poll (attempt', pollCount, ')');
        handleSession(session);
        return;
      }
      if (isDev && pollCount % 5 === 0) {
        console.log('[OAuth Callback] Still polling... (attempt', pollCount, ')');
      }
      timeoutId = setTimeout(poll, FALLBACK_POLL_MS);
    };
    timeoutId = setTimeout(poll, 1000); // Start after a short delay for code exchange

    // 4. Timeout if session never arrives
    const failTimeoutId = setTimeout(() => {
      if (mounted && !hasFinalized && !hasRedirected) {
        hasFinalized = true;
        if (isDev) console.error('[OAuth Callback] Timeout - no session after', MAX_WAIT_MS, 'ms');
        setError('Sign-in timed out. Please try again.');
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
      }
    }, MAX_WAIT_MS);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(failTimeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50 p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          {errorDetails && errorDetails.length > 0 && (
            <div className="text-left text-sm text-gray-700 mb-4">
              <p className="font-medium text-gray-900 mb-2">What to check</p>
              <ul className="list-disc pl-5 space-y-1.5">
                {errorDetails.map((line, i) => (
                  <li key={i} className={line.startsWith('   ') ? 'font-mono text-xs' : ''}>{line.trim()}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-gray-500 text-sm mb-4">Redirecting to login in a few seconds...</p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.LOGIN, { replace: true })}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return <AuthCallbackSkeleton />;
}
