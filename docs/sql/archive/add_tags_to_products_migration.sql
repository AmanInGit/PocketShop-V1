-- Migration: Add tags column to products (separate from category)
-- Category = cuisine/type (e.g. Fastfood, North Indian)
-- Tags = labels/badges (e.g. All time favorites, Bestseller) - comma-separated
-- Run in Supabase SQL Editor.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT NULL;

COMMENT ON COLUMN public.products.tags IS 'Comma-separated labels e.g. "All time favorites, Bestseller". Separate from category.';
