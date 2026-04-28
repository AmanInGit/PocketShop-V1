-- Migration: Add detailed product fields + coupon applicability
-- Run in Supabase SQL Editor.

-- Unique identifier for inventory/POS
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT NULL;

-- How it's sold: per plate, per piece, per 100g, etc.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT 'per piece';

-- Comma-separated: nuts, gluten, dairy, etc.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allergens TEXT DEFAULT NULL;

-- Ingredient list for transparency
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ingredients TEXT DEFAULT NULL;

-- Vendor-only notes (prep, supplier, etc.)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT NULL;

-- Minimum order quantity (default 1)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- Promo/sale price and validity
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_valid_until TIMESTAMPTZ DEFAULT NULL;

-- Whether coupons/discounts apply to this product (default true)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS coupon_applicable BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.products.coupon_applicable IS 'If false, vendor discounts/coupons do not apply to this item. Shown to customer at checkout.';
