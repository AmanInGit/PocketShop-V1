-- ============================================================================
-- PocketShop Row Level Security (RLS) Policies
-- PostgreSQL + Supabase
-- 
-- This script creates RLS policies for all core tables to enforce security
-- and data access rules. RLS must be enabled on tables (done in schema.sql)
-- before these policies take effect.
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILES POLICIES
-- ============================================================================
-- Rationale: Vendors need full control over their own profiles, while public
-- storefronts need read-only access to active vendor information.
-- ============================================================================

-- Policy 1.1: Vendors can view their own profile
-- Used for: Vendor dashboard, profile editing screens
DROP POLICY IF EXISTS "Vendors can view own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can view own profile"
ON public.vendor_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 1.2: Public can view active vendor profiles (for storefront)
-- Used for: Public QR code storefront, menu browsing, store information
-- Rationale: Customers need to see vendor info when scanning QR codes
DROP POLICY IF EXISTS "Public can view active vendor profiles" ON public.vendor_profiles;
CREATE POLICY "Public can view active vendor profiles"
ON public.vendor_profiles
FOR SELECT
USING (is_active = TRUE);

-- Policy 1.3: Vendors can insert their own profile
-- Used for: Initial profile creation (typically via trigger, but allows manual insert)
-- Rationale: Restricts insertion to authenticated vendors only, ensuring user_id matches
DROP POLICY IF EXISTS "Vendors can insert own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can insert own profile"
ON public.vendor_profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'vendor'
  )
);

-- Policy 1.4: Vendors can update their own profile
-- Used for: Onboarding flow, profile updates, settings changes
DROP POLICY IF EXISTS "Vendors can update own profile" ON public.vendor_profiles;
CREATE POLICY "Vendors can update own profile"
ON public.vendor_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 1.5: DELETE Policy - Admin Only
-- Rationale: Vendor profile deletion should be restricted to prevent accidental
-- data loss. Best practice is to soft-delete (set is_active = FALSE) rather than
-- hard delete. If hard delete is needed, use service role or admin function.
-- For now, we'll restrict DELETE to service role (admin) only.
-- Note: In production, consider creating a function with SECURITY DEFINER for
-- controlled deletion that also handles cascading cleanup.
DROP POLICY IF EXISTS "Admin can delete vendor profiles" ON public.vendor_profiles;
-- Uncomment below to allow service role (admin) deletion:
-- CREATE POLICY "Admin can delete vendor profiles"
-- ON public.vendor_profiles
-- FOR DELETE
-- USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 2. CUSTOMER PROFILES POLICIES
-- ============================================================================
-- Rationale: Customers should have full control over their own profiles.
-- Other users should not be able to access customer profile data.
-- ============================================================================

-- Policy 2.1: Customers can view their own profile
-- Used for: Customer dashboard, account settings
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customer_profiles;
CREATE POLICY "Customers can view own profile"
ON public.customer_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2.2: Customers can insert their own profile
-- Used for: Initial profile creation (typically via trigger)
-- Rationale: Restricts insertion to authenticated customers only
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customer_profiles;
CREATE POLICY "Customers can insert own profile"
ON public.customer_profiles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'customer'
  )
);

-- Policy 2.3: Customers can update their own profile
-- Used for: Profile updates, name/email changes
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customer_profiles;
CREATE POLICY "Customers can update own profile"
ON public.customer_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2.4: DELETE Policy - Customer Self-Deletion
-- Rationale: Allow customers to delete their own profiles (GDPR compliance)
-- or restrict to admin-only. Uncomment based on your requirements.
DROP POLICY IF EXISTS "Customers can delete own profile" ON public.customer_profiles;
-- Option A: Allow self-deletion
CREATE POLICY "Customers can delete own profile"
ON public.customer_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Option B: Admin-only deletion (uncomment if preferred)
-- CREATE POLICY "Admin can delete customer profiles"
-- ON public.customer_profiles
-- FOR DELETE
-- USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. PRODUCTS POLICIES
-- ============================================================================
-- Rationale: Public needs read access to available products for browsing.
-- Vendors need full CRUD on their own products only.
-- ============================================================================

