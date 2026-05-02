import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/features/vendor/context/OnboardingContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ROUTES } from '@/constants/routes';
import { preloadNextOnboardingStage } from '@/utils/preloaders';
import { InputField } from '@/features/common/components/shared/InputField';
import { StageIndicator } from '@/features/common/components/shared/StageIndicator';
import { uploadVendorAsset } from '@/features/common/utils/storage';

const OnboardingStage1: React.FC = () => {
  const { data, updateData } = useOnboarding();
  const { user, setOnboardingStatus } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerObjectUrl, setBannerObjectUrl] = useState<string | null>(null);
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bannerFile) {
      setBannerObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  useEffect(() => {
    if (!logoFile) {
      setLogoObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Client-side validation
    if (!data.restaurantName) newErrors.restaurantName = 'Restaurant name is required';
    if (!data.ownerName) newErrors.ownerName = 'Owner name is required';
    if (!data.restaurantType) newErrors.restaurantType = 'Restaurant type is required';
    if (!data.businessCategory) newErrors.businessCategory = 'Business category is required';

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
      console.log('[OnboardingStage1] Starting stage 1 completion for user:', user.id);
      console.log('[OnboardingStage1] Form data:', {
        restaurantName: data.restaurantName,
        ownerName: data.ownerName,
        restaurantType: data.restaurantType,
        businessCategory: data.businessCategory,
      });

      // Step 0: Check if vendor profile exists
      console.log('[OnboardingStage1] Checking if vendor profile exists...');
      const { data: existingProfile, error: checkError } = await (supabase
        .from('vendor_profiles' as any)
        .select('id, onboarding_status')
        .eq('user_id', user.id)
        .single()) as any;

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means "not found" which is OK, we'll create/update
        console.error('[OnboardingStage1] Error checking profile:', checkError);
        setErrors({ submit: `Error checking profile: ${checkError.message}. Please refresh and try again.` });
        setIsLoading(false);
        return;
      }

      let updateResponse: any = null;
      
      if (!existingProfile) {
        console.log('[OnboardingStage1] No profile found, creating new profile...');
        // Profile doesn't exist, create it
        const { error: createError, data: createResponse } = await (supabase
          .from('vendor_profiles' as any)
          .insert({
            user_id: user.id,
            business_name: data.restaurantName,
            owner_name: data.ownerName,
            business_type: data.restaurantType,
            email: user.email || '',
            mobile_number: '', // Will be set later or from auth metadata
            metadata: {
              business_category: data.businessCategory,
            },
            onboarding_status: 'basic_info',
            is_active: false,
          })
          .select()) as any;

        if (createError) {
          console.error('[OnboardingStage1] ❌ Error creating profile:', createError);
          console.error('[OnboardingStage1] Error code:', createError.code);
          console.error('[OnboardingStage1] Error message:', createError.message);
          console.error('[OnboardingStage1] Error details:', createError.details);
          setErrors({ submit: `Failed to create profile: ${createError.message} (Code: ${createError.code}). Please check if you have permission to create a profile.` });
          setIsLoading(false);
          return;
        }

        console.log('[OnboardingStage1] ✅ Profile created successfully:', createResponse);
        updateResponse = createResponse;
      } else {
        console.log('[OnboardingStage1] Profile exists, updating...');
        console.log('[OnboardingStage1] Current status:', existingProfile.onboarding_status);

        // Step 1: Save stage 1 data AND update onboarding status in one operation
        console.log('[OnboardingStage1] Saving data to database with status update...');
        console.log('[OnboardingStage1] User ID:', user.id);
        console.log('[OnboardingStage1] Update payload:', {
          business_name: data.restaurantName,
          owner_name: data.ownerName,
          business_type: data.restaurantType,
          metadata: {
            business_category: data.businessCategory,
          },
          onboarding_status: 'basic_info',
        });
        
        const { error: updateError, data: updateData } = await (supabase
          .from('vendor_profiles' as any)
          .update({
            business_name: data.restaurantName,
            owner_name: data.ownerName,
            business_type: data.restaurantType,
            metadata: {
              business_category: data.businessCategory,
            },
            onboarding_status: 'basic_info', // This marks stage 1 as complete
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()) as any;
        
        console.log('[OnboardingStage1] Update response - Error:', updateError);
        console.log('[OnboardingStage1] Update response - Data:', updateData);

        if (updateError) {
          console.error('[OnboardingStage1] ❌ Database update error:', updateError);
          console.error('[OnboardingStage1] Error code:', updateError.code);
          console.error('[OnboardingStage1] Error message:', updateError.message);
          console.error('[OnboardingStage1] Error details:', updateError.details);
          setErrors({ submit: `Failed to save data: ${updateError.message} (Code: ${updateError.code}). Please check if you have permission to update your profile.` });
          setIsLoading(false);
          return;
        }

        if (!updateData || updateData.length === 0) {
          console.error('[OnboardingStage1] ❌ No data returned from update!');
          setErrors({ submit: 'Update succeeded but no data returned. Please refresh and try again.' });
          setIsLoading(false);
          return;
        }

        updateResponse = updateData;
      }

      console.log('[OnboardingStage1] ✅ Data saved successfully:', updateResponse);
      
      // Verify the update actually worked by checking the returned data
      const savedStatus = updateResponse[0]?.onboarding_status;
      console.log('[OnboardingStage1] Saved status from response:', savedStatus);
      if (savedStatus !== 'basic_info') {
        console.error('[OnboardingStage1] ⚠️ WARNING: Status mismatch! Expected basic_info, got:', savedStatus);
        setErrors({ submit: `Status update may have failed. Expected 'basic_info', got '${savedStatus}'. Please try again.` });
        setIsLoading(false);
        return;
      }

      // Step 2: Verify database update by re-querying (double-check)
      console.log('[OnboardingStage1] Verifying database update...');
      const { data: verifyData, error: verifyError } = await (supabase
        .from('vendor_profiles' as any)
        .select('onboarding_status, business_name')
        .eq('user_id', user.id)
        .single()) as any;

      if (verifyError) {
        console.error('[OnboardingStage1] Verification query error:', verifyError);
        setErrors({ submit: `Failed to verify update: ${verifyError.message}. Please refresh and try again.` });
        setIsLoading(false);
        return;
      }

      if (verifyData) {
        console.log('[OnboardingStage1] Verification result - Status:', verifyData.onboarding_status);
        if (verifyData.onboarding_status === 'basic_info') {
          console.log('[OnboardingStage1] ✅ Status verified! Stage 1 is complete.');
          setOnboardingStatus('basic_info'); // cache so next page doesn't refetch
        } else {
          console.error('[OnboardingStage1] ❌ Status verification failed! Status is:', verifyData.onboarding_status);
          setErrors({ submit: `Status update failed. Current status: ${verifyData.onboarding_status}. Please try again.` });
          setIsLoading(false);
          return;
        }
      }

      const imageUpdates: Record<string, string> = {};
      if (bannerFile) {
        const bannerResult = await uploadVendorAsset(bannerFile, 'banner');
        if (!bannerResult) {
          setErrors({
            submit:
              'Could not upload your restaurant cover photo. Use JPEG, PNG, WebP, or GIF under 5MB, or clear the file and try again.',
          });
          setIsLoading(false);
          return;
        }
        imageUpdates.banner_url = bannerResult.url;
      }
      if (logoFile) {
        const logoResult = await uploadVendorAsset(logoFile, 'logo');
        if (!logoResult) {
          setErrors({
            submit:
              'Could not upload your logo. Use JPEG, PNG, WebP, or GIF under 5MB, or clear the file and try again.',
          });
          setIsLoading(false);
          return;
        }
        imageUpdates.logo_url = logoResult.url;
      }

      if (Object.keys(imageUpdates).length > 0) {
        const { error: imgUpdateError } = await (supabase
          .from('vendor_profiles' as any)
          .update({
            ...imageUpdates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)) as any;

        if (imgUpdateError) {
          setErrors({
            submit: `Profile saved but images could not be updated: ${imgUpdateError.message}. Try again or continue without new photos.`,
          });
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Preload next stage for faster navigation
      console.log('[OnboardingStage1] Preloading stage 2...');
      preloadNextOnboardingStage(1).catch(console.error);

      // Step 4: Wait a moment to ensure database commit is fully propagated
      console.log('[OnboardingStage1] Waiting for database commit propagation...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1s for reliability

      // Step 5: Force a hard navigation to stage 2 (bypasses React Router state issues)
      console.log('[OnboardingStage1] ✅ All checks passed! Navigating to stage 2...');
      // Use window.location for reliable navigation that forces a fresh page load
      // This ensures OnboardingProtectedRoute re-checks the database with fresh data
      window.location.href = ROUTES.VENDOR_ONBOARDING_STAGE_2;
      
    } catch (err: any) {
      console.error('[OnboardingStage1] Unexpected error:', err);
      setErrors({ 
        submit: err.message || 'An unexpected error occurred. Please try again or refresh the page.' 
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans flex flex-col items-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8 max-w-[600px] w-full">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight">
          Complete your restaurant profile
        </h1>
        <p className="text-[#6B7280] mt-1.5 text-sm">
          Step 1 of 3 · Tell us about your restaurant so customers recognize you.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[600px]">
        <form onSubmit={handleNext}>
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xl p-10 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">Restaurant information</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                These details appear on orders and in your storefront.
              </p>
            </div>

            <InputField
                label="Restaurant Name"
                placeholder="e.g., Golden Dragon Restaurant"
                value={data.restaurantName}
                onChange={(e) => updateData({ restaurantName: e.target.value })}
                error={errors.restaurantName}
              />

              <InputField
                label="Owner Name"
                placeholder="Your full name"
                value={data.ownerName}
                onChange={(e) => updateData({ ownerName: e.target.value })}
                error={errors.ownerName}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  Restaurant Type
                </label>
                <select
                  className={`w-full px-5 py-3.5 rounded-lg border text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 focus:border-[#5522E2] transition-all ${
                    errors.restaurantType
                      ? 'border-[#E83935] focus:ring-[#E83935]/25 focus:border-[#E83935]'
                      : 'border-[#E5E7EB]'
                  }`}
                  value={data.restaurantType}
                  onChange={(e) => updateData({ restaurantType: e.target.value })}
                >
                  <option value="">Select restaurant type</option>
                  <option value="food-truck">Food Truck</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="cloud-kitchen">Cloud Kitchen</option>
                </select>
                {errors.restaurantType && (
                  <p className="text-sm text-[#E83935] mt-1">{errors.restaurantType}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  Business Category
                </label>
                <select
                  className={`w-full px-5 py-3.5 rounded-lg border text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 focus:border-[#5522E2] transition-all ${
                    errors.businessCategory
                      ? 'border-[#E83935] focus:ring-[#E83935]/25 focus:border-[#E83935]'
                      : 'border-[#E5E7EB]'
                  }`}
                  value={data.businessCategory}
                  onChange={(e) => updateData({ businessCategory: e.target.value })}
                >
                  <option value="">Select category</option>
                  <option value="chinese">Chinese</option>
                  <option value="indian">Indian</option>
                  <option value="italian">Italian</option>
                  <option value="fast-food">Fast Food</option>
                  <option value="bakery">Bakery</option>
                  <option value="cafe">Cafe</option>
                  <option value="desserts">Desserts</option>
                </select>
                {errors.businessCategory && (
                  <p className="text-sm text-[#E83935] mt-1">{errors.businessCategory}</p>
                )}
              </div>

            <div>
              <h2 className="text-base font-semibold text-[#111827]">Restaurant photos (optional)</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Cover photo and logo appear when customers browse your café or restaurant. JPEG, PNG, WebP, or GIF,
                max 5MB each.
              </p>
              <div className="grid sm:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                    Cover photo
                  </label>
                  <div className="relative rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] aspect-video max-h-44 overflow-hidden flex items-center justify-center">
                    {bannerObjectUrl || data.bannerUrl ? (
                      <img
                        src={bannerObjectUrl || data.bannerUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-[#9CA3AF] px-3 text-center">No cover yet</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-sm text-[#374151] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#5522E2] file:text-white file:font-medium"
                    onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                  />
                  {bannerFile ? (
                    <button
                      type="button"
                      className="text-sm text-[#5522E2] font-medium hover:underline"
                      onClick={() => setBannerFile(null)}
                    >
                      Clear selected file
                    </button>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Logo</label>
                  <div className="relative rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] w-36 h-36 mx-auto sm:mx-0 overflow-hidden flex items-center justify-center">
                    {logoObjectUrl || data.logoUrl ? (
                      <img
                        src={logoObjectUrl || data.logoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-[#9CA3AF] px-2 text-center">No logo yet</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-sm text-[#374151] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#5522E2] file:text-white file:font-medium"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                  {logoFile ? (
                    <button
                      type="button"
                      className="text-sm text-[#5522E2] font-medium hover:underline"
                      onClick={() => setLogoFile(null)}
                    >
                      Clear selected file
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Primary Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3.5 rounded-lg bg-[#5522E2] hover:bg-[#4A1EC9] text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#5522E2]/25 focus:ring-offset-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? 'Saving…' : 'Continue to Operations'}
              </button>
            </div>
          </div>
        </form>

        {/* Progress dots */}
        <div className="flex justify-center mt-10">
          <StageIndicator currentStage={1} totalStages={3} />
        </div>
      </div>
    </div>
  );
};

export default OnboardingStage1;

