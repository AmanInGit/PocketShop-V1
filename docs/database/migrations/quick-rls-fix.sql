-- ============================================================================
-- QUICK FIX: RLS Permission Denied Error
-- 
-- Run this IMMEDIATELY to fix the "Permission denied" error when creating orders.
-- This fixes the RLS policy that's blocking order creation from the storefront.
-- ============================================================================

-- Step 1: Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Step 2: Create a more permissive policy (doesn't require customer_id or guest_session_id)
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  TO public
  WITH CHECK (
    -- Basic validation only - no requirement for customer_id or guest_session_id
    items IS NOT NULL
    AND jsonb_array_length(items) > 0
    AND total_amount >= 0
    AND vendor_id IS NOT NULL
  );

-- Step 3: Ensure public can view orders (for order confirmation)
DROP POLICY IF EXISTS "Public can view orders by UUID" ON public.orders;
CREATE POLICY "Public can view orders by UUID"
  ON public.orders FOR SELECT
  TO public
  USING (true);

-- Step 4: Ensure guest sessions can be created (optional, but helpful)
DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;
CREATE POLICY "Anyone can create guest sessions"
  ON public.guest_sessions FOR INSERT
  TO public
  WITH CHECK (TRUE);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the policy was created:
-- SELECT policyname, cmd, with_check
-- FROM pg_policies
-- WHERE tablename = 'orders'
-- AND policyname = 'Anyone can create orders';

-- ============================================================================
-- DONE!
-- ============================================================================
-- After running this, try placing an order again from the storefront.
-- The order should be created successfully without permission errors.
-- ============================================================================

