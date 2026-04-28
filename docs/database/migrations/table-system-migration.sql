-- ============================================================================
-- PocketShop Table System Migration
-- 
-- Adds:
-- 1. vendor_tables - tables with permanent slugs (QR never regenerated)
-- 2. orders.table_code - stores "3", "N-T1", or "PICKUP"
-- 3. vendor_profiles.metadata.table_config - mode (simple|zone), total_tables, zone_counts
-- 4. Pickup QR uses existing qr_code_url (regeneratable) - links to storefront?pickup=1
--
-- Table QR URLs: /storefront/:vendorId?table=:table_slug (permanent)
-- Pickup QR URL: /storefront/:vendorId?pickup=1 (regeneratable)
-- ============================================================================

-- 1. Create vendor_tables table (each row = one table with permanent slug)
CREATE TABLE IF NOT EXISTS public.vendor_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  -- Permanent slug used in QR URL - NEVER change once created
  table_slug TEXT NOT NULL,
  -- Display code shown to staff: "3", "N-T1", "S-T2", etc.
  table_code TEXT NOT NULL,
  -- Zone: null for simple (1-10), 'north'|'south'|'east'|'west' for zone mode
  zone TEXT CHECK (zone IS NULL OR zone IN ('north','south','east','west')),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, table_slug)
);

CREATE INDEX IF NOT EXISTS idx_vendor_tables_vendor_id ON public.vendor_tables(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tables_slug ON public.vendor_tables(vendor_id, table_slug);

-- RLS for vendor_tables
ALTER TABLE public.vendor_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can manage own tables" ON public.vendor_tables;
CREATE POLICY "Vendors can manage own tables" ON public.vendor_tables
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()))
  WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read vendor tables for storefront" ON public.vendor_tables;
CREATE POLICY "Public can read vendor tables for storefront" ON public.vendor_tables
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = vendor_tables.vendor_id AND COALESCE(vp.is_active, false) = true
    )
  );

-- 2. Add table_code to orders (nullable - PICKUP or table code like "3", "N-T1")
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_code TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_table_code ON public.orders(table_code) WHERE table_code IS NOT NULL;

-- 3. table_config stored in vendor_profiles.metadata:
-- metadata.table_config = {
--   mode: 'simple' | 'zone',
--   total_tables: number,
--   zone_counts?: { north: number, south: number, east: number, west: number }
-- }
-- No schema change needed - metadata is JSONB

-- Note: Pickup QR uses vendor_profiles.qr_code_url - we'll generate URL with ?pickup=1
-- and allow regeneration. Table QRs are generated client-side from vendor_tables
-- and downloaded/printed - no DB storage of table QR images.3. Showing the correct tables
In simple mode, we take the first total_tables from the config (ordered by display_order).
With config = 10 but 20 tables in the DB, only the first 10 are shown in simple layout.
Flow
Set “Number of tables” to 10 → click “Update configuration”.
Layout switches from zone-based to simple rows.
Tables appear as 1, 2, 3… in rows of 5 (2 rows for 10 tables).
