-- Migration: Add preparation_time_minutes to products
-- Run this in Supabase SQL Editor.
-- Used for order preparation timer (vendor sets per-item prep time).

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER DEFAULT 15 
  CHECK (preparation_time_minutes IS NULL OR (preparation_time_minutes >= 1 AND preparation_time_minutes <= 120));

COMMENT ON COLUMN public.products.preparation_time_minutes IS 'Estimated prep time in minutes; used for order timers (1–120 min).';
