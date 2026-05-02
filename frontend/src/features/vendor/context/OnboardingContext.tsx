/**
 * Onboarding Context
 * 
 * Manages onboarding state, stage tracking, and completion status.
 * Integrates with Supabase to persist progress and validate stage access.
 */

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { DEFAULT_SERVICE_CITY } from '@/features/common/constants/serviceCities';

interface OnboardingData {
  // Stage 1: Restaurant Info
  restaurantName: string;
  ownerName: string;
  restaurantType: string;
  businessCategory: string;
  /** Saved URLs from vendor_profiles (preview when resuming). */
  logoUrl: string;
  bannerUrl: string;
  // Stage 2: Operational Details
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  operationalZone: string;
  operationalHours: Record<string, { open: string; close: string }>;
  workingDays: string[];
  // Stage 3: Plans
  selectedPlan: 'free' | 'pro' | null;
}

interface StageCompletion {
  stage1: boolean;
  stage2: boolean;
  stage3: boolean;
  completed: boolean;
}

interface OnboardingContextType {
  data: OnboardingData;
  currentStage: number;
  stageCompletion: StageCompletion;
  loading: boolean;
  updateData: (newData: Partial<OnboardingData>) => void;
  completeStage: (stage: number) => Promise<void>;
  goToStage: (stage: number) => void;
  nextStage: () => void;
  previousStage: () => void;
  resetOnboarding: () => void;
  refreshStatus: () => Promise<void>;
  canAccessStage: (stage: number) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Map onboarding_status to stage completion
const mapStatusToStages = (status: string): StageCompletion => {
  switch (status) {
    case 'completed':
      return { stage1: true, stage2: true, stage3: true, completed: true };
    case 'planning_selected':
    case 'operational_details':
      return { stage1: true, stage2: true, stage3: false, completed: false };
    case 'basic_info':
      return { stage1: true, stage2: false, stage3: false, completed: false };
    case 'incomplete':
    default:
      return { stage1: false, stage2: false, stage3: false, completed: false };
  }
};

// Map stage number to onboarding_status value
const getStatusForStage = (stage: number): string => {
  switch (stage) {
    case 1:
      return 'basic_info';
    case 2:
      return 'operational_details';
    case 3:
      return 'planning_selected';
    default:
      return 'incomplete';
  }
};

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stageCompletion, setStageCompletion] = useState<StageCompletion>({
    stage1: false,
    stage2: false,
    stage3: false,
    completed: false,
  });
  const [data, setData] = useState<OnboardingData>({
    restaurantName: '',
    ownerName: '',
    restaurantType: '',
    businessCategory: '',
    logoUrl: '',
    bannerUrl: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    operationalZone: DEFAULT_SERVICE_CITY,
    operationalHours: {},
    workingDays: [],
    selectedPlan: null,
  });

  // Load onboarding status from database
  const refreshStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      // Expose debug variable
      (window as any).__DEBUG_ONBOARDING_LOADING = false;
      return;
    }

    try {
      setLoading(true);
      // Expose debug variable
      (window as any).__DEBUG_ONBOARDING_LOADING = true;
      
      console.log('[OnboardingContext] Loading status for user:', user.id);
      
      const { data: profile, error } = await (supabase
        .from('vendor_profiles' as any)
        .select(
          'onboarding_status, business_name, owner_name, business_type, address, city, state, postal_code, country, working_days, operational_hours, metadata, logo_url, banner_url'
        )
        .eq('user_id', user.id)
        .single()) as any;

      if (error) {
        console.error('[OnboardingContext] Error loading onboarding status:', error.code, error.message);
        // Default to no completion if error
        setStageCompletion({
          stage1: false,
          stage2: false,
          stage3: false,
          completed: false,
        });
        setCurrentStage(1);
      } else if (profile) {
        console.log('[OnboardingContext] Profile loaded, status:', profile.onboarding_status);
        const completion = mapStatusToStages(profile.onboarding_status || 'incomplete');
        setStageCompletion(completion);

        // Load existing data from database (always merge saved image URLs; rest when basic info exists)
        setData((prev) => ({
          ...prev,
          logoUrl: profile.logo_url ?? prev.logoUrl,
          bannerUrl: profile.banner_url ?? prev.bannerUrl,
          ...(profile.business_name || profile.owner_name
            ? {
                restaurantName: profile.business_name || prev.restaurantName,
                ownerName: profile.owner_name || prev.ownerName,
                restaurantType: profile.business_type || prev.restaurantType,
                businessCategory: profile.metadata?.business_category || prev.businessCategory,
                address: profile.address || prev.address,
                city: profile.city || prev.city,
                state: profile.state || prev.state,
                postalCode: profile.postal_code || prev.postalCode,
                country: profile.country || prev.country,
                operationalZone: profile.metadata?.operational_zone || prev.operationalZone,
                workingDays: profile.working_days || prev.workingDays,
                operationalHours: profile.operational_hours || prev.operationalHours,
                selectedPlan: profile.metadata?.selected_plan || prev.selectedPlan,
              }
            : {}),
        }));

        // Set current stage based on completion
        if (completion.completed) {
          setCurrentStage(4); // Completion stage
        } else if (completion.stage3) {
          setCurrentStage(3);
        } else if (completion.stage2) {
          setCurrentStage(2);
        } else if (completion.stage1) {
          setCurrentStage(2); // Move to stage 2 if stage 1 is done
        } else {
          setCurrentStage(1);
        }
      } else {
        // No profile found - treat as incomplete
        console.log('[OnboardingContext] No profile found, treating as incomplete');
        setStageCompletion({
          stage1: false,
          stage2: false,
          stage3: false,
          completed: false,
        });
        setCurrentStage(1);
      }
    } catch (err) {
      console.error('[OnboardingContext] Unexpected error refreshing onboarding status:', err);
      // On error, assume incomplete to be safe
      setStageCompletion({
        stage1: false,
        stage2: false,
        stage3: false,
        completed: false,
      });
      setCurrentStage(1);
    } finally {
      // MUST run regardless of success/error to prevent stuck loading state
      setLoading(false);
      // Expose debug variable
      (window as any).__DEBUG_ONBOARDING_LOADING = false;
      console.log('[OnboardingContext] Loading complete');
    }
  }, [user]);

  // Load status on mount and when user changes
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Update data in context
  const updateData = useCallback((newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Complete a stage - NOTE: This only updates local state now
  // The actual database update happens in the stage components
  // This function is kept for backward compatibility but doesn't do DB updates
  const completeStage = useCallback(async (stage: number): Promise<void> => {
    if (!user) {
      console.warn('[OnboardingContext] completeStage called but user is not authenticated');
      return;
    }

    try {
      console.log('[OnboardingContext] completeStage called for stage:', stage);
      console.log('[OnboardingContext] NOTE: Database update should already be done in stage component');
      
      // Update local state ONLY (optimistic update)
      // The database was already updated by the stage component
      const newCompletion = { ...stageCompletion };
      if (stage === 1) newCompletion.stage1 = true;
      if (stage === 2) newCompletion.stage2 = true;
      if (stage === 3) newCompletion.stage3 = true;

      console.log('[OnboardingContext] Updating local state only:', newCompletion);
      setStageCompletion(newCompletion);

      // Don't update database here - it's already done in the stage component
      // This prevents duplicate updates and race conditions
      
    } catch (err) {
      console.error('[OnboardingContext] Error in completeStage:', err);
      // Don't throw - this is just for local state update
    }
  }, [user, stageCompletion]);

  // Check if user can access a stage
  const canAccessStage = useCallback((stage: number): boolean => {
    switch (stage) {
      case 1:
        return true; // Always accessible
      case 2:
        return stageCompletion.stage1;
      case 3:
        return stageCompletion.stage1 && stageCompletion.stage2;
      case 4: // Completion
        return stageCompletion.stage1 && stageCompletion.stage2 && stageCompletion.stage3;
      default:
        return false;
    }
  }, [stageCompletion]);

  // Navigate to a specific stage (with validation)
  const goToStage = useCallback((stage: number) => {
    console.log('[OnboardingContext] goToStage called with stage:', stage);
    console.log('[OnboardingContext] canAccessStage:', canAccessStage(stage));
    console.log('[OnboardingContext] stageCompletion:', stageCompletion);
    
    if (!canAccessStage(stage)) {
      console.warn('[OnboardingContext] Cannot access stage', stage, 'redirecting to first incomplete stage');
      // Redirect to the first incomplete stage
      if (!stageCompletion.stage1) {
        navigate(ROUTES.VENDOR_ONBOARDING_STAGE_1, { replace: true });
      } else if (!stageCompletion.stage2) {
        navigate(ROUTES.VENDOR_ONBOARDING_STAGE_2, { replace: true });
      } else if (!stageCompletion.stage3) {
        navigate(ROUTES.VENDOR_ONBOARDING_STAGE_3, { replace: true });
      }
      return;
    }

    console.log('[OnboardingContext] Setting current stage to:', stage);
    setCurrentStage(stage);
    // Map stage number to route
    const stageRoutes: Record<number, string> = {
      1: ROUTES.VENDOR_ONBOARDING_STAGE_1,
      2: ROUTES.VENDOR_ONBOARDING_STAGE_2,
      3: ROUTES.VENDOR_ONBOARDING_STAGE_3,
    };
    const targetPath = stageRoutes[stage] || ROUTES.VENDOR_ONBOARDING_STAGE_1;
    console.log('[OnboardingContext] Navigating to:', targetPath);
    navigate(targetPath, { replace: true });
  }, [canAccessStage, stageCompletion, navigate]);

  // Move to next stage
  const nextStage = useCallback(() => {
    console.log('[OnboardingContext] nextStage called, currentStage:', currentStage, 'stageCompletion:', stageCompletion);
    
    if (currentStage < 3) {
      const next = currentStage + 1;
      console.log('[OnboardingContext] Moving to stage:', next);
      if (canAccessStage(next)) {
        console.log('[OnboardingContext] Stage access granted, navigating...');
        goToStage(next);
      } else {
        console.warn('[OnboardingContext] Stage access denied for stage:', next);
        // Fallback: navigate directly if access check fails
        const stageRoutes: Record<number, string> = {
          1: ROUTES.VENDOR_ONBOARDING_STAGE_1,
          2: ROUTES.VENDOR_ONBOARDING_STAGE_2,
          3: ROUTES.VENDOR_ONBOARDING_STAGE_3,
        };
        navigate(stageRoutes[next] || ROUTES.VENDOR_ONBOARDING_STAGE_1, { replace: true });
      }
    } else if (currentStage === 3 && stageCompletion.stage3) {
      // Move to completion page
      console.log('[OnboardingContext] All stages complete, navigating to completion...');
      navigate(ROUTES.VENDOR_ONBOARDING_COMPLETION, { replace: true });
    } else {
      console.warn('[OnboardingContext] Cannot determine next stage, currentStage:', currentStage);
    }
  }, [currentStage, canAccessStage, goToStage, stageCompletion, navigate]);

  // Move to previous stage
  const previousStage = useCallback(() => {
    if (currentStage > 1) {
      goToStage(currentStage - 1);
    }
  }, [currentStage, goToStage]);

  // Reset onboarding (for testing/development)
  const resetOnboarding = useCallback(() => {
    setCurrentStage(1);
    setStageCompletion({
      stage1: false,
      stage2: false,
      stage3: false,
      completed: false,
    });
    setData({
      restaurantName: '',
      ownerName: '',
      restaurantType: '',
      businessCategory: '',
      logoUrl: '',
      bannerUrl: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      operationalZone: DEFAULT_SERVICE_CITY,
      operationalHours: {},
      workingDays: [],
      selectedPlan: null,
    });
  }, []);

  const value: OnboardingContextType = {
    data,
    currentStage,
    stageCompletion,
    loading,
    updateData,
    completeStage,
    goToStage,
    nextStage,
    previousStage,
    resetOnboarding,
    refreshStatus,
    canAccessStage,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};
