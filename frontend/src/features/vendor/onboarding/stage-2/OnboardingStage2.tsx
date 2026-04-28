import React, { useState } from 'react';
import { useOnboarding } from '@/features/vendor/context/OnboardingContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { preloadNextOnboardingStage } from '@/utils/preloaders';
import { InputField } from '@/features/common/components/shared/InputField';
import { StageIndicator } from '@/features/common/components/shared/StageIndicator';
import { SUPPORTED_SERVICE_CITIES } from '@/features/common/constants/serviceCities';

const OnboardingStage2: React.FC = () => {
  const { data, updateData, completeStage, nextStage, previousStage } = useOnboarding();
  const { user, setOnboardingStatus } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Client-side validation
    if (!data.address) newErrors.address = 'Address is required';
    if (!data.city) newErrors.city = 'City is required';
    if (!data.state) newErrors.state = 'State is required';
    if (!data.postalCode) newErrors.postalCode = 'Postal code is required';
    if (!data.operationalZone) newErrors.operationalZone = 'Operational zone is required';
    if (data.workingDays.length === 0) newErrors.workingDays = 'Select at least one working day';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!user) {
      setErrors({ submit: 'User not authenticated. Please log in again.' });
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors

    try {
      console.log('[OnboardingStage2] Starting stage 2 completion for user:', user.id);

      // Step 1: Save stage 2 data to database
      console.log('[OnboardingStage2] Saving data to database...');
      const { data: currentProfile, error: profileError } = await (supabase
        .from('vendor_profiles' as any)
        .select('metadata')
        .eq('user_id', user.id)
        .single()) as any;

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('[OnboardingStage2] Profile metadata fetch error:', profileError);
        setErrors({ submit: `Failed to load profile data: ${profileError.message}. Please try again.` });
        setIsLoading(false);
        return;
      }

      const { error: updateError, data: updateData } = await (supabase
        .from('vendor_profiles' as any)
        .update({
          address: data.address,
          city: data.city,
          state: data.state,
          postal_code: data.postalCode,
          country: data.country || 'IN',
          metadata: {
            ...(currentProfile?.metadata || {}),
            operational_zone: data.operationalZone,
          },
          working_days: data.workingDays,
          operational_hours: data.operationalHours,
          onboarding_status: 'operational_details',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()) as any;

      if (updateError) {
        console.error('[OnboardingStage2] Database update error:', updateError);
        setErrors({ submit: `Failed to save data: ${updateError.message}. Please try again.` });
        setIsLoading(false);
        return;
      }

      console.log('[OnboardingStage2] Data saved successfully:', updateData);
      setOnboardingStatus('operational_details'); // cache so next page doesn't refetch

      // Step 2: Mark stage 2 as complete in context
      console.log('[OnboardingStage2] Marking stage 2 as complete...');
      try {
        await completeStage(2);
        console.log('[OnboardingStage2] Stage 2 marked as complete');
      } catch (completeError: any) {
        console.error('[OnboardingStage2] Error completing stage:', completeError);
        setErrors({ submit: `Failed to update progress: ${completeError.message}. Please try again.` });
        setIsLoading(false);
        return;
      }

      // Step 3: Preload next stage for faster navigation
      console.log('[OnboardingStage2] Preloading stage 3...');
      preloadNextOnboardingStage(2).catch(console.error);

      // Step 4: Wait a brief moment to ensure database update is committed
      console.log('[OnboardingStage2] Waiting for database commit...');
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

      // Step 5: Force a hard navigation to stage 3 (bypasses React Router state issues)
      console.log('[OnboardingStage2] Navigating to stage 3...');
      // Use window.location for reliable navigation that forces a fresh page load
      window.location.href = ROUTES.VENDOR_ONBOARDING_STAGE_3;
    } catch (err: any) {
      console.error('[OnboardingStage2] Unexpected error:', err);
      setErrors({ 
        submit: err.message || 'An unexpected error occurred. Please try again or refresh the page.' 
      });
      setIsLoading(false);
    }
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleWorkingDay = (day: string) => {
    const updatedDays = data.workingDays.includes(day)
      ? data.workingDays.filter((d) => d !== day)
      : [...data.workingDays, day];
    updateData({ workingDays: updatedDays });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8 max-w-[600px] w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight">
          Operational Details
        </h1>
        <p className="text-[#6B7280] mt-1.5 text-sm">Step 2 of 3</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[600px]">
        <form onSubmit={handleNext}>
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl p-10 space-y-6">
            {/* Location */}
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Location information</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Where is your restaurant located?</p>
              <InputField
                label="Address"
                placeholder="Street address"
                value={data.address}
                onChange={(e) => updateData({ address: e.target.value })}
                error={errors.address}
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="City"
                  placeholder="Your city"
                  value={data.city}
                  onChange={(e) => updateData({ city: e.target.value })}
                  error={errors.city}
                />
                <InputField
                  label="State"
                  placeholder="Your state"
                  value={data.state}
                  onChange={(e) => updateData({ state: e.target.value })}
                  error={errors.state}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Postal Code"
                  placeholder="XXXXX"
                  value={data.postalCode}
                  onChange={(e) => updateData({ postalCode: e.target.value })}
                  error={errors.postalCode}
                />
                <InputField
                  label="Country"
                  placeholder="India"
                  value={data.country || 'India'}
                  onChange={(e) => updateData({ country: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 mt-4">
                <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  Operational Zone
                </label>
                <select
                  className={`w-full px-5 py-3.5 rounded-lg border text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 focus:border-[#5522E2] transition-all ${
                    errors.operationalZone
                      ? 'border-[#E83935] focus:ring-[#E83935]/25 focus:border-[#E83935]'
                      : 'border-[#E5E7EB]'
                  }`}
                  value={data.operationalZone}
                  onChange={(e) => updateData({ operationalZone: e.target.value })}
                >
                  <option value="">Select operational zone</option>
                  {SUPPORTED_SERVICE_CITIES.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
                {errors.operationalZone && (
                  <p className="text-sm text-[#E83935] mt-1">{errors.operationalZone}</p>
                )}
              </div>
            </div>

            {/* Working Days */}
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Working days</h2>
              <p className="mt-1 text-sm text-[#6B7280]">Select days you operate</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {weekDays.map((day) => (
                  <label key={day} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.workingDays.includes(day)}
                      onChange={() => toggleWorkingDay(day)}
                      className="w-4 h-4 rounded border-[#E5E7EB] text-[#5522E2] focus:ring-[#5522E2]/25 cursor-pointer"
                    />
                    <span className="text-sm text-[#374151] font-medium">{day}</span>
                  </label>
                ))}
              </div>
              {errors.workingDays && (
                <p className="text-sm text-[#E83935] mt-1">{errors.workingDays}</p>
              )}
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => previousStage()}
                className="flex-1 px-8 py-3.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] font-medium text-sm hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-8 py-3.5 rounded-lg bg-[#5522E2] hover:bg-[#4A1EC9] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 focus:ring-offset-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? 'Saving…' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </form>

        {/* Progress dots */}
        <div className="flex justify-center mt-10">
          <StageIndicator currentStage={2} totalStages={3} />
        </div>
      </div>
    </div>
  );
};

export default OnboardingStage2;

