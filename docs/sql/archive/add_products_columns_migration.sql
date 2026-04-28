-- Migration: Add diet_type, stock_quantity, low_stock_threshold to products
-- Run this in Supabase SQL Editor if your products table is missing these columns.
-- Error: PGRST204 "Could not find the 'diet_type' column of 'products' in the schema cache"

-- Add diet_type (veg/non_veg)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS diet_type TEXT CHECK (diet_type IN ('veg', 'non_veg'));

-- Add stock_quantity
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Add low_stock_threshold
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
