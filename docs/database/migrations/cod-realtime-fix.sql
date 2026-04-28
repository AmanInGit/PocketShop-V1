-- ============================================================================
-- PocketShop: COD Order → Payment → Realtime Update Fix
-- 
-- This migration fixes the missing elements for COD orders to automatically
-- create payments and enable realtime updates in the vendor dashboard.
-- 
-- Based on comparison with working environment (Prathamesh's org), this adds:
-- 1. Payments table to realtime publication
-- 2. COD payment handler function (handle_cod_payment)
-- 3. Trigger to auto-create payments for COD orders
-- 4. Vendor-specific RLS policies for orders and payments
-- 5. Helper functions (handle_customer, has_role) if missing
-- 6. Additional triggers (set_vendors_updated_at, update_customer_profiles_updated_at)
--
-- Instructions:
-- 1. PREREQUISITE: Ensure PHASE4_MIGRATION.sql has been run (payments table must exist)
-- 2. Go to Supabase Dashboard → SQL Editor → New Query
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Wait for all commands to execute
-- 6. Verify setup using the queries at the bottom of this file
--
-- Dependencies:
-- - payments table must exist (from PHASE4_MIGRATION.sql)
-- - orders table must exist (from PHASE4_MIGRATION.sql or DATABASE_SETUP_COMPLETE.sql)
-- - vendor_profiles table must exist (from DATABASE_SETUP_COMPLETE.sql)
-- - payment_method enum must exist (from PHASE4_MIGRATION.sql)
-- - payment_status enum must exist (from PHASE4_MIGRATION.sql)
-- ============================================================================

-- ============================================================================
-- PART 1: ADD PAYMENTS TO REALTIME PUBLICATION
-- ============================================================================
-- This enables realtime subscriptions for payment updates
-- ============================================================================

-- Enable realtime for payments table (if not already enabled)
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- Add payments table to realtime publication (if not already added)
-- Note: This will fail silently if already added, which is fine
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'payments'
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If publication doesn't exist or other error, log and continue
    RAISE NOTICE 'Could not add payments to realtime publication: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 2: ADD VENDOR_ID COLUMN TO PAYMENTS TABLE (OPTIONAL BUT RECOMMENDED)
-- ============================================================================
-- Adding vendor_id directly to payments improves RLS policy performance
-- and makes queries more efficient
-- ============================================================================

-- Add vendor_id column to payments table if it doesn't exist
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE;

-- Create index for vendor_id if column was just added
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON public.payments(vendor_id) WHERE vendor_id IS NOT NULL;

-- Populate vendor_id for existing payments (backfill)
UPDATE public.payments p
SET vendor_id = o.vendor_id
FROM public.orders o
WHERE p.order_id = o.id
  AND p.vendor_id IS NULL;

-- Make vendor_id NOT NULL after backfilling (only if all payments have vendor_id)
-- If there are NULL values, we'll keep it nullable for safety
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.payments WHERE vendor_id IS NULL) THEN
    -- Only alter if there are no NULL values
    ALTER TABLE public.payments 
      ALTER COLUMN vendor_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Column might already be NOT NULL or other constraint exists
    RAISE NOTICE 'Could not set vendor_id as NOT NULL: %', SQLERRM;
END $$;

-- ============================================================================
-- PART 3: CREATE COD PAYMENT HANDLER FUNCTION
-- ============================================================================
-- This function automatically creates a payment record when a COD order is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_cod_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_method_enum payment_method;
  existing_payment_id UUID;
