# Migration Status Index

**Purpose:** Quick orientation when switching to a new chat. Read this first.

---

## Context

- **Aman's Org** = Your Supabase project (target – make it match Prathmesh)
- **Prathmesh's Org** = Reference project (`uzyrfljocowacffxvtwx.supabase.co`) – source of truth
- **Migration_Data** = Reference app folder (gitignored) – has schema, Edge Functions, migrations

---

## Current Status (at a Glance)

| Done | Remaining |
|------|-----------|
| Tables exist | `vendors` view |
| `atomic_stock_update` (JSONB) | Realtime publication (verify) |
| Functions: calculate_avg_processing_time, get_order_queue_position, has_role, handle_customer_signup, update_order_timestamps | Edge Functions (6) |
| Triggers: low_stock, new_order, payment_status, updated_at | Secrets (Stripe, Resend, Lovable) |
| | Storage (product-images) |
| | Frontend env (.env.local) |
| | OrderTracking page port + realtime |
| | Build + E2E test |

---

## Doc Map – Which File When

| If you need to… | Read this |
|-----------------|-----------|
| Get oriented quickly (new chat) | **This file** |
| See full checklist & next steps | [SUPABASE_MIGRATION_STATUS_REPORT.md](SUPABASE_MIGRATION_STATUS_REPORT.md) |
| Match Prathmesh item-by-item | [SUPABASE_MATCH_CHECKLIST.md](SUPABASE_MATCH_CHECKLIST.md) |
| Follow step-by-step commands | [AMAN_MIGRATION_STEPS.md](AMAN_MIGRATION_STEPS.md) |
| Prathmesh reference + Aman checklist | [DEPLOYMENT.md](../../DEPLOYMENT.md) |
| Schema & table details | [SUPABASE_MIGRATION_GUIDE.md](SUPABASE_MIGRATION_GUIDE.md) |
| Post-setup polish (OrderTracking, emails) | [LAST_FINAL_MIGRATION.md](LAST_FINAL_MIGRATION.md) |
| Overall phase tracking | [MIGRATION_STATUS.md](MIGRATION_STATUS.md), [MIGRATION_STATUS_CURRENT.md](MIGRATION_STATUS_CURRENT.md) |

---

## Next Actions (in order)

1. Create `vendors` view (1 SQL statement)
2. Verify Realtime for orders, order_messages, notifications, products
3. Deploy Edge Functions from Migration_Data
4. Set Edge Function secrets
5. Create product-images bucket
6. Set frontend/.env.local (Aman URL + anon key)
7. Port OrderTracking page + realtime (ask AI)
8. Build and E2E test

---

## Useful prompts for AI

- *"Create the vendors view SQL"*
- *"Port OrderTracking now"*
- *"Add send-order-confirmation to OrderConfirmation"*
- *"What's the status of the Supabase migration?"*
