-- ============================================================================
-- RLS Policy Fix for Orders Table
-- 
-- This fixes the "Permission denied" error when creating orders from storefront.
-- The issue is that the RLS policy requires either customer_id OR guest_session_id,
-- but if guest session creation fails or policy isn't applied correctly, orders fail.
-- 
-- Run this in Supabase SQL Editor to fix the RLS policies.
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY CURRENT POLICIES
-- ============================================================================
-- Check what policies currently exist for orders table
-- Run this first to see current state:

-- SELECT 
--   policyname, 
--   cmd, 
--   roles,
--   qual,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'orders'
-- ORDER BY cmd, policyname;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING ORDER POLICIES (Clean Slate)
-- ============================================================================
-- Drop all existing policies to avoid conflicts

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view their orders" ON public.orders;
DROP POLICY IF EXISTS "vendor_view_own_orders" ON public.orders;
DROP POLICY IF EXISTS "vendor_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "vendor_insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders by UUID" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can update order status" ON public.orders;

-- ============================================================================
-- STEP 3: CREATE POLICIES IN CORRECT ORDER
-- ============================================================================

-- Policy 1: PUBLIC INSERT - Anyone can create orders (GUEST CHECKOUT)
-- This is the MOST PERMISSIVE and CRITICAL for storefront
-- Allows orders WITHOUT requiring customer_id or guest_session_id
-- We store customer_name and customer_phone directly in orders table for guest checkout
DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
CREATE POLICY "public_insert_orders"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (
    -- Basic data validation only
    items IS NOT NULL
    AND jsonb_array_length(items) > 0
    AND total_amount >= 0
    AND vendor_id IS NOT NULL
    -- NOTE: We do NOT require customer_id OR guest_session_id here
    -- This allows maximum flexibility for guest checkout
    -- Customer info is stored in customer_name and customer_phone fields
  );

-- Policy 2: PUBLIC SELECT - Anyone can view orders (for order confirmation)
DROP POLICY IF EXISTS "public_select_orders" ON public.orders;
CREATE POLICY "public_select_orders"
  ON public.orders
  FOR SELECT
  TO public
  USING (true);

-- Policy 3: VENDOR SELECT - Vendors can view their own orders
DROP POLICY IF EXISTS "vendor_select_orders" ON public.orders;
CREATE POLICY "vendor_select_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy 4: VENDOR UPDATE - Vendors can update their own orders
DROP POLICY IF EXISTS "vendor_update_orders" ON public.orders;
CREATE POLICY "vendor_update_orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
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

-- Policy 5: VENDOR INSERT - Vendors can create orders for their vendor_id
-- This allows vendors to manually create orders if needed
DROP POLICY IF EXISTS "vendor_insert_orders" ON public.orders;
CREATE POLICY "vendor_insert_orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy 6: CUSTOMER SELECT - Customers can view their own orders
DROP POLICY IF EXISTS "customer_select_orders" ON public.orders;
CREATE POLICY "customer_select_orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customer_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: VERIFY GUEST SESSIONS POLICY
-- ============================================================================
-- Ensure guest sessions can be created by anyone

DROP POLICY IF EXISTS "public_insert_guest_sessions" ON public.guest_sessions;
CREATE POLICY "public_insert_guest_sessions"
  ON public.guest_sessions
  FOR INSERT
  TO public
  WITH CHECK (TRUE);

-- Policy for viewing guest sessions (optional, for debugging)
DROP POLICY IF EXISTS "public_select_guest_sessions" ON public.guest_sessions;
CREATE POLICY "public_select_guest_sessions"
  ON public.guest_sessions
  FOR SELECT
  TO public
  USING (
    is_active = TRUE 
    AND expires_at > NOW()
  );

-- ============================================================================
-- STEP 5: VERIFY RLS IS ENABLED
-- ============================================================================
-- Ensure RLS is enabled on both tables

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify policies are set up correctly:

-- Check orders policies:
-- SELECT 
--   policyname, 
--   cmd, 
--   roles,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'orders'
-- ORDER BY cmd, policyname;

-- Check guest_sessions policies:
-- SELECT 
--   policyname, 
--   cmd, 
--   roles,
--   with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'guest_sessions'
-- ORDER BY cmd, policyname;

-- Test guest session creation (should work):
-- INSERT INTO public.guest_sessions (
--   session_token,
--   customer_name,
--   mobile_number,
--   is_active,
--   expires_at
-- ) VALUES (
--   'test-' || NOW()::text,
--   'Test Customer',
--   '+911234567890',
--   true,
--   NOW() + INTERVAL '7 days'
-- ) RETURNING id;

-- Test order creation (should work with guest_session_id from above):
-- INSERT INTO public.orders (
--   vendor_id,
--   guest_session_id,
--   items,
--   total_amount,
--   status,
--   payment_status,
--   payment_method,
--   customer_name,
--   customer_phone,
--   order_number
-- ) 
-- SELECT 
--   vp.id,
--   (SELECT id FROM public.guest_sessions ORDER BY created_at DESC LIMIT 1),
--   '[{"product_id": "test", "quantity": 1, "price": 100}]'::jsonb,
--   100.00,
--   'pending',
--   'unpaid',
--   'cash',
--   'Test Customer',
--   '+911234567890',
--   'TEST-' || EXTRACT(EPOCH FROM NOW())::text
-- FROM public.vendor_profiles vp
-- LIMIT 1
-- RETURNING id, order_number;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. The "public_insert_orders" policy is the MOST PERMISSIVE
--    - It allows ANYONE (public) to insert orders
--    - It only validates basic data integrity (items, total_amount, vendor_id)
--    - It does NOT require customer_id or guest_session_id (more flexible)
--
-- 2. Multiple policies can coexist
--    - Public policies allow guest checkout
--    - Vendor policies allow authenticated vendors to manage orders
--    - Customer policies allow authenticated customers to view their orders
--
-- 3. Policy evaluation
--    - For INSERT: If ANY policy allows it, the insert succeeds
--    - For SELECT: If ANY policy allows it, the row is visible
--    - For UPDATE: If ANY policy allows it (both USING and WITH CHECK), update succeeds
--
-- 4. If orders still fail after this:
--    - Check if vendor_id is valid (exists in vendor_profiles table)
--    - Check if items array is valid JSONB
--    - Check if total_amount is a valid number
--    - Check Supabase logs for detailed error messages
--
-- ============================================================================

