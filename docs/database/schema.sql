-- ============================================================================
-- PocketShop Core Database Schema
-- PostgreSQL + Supabase
-- 
-- This script creates all core tables required for PocketShop onboarding 
-- and operations, including vendor profiles, customer profiles, products,
-- orders, guest sessions, and user roles.
-- ============================================================================

-- ============================================================================
-- 1. VENDOR PROFILES TABLE
-- Stores vendor business information and onboarding status
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication Reference
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Business Information
  business_name TEXT NOT NULL,
  business_type TEXT, -- e.g., 'food', 'retail', 'salon', 'clinic'
  
  -- Contact Information
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE, -- REQUIRED field
  
  -- Business Owner & Location Details
  owner_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',
  
  -- Operational Configuration
  operational_hours JSONB, -- {"monday": {"open": "09:00", "close": "22:00"}, ...}
  working_days TEXT[], -- ['monday', 'tuesday', 'wednesday', ...]
  
  -- Media & Branding
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  
  -- QR Code System
  qr_code_id TEXT UNIQUE,
  qr_code_url TEXT,
  
  -- Account Status & Onboarding
  onboarding_status TEXT DEFAULT 'incomplete' 
    CHECK (onboarding_status IN ('incomplete', 'basic_info', 'operational_details', 'planning_selected', 'completed')),
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Metadata & Timestamps
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for vendor_profiles
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_user_id ON public.vendor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_email ON public.vendor_profiles(email);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_mobile_number ON public.vendor_profiles(mobile_number);

-- Enable Row Level Security
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CUSTOMER PROFILES TABLE
-- Stores customer information for registered users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication Reference
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL UNIQUE, -- REQUIRED field
  email TEXT,
  
  -- Verification Status
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  
  -- Account Status
  is_guest_converted BOOLEAN DEFAULT FALSE, -- Track if guest converted to registered user
  
  -- Metadata & Timestamps
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for customer_profiles
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user_id ON public.customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_mobile_number ON public.customer_profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email) WHERE email IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. GUEST SESSIONS TABLE
-- Stores temporary guest checkout sessions (no authentication required)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.guest_sessions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session Token (stored in localStorage for guest users)
  session_token TEXT UNIQUE NOT NULL,
  
  -- Guest Information
  customer_name TEXT,
  mobile_number TEXT NOT NULL, -- REQUIRED field
  email TEXT,
  
  -- Session Status
  is_active BOOLEAN DEFAULT TRUE,
  converted_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If guest later registers
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Indexes for guest_sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_session_token ON public.guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_mobile_number ON public.guest_sessions(mobile_number);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_converted_to_user_id ON public.guest_sessions(converted_to_user_id) WHERE converted_to_user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. USER ROLES TABLE
-- Tracks user roles (vendor or customer) for authorization
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  -- Primary Key (composite with user_id)
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role Assignment
  role TEXT NOT NULL CHECK (role IN ('vendor', 'customer')),
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. PRODUCTS TABLE
-- Stores vendor products/menu items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vendor Reference
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  
  -- Product Information
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  diet_type TEXT CHECK (diet_type IN ('veg', 'non_veg')),
  
  -- Availability Status
  is_available BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_available ON public.products(is_available) WHERE is_available = TRUE;

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. ORDERS TABLE
-- Stores customer orders (supports both registered customers and guests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Vendor Reference
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  
  -- Customer Reference (nullable - can be registered customer or guest)
  customer_id UUID REFERENCES public.customer_profiles(id) ON DELETE SET NULL,
  guest_session_id UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  
  -- Order Items (stored as JSONB array)
  -- Format: [{"product_id": "uuid", "quantity": 2, "price": 25.50, "name": "Product Name"}, ...]
  items JSONB NOT NULL,
  
  -- Order Amount
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Order Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  
  -- Payment Information
  payment_status TEXT DEFAULT 'unpaid' 
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_method TEXT,
  
  -- Customer Contact Info (stored for reference)
  customer_phone TEXT,
  customer_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_guest_session_id ON public.orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- END OF SCHEMA CREATION
-- ============================================================================
