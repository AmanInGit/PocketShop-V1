-- ============================================================================
-- Customer profiles + orders RLS alignment (email/password customer flow)
-- Run in Supabase SQL Editor (idempotent where possible).
--
-- Fixes:
-- 1) mobile_number: allow NULL + synthetic placeholders (email:uuidnodashes)
-- 2) Remove blanket UNIQUE / E.164-only checks that block email-only signups
-- 3) handle_new_customer: deterministic synthetic phone when no OTP phone
-- 4) orders INSERT: guest checkout without customer_id / guest_session_id
-- 5) customer_profiles INSERT: bootstrap without pre-existing user_roles row
-- 6) user_roles INSERT: user can insert own role (fallback if trigger missed)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. customer_profiles: drop constraints/indexes that block synthetics
-- ---------------------------------------------------------------------------
ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_mobile_number_e164_chk;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_phone_e164_chk;

DROP INDEX IF EXISTS ux_customer_profiles_mobile_number_e164;
DROP INDEX IF EXISTS ux_customer_profiles_phone_e164;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'customer_profiles'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%mobile_number%'
  LOOP
    EXECUTE format('ALTER TABLE public.customer_profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.customer_profiles
  ALTER COLUMN mobile_number DROP NOT NULL;

-- Backfill empty / null mobile with stable synthetic (per auth user)
UPDATE public.customer_profiles cp
SET mobile_number = 'email:' || replace(u.id::text, '-', '')
FROM auth.users u
WHERE cp.user_id = u.id
  AND (cp.mobile_number IS NULL OR btrim(cp.mobile_number) = '');

UPDATE public.customer_profiles
SET mobile_number = 'email:' || replace(user_id::text, '-', '')
WHERE mobile_number IS NULL OR btrim(mobile_number) = '';

-- Real phones unique; synthetics use email: prefix and are unique per user_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_profiles_mobile_number_real
ON public.customer_profiles (mobile_number)
WHERE mobile_number IS NOT NULL
  AND btrim(mobile_number) <> ''
  AND mobile_number NOT LIKE 'email:%';

-- ---------------------------------------------------------------------------
-- 2. Auth trigger: customer profile + role (email-first safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_phone TEXT;
  v_synthetic TEXT;
  v_phone_verified BOOLEAN;
BEGIN
  v_synthetic := 'email:' || replace(NEW.id::text, '-', '');

  v_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    CASE WHEN NEW.phone IS NOT NULL AND btrim(NEW.phone) <> '' THEN NEW.phone ELSE NULL END,
    'Customer'
  );

  v_phone := COALESCE(
    NULLIF(btrim(NEW.phone), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'mobile_number'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'phone'), '')
  );

  IF v_phone IS NULL OR v_phone = '' THEN
    v_phone := v_synthetic;
    v_phone_verified := FALSE;
  ELSE
    v_phone_verified := TRUE;
  END IF;

  INSERT INTO public.customer_profiles (
    user_id,
    email,
    name,
    mobile_number,
    phone_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_phone,
    v_phone_verified
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_customer_auth_user_created ON auth.users;

CREATE TRIGGER on_customer_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'customer')
  EXECUTE FUNCTION public.handle_new_customer();

-- ---------------------------------------------------------------------------
-- 3. RLS: orders INSERT (guest checkout without session / customer_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (
  items IS NOT NULL
  AND jsonb_array_length(items) > 0
  AND total_amount >= 0
  AND vendor_id IS NOT NULL
);

-- ---------------------------------------------------------------------------
-- 4. RLS: customer_profiles INSERT (no user_roles prerequisite)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can insert own profile" ON public.customer_profiles;
DROP POLICY IF EXISTS "Customers can insert their own profile" ON public.customer_profiles;
CREATE POLICY "Customers can insert their own profile"
ON public.customer_profiles FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. RLS: user_roles — allow authenticated user to insert own row (bootstrap)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create their own role" ON public.user_roles;
CREATE POLICY "Users can create their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- After running: Supabase Dashboard → Authentication → URL Configuration →
-- Redirect URLs: include https://<your-app-host>/customer-auth (matches CustomerAuth emailRedirectTo).
