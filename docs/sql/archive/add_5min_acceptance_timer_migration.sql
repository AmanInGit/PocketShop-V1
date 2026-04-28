-- Migration: 5-minute acceptance timer – auto-mark unaccepted orders as "Unable to deliver"
-- Run this in Supabase SQL Editor.
--
-- Prerequisite: Enable pg_cron in Dashboard → Database → Extensions (if not already).
--
-- Behavior: Orders with status 'pending' that are older than 5 minutes are auto-updated to
-- 'cancelled' (displayed as "Unable to deliver" in the vendor UI).

-- 1. Enable pg_cron (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Function to mark overdue pending orders as cancelled
CREATE OR REPLACE FUNCTION public.auto_cancel_unaccepted_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- 3. Schedule the job to run every minute
-- (Job name is permanent; use cron.unschedule('auto-cancel-unaccepted-orders') to remove)
SELECT cron.schedule(
  'auto-cancel-unaccepted-orders',
  '* * * * *',
  $$SELECT public.auto_cancel_unaccepted_orders()$$
);

-- To verify: SELECT * FROM cron.job WHERE jobname = 'auto-cancel-unaccepted-orders';
-- To unschedule: SELECT cron.unschedule('auto-cancel-unaccepted-orders');
