-- Row Level Security (RLS) Policies for vendor_profiles
-- Run this SQL in your Supabase SQL Editor

-- 1. Vendors can view their own profile
DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can view own profile"
ON public.vendor_profiles FOR SELECT
USING (auth.uid() = user_id);

-- 2. Vendors can update their own profile
DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update own profile"
ON public.vendor_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Vendors can insert their own profile
DROP POLICY IF EXISTS "Vendors can insert own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can insert own profile"
ON public.vendor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Public can view active vendor info (for storefront)
DROP POLICY IF EXISTS "Public can view active vendor info" ON public.vendor_profiles;
CREATE POLICY "Public can view active vendor info"
ON public.vendor_profiles FOR SELECT
USING (is_active = TRUE);

