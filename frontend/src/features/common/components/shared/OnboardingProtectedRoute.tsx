/**
 * Onboarding Protected Route Component
 * 
 * Handles routes that need onboarding status checks:
 * - Validates stage completion before allowing access
 * - Redirects to appropriate stage if user tries to skip
 * - Allows access to completion only after all stages done
 * - Checks vendor_profiles.onboarding_status in database
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ROUTES } from '@/constants/routes';
import { LoadingScreen } from '@/features/common/components/LoadingScreen';
import { supabase } from '@/lib/supabaseClient';

interface OnboardingProtectedRouteProps {
  children: React.ReactNode;
  /**
   * If true, route requires completed onboarding (e.g., dashboard)
   * If false, route is part of onboarding flow (e.g., onboarding stages)
   */
  requireCompletedOnboarding?: boolean;
  /**
   * Stage number (1, 2, 3, or 'completion')
   * Used to validate stage access
   */
  stage?: number | 'completion';
}

interface OnboardingStatus {
  status: 'completed' | 'incomplete' | 'loading' | 'error';
  stage1Completed: boolean;
  stage2Completed: boolean;
  stage3Completed: boolean;
}

// Map onboarding_status to stage completion
const mapStatusToStages = (status: string): { stage1Completed: boolean; stage2Completed: boolean; stage3Completed: boolean } => {
  switch (status) {
    case 'completed':
      return { stage1Completed: true, stage2Completed: true, stage3Completed: true };
    case 'planning_selected':
      // planning_selected means stage 3 (plan selection) is complete
      return { stage1Completed: true, stage2Completed: true, stage3Completed: true };
    case 'operational_details':
      // operational_details means stage 2 is complete, but stage 3 is not
      return { stage1Completed: true, stage2Completed: true, stage3Completed: false };
    case 'basic_info':
      // basic_info means stage 1 is complete, but stages 2 and 3 are not
      return { stage1Completed: true, stage2Completed: false, stage3Completed: false };
    case 'incomplete':
    default:
      return { stage1Completed: false, stage2Completed: false, stage3Completed: false };
  }
};

/**
 * OnboardingProtectedRoute - Handles onboarding-based route protection with stage validation
 * 
 * Usage:
 * // For dashboard (requires completed onboarding)
 * <Route path="/vendor/dashboard/*" element={
 *   <OnboardingProtectedRoute requireCompletedOnboarding>
 *     <VendorDashboard />
 *   </OnboardingProtectedRoute>
 * } />
 * 
 * // For onboarding stage 1
 * <Route path="/vendor/onboarding/stage-1" element={
 *   <OnboardingProtectedRoute stage={1}>
 *     <OnboardingStage1 />
 *   </OnboardingProtectedRoute>
 * } />
 */