BEGIN
  -- Only process if payment_method is 'cash' (COD) or NULL with unpaid status
  -- Also process other non-card payment methods (upi, wallet) that need payment records
  IF (NEW.payment_method = 'cash' OR 
      NEW.payment_method = 'upi' OR 
      NEW.payment_method = 'wallet' OR
      (NEW.payment_method IS NULL AND NEW.payment_status = 'unpaid')) THEN
    
    -- Check if payment already exists for this order (prevent duplicates)
    SELECT id INTO existing_payment_id
    FROM public.payments
    WHERE order_id = NEW.id
    LIMIT 1;
    
    -- Only create payment if it doesn't exist
    IF existing_payment_id IS NULL THEN
      -- Determine payment method enum from TEXT field
      -- orders.payment_method is TEXT, payments.payment_method is enum
      BEGIN
        payment_method_enum := CASE 
          WHEN NEW.payment_method = 'cash' THEN 'cash'::payment_method
          WHEN NEW.payment_method = 'upi' THEN 'upi'::payment_method
          WHEN NEW.payment_method = 'wallet' THEN 'wallet'::payment_method
          WHEN NEW.payment_method = 'card' THEN 'card'::payment_method
          ELSE 'cash'::payment_method  -- Default to cash for COD/unpaid orders
        END;
      EXCEPTION
        WHEN OTHERS THEN
          -- If enum conversion fails, default to cash
          payment_method_enum := 'cash'::payment_method;
      END;
      
      -- Insert payment record
      -- For COD (cash), status is 'pending' until vendor marks as received
      -- For other methods, status depends on the payment flow
      INSERT INTO public.payments (
        order_id,
        vendor_id,
        amount,
        payment_method,
        payment_status,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.vendor_id,
        NEW.total_amount,
        payment_method_enum,
        CASE 
          WHEN NEW.payment_method = 'cash' THEN 'pending'::payment_status  -- COD starts as pending
          WHEN NEW.payment_status = 'paid' THEN 'completed'::payment_status
          ELSE 'pending'::payment_status  -- Other methods start as pending
        END,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 4: CREATE TRIGGER FOR COD ORDER CREATION
-- ============================================================================
-- This trigger fires when a new order is inserted and creates payment if COD
-- ============================================================================

DROP TRIGGER IF EXISTS on_cod_order_created ON public.orders;
CREATE TRIGGER on_cod_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_cod_payment();

-- ============================================================================
-- PART 5: CREATE HELPER FUNCTIONS (if missing)
-- ============================================================================
-- These functions help with customer handling and role checks
-- ============================================================================

-- Function to handle customer profile creation/updates
CREATE OR REPLACE FUNCTION public.handle_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;

-- ============================================================================
-- PART 6: CREATE ADDITIONAL TRIGGERS
-- ============================================================================
-- Triggers for updated_at timestamps on vendor_profiles and customer_profiles
-- ============================================================================

-- Trigger for vendor_profiles updated_at
DROP TRIGGER IF EXISTS set_vendors_updated_at ON public.vendor_profiles;
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for customer_profiles updated_at
DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 7: UPDATE RLS POLICIES FOR ORDERS
-- ============================================================================
-- Add vendor-specific policies for orders (more restrictive than public)
-- ============================================================================

-- Drop existing generic policies if they conflict
-- Note: We're keeping public policies for guest checkout, but adding vendor-specific ones

-- Policy: Vendors can view their own orders (more specific than public)
DROP POLICY IF EXISTS "vendor_view_own_orders" ON public.orders;
CREATE POLICY "vendor_view_own_orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Vendors can update their own orders
DROP POLICY IF EXISTS "vendor_update_own_orders" ON public.orders;
CREATE POLICY "vendor_update_own_orders"
  ON public.orders FOR UPDATE
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

-- Policy: Vendors can insert orders for their vendor_id
-- (This is useful if vendors need to manually create orders)
DROP POLICY IF EXISTS "vendor_insert_own_orders" ON public.orders;
CREATE POLICY "vendor_insert_own_orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Anyone can create orders (supports guest checkout)
-- This is CRITICAL for storefront order creation
-- NOTE: We do NOT require customer_id OR guest_session_id
-- Customer info is stored directly in orders table (customer_name, customer_phone)
-- This makes guest checkout more reliable and doesn't depend on guest session creation
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  TO public
  WITH CHECK (
    -- Basic data validation only
    items IS NOT NULL
    AND jsonb_array_length(items) > 0
    AND total_amount >= 0
    AND vendor_id IS NOT NULL
    -- NOTE: customer_id and guest_session_id are optional
    -- Orders can be created with just customer_name and customer_phone
  );

-- Policy: Public can view orders (for order confirmation pages)
DROP POLICY IF EXISTS "Public can view orders by UUID" ON public.orders;
CREATE POLICY "Public can view orders by UUID"
  ON public.orders FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- PART 7B: GUEST SESSIONS RLS POLICIES
-- ============================================================================
-- Ensure guest sessions can be created by anyone (required for guest checkout)
-- ============================================================================

-- Policy: Anyone can create guest sessions
DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;
CREATE POLICY "Anyone can create guest sessions"
  ON public.guest_sessions FOR INSERT
  TO public
  WITH CHECK (TRUE);

-- ============================================================================
-- PART 8: UPDATE RLS POLICIES FOR PAYMENTS
-- ============================================================================
-- Add vendor-specific policies for payments
-- ============================================================================

-- Policy: Vendors can view their own payments (using vendor_id if available, otherwise via order)
DROP POLICY IF EXISTS "vendor_view_own_payments" ON public.payments;
CREATE POLICY "vendor_view_own_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    -- Check via vendor_id if available
    (vendor_id IS NOT NULL AND vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    ))
    OR
    -- Fallback: check via order's vendor_id
    (vendor_id IS NULL AND order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    ))
  );

