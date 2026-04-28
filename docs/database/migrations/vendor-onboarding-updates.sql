-- ============================================================================
-- PocketShop Vendor Onboarding Status Updates
-- PostgreSQL + Supabase
-- 
-- SQL snippets for updating vendor_profiles.onboarding_status at each stage.
-- These queries use auth.uid() for RLS-safe updates.
-- ============================================================================

-- ============================================================================
-- STAGE 1: After Registration → 'basic_info'
-- ============================================================================
-- Updates: onboarding_status, basic fields
-- Trigger: User completes registration form
-- ============================================================================
UPDATE public.vendor_profiles
SET 
  onboarding_status = 'basic_info',
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- STAGE 2: After Business Details → 'business_details'
-- ============================================================================
-- Updates: onboarding_status, business location and owner info
-- Trigger: User completes business details form
-- ============================================================================
UPDATE public.vendor_profiles
SET 
  owner_name = 'John Doe',                    -- Replace with actual value
  address = '123 Main Street',                -- Replace with actual value
  city = 'Mumbai',                            -- Replace with actual value
  state = 'Maharashtra',                      -- Replace with actual value
  postal_code = '400001',                     -- Replace with actual value
  business_type = 'food',                     -- Replace with actual value
  onboarding_status = 'business_details',
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- STAGE 3: After Operational Details → 'operational_details'
-- ============================================================================
-- Updates: onboarding_status, operational_hours (JSONB), working_days (TEXT[])
-- Trigger: User completes operational details form
-- ============================================================================
UPDATE public.vendor_profiles
SET 
  operational_hours = '{
    "monday": {"open": "09:00", "close": "22:00"},
    "tuesday": {"open": "09:00", "close": "22:00"},
    "wednesday": {"open": "09:00", "close": "22:00"},
    "thursday": {"open": "09:00", "close": "22:00"},
    "friday": {"open": "09:00", "close": "23:00"},
    "saturday": {"open": "10:00", "close": "23:00"},
    "sunday": {"open": "10:00", "close": "22:00"}
  }'::jsonb,
  working_days = ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  description = 'Great food, great service!', -- Replace with actual value
  onboarding_status = 'operational_details',
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- STAGE 4: After Plan Selection → 'planning_selected'
-- ============================================================================
-- Updates: onboarding_status, metadata.selected_plan (JSONB)
-- Trigger: User selects a plan (Free Plan or Gold Plan)
-- ============================================================================
UPDATE public.vendor_profiles
SET 
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{selected_plan}',
    '"gold"'::jsonb  -- Replace 'gold' with actual plan: 'free' or 'gold'
  ),
  onboarding_status = 'planning_selected',
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- STAGE 5: After Accept & Finish → 'completed' and Activate
-- ============================================================================
-- Updates: onboarding_status = 'completed', is_active = TRUE
-- Trigger: User completes onboarding and accepts terms
-- ============================================================================
UPDATE public.vendor_profiles
SET 
  onboarding_status = 'completed',
  is_active = TRUE,
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- PARTIAL UPDATES: Update Only Specific Fields
-- ============================================================================

-- Update only operational_hours (preserve other fields)
UPDATE public.vendor_profiles
SET 
  operational_hours = '{
    "monday": {"open": "10:00", "close": "23:00"}
  }'::jsonb,
  updated_at = NOW()
WHERE user_id = auth.uid();

-- Merge into existing operational_hours (preserve other days)
UPDATE public.vendor_profiles
SET 
  operational_hours = jsonb_set(
    COALESCE(operational_hours, '{}'::jsonb),
    '{monday}',
    '{"open": "10:00", "close": "23:00"}'::jsonb
  ),
  updated_at = NOW()
WHERE user_id = auth.uid();

-- Update nested metadata field (add/update bank_account)
UPDATE public.vendor_profiles
SET 
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{bank_account}',
    '{"account_number": "123456789", "ifsc": "HDFC0001234"}'::jsonb
  ),
  updated_at = NOW()
WHERE user_id = auth.uid();

-- ============================================================================
-- UPSERT: Create or Update Vendor Profile
-- ============================================================================
-- Use this pattern for idempotent operations
-- Typically used with service role (backend) or client-side with RLS
-- ============================================================================

-- Client-side UPSERT (with RLS)
INSERT INTO public.vendor_profiles (
  user_id,
  business_name,
  mobile_number,
  email,
  onboarding_status,
  created_at,
  updated_at
)
VALUES (
  auth.uid(),
  'My Business',
  '+919876543210',
  (SELECT email FROM auth.users WHERE id = auth.uid()),
  'basic_info',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  business_name = EXCLUDED.business_name,
  mobile_number = EXCLUDED.mobile_number,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = NOW();

-- Service role UPSERT (backend/admin - bypasses RLS)
-- ⚠️ Only use in secure backend code
-- INSERT INTO public.vendor_profiles (
--   user_id,
--   business_name,
--   mobile_number,
--   email,
--   onboarding_status,
--   is_active,
--   created_at,
--   updated_at
-- )
-- VALUES (
--   'user-uuid-here',  -- Specific user_id
--   'Admin Created Business',
--   '+919876543210',
--   'business@example.com',
--   'completed',
--   TRUE,
--   NOW(),
--   NOW()
-- )
-- ON CONFLICT (user_id) 
-- DO UPDATE SET
--   business_name = EXCLUDED.business_name,
--   mobile_number = EXCLUDED.mobile_number,
--   email = EXCLUDED.email,
--   onboarding_status = EXCLUDED.onboarding_status,
--   is_active = EXCLUDED.is_active,
--   updated_at = NOW();

-- ============================================================================
-- HELPER QUERIES: Check Current Status
-- ============================================================================

-- Get current onboarding status
SELECT 
  id,
  business_name,
  onboarding_status,
  is_active,
  updated_at
FROM public.vendor_profiles
WHERE user_id = auth.uid();

-- Check if vendor is active
SELECT 
  id,
  business_name,
  is_active,
  onboarding_status
FROM public.vendor_profiles
WHERE user_id = auth.uid()
  AND is_active = TRUE;

-- Get incomplete onboarding stages
SELECT 
  CASE 
    WHEN onboarding_status = 'incomplete' THEN 'Stage 1: Basic Info'
    WHEN onboarding_status = 'basic_info' THEN 'Stage 2: Business Details'
    WHEN onboarding_status = 'business_details' THEN 'Stage 3: Operational Details'
    WHEN onboarding_status = 'operational_details' THEN 'Stage 4: Plan Selection'
    WHEN onboarding_status = 'planning_selected' THEN 'Stage 5: Complete Onboarding'
    WHEN onboarding_status = 'completed' THEN 'Completed'
    ELSE 'Unknown'
  END AS current_stage,
  onboarding_status,
  is_active
FROM public.vendor_profiles
WHERE user_id = auth.uid();

-- ============================================================================
-- RESET ONBOARDING (Admin/Service Role Only)
-- ============================================================================
-- ⚠️ Use only with service role in secure backend
-- UPDATE public.vendor_profiles
-- SET 
--   onboarding_status = 'incomplete',
--   is_active = FALSE,
--   updated_at = NOW()
-- WHERE id = 'vendor-uuid-here';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. All UPDATE queries use WHERE user_id = auth.uid() for RLS safety
-- 2. RLS policies ensure users can only update their own profiles
-- 3. For admin operations, use service role and update by id instead
-- 4. JSONB fields can be updated partially using jsonb_set()
-- 5. Always update updated_at timestamp for tracking
-- 6. Test queries in Supabase SQL Editor while authenticated as vendor
-- ============================================================================
