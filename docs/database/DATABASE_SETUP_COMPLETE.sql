-- ============================================================================
-- PocketShop COMPLETE DATABASE SETUP
-- PostgreSQL + Supabase
-- 
-- This is a single-file setup script that creates everything needed for
-- PocketShop in the correct order.
--
-- Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor → New Query
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run" or press Ctrl+Enter
-- 4. Wait for all commands to execute
-- 5. Verify setup using the queries at the bottom of this file
--
-- Order of execution:
-- 1. Schema (tables)
-- 2. Triggers (auto-create profiles)
-- 3. RLS Policies (security)
-- ============================================================================

-- ============================================================================
-- PART 1: SCHEMA (TABLES)
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE,
  owner_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',
  operational_hours JSONB,
  working_days TEXT[],
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  qr_code_id TEXT UNIQUE,
  qr_code_url TEXT,
  onboarding_status TEXT DEFAULT 'incomplete' 
    CHECK (onboarding_status IN ('incomplete', 'basic_info', 'operational_details', 'planning_selected', 'completed')),
  is_active BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON public.vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_email ON public.vendor_profiles(email);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_mobile_number ON public.vendor_profiles(mobile_number);
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CUSTOMER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE,
  email TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  is_guest_converted BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_mobile_number ON public.customer_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email) WHERE email IS NOT NULL;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. GUEST SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  mobile_number TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_token ON public.guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_mobile_number ON public.guest_sessions(mobile_number);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_converted_to_user_id ON public.guest_sessions(converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. USER ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('vendor', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available) WHERE is_available = TRUE;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  guest_session_id UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_session_id ON public.orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: TRIGGERS
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILE CREATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vendor_profiles (
    user_id, email, business_name, mobile_number, onboarding_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', ''),
    'basic_info'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendor')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CUSTOMER PROFILE CREATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_name TEXT;
  customer_phone TEXT;
BEGIN
  customer_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.phone, 'Customer')
  );

  customer_phone := COALESCE(
    NEW.phone,
    NEW.raw_user_meta_data->>'mobile_number',
    NEW.raw_user_meta_data->>'phone',
    ''
  );

  INSERT INTO public.customer_profiles (
    user_id, email, name, mobile_number, phone_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    customer_name,
    customer_phone,
    TRUE
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
DROP TRIGGER IF EXISTS on_vendor_auth_user_created ON auth.users;
CREATE TRIGGER on_vendor_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'vendor')
  EXECUTE FUNCTION public.handle_new_vendor();

-- ============================================================================
-- 4. CUSTOMER TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS on_customer_auth_user_created ON auth.users;
CREATE TRIGGER on_customer_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'customer')
  EXECUTE FUNCTION public.handle_new_customer();

-- ============================================================================
-- PART 3: RLS POLICIES
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can view own profile"
ON public.vendor_profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Public can view active vendor profiles"
ON public.vendor_profiles FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Vendors can insert own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can insert own profile"
ON public.vendor_profiles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'vendor'
  )
);

DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update own profile"
ON public.vendor_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. CUSTOMER PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customer_profiles;
CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'customer'
  )
);

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update own profile"
ON public.customer_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can delete own profile" ON public.customer_profiles;
CREATE POLICY "Customers can delete own profile"
ON public.customer_profiles FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. PRODUCTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
CREATE POLICY "Public can view available products"
ON public.products FOR SELECT
USING (is_available = TRUE);

DROP POLICY IF EXISTS "Vendors can view own products" ON public.products;
CREATE POLICY "Vendors can view own products"
ON public.products FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vendors can insert own products" ON public.products;
CREATE POLICY "Vendors can insert own products"
ON public.products FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vendors can update own products" ON public.products;
CREATE POLICY "Vendors can update own products"
ON public.products FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Vendors can delete own products" ON public.products;
CREATE POLICY "Vendors can delete own products"
ON public.products FOR DELETE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. ORDERS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Vendors can view their orders" ON public.orders;
CREATE POLICY "Vendors can view their orders"
ON public.orders FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
ON public.orders FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customer_profiles
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (
  items IS NOT NULL
  AND jsonb_array_length(items) > 0
  AND total_amount >= 0
  AND (customer_id IS NOT NULL OR guest_session_id IS NOT NULL)
);

DROP POLICY IF EXISTS "Vendors can update order status" ON public.orders;
CREATE POLICY "Vendors can update order status"
ON public.orders FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. GUEST SESSIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;
CREATE POLICY "Anyone can create guest sessions"
ON public.guest_sessions FOR INSERT
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Public can view guest sessions" ON public.guest_sessions;
CREATE POLICY "Public can view guest sessions"
ON public.guest_sessions FOR SELECT
USING (
  (converted_to_user_id IS NOT NULL AND converted_to_user_id = auth.uid())
  OR
  (is_active = TRUE AND expires_at > NOW())
);

DROP POLICY IF EXISTS "Users can update converted guest sessions" ON public.guest_sessions;
CREATE POLICY "Users can update converted guest sessions"
ON public.guest_sessions FOR UPDATE
USING (
  converted_to_user_id IS NOT NULL
  AND converted_to_user_id = auth.uid()
)
WITH CHECK (
  converted_to_user_id IS NOT NULL
  AND converted_to_user_id = auth.uid()
);

-- ============================================================================
-- 6. USER ROLES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view roles" ON public.user_roles;
CREATE POLICY "Public can view roles"
ON public.user_roles FOR SELECT
USING (TRUE);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries AFTER the setup completes to verify everything is working:

-- Check tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check triggers exist:
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Check RLS is enabled:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('vendor_profiles', 'customer_profiles', 'products', 'orders', 'guest_sessions', 'user_roles')
ORDER BY tablename;

-- Check policies exist:
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your database is now ready to use!
-- 
-- Test it by:
-- 1. Going to http://localhost:3000
-- 2. Clicking "Join PocketShop"
-- 3. Registering with a new account
-- 4. Verifying the vendor profile was created automatically
-- ============================================================================

