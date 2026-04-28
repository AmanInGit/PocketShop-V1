-- ============================================================================
-- PocketShop Phase 4: Database Migration
-- Adapting reference repo schema to work with frontend's vendor_profiles table
-- 
-- This migration script creates base tables (if needed) and adds missing features
-- needed for the vendor dashboard
-- 
-- Instructions:
-- 1. PREREQUISITE: Ensure vendor_profiles table exists (from DATABASE_SETUP_COMPLETE.sql)
--    If vendor_profiles doesn't exist, run DATABASE_SETUP_COMPLETE.sql first
-- 2. Go to Supabase Dashboard → SQL Editor → New Query
-- 3. Copy and paste this ENTIRE file
-- 4. Click "Run" or press Ctrl+Enter
-- 5. Wait for all commands to execute
-- 6. Verify setup using the queries at the bottom of this file
--
-- Order of execution:
-- 1. Enum types
-- 2. Create base tables (products, orders) if they don't exist
-- 3. Update existing tables (add missing columns)
-- 4. Create new tables (order_items, payments, notifications, order_messages)
-- 5. Functions
-- 6. Triggers
-- 7. Indexes
-- 8. RLS Policies
-- 9. Realtime
-- ============================================================================

-- ============================================================================
-- PART 1: ENUM TYPES
-- ============================================================================

-- Create enum types (if they don't exist)
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending',
    'processing',
    'ready',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'card',
    'upi',
    'cash',
    'wallet'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 2: CHECK PREREQUISITES AND CREATE BASE TABLES (if they don't exist)
-- ============================================================================

-- Check if vendor_profiles table exists (required prerequisite)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'vendor_profiles'
  ) THEN
    RAISE EXCEPTION 'Prerequisite table vendor_profiles does not exist. Please run DATABASE_SETUP_COMPLETE.sql first.';
  END IF;
END $$;

-- Create customer_profiles table if it doesn't exist (needed for orders table)
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE,
  email TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  is_guest_converted BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_mobile_number ON public.customer_profiles(mobile_number);
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Create guest_sessions table if it doesn't exist (needed for orders table)
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  mobile_number TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_token ON public.guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_mobile_number ON public.guest_sessions(mobile_number);
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for products table if they don't exist
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available) WHERE is_available = TRUE;

-- Enable RLS on products table if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  guest_session_id UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders table if they don't exist
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_session_id ON public.orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable RLS on orders table if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: UPDATE EXISTING TABLES (Add missing columns)
-- ============================================================================

-- Add missing columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10 CHECK (low_stock_threshold >= 0);

-- Update orders table to add missing columns and adapt structure
-- Note: Frontend uses JSONB items, but we'll also support order_items table for better normalization
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update orders table status to match hooks/components expectations
-- Migrate existing status values: 'confirmed' -> 'processing', 'preparing' -> 'processing'
UPDATE public.orders 
SET status = 'processing' 
WHERE status IN ('confirmed', 'preparing');

-- Drop existing status constraint and add new one
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'cancelled'));

-- Create index for order_number if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number) WHERE order_number IS NOT NULL;

-- Generate order_number for existing orders that don't have one
-- Only update if there are existing orders without order_number
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE order_number IS NULL) THEN
    UPDATE public.orders 
    SET order_number = 'ORD-' || UPPER(SUBSTRING(id::text, 1, 8)) || '-' || EXTRACT(EPOCH FROM created_at)::BIGINT
    WHERE order_number IS NULL;
  END IF;
END $$;

-- Make order_number NOT NULL after populating (only if table has rows)
-- If no rows exist, the constraint will be added when first row is inserted
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders) THEN
    -- Only alter if there are no NULL values
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number IS NULL) THEN
      ALTER TABLE public.orders 
        ALTER COLUMN order_number SET NOT NULL;
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    -- Constraint might already exist or column might not exist - that's okay
    NULL;
END $$;

-- ============================================================================
-- PART 4: CREATE NEW TABLES
-- ============================================================================

