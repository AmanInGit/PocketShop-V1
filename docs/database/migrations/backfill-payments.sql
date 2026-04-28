-- ============================================================================
-- PocketShop: Backfill payments for existing orders
--
-- Run this if you placed orders but revenue shows ₹0 because no payment
-- records were created (e.g. COD_REALTIME_FIX.sql trigger was not run).
--
-- This will:
-- 1. Create payment records for orders that don't have any
-- 2. Set UPI/wallet payments as 'completed' (revenue counts immediately)
-- 3. Set cash payments as 'pending' (vendor marks as paid when received)
--
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- Step 1: Create missing payment records for orders
-- (Uses base payments columns; vendor_id is optional, added by COD_REALTIME_FIX.sql)
INSERT INTO public.payments (order_id, amount, payment_method, payment_status, created_at, updated_at)
SELECT 
  o.id,
  o.total_amount,
  CASE 
    WHEN o.payment_method = 'upi' THEN 'upi'::payment_method
    WHEN o.payment_method = 'wallet' THEN 'wallet'::payment_method
    WHEN o.payment_method = 'card' THEN 'card'::payment_method
    ELSE 'cash'::payment_method
  END,
  CASE 
    WHEN o.payment_method IN ('upi', 'wallet') THEN 'completed'::payment_status
    ELSE 'pending'::payment_status
  END,
  o.created_at,
  NOW()
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments p WHERE p.order_id = o.id
)
AND (
  o.payment_method IN ('cash', 'upi', 'wallet')
  OR (o.payment_method IS NULL AND o.payment_status = 'unpaid')
);

-- Step 2: Upgrade existing UPI/wallet payments from 'pending' to 'completed'
-- (so they count toward revenue immediately)
UPDATE public.payments
SET payment_status = 'completed', updated_at = NOW()
WHERE payment_method IN ('upi', 'wallet')
  AND payment_status = 'pending';
