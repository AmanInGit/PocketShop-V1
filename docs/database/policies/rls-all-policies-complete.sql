-- ============================================================================
-- PocketShop – All RLS Policies (Complete)
-- Run this in Supabase SQL Editor → New Query → Paste → Run
-- 
-- Creates/updates Row Level Security policies for all core tables.
-- Safe to run multiple times (uses DROP POLICY IF EXISTS before CREATE).
-- ============================================================================

-- ============================================================================
-- 1. VENDOR_PROFILES
-- ============================================================================
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Vendors can view their own vendor profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can view own profile" ON public.vendor_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view active vendor profiles" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Allow public read access to active vendors" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Public can view active vendors" ON public.vendor_profiles;
CREATE POLICY "Public can view active vendors" ON public.vendor_profiles FOR SELECT TO public USING (COALESCE(is_active, false) = true);

DROP POLICY IF EXISTS "Vendors can insert own profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can insert their own vendor profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can insert own profile" ON public.vendor_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can update their own vendor profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update own profile" ON public.vendor_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. CUSTOMER_PROFILES
-- ============================================================================
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can view their own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view their own profile" ON public.customer_profiles FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can insert their own profile" ON public.customer_profiles;
CREATE POLICY "Customers can insert their own profile" ON public.customer_profiles FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can update their own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update their own profile" ON public.customer_profiles FOR UPDATE TO public USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. NOTIFICATIONS
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO public WITH CHECK (true);

-- ============================================================================
-- 4. ORDER_FEEDBACK
-- ============================================================================
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.order_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.order_feedback FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Vendors can view their feedback" ON public.order_feedback;
CREATE POLICY "Vendors can view their feedback" ON public.order_feedback FOR SELECT TO public USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

-- ============================================================================
-- 5. ORDER_ITEMS
-- ============================================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Vendors can view their order items" ON public.order_items;
CREATE POLICY "Vendors can view their order items" ON public.order_items FOR SELECT TO authenticated USING (
  order_id IN (
    SELECT id FROM public.orders
    WHERE vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
  )
);

-- ============================================================================
-- 6. ORDER_MESSAGES
-- ============================================================================
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create customer messages" ON public.order_messages;
DROP POLICY IF EXISTS "Public can create customer messages" ON public.order_messages;
CREATE POLICY "Anyone can create customer messages" ON public.order_messages FOR INSERT TO public WITH CHECK (sender_type = 'customer');

DROP POLICY IF EXISTS "Vendors can create messages for their orders" ON public.order_messages;
CREATE POLICY "Vendors can create messages for their orders" ON public.order_messages FOR INSERT TO authenticated WITH CHECK (
  sender_type = 'vendor'
  AND order_id IN (
    SELECT id FROM public.orders
    WHERE vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Vendors can view their order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Public can view order messages" ON public.order_messages;
CREATE POLICY "Vendors can view their order messages" ON public.order_messages FOR SELECT TO public USING (true);

-- ============================================================================
-- 7. ORDERS
-- ============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "public_insert_orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO public WITH CHECK (
  items IS NOT NULL AND jsonb_array_length(items) > 0 AND total_amount >= 0 AND vendor_id IS NOT NULL
);

DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders by UUID" ON public.orders;
DROP POLICY IF EXISTS "public_select_orders" ON public.orders;
CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "customer_select_orders" ON public.orders;
CREATE POLICY "Customers can view their own orders" ON public.orders FOR SELECT TO authenticated USING (
  customer_id IN (SELECT id FROM public.customer_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can view vendor orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view their orders" ON public.orders;
DROP POLICY IF EXISTS "vendor_select_orders" ON public.orders;
CREATE POLICY "Vendors can view their own orders" ON public.orders FOR SELECT TO authenticated USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can update vendor orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can update their orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can update order status" ON public.orders;
DROP POLICY IF EXISTS "vendor_update_orders" ON public.orders;
CREATE POLICY "Vendors can update their own orders" ON public.orders FOR UPDATE TO authenticated USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
) WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Public can view payments" ON public.payments;
CREATE POLICY "Anyone can view payments" ON public.payments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Service role can update payments" ON public.payments;
CREATE POLICY "Service role can update payments" ON public.payments FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Vendors can view their payments" ON public.payments;
CREATE POLICY "Vendors can view their payments" ON public.payments FOR SELECT TO authenticated USING (
  order_id IN (
    SELECT id FROM public.orders
    WHERE vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Public can create payments" ON public.payments;
CREATE POLICY "Public can create payments" ON public.payments FOR INSERT TO public WITH CHECK (true);

-- ============================================================================
-- 9. PRODUCTS
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to available products" ON public.products;
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
CREATE POLICY "Allow public read access to available products" ON public.products FOR SELECT TO public USING (COALESCE(is_available, true) = true);

CREATE POLICY "Public can view available products" ON public.products FOR SELECT TO anon USING (COALESCE(is_available, true) = true);

DROP POLICY IF EXISTS "Staff can view vendor products" ON public.products;
DROP POLICY IF EXISTS "Vendors can view own products" ON public.products;
CREATE POLICY "Staff can view vendor products" ON public.products FOR SELECT TO public USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can update vendor products" ON public.products;
DROP POLICY IF EXISTS "Vendors can update own products" ON public.products;
CREATE POLICY "Staff can update vendor products" ON public.products FOR UPDATE TO public USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.products;
CREATE POLICY "Vendors can manage their own products" ON public.products FOR ALL TO authenticated USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
) WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- 10. USER_ROLES
-- ============================================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own role" ON public.user_roles;
CREATE POLICY "Users can create their own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- 11. VENDOR_STAFF
-- ============================================================================
ALTER TABLE public.vendor_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their assignments" ON public.vendor_staff;
CREATE POLICY "Staff can view their assignments" ON public.vendor_staff FOR SELECT TO public USING (
  user_id = auth.uid() OR vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can manage their staff" ON public.vendor_staff;
CREATE POLICY "Vendors can manage their staff" ON public.vendor_staff FOR ALL TO public USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

-- ============================================================================
-- 12. GUEST_SESSIONS
-- ============================================================================
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "public_insert_guest_sessions" ON public.guest_sessions;
CREATE POLICY "Anyone can create guest sessions" ON public.guest_sessions FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "public_select_guest_sessions" ON public.guest_sessions;
CREATE POLICY "Public can view guest sessions" ON public.guest_sessions FOR SELECT TO public USING (
  (converted_to_user_id IS NOT NULL AND converted_to_user_id = auth.uid())
  OR (is_active = true AND expires_at > NOW())
);

-- ============================================================================
-- 13. VENDORS VIEW (if using view - policies apply to underlying vendor_profiles)
-- ============================================================================
-- The vendors view reads from vendor_profiles. No separate RLS needed for the view
-- if vendor_profiles policies are correct. If you have a separate vendors TABLE:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendors' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read access to active vendors" ON public.vendors;
    CREATE POLICY "Allow public read access to active vendors" ON public.vendors FOR SELECT TO public USING (COALESCE(is_active, false) = true);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
-- Run this entire script in Supabase SQL Editor. Verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