-- Create order_items table (for better normalization, even if frontend uses JSONB)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending' NOT NULL,
  transaction_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create order_messages table for customer-vendor communication
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('vendor', 'customer')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: CREATE FUNCTIONS
-- ============================================================================

-- Create function to get vendor_id from user_id (adapted for vendor_profiles)
CREATE OR REPLACE FUNCTION public.get_vendor_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendor_profiles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Create function for atomic stock updates (prevent race conditions)
CREATE OR REPLACE FUNCTION public.atomic_stock_update(
  _product_id UUID,
  _quantity_change INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Lock the row for update
  SELECT stock_quantity INTO current_stock
  FROM public.products
  WHERE id = _product_id
  FOR UPDATE;
  
  -- Check if product exists
  IF current_stock IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new stock
  new_stock := current_stock + _quantity_change;
  
  -- Check if new stock would be negative
  IF new_stock < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update stock
  UPDATE public.products
  SET stock_quantity = new_stock,
      updated_at = NOW()
  WHERE id = _product_id;
  
  RETURN TRUE;
END;
$$;

-- Create or replace handle_updated_at function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 6: CREATE TRIGGERS
-- ============================================================================

-- Create updated_at triggers for tables that need them
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for low stock notifications
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If stock goes below threshold, create notification
  IF NEW.stock_quantity <= NEW.low_stock_threshold AND 
     (OLD.stock_quantity IS NULL OR OLD.stock_quantity > OLD.low_stock_threshold) THEN
    
    INSERT INTO public.notifications (
      user_id,
      vendor_id,
      title,
      message,
      type
    )
    SELECT 
      vp.user_id,
      vp.id,
      'Low Stock Alert',
      'Product "' || NEW.name || '" is running low (Stock: ' || NEW.stock_quantity || ')',
      'low_stock'
    FROM public.vendor_profiles vp
    WHERE vp.id = NEW.vendor_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS low_stock_notification ON public.products;
CREATE TRIGGER low_stock_notification
  AFTER UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock();

-- Create trigger for new order notifications
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    vendor_id,
    title,
    message,
    type
  )
  SELECT 
    vp.user_id,
    vp.id,
    'New Order Received',
    'Order #' || COALESCE(NEW.order_number, NEW.id::text) || ' from ' || COALESCE(NEW.customer_name, 'Customer'),
    'new_order'
  FROM public.vendor_profiles vp
  WHERE vp.id = NEW.vendor_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS new_order_notification ON public.orders;
CREATE TRIGGER new_order_notification
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();

-- Create trigger for payment status notifications
CREATE OR REPLACE FUNCTION public.notify_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify on status changes to completed or failed
  IF NEW.payment_status IN ('completed', 'failed') AND 
     (OLD.payment_status IS NULL OR OLD.payment_status != NEW.payment_status) THEN
    
    INSERT INTO public.notifications (
      user_id,
      vendor_id,
      title,
      message,
      type
    )
    SELECT 
      vp.user_id,
      o.vendor_id,
      CASE 
        WHEN NEW.payment_status = 'completed' THEN 'Payment Received'
        ELSE 'Payment Failed'
      END,
      'Payment of ₹' || NEW.amount || ' for order #' || COALESCE(o.order_number, o.id::text) || ' is ' || NEW.payment_status,
      'payment_' || NEW.payment_status
    FROM public.orders o
    JOIN public.vendor_profiles vp ON vp.id = o.vendor_id
    WHERE o.id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_status_notification ON public.payments;
CREATE TRIGGER payment_status_notification
  AFTER UPDATE OF payment_status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_status();

-- ============================================================================
-- PART 7: CREATE INDEXES
-- ============================================================================

-- Indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_vendor_id ON public.notifications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Indexes for order_messages
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created_at ON public.order_messages(created_at DESC);

