-- ============================================================================
-- PocketShop Authentication Triggers
-- PostgreSQL + Supabase
-- 
-- This script creates trigger functions that automatically create vendor_profiles
-- and customer_profiles when new users sign up via Supabase Auth, based on the
-- user_type specified in raw_user_meta_data during signup.
-- ============================================================================

-- ============================================================================
-- UNDERSTANDING SUPABASE AUTH DATA FLOW
-- ============================================================================
-- 
-- When users sign up via Supabase Auth:
-- 
-- 1. VENDOR SIGNUP (Email/Password):
--    supabase.auth.signUp({
--      email: 'vendor@example.com',
--      password: 'password123',
--      options: {
--        data: {
--          user_type: 'vendor',
--          business_name: 'My Business',
--          mobile_number: '+919876543210'
--        }
--      }
--    })
--    → This data is stored in auth.users.raw_user_meta_data as JSONB
--    → Access via: raw_user_meta_data->>'user_type'
--                  raw_user_meta_data->>'business_name'
--                  raw_user_meta_data->>'mobile_number'
--
-- 2. CUSTOMER SIGNUP (Phone OTP):
--    supabase.auth.signInWithOtp({
--      phone: '+919876543210',
--      options: {
--        shouldCreateUser: true,
--        data: {
--          user_type: 'customer',
--          name: 'John Doe'
--        }
--      }
--    })
--    → Phone number is stored in auth.users.phone (TEXT field)
--    → Additional data in raw_user_meta_data->>'name'
--    → After OTP verification, user is created in auth.users
--
-- Note: These triggers fire AFTER INSERT on auth.users, so the user record
-- already exists when the function executes.
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILE CREATION FUNCTION
-- ============================================================================
-- Automatically creates vendor_profiles and assigns 'vendor' role when a new
-- user signs up with user_type = 'vendor' in raw_user_meta_data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert vendor profile with data from signup metadata
  INSERT INTO public.vendor_profiles (
    user_id,
    email,
    business_name,
    mobile_number,
    onboarding_status
  )
  VALUES (
    NEW.id, -- UUID from auth.users
    NEW.email, -- Email from auth.users
    COALESCE(
      NEW.raw_user_meta_data->>'business_name',
      'My Business' -- Default fallback if not provided
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'mobile_number',
      '' -- Empty string if not provided (should be validated in app)
    ),
    'basic_info' -- Start onboarding at basic_info stage
  );

  -- Insert user role (vendor)
  -- Use ON CONFLICT to prevent duplicate insertion if trigger fires multiple times
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendor')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CUSTOMER PROFILE CREATION FUNCTION
-- ============================================================================
-- Automatically creates customer_profiles and assigns 'customer' role when a new
-- user signs up with user_type = 'customer' (typically via OTP)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_synthetic TEXT;
  v_phone_verified BOOLEAN;
BEGIN
  -- Deterministic placeholder for email-only signups (unique per user, NOT NULL safe)
  v_synthetic := 'email:' || replace(NEW.id::text, '-', '');

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    CASE WHEN NEW.phone IS NOT NULL AND btrim(NEW.phone) <> '' THEN NEW.phone ELSE NULL END,
    'Customer'
  );

  v_phone := COALESCE(
    NULLIF(btrim(NEW.phone), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'mobile_number'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), '')
  );

  IF v_phone IS NULL OR v_phone = '' THEN
    v_phone := v_synthetic;
    v_phone_verified := FALSE;
  ELSE
    v_phone_verified := TRUE;
  END IF;

  INSERT INTO public.customer_profiles (
    user_id,
    email,
    name,
    mobile_number,
    phone_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_phone,
    v_phone_verified
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. VENDOR TRIGGER
-- ============================================================================
-- Fires AFTER INSERT on auth.users when user_type = 'vendor'
-- ============================================================================
DROP TRIGGER IF EXISTS on_vendor_auth_user_created ON auth.users;

CREATE TRIGGER on_vendor_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'vendor')
  EXECUTE FUNCTION public.handle_new_vendor();

-- ============================================================================
-- 4. CUSTOMER TRIGGER
-- ============================================================================
-- Fires AFTER INSERT on auth.users when user_type = 'customer'
-- ============================================================================
DROP TRIGGER IF EXISTS on_customer_auth_user_created ON auth.users;

CREATE TRIGGER on_customer_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'customer')
  EXECUTE FUNCTION public.handle_new_customer();

-- ============================================================================
-- END OF TRIGGER SETUP
-- ============================================================================

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. SECURITY DEFINER allows functions to bypass RLS on tables
--    This is necessary because triggers fire as the system user, not the
--    authenticated user, and need to insert into protected tables.
--
-- 2. The WHEN clause ensures triggers only fire for specific user_types,
--    preventing unnecessary function calls.
--
-- 3. ON CONFLICT DO NOTHING prevents errors if user_roles already exists
--    (useful if triggers fire multiple times or manual inserts occur).
--
-- 4. Functions use COALESCE for graceful fallbacks when metadata is missing.
--
-- 5. For customer signups via OTP, the phone field in auth.users is the
--    primary source, as it's automatically populated by Supabase Auth.
--
-- 6. Email/password customer signups without a phone use a synthetic
--    mobile_number: email:<uuid_without_dashes> (unique, RLS-friendly).
-- ============================================================================
