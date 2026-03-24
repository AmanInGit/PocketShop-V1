-- ============================================================================
-- Orders table queue foundation
-- Adds table-aware order lifecycle, queue fields, and auto-promotion triggers.
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_slug TEXT,
  ADD COLUMN IF NOT EXISTS order_sequence_on_table INTEGER,
  ADD COLUMN IF NOT EXISTS is_followup BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS queue_rank INTEGER,
  ADD COLUMN IF NOT EXISTS kitchen_state TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_kitchen_state_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_kitchen_state_check
  CHECK (kitchen_state IS NULL OR kitchen_state IN ('queued', 'active', 'done'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_sequence_on_table_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_sequence_on_table_check
  CHECK (order_sequence_on_table IS NULL OR order_sequence_on_table >= 1);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_table_status_kitchen_created
  ON public.orders(vendor_id, table_code, status, kitchen_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_table_queue_rank
  ON public.orders(vendor_id, table_code, kitchen_state, queue_rank, created_at)
  WHERE table_code IS NOT NULL;

CREATE OR REPLACE VIEW public.v_active_order_count_per_vendor_table AS
SELECT
  vendor_id,
  table_code,
  COUNT(*)::INTEGER AS active_count
FROM public.orders
WHERE table_code IS NOT NULL
  AND status NOT IN ('completed', 'cancelled')
  AND kitchen_state = 'active'
GROUP BY vendor_id, table_code;

-- Atomic insert path for table-based ordering:
-- - max 3 active per vendor+table
-- - overflows are queued
-- - tracks follow-up and per-table sequence
CREATE OR REPLACE FUNCTION public.create_table_order_with_queue(
  p_vendor_id UUID,
  p_customer_id UUID,
  p_guest_session_id UUID,
  p_items JSONB,
  p_total_amount NUMERIC,
  p_status TEXT,
  p_payment_status TEXT,
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_order_number TEXT,
  p_notes TEXT,
  p_table_code TEXT,
  p_table_slug TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_count INTEGER := 0;
  v_next_sequence INTEGER := 1;
  v_queue_rank INTEGER := NULL;
  v_is_followup BOOLEAN := FALSE;
  v_kitchen_state TEXT := NULL;
  v_activated_at TIMESTAMPTZ := NULL;
  v_order public.orders;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(COALESCE(p_vendor_id::TEXT, '') || ':' || COALESCE(p_table_code, '')));

  IF p_table_code IS NOT NULL AND p_table_code <> 'PICKUP' THEN
    SELECT
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'cancelled')
          AND kitchen_state = 'active'
      ),
      COALESCE(MAX(order_sequence_on_table), 0)
    INTO v_active_count, v_next_sequence
    FROM public.orders
    WHERE vendor_id = p_vendor_id
      AND table_code = p_table_code;

    v_next_sequence := v_next_sequence + 1;
    v_is_followup := v_active_count > 0;

    IF v_active_count >= 3 THEN
      v_kitchen_state := 'queued';
      SELECT COALESCE(MAX(queue_rank), 0) + 1
      INTO v_queue_rank
      FROM public.orders
      WHERE vendor_id = p_vendor_id
        AND table_code = p_table_code
        AND status NOT IN ('completed', 'cancelled')
        AND kitchen_state = 'queued';
    ELSE
      v_kitchen_state := 'active';
      v_activated_at := NOW();
    END IF;
  END IF;

  INSERT INTO public.orders (
    vendor_id,
    customer_id,
    guest_session_id,
    items,
    total_amount,
    status,
    payment_status,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    order_number,
    notes,
    table_code,
    table_slug,
    order_sequence_on_table,
    is_followup,
    queue_rank,
    kitchen_state,
    activated_at
  )
  VALUES (
    p_vendor_id,
    p_customer_id,
    p_guest_session_id,
    p_items,
    p_total_amount,
    p_status,
    p_payment_status,
    p_payment_method,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_order_number,
    p_notes,
    p_table_code,
    p_table_slug,
    CASE WHEN p_table_code IS NOT NULL AND p_table_code <> 'PICKUP' THEN v_next_sequence ELSE NULL END,
    v_is_followup,
    v_queue_rank,
    v_kitchen_state,
    v_activated_at
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_delivery_and_queue_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.delivered_at IS NULL THEN
      NEW.delivered_at := NOW();
    END IF;
    NEW.kitchen_state := 'done';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_delivery_fields ON public.orders;
CREATE TRIGGER trg_order_delivery_fields
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_delivery_and_queue_promotion();

CREATE OR REPLACE FUNCTION public.promote_next_queued_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_order_id UUID;
BEGIN
  IF NEW.status IN ('completed', 'cancelled')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.table_code IS NOT NULL
     AND NEW.table_code <> 'PICKUP' THEN

    SELECT id
    INTO v_next_order_id
    FROM public.orders
    WHERE vendor_id = NEW.vendor_id
      AND table_code = NEW.table_code
      AND status NOT IN ('completed', 'cancelled')
      AND kitchen_state = 'queued'
    ORDER BY queue_rank ASC NULLS LAST, created_at ASC
    LIMIT 1;

    IF v_next_order_id IS NOT NULL THEN
      UPDATE public.orders
      SET kitchen_state = 'active',
          queue_rank = NULL,
          activated_at = COALESCE(activated_at, NOW()),
          updated_at = NOW()
      WHERE id = v_next_order_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_next_queued_order ON public.orders;
CREATE TRIGGER trg_promote_next_queued_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.promote_next_queued_order();
