-- ============================================================================
-- PocketShop: Sync orders.payment_status with payments table
--
-- Problem: Order History showed "Unpaid" for paid orders because
-- orders.payment_status was never updated when payments.payment_status became
-- 'completed'. The frontend now derives status from payments; this script
-- keeps orders.payment_status in sync for consistency.
--
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Backfill – set orders.payment_status = 'paid' where payment is completed
UPDATE public.orders o
SET payment_status = 'paid'
WHERE o.payment_status = 'unpaid'
  AND EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = o.id
      AND p.payment_status = 'completed'
  );

-- Step 2: Trigger – when payments.payment_status becomes 'completed', update orders
CREATE OR REPLACE FUNCTION public.sync_order_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql 

SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE public.orders
    SET payment_status = 'paid', updated_at = NOW()
    WHERE id = NEW.order_id AND payment_status != 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_completed_sync_order ON public.payments;
CREATE TRIGGER on_payment_completed_sync_order
  AFTER UPDATE OF payment_status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_payment_status();
