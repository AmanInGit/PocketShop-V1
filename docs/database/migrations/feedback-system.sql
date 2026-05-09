-- ============================================================================
-- Order Feedback Table
-- Stores customer feedback for completed orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_feedback (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  
  -- Feedback Data
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_feedback_vendor_id ON public.order_feedback(vendor_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_order_id ON public.order_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_created_at ON public.order_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers/Guests can submit feedback (Anyone can insert, matched by order_id)
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.order_feedback;
CREATE POLICY "Anyone can submit feedback" ON public.order_feedback 
FOR INSERT TO public 
WITH CHECK (true);

-- Vendors can view feedback for their own shop
DROP POLICY IF EXISTS "Vendors can view their feedback" ON public.order_feedback;
CREATE POLICY "Vendors can view their feedback" ON public.order_feedback 
FOR SELECT TO authenticated 
USING (
  vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())
);

-- Everyone can view feedback (optional, but good for storefront if needed)
-- For now, let's stick to the requirements.

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_feedback;
