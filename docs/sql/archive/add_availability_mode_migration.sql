-- Migration: Add availability_mode and daily_quantity to products
-- Run this in Supabase SQL Editor.
-- Supports: quantity-based (plates, daily stock) vs requirement-based (in/out toggle).

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS availability_mode TEXT DEFAULT 'quantity'
  CHECK (availability_mode IN ('quantity', 'requirement'));

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS daily_quantity INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.products.availability_mode IS 'quantity = track stock with daily reset; requirement = simple in/out toggle';
COMMENT ON COLUMN public.products.daily_quantity IS 'Max quantity per day (quantity mode); used for daily reset.';