-- Policy 3.1: Public can view available products
-- Used for: Storefront menu display, QR code browsing
-- Rationale: Customers and guests need to see products when browsing
DROP POLICY IF EXISTS "Public can view available products" ON public.products;
CREATE POLICY "Public can view available products"
ON public.products
FOR SELECT
USING (is_available = TRUE);

-- Policy 3.2: Vendors can view all their products (including unavailable)
-- Used for: Vendor dashboard, product management
-- Rationale: Vendors need to see all products to manage inventory
DROP POLICY IF EXISTS "Vendors can view own products" ON public.products;
CREATE POLICY "Vendors can view own products"
ON public.products
FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 3.3: Vendors can insert products for their own vendor profile
-- Used for: Adding new products/menu items
DROP POLICY IF EXISTS "Vendors can insert own products" ON public.products;
CREATE POLICY "Vendors can insert own products"
ON public.products
FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 3.4: Vendors can update their own products
-- Used for: Editing product details, changing prices, toggling availability
DROP POLICY IF EXISTS "Vendors can update own products" ON public.products;
CREATE POLICY "Vendors can update own products"
ON public.products
FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 3.5: Vendors can delete their own products
-- Used for: Removing products from menu
DROP POLICY IF EXISTS "Vendors can delete own products" ON public.products;
CREATE POLICY "Vendors can delete own products"
ON public.products
FOR DELETE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. ORDERS POLICIES
-- ============================================================================
-- Rationale: Orders involve multiple parties (vendor, customer, guest).
-- Vendors see orders for their store, customers see their own orders.
-- Anyone can create orders (for guest checkout support).
-- ============================================================================

-- Policy 4.1: Vendors can view orders for their vendor_id
-- Used for: Vendor dashboard, order management, kitchen display
DROP POLICY IF EXISTS "Vendors can view their orders" ON public.orders;
CREATE POLICY "Vendors can view their orders"
ON public.orders
FOR SELECT
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 4.2: Customers can view their own orders
-- Used for: Order history, order tracking
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
ON public.orders
FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customer_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 4.3: Anyone can create orders (supports guest checkout)
-- Used for: Guest checkout, customer checkout
-- Rationale: Guests don't have auth.uid(), so we need permissive INSERT
-- WITH CHECK ensures data integrity: items must exist and total_amount >= 0
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  items IS NOT NULL
  AND jsonb_array_length(items) > 0
  AND total_amount >= 0
  AND (
    -- Must have either customer_id OR guest_session_id (but not necessarily both)
    customer_id IS NOT NULL OR guest_session_id IS NOT NULL
  )
);

-- Policy 4.4: Vendors can update order status for their orders
-- Used for: Order status updates (pending → confirmed → preparing → ready → completed)
-- Rationale: Only vendors can change order status, not customers
DROP POLICY IF EXISTS "Vendors can update order status" ON public.orders;
CREATE POLICY "Vendors can update order status"
ON public.orders
FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  vendor_id IN (
    SELECT id FROM public.vendor_profiles
    WHERE user_id = auth.uid()
  )
);

-- Policy 4.5: DELETE Policy - Restricted
-- Rationale: Orders should rarely be deleted (legal/compliance reasons).
-- Best practice: Use status = 'cancelled' instead of DELETE.
-- Restrict DELETE to admin/service role only.
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
-- Uncomment below to allow service role deletion:
-- CREATE POLICY "Admin can delete orders"
-- ON public.orders
-- FOR DELETE
-- USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 5. GUEST SESSIONS POLICIES
-- ============================================================================
-- Rationale: Guest sessions are created before authentication. They need
-- permissive INSERT. SELECT should be limited (preferably via application logic
-- using session_token, but RLS can help).
-- ============================================================================

-- Policy 5.1: Anyone can create guest sessions
-- Used for: Guest checkout initiation
-- Rationale: Guests aren't authenticated, so INSERT must be open
DROP POLICY IF EXISTS "Anyone can create guest sessions" ON public.guest_sessions;
CREATE POLICY "Anyone can create guest sessions"
ON public.guest_sessions
FOR INSERT
WITH CHECK (TRUE);

