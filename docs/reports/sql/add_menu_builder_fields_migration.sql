-- Migration: Add vendor menu-builder fields to products
-- Run this in Supabase SQL Editor before using new menu options.

-- Category refinement
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT NULL;

-- Multi-tag dietary labels: veg, non_veg, egg, vegan, gluten_free
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}'::TEXT[];

-- Pricing and extra charges
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_charge DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS handling_charge DECIMAL(10,2) DEFAULT 0;

-- Variants and add-ons
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::JSONB;

-- Time-specific visibility (e.g. breakfast only)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_from TIME DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_until TIME DEFAULT NULL;

-- Merchandising
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.products.subcategory IS 'Optional subcategory under category (e.g. Main Course > North Indian).';
COMMENT ON COLUMN public.products.dietary_tags IS 'Dietary tags array: veg, non_veg, egg, vegan, gluten_free.';
COMMENT ON COLUMN public.products.gst_rate IS 'GST/tax percentage for item-level taxation.';
COMMENT ON COLUMN public.products.packaging_charge IS 'Item-level packaging charge.';
COMMENT ON COLUMN public.products.handling_charge IS 'Item-level handling charge.';
COMMENT ON COLUMN public.products.variants IS 'Array of price variants: [{ "name": "Half Plate", "price": 100 }, ...].';
COMMENT ON COLUMN public.products.addons IS 'Array of optional add-ons: [{ "name": "Extra Cheese", "price": 20 }, ...].';
COMMENT ON COLUMN public.products.available_from IS 'Start time when item is visible in storefront.';
COMMENT ON COLUMN public.products.available_until IS 'End time when item is hidden in storefront.';
COMMENT ON COLUMN public.products.is_bestseller IS 'Highlights item as bestseller.';
COMMENT ON COLUMN public.products.is_recommended IS 'Highlights item as recommended.';
