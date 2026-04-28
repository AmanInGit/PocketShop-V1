-- Migration: Auto-generate SKU (series PROD-1, PROD-2, ...) with released-number reuse
-- Run in Supabase SQL Editor.
-- When a product is deleted, its SKU number is released for reuse.

-- Table to track released SKU numbers (for reuse when products are deleted)
CREATE TABLE IF NOT EXISTS public.released_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  sku_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, sku_number)
);

-- Trigger: on product delete, release its SKU number if it matches PROD-<n>
CREATE OR REPLACE FUNCTION release_sku_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  num INTEGER;
BEGIN
  IF OLD.sku IS NOT NULL AND OLD.sku ~ '^PROD-[0-9]+$' THEN
    num := CAST(SUBSTRING(OLD.sku FROM 6) AS INTEGER);
    INSERT INTO public.released_skus (vendor_id, sku_number)
    VALUES (OLD.vendor_id, num)
    ON CONFLICT (vendor_id, sku_number) DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_release_sku_on_delete ON public.products;
CREATE TRIGGER trigger_release_sku_on_delete
  BEFORE DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION release_sku_on_delete();

-- RPC: Get next SKU for a vendor (uses released numbers first, then max+1)
CREATE OR REPLACE FUNCTION get_next_sku(p_vendor_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  released_row RECORD;
BEGIN
  -- Prefer a released SKU (smallest first)
  SELECT sku_number INTO released_row
  FROM public.released_skus
  WHERE vendor_id = p_vendor_id
  ORDER BY sku_number ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    next_num := released_row.sku_number;
    DELETE FROM public.released_skus
    WHERE vendor_id = p_vendor_id AND sku_number = next_num;
    RETURN 'PROD-' || next_num;
  END IF;

  -- Otherwise use max existing + 1
  SELECT COALESCE(MAX(
    CASE WHEN sku ~ '^PROD-[0-9]+$'
    THEN CAST(SUBSTRING(sku FROM 6) AS INTEGER)
    ELSE 0 END
  ), 0) + 1 INTO next_num
  FROM public.products
  WHERE vendor_id = p_vendor_id;

  RETURN 'PROD-' || next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
