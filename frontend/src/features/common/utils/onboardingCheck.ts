import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';

export type OnboardingStatusValue = 'incomplete' | 'basic_info' | 'operational_details' | 'planning_selected' | 'completed';

type SessionUserLike = {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null;

/** Match AuthContext: explicit vendor/customer from metadata; missing → null (ambiguous). */
export function resolveExplicitUserRole(sessionUser: SessionUserLike): 'vendor' | 'customer' | null {
  if (!sessionUser) return null;
  const meta = (sessionUser.user_metadata ?? {}) as Record<string, unknown>;
  const app = (sessionUser.app_metadata ?? {}) as Record<string, unknown>;
  const role = meta.user_type ?? meta.role ?? app.user_type ?? app.role;

  if (role === 'vendor') return 'vendor';
  if (role === 'customer') return 'customer';
  return null;
}

/**
 * Get redirect path from a known onboarding status (no DB call).
 * Use when status was already loaded (e.g. after login).
 */
export const getRedirectPathFromStatus = (status: OnboardingStatusValue | null): string => {
  if (status === 'completed') return ROUTES.VENDOR_DASHBOARD;
  return ROUTES.VENDOR_ONBOARDING_STAGE_1;
};

/**
 * Post-auth redirect for vendor onboarding/dashboard vs customer home.
 * Pass `sessionUser` whenever available (OAuth callback, fresh sign-in) so customers are not sent to vendor onboarding.
 */
export const getOnboardingRedirectPath = async (
  userId: string,
  sessionUser?: SessionUserLike
): Promise<string> => {
  const explicit = resolveExplicitUserRole(sessionUser ?? null);
  if (explicit === 'customer') {
    return ROUTES.CUSTOMER_HOME;
  }

  try {
    const timeoutPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve(ROUTES.VENDOR_ONBOARDING_STAGE_1), 5000)
    );

    const queryPromise = supabase
      .from('vendor_profiles')
      .select('onboarding_status')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log('Profile query error:', error.code, error.message);
          if (error.code === 'PGRST116') {
            if (explicit === 'vendor') {
              return ROUTES.VENDOR_ONBOARDING_STAGE_1;
            }
            return ROUTES.CUSTOMER_HOME;
          }
          return ROUTES.VENDOR_ONBOARDING_STAGE_1;
        }

        if (data) {
          const status = data.onboarding_status;
          console.log('getOnboardingRedirectPath - Status:', status);
          if (status === 'completed') {
            console.log('Redirecting to dashboard - onboarding completed');
            return ROUTES.VENDOR_DASHBOARD;
          }
          console.log('Redirecting to onboarding - status:', status);
          return ROUTES.VENDOR_ONBOARDING_STAGE_1;
        }

        return ROUTES.VENDOR_ONBOARDING_STAGE_1;
      });

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    console.error('Error checking onboarding status:', err);
    return ROUTES.VENDOR_ONBOARDING_STAGE_1;
  }
};