-- Policy: Vendors can update their own payments
DROP POLICY IF EXISTS "vendor_update_own_payments" ON public.payments;
CREATE POLICY "vendor_update_own_payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    -- Check via vendor_id if available
    (vendor_id IS NOT NULL AND vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    ))
    OR
    -- Fallback: check via order's vendor_id
    (vendor_id IS NULL AND order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    ))
  )
  WITH CHECK (
    -- Check via vendor_id if available
    (vendor_id IS NOT NULL AND vendor_id IN (
      SELECT id FROM public.vendor_profiles
      WHERE user_id = auth.uid()
    ))
    OR
    -- Fallback: check via order's vendor_id
    (vendor_id IS NULL AND order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    ))
  );

-- Policy: Service role can update payments (for webhooks, admin operations)
-- This allows Stripe webhooks and admin functions to update payment status
DROP POLICY IF EXISTS "service_role_can_update_payments" ON public.payments;
-- Note: Service role bypasses RLS by default, but we can add this for clarity
-- Uncomment if you need explicit policy:
-- CREATE POLICY "service_role_can_update_payments"
--   ON public.payments FOR UPDATE
--   TO service_role
--   USING (true)
--   WITH CHECK (true);

-- ============================================================================
-- PART 9: UPDATE PAYMENT STATUS NOTIFICATION TRIGGER
-- ============================================================================
-- Ensure payment status notifications work with vendor_id
-- ============================================================================

-- The notify_payment_status function already exists in PHASE4_MIGRATION.sql
-- We just need to ensure it works correctly with the new vendor_id column
-- No changes needed if function already uses orders.vendor_id

-- ============================================================================
-- PART 10: VERIFICATION QUERIES
-- ============================================================================
-- Run these queries AFTER the setup completes to verify everything is working
-- ============================================================================

-- Check if payments table is in realtime publication:
-- SELECT tablename 
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- AND schemaname = 'public'
-- AND tablename = 'payments';

-- Check if handle_cod_payment function exists:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name = 'handle_cod_payment';

-- Check if COD trigger exists:
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- AND trigger_name = 'on_cod_order_created';

-- Check if vendor_id column exists in payments:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'payments'
-- AND column_name = 'vendor_id';

-- Check RLS policies for orders:
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename = 'orders'
-- AND policyname LIKE '%vendor%'
-- ORDER BY policyname;

-- Check RLS policies for payments:
-- SELECT policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename = 'payments'
-- ORDER BY policyname;

-- Test COD order creation (run this after creating a test order):
-- SELECT p.id, p.order_id, p.amount, p.payment_method, p.payment_status, p.vendor_id
-- FROM public.payments p
-- JOIN public.orders o ON p.order_id = o.id
-- WHERE o.payment_method = 'cash'
-- ORDER BY p.created_at DESC
-- LIMIT 5;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your database is now configured for COD orders with realtime payment updates.
-- 
-- What was fixed:
-- ✅ Payments table added to realtime publication
-- ✅ COD payment handler function created
-- ✅ Trigger to auto-create payments for COD orders
-- ✅ Vendor-specific RLS policies for orders and payments
-- ✅ Helper functions (handle_customer, has_role) added
-- ✅ Additional triggers for updated_at timestamps
-- 
-- Next steps:
-- 1. Verify all changes using the queries above
-- 2. Test creating a COD order and verify payment is auto-created
-- 3. Check realtime logs in Supabase Dashboard to confirm updates are broadcast
-- 4. Test vendor dashboard to ensure realtime updates work
-- ============================================================================