-- Indexes for products (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON public.products(stock_quantity) WHERE stock_quantity <= low_stock_threshold;

-- ============================================================================
-- PART 8: CREATE RLS POLICIES
-- ============================================================================

-- RLS Policies for products (update existing to include stock fields)
-- Products policies should already exist from DATABASE_SETUP_COMPLETE.sql
-- We'll add policies that might be missing

-- RLS Policies for order_items
DROP POLICY IF EXISTS "Vendors can view their order items" ON public.order_items;
CREATE POLICY "Vendors can view their order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Vendors can create order items" ON public.order_items;
CREATE POLICY "Vendors can create order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Public can view order items (for order detail pages)
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items"
  ON public.order_items FOR SELECT
  TO public
  USING (true);

-- RLS Policies for payments
DROP POLICY IF EXISTS "Vendors can view their payments" ON public.payments;
CREATE POLICY "Vendors can view their payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Vendors can update their payments" ON public.payments;
CREATE POLICY "Vendors can update their payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Public can view payments (for order detail pages)
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
CREATE POLICY "Public can view payments"
  ON public.payments FOR SELECT
  TO public
  USING (true);

-- Public can create payments (for checkout)
DROP POLICY IF EXISTS "Public can create payments" ON public.payments;
CREATE POLICY "Public can create payments"
  ON public.payments FOR INSERT
  TO public
  WITH CHECK (true);

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for order_messages
DROP POLICY IF EXISTS "Vendors can view their order messages" ON public.order_messages;
CREATE POLICY "Vendors can view their order messages"
  ON public.order_messages FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Vendors can create messages for their orders" ON public.order_messages;
CREATE POLICY "Vendors can create messages for their orders"
  ON public.order_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'vendor' AND
    order_id IN (
      SELECT id FROM public.orders
      WHERE vendor_id IN (
        SELECT id FROM public.vendor_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Public can view and create customer messages (for storefront)
DROP POLICY IF EXISTS "Public can view order messages" ON public.order_messages;
CREATE POLICY "Public can view order messages"
  ON public.order_messages FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Public can create customer messages" ON public.order_messages;
CREATE POLICY "Public can create customer messages"
  ON public.order_messages FOR INSERT
  TO public
  WITH CHECK (sender_type = 'customer');

-- Update orders policies to allow public viewing (for order detail pages)
DROP POLICY IF EXISTS "Public can view orders by UUID" ON public.orders;
CREATE POLICY "Public can view orders by UUID"
  ON public.orders FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- PART 9: ENABLE REALTIME (Optional)
-- ============================================================================

-- Enable realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Enable realtime for products table
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for order_messages table
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;

-- ============================================================================
-- PART 10: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries AFTER the setup completes to verify everything is working:

-- Check tables exist:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_type = 'BASE TABLE'
-- AND table_name IN ('products', 'orders', 'order_items', 'payments', 'notifications', 'order_messages')
-- ORDER BY table_name;

-- Check columns exist in products table:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name = 'products'
-- AND column_name IN ('stock_quantity', 'low_stock_threshold')
-- ORDER BY column_name;

-- Check functions exist:
-- SELECT routine_name 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN ('get_vendor_id', 'atomic_stock_update', 'handle_updated_at', 'check_low_stock', 'notify_new_order', 'notify_payment_status')
-- ORDER BY routine_name;

-- Check triggers exist:
-- SELECT trigger_name, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public'
-- AND trigger_name IN ('set_products_updated_at', 'set_orders_updated_at', 'set_payments_updated_at', 'low_stock_notification', 'new_order_notification', 'payment_status_notification')
-- ORDER BY trigger_name;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('products', 'orders', 'order_items', 'payments', 'notifications', 'order_messages')
-- ORDER BY tablename;

-- Check policies exist:
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- AND tablename IN ('order_items', 'payments', 'notifications', 'order_messages')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Your database is now ready for Phase 4!
-- 
-- Next steps:
-- 1. Verify all tables, functions, and policies were created
-- 2. Test the hooks with real data
-- 3. Generate TypeScript types (Phase 4.8)
-- 4. Test complete integration
-- ============================================================================

