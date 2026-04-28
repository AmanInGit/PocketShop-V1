# Migration Status – Current (Aman's Org)

**Last updated:** 2025-02-19  
**Target:** Make Aman's Org Supabase identical to Prathmesh (reference)

> **Start here:** [MIGRATION_STATUS_INDEX.md](MIGRATION_STATUS_INDEX.md) for quick orientation.

---

## Quick status

| Area | Status | Notes |
|------|--------|-------|
| Tables | ✅ Done | All required tables exist |
| Database Functions | ✅ Done | atomic_stock_update (jsonb), calculate_avg_processing_time, get_order_queue_position, has_role, handle_customer_signup, update_order_timestamps |
| Triggers | ✅ Done | low_stock_notification, new_order_notification, payment_status_notification, set_*_updated_at |
| `vendors` view | ☐ | Create view over vendor_profiles |
| Realtime | ⚠️ Verify | orders, order_messages, notifications, products in publication |
| Edge Functions | ☐ | Deploy all 6 |
| Secrets | ☐ | Stripe, Resend, Lovable |
| Frontend env | ☐ | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| OrderTracking page | ☐ | Placeholder only – needs full port |
| Build | ☐ | Not verified |

---

## 1. Database (Supabase)

### Tables
| Table | Status |
|-------|--------|
| orders, order_items, products, payments | ✅ |
| notifications, order_messages, order_feedback | ✅ |
| customer_profiles, vendor_profiles | ✅ |
| user_roles, guest_sessions, vendor_staff | ✅ |
| menu_categories (Aman extra) | ✅ |

### Functions
| Function | Status |
|----------|--------|
| `atomic_stock_update` (p_product_id, p_quantity → jsonb) | ✅ Done |
| `check_low_stock`, `get_vendor_id`, `handle_updated_at` | ✅ Done |
| `notify_new_order`, `notify_payment_status` | ✅ Done |
| `calculate_avg_processing_time`, `get_order_queue_position` | ✅ Done |
| `handle_customer_signup`, `has_role`, `update_order_timestamps` | ✅ Done |

### Views
| View | Status |
|------|--------|
| `vendors` (over vendor_profiles) | ☐ Create |
| `vendors_public` | ☐ Check exists |

### Realtime
| Table | Status |
|-------|--------|
| orders | ☐ |
| order_messages | ☐ |
| notifications | ☐ |
| products | ☐ |

---

## 2. Edge Functions

| Function | Status | Secrets |
|----------|--------|---------|
| create-order | ☐ | — |
| create-checkout-session | ☐ | STRIPE_SECRET_KEY |
| stripe-webhook | ☐ | STRIPE_WEBHOOK_SECRET |
| restore-stock | ☐ | — |
| send-order-confirmation | ☐ | RESEND_API_KEY |
| generate-insights | ☐ | LOVABLE_API_KEY |

---

## 3. Secrets

| Secret | Status |
|--------|--------|
| STRIPE_SECRET_KEY | ☐ |
| STRIPE_WEBHOOK_SECRET | ☐ |
| RESEND_API_KEY | ☐ |
| LOVABLE_API_KEY | ☐ (optional) |

---

## 4. Frontend

| Item | Status |
|------|--------|
| frontend/.env.local → Aman URL + anon key | ☐ |
| OrderTracking page (full + realtime) | ☐ Placeholder |
| send-order-confirmation wired | ☐ Optional |
| npm run build | ☐ |

---

## 5. Next actions (in order)

1. **Create `vendors` view** – Run SQL from AMAN_MIGRATION_STEPS Step 1  
2. **Verify Realtime** – Add 4 tables to publication (orders, order_messages, notifications, products)  
3. **Deploy Edge Functions** – Link CLI, deploy all 6  
4. **Set secrets** – Stripe, Resend, Lovable  
5. **Frontend env** – Point to Aman project  
6. **Port OrderTracking** – Ask AI  
7. **Test & build**

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `MIGRATION_STATUS_INDEX.md` | Quick orientation, doc map (start here) |
| `SUPABASE_MIGRATION_STATUS_REPORT.md` | Full checklist, done vs remaining |
| `AMAN_MIGRATION_STEPS.md` | Step-by-step commands |
| `SUPABASE_MATCH_CHECKLIST.md` | Prathmesh vs Aman comparison |
| [DEPLOYMENT.md](../../DEPLOYMENT.md) | Prathmesh reference + Aman checklist |
| `LAST_FINAL_MIGRATION.md` | Post-setup polish |
| `SERVICE_HEALTH_MONITOR.md` | Health monitoring |
| `MIGRATION_STATUS.md` | Overall migration phases |