export const OnboardingProtectedRoute: React.FC<OnboardingProtectedRouteProps> = ({
  children,
  requireCompletedOnboarding = false,
  stage,
}) => {
  const { user, loading: authLoading, session, onboardingStatus: cachedStatus, setOnboardingStatus: setCachedStatus } = useAuth();
  const location = useLocation();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    status: 'loading',
    stage1Completed: false,
    stage2Completed: false,
    stage3Completed: false,
  });
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [vendorProfileExists, setVendorProfileExists] = useState<boolean | null>(null);

  // Determine target route based on stage completion
  const getTargetRoute = (): string | null => {
    // If route requires completed onboarding but it's incomplete
    if (requireCompletedOnboarding && onboardingStatus.status !== 'completed') {
      if (!onboardingStatus.stage1Completed) {
        return ROUTES.VENDOR_ONBOARDING_STAGE_1;
      } else if (!onboardingStatus.stage2Completed) {
        return ROUTES.VENDOR_ONBOARDING_STAGE_2;
      } else if (!onboardingStatus.stage3Completed) {
        return ROUTES.VENDOR_ONBOARDING_STAGE_3;
      } else {
        return ROUTES.VENDOR_ONBOARDING_COMPLETION;
      }
    }

    // If route is part of onboarding flow and onboarding is already completed
    if (!requireCompletedOnboarding && onboardingStatus.status === 'completed') {
      return ROUTES.VENDOR_DASHBOARD;
    }

    // Validate stage access
    if (stage && !requireCompletedOnboarding) {
      if (stage === 1) {
        // Stage 1 is always accessible
        return null; // No redirect needed
      } else if (stage === 2) {
        // Stage 2 requires stage 1 completion
        if (!onboardingStatus.stage1Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_1;
        }
      } else if (stage === 3) {
        // Stage 3 requires stage 1 and 2 completion
        if (!onboardingStatus.stage1Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_1;
        } else if (!onboardingStatus.stage2Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_2;
        }
      } else if (stage === 'completion') {
        // Completion requires all stages completed
        if (!onboardingStatus.stage1Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_1;
        } else if (!onboardingStatus.stage2Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_2;
        } else if (!onboardingStatus.stage3Completed) {
          return ROUTES.VENDOR_ONBOARDING_STAGE_3;
        }
      }
    }

    return null; // No redirect needed
  };

  // Check if user can access the required stage
  const canAccessStage = (requiredStage: number | 'completion' | undefined): boolean => {
    if (!requiredStage || requiredStage === 1) {
      return true; // Stage 1 is always accessible
    }
    if (requiredStage === 2) {
      return onboardingStatus.stage1Completed;
    }
    if (requiredStage === 3) {
      return onboardingStatus.stage1Completed && onboardingStatus.stage2Completed;
    }
    if (requiredStage === 'completion') {
      return onboardingStatus.stage1Completed && onboardingStatus.stage2Completed && onboardingStatus.stage3Completed;
    }
    return false;
  };

  // Use cached onboarding status from auth when available (set once after login); only fetch when missing
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setVendorProfileExists(false);
      setOnboardingStatus({
        status: 'incomplete',
        stage1Completed: false,
        stage2Completed: false,
        stage3Completed: false,
      });
      setOnboardingLoading(false);
      return;
    }

    // Cached status from auth (loaded once after login) – no DB call
    if (cachedStatus !== null) {
      setVendorProfileExists(true);
      const isCompleted = cachedStatus === 'completed';
      const stageCompletion = mapStatusToStages(cachedStatus);
      setOnboardingStatus({
        status: isCompleted ? 'completed' : 'incomplete',
        ...stageCompletion,
      });
      setOnboardingLoading(false);
      return;
    }

    // No cache: fetch once (e.g. first navigation before profile loaded)
    let mounted = true;
    setOnboardingLoading(true);
    setOnboardingStatus(prev => ({ ...prev, status: 'loading' }));

    const runFetch = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        const queryPromise = (supabase
          .from('vendor_profiles' as any)
          .select('onboarding_status')
          .eq('user_id', user.id)
          .single()) as any;

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (!mounted) return;

        const exists = Boolean(data) && !error;
        setVendorProfileExists(exists);

        const status = (!exists) ? 'incomplete' : (data.onboarding_status || 'incomplete');
        const isCompleted = status === 'completed';
        const stageCompletion = mapStatusToStages(status);

        setOnboardingStatus({ status: isCompleted ? 'completed' : 'incomplete', ...stageCompletion });
        setCachedStatus(status as any); // cache for future navigations
      } catch (err) {
        if (mounted) {
          setVendorProfileExists(false);
          setOnboardingStatus({
            status: 'incomplete',
            stage1Completed: false,
            stage2Completed: false,
            stage3Completed: false,
          });
        }
      } finally {
        if (mounted) setOnboardingLoading(false);
      }
    };

    runFetch();
    return () => { mounted = false; };
  }, [user, authLoading, cachedStatus, setCachedStatus]);

  // Debug logging
  useEffect(() => {
    const target = getTargetRoute();
    const canAccess = canAccessStage(stage);
    console.log('[OnboardingGuard] authLoading=', authLoading, 'onboardingLoading=', onboardingLoading, 'pathname=', location.pathname);
    console.log('[OnboardingGuard] target=', target, 'canAccess=', canAccess, 'stage=', stage);
    console.log('[OnboardingGuard] status=', onboardingStatus.status, 'stage1=', onboardingStatus.stage1Completed, 'stage2=', onboardingStatus.stage2Completed, 'stage3=', onboardingStatus.stage3Completed);
  }, [authLoading, onboardingLoading, location.pathname, stage, onboardingStatus]);

  // Show loading during auth check
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // If not authenticated, redirect to login
  if (!user || !session) {
    return (
      <Navigate 
        to={ROUTES.LOGIN} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If email not confirmed, require confirmation before onboarding (systematic validation)
  const emailConfirmed = Boolean(session?.user?.email_confirmed_at);
  if (session?.user?.email && !emailConfirmed) {
    return (
      <Navigate 
        to={ROUTES.LOGIN} 
        state={{ from: location, message: 'confirm_email' }} 
        replace 
      />
    );
  }

  // Hard separation: onboarding routes are vendor-only.
  if (user.role !== 'vendor') {
    return <Navigate to={ROUTES.CUSTOMER_HOME} replace />;
  }

  // Show loading while checking onboarding status
  if (onboardingLoading || onboardingStatus.status === 'loading') {
    return <LoadingScreen message="Checking onboarding status..." />;
  }

  // Hard separation: onboarding pages are vendor-only.
  if (vendorProfileExists === false) {
    return <Navigate to={ROUTES.CUSTOMER_HOME} replace />;
  }

  // Get target route for redirect
  const target = getTargetRoute();

  // Debug logging
  console.log('[OnboardingGuard] Final check:');
  console.log('  - Current path:', location.pathname);
  console.log('  - Target redirect:', target);
  console.log('  - Stage:', stage);
  console.log('  - Status:', onboardingStatus.status);
  console.log('  - Stage 1 complete:', onboardingStatus.stage1Completed);
  console.log('  - Stage 2 complete:', onboardingStatus.stage2Completed);
  console.log('  - Stage 3 complete:', onboardingStatus.stage3Completed);

  // If we need to redirect and we're not already on the target route
  if (target && location.pathname !== target) {
    console.log('[OnboardingGuard] ⚠️ REDIRECTING from', location.pathname, 'to', target);
    return <Navigate to={target} replace />;
  }

  // If we're already on the target route (or no redirect needed), render children
  // This ensures the component tree renders the page instead of leaving a blank render
  console.log('[OnboardingGuard] ✅ ALLOWING ACCESS to', location.pathname);
  return <>{children}</>;
};
