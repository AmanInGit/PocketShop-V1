-- Migration: Add spicy_level indicator to products
-- Run this in Supabase SQL Editor.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS spicy_level TEXT
  CHECK (spicy_level IS NULL OR spicy_level IN ('mild', 'medium', 'spicy'));

COMMENT ON COLUMN public.products.spicy_level IS 'Optional spice indicator for customer menu: mild, medium, spicy.';