-- Policy 5.2: Public can view guest sessions (limited use)
-- Rationale: RLS cannot easily check session_token from localStorage.
-- Best practice: Handle token validation in application layer, but allow
-- basic SELECT for authenticated users viewing their converted sessions.
-- Note: For true token-based access, use a function with SECURITY DEFINER
-- that validates the token and returns session data.
DROP POLICY IF EXISTS "Public can view guest sessions" ON public.guest_sessions;
CREATE POLICY "Public can view guest sessions"
ON public.guest_sessions
FOR SELECT
USING (
  -- Allow if user is viewing their own converted session
  (converted_to_user_id IS NOT NULL AND converted_to_user_id = auth.uid())
  OR
  -- Allow if session is active and not expired (basic check)
  (is_active = TRUE AND expires_at > NOW())
);

-- Policy 5.3: UPDATE Policy - Limited
-- Rationale: Guest sessions should be updated minimally (e.g., marking as converted).
-- Allow updates only for converted sessions by the converted user.
DROP POLICY IF EXISTS "Users can update converted guest sessions" ON public.guest_sessions;
CREATE POLICY "Users can update converted guest sessions"
ON public.guest_sessions
FOR UPDATE
USING (
  converted_to_user_id IS NOT NULL
  AND converted_to_user_id = auth.uid()
)
WITH CHECK (
  converted_to_user_id IS NOT NULL
  AND converted_to_user_id = auth.uid()
);

-- Policy 5.4: DELETE Policy - Restricted
-- Rationale: Guest sessions should auto-expire. Manual deletion should be admin-only.
-- Best practice: Use scheduled cleanup function to delete expired sessions.
DROP POLICY IF EXISTS "Admin can delete guest sessions" ON public.guest_sessions;
-- Uncomment below to allow service role deletion:
-- CREATE POLICY "Admin can delete guest sessions"
-- ON public.guest_sessions
-- FOR DELETE
-- USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 6. USER ROLES POLICIES
-- ============================================================================
-- Rationale: User roles should be readable by the owner, but modifications
-- should be restricted (typically handled by triggers).
-- ============================================================================

-- Policy 6.1: Users can view their own role
-- Used for: Authorization checks in application
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 6.2: Public can view roles (for vendor lookups)
-- Rationale: Needed to check if a user is a vendor for public storefront
DROP POLICY IF EXISTS "Public can view roles" ON public.user_roles;
CREATE POLICY "Public can view roles"
ON public.user_roles
FOR SELECT
USING (TRUE);

-- Policy 6.3: INSERT Policy - Restricted to triggers
-- Rationale: Roles are created by trigger functions. Manual insertion should
-- be restricted to prevent privilege escalation.
DROP POLICY IF EXISTS "Triggers can insert roles" ON public.user_roles;
-- Note: Trigger functions use SECURITY DEFINER, so they bypass RLS.
-- For additional security, you could add a policy that only allows inserts
-- from specific functions, but this is complex. Best practice: restrict
-- manual inserts via application logic.

-- Policy 6.4: UPDATE/DELETE Policy - Admin Only
-- Rationale: Role changes should be tightly controlled
DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
-- Uncomment below if needed:
-- CREATE POLICY "Admin can update roles"
-- ON public.user_roles
-- FOR UPDATE
-- USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================

-- ============================================================================
-- NOTES AND BEST PRACTICES
-- ============================================================================
--
-- 1. Testing RLS Policies:
--    - Use Supabase Dashboard > Authentication to create test users
--    - Use SQL Editor with different user contexts
--    - Test from application with authenticated and unauthenticated requests
--
-- 2. Guest Session Token Validation:
--    - RLS cannot directly validate localStorage tokens
--    - Best practice: Create a function with SECURITY DEFINER that:
--      a. Accepts session_token as parameter
--      b. Validates token matches session
--      c. Returns session data if valid
--    - Example function provided in testing checklist
--
-- 3. DELETE Operations:
--    - Prefer soft-delete (is_active = FALSE) over hard DELETE
--    - Use DELETE only for GDPR compliance or admin cleanup
--    - Consider creating cleanup functions for expired data
--
-- 4. Service Role Access:
--    - Service role bypasses RLS (useful for admin operations)
--    - Use sparingly and only in backend/server-side code
--    - Never expose service role key to frontend
--
-- 5. Policy Performance:
--    - Policies with subqueries (like vendor_id checks) can be slower
--    - Consider adding indexes on frequently queried columns
--    - Monitor query performance in Supabase Dashboard
--
-- ============================================================================
