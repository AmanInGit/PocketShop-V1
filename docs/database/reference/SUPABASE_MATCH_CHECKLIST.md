# Supabase Match Checklist: Prathmesh vs Aman

Use this to ensure **Aman's Org** Supabase matches **Prathmesh** (reference) so the app works the same way.

**Prathmesh project:** `uzyrfljocowacffxvtwx.supabase.co`  
**Aman project:** `https://YOUR_AMAN_PROJECT_REF.supabase.co`

---

## 1. Database Tables

| Table | Prathmesh | Aman | Notes |
|-------|-----------|------|-------|
| `vendors` | ✓ | ☐ View over `vendor_profiles` | Aman uses `vendor_profiles`; create view if needed |
| `vendor_profiles` | May differ | ✓ | Aman canonical vendor table |
| `orders` | ✓ | ☐ | Must have: id, vendor_id, customer_id, items (jsonb), status, payment_*, etc. |
| `order_items` | ✓ | ☐ | |
| `products` | ✓ | ☐ | |
| `payments` | ✓ | ☐ | |
| `notifications` | ✓ | ☐ | |
| `order_messages` | ✓ | ☐ | |
| `order_feedback` | ✓ | ☐ | |
| `customer_profiles` | ✓ | ☐ | |
| `user_roles` | ✓ | ☐ | |
| `guest_sessions` | ✓ | ☐ | For guest checkout |
| `vendor_staff` | ✓ | ☐ | Optional |
| `vendors_public` | ✓ | ☐ | View for public storefront |

**Aman-specific:** If you use `vendor_profiles` only, run:

```sql
CREATE OR REPLACE VIEW public.vendors AS
SELECT id, user_id, COALESCE(is_active, false) AS is_active
FROM public.vendor_profiles;
```

---

## 2. Database RPC Functions

| Function | Prathmesh | Aman | Notes |
|----------|-----------|------|-------|
| `atomic_stock_update(p_product_id, p_quantity)` | ✓ Returns JSONB | ☐ | Required by `create-order`; Migration `20251106090220_*.sql` |
| `get_order_queue_position` | ✓ | ☐ | Optional |
| `calculate_avg_processing_time` | ✓ | ☐ | Optional |
| `update_order_timestamps` | ✓ | ☐ | Optional |
| `check_low_stock` | ✓ | ☐ | Optional |
| `notify_new_order` | ✓ | ☐ | Trigger/notification |
| `notify_payment_status` | ✓ | ☐ | Optional |
| `handle_customer_signup` | ✓ | ☐ | Auth hook |
| `has_role` | ✓ | ☐ | RLS helper |
| `get_vendor_id(_user_id)` | ✓ | ☐ | Returns vendor id from user_id |

**Minimum for orders to work:** `atomic_stock_update` with JSONB return.

---

## 3. Realtime Publication

| Table | Prathmesh | Aman | Notes |
|-------|-----------|------|-------|
| `orders` | ✓ | ☐ | Live order status |
| `order_messages` | ✓ | ☐ | Live messaging |
| `notifications` | ✓ | ☐ | Live notifications |
| `products` | ✓ | ☐ | Live inventory |
| `payments` | ✓ | ☐ | Optional |

**Fix if missing:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
```

---

## 4. Edge Functions

| Function | Prathmesh | Aman | Secrets Required |
|----------|-----------|------|------------------|
| `create-order` | ✓ | ☐ | None (Supabase auto) |
| `create-checkout-session` | ✓ | ☐ | STRIPE_SECRET_KEY |
| `stripe-webhook` | ✓ | ☐ | STRIPE_WEBHOOK_SECRET |
| `restore-stock` | ✓ | ☐ | None |
| `send-order-confirmation` | ✓ | ☐ | RESEND_API_KEY |
| `generate-insights` | ✓ | ☐ | LOVABLE_API_KEY |

Deploy from: `Migration_Data/supabase/functions/<name>/`

---

## 5. Edge Function Secrets

| Secret | Prathmesh | Aman | Where to Get |
|--------|-----------|------|--------------|
| `STRIPE_SECRET_KEY` | ✓ | ☐ | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | ✓ | ☐ | Stripe Webhook → Signing secret |
| `RESEND_API_KEY` | ✓ | ☐ | Resend.com (not SMTP) |
| `LOVABLE_API_KEY` | ✓ | ☐ | Lovable AI Gateway |
| `SUPABASE_URL` | Auto | Auto | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Auto | — |

**Note:** Prathmesh uses **Resend** for emails, not SMTP. `send-order-confirmation` expects `RESEND_API_KEY`.

---

## 6. Storage

| Bucket | Prathmesh | Aman | Notes |
|--------|-----------|------|-------|
| `product-images` | ✓ Public | ☐ | Product photos |

---

## 7. Authentication

| Provider | Prathmesh | Aman | Notes |
|----------|-----------|------|-------|
| Email | ✓ | ☐ | Enable in Auth → Providers |
| Google (optional) | ? | ☐ | If used |
| RLS policies | ✓ | ☐ | Must allow vendor/customer access |

---

## 8. Quick Verification Queries

Run in **Aman** SQL Editor:

```sql
-- Tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- RPC functions
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND proname IN (
  'atomic_stock_update', 'get_vendor_id', 'has_role'
);

-- Realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

---

## 9. What to Fix First

1. **Tables** – Run migrations until all required tables exist.
2. **`vendors` view** – If using vendor_profiles, create the view.
3. **`atomic_stock_update`** – Must exist with JSONB return for create-order.
4. **Realtime** – Add required tables to publication.
5. **Edge Functions** – Deploy all 6, set secrets.
6. **Storage** – Create `product-images` bucket.
