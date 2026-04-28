## Supabase Migration Guide (Aman → Prathmesh setup)

This guide helps you make your **Aman org** Supabase project behave like the **working Prathmesh org** project that `Migration_Data` was built against.

It is a companion to `MIGRATION_STATUS.md`, but focused only on **Supabase, realtime, and Edge Functions**.

> As you share screenshots of both projects, we can refine/fill any TODOs in this file together.

---

### 1. Overview

- **Goal:** Make your Aman Supabase project match the schema, realtime config, and functions of the working Prathmesh project, so the `frontend/` app works the same way as `Migration_Data`.
- **You do (console/CLI):** Project creation, env vars, running SQL, deploying functions.
- **I do (code):** Any app changes (OrderTracking port, send-order-confirmation wiring, fixing TS errors).

Keep this open side‑by‑side with the Supabase dashboard.

---

### 2. Identify the two projects

You mentioned:
- **Aman org** – your main project (target)
- **Prathmesh org** – working project used by `Migration_Data` (source)

When you send screenshots, please include for **both** projects:
- **Project Home** (shows project ref / URL)
- **Database → Tables** (left sidebar list is enough)
- **Database → Replication** (publication tables)
- **Edge Functions** list
- **Authentication → Policies / Providers** if relevant

We will use those to confirm:
- Which tables exist and match the SQL in `Migration_Data/supabase/migrations/*`.
- Which tables are enabled for realtime.
- Which Edge Functions exist and which environment variables are set.

---

### 3. Environment variables (frontend)

In `frontend/.env.local` you should have:

```bash
VITE_SUPABASE_URL=https://YOUR-AMAN-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Checklist:**
- [ ] URL is from **Aman** project (Settings → API → Project URL).
- [ ] anon key is from **Aman** project (Settings → API → anon/public key).
- [ ] File is inside `frontend/` folder (not repo root).
- [ ] You restarted `npm run dev` after editing this file.

If this is already done, we won’t touch it.

---

### 4. Database schema & migrations

The **source of truth** for schema is:
- `Migration_Data/supabase/migrations/*.sql`
- (Optionally) consolidated SQL in `docs/database/*.sql` in this repo.

**High-level steps (Aman project):**
1. Open **Aman** project → Database → SQL Editor.
2. For each `.sql` file in `Migration_Data/supabase/migrations/`:
   - Open the file locally.
   - Copy its content into a new SQL query in Supabase.
   - Run it (oldest timestamp first).
3. If you already ran some of them, Supabase may say “table exists” – that’s OK, we just need it to match.

**What to verify (later, with screenshots):**
- Tables like `orders`, `order_items`, `vendors`/`vendor_profiles`, `products`, `notifications`, `order_messages`, `payments` exist in **Aman** and look similar to **Prathmesh**.

We’ll refine this section specifically once we see your screenshots of:
- Database → Tables (both orgs).

---

### 5. Realtime configuration

`Migration_Data` enables realtime by adding tables to the `supabase_realtime` publication (see SQL files under `Migration_Data/supabase/migrations/`).

Tables that should be in the publication:
- `orders`
- `order_messages`
- `notifications`
- `products`
- (optionally `payments`)

**In Aman project:**
1. Go to **Database → Replication** (or \"Realtime\" depending on UI version).
2. Confirm that the tables above are listed under the realtime publication.
3. If not, run this SQL in SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
```

We can compare this with the **Prathmesh** project via your screenshots to be sure everything matches.

---

### 6. Edge Functions

Frontend expects these Supabase Edge Functions to exist in **Aman**:

- `create-order`
- `create-checkout-session`
- `generate-insights`
- `restore-stock`
- `send-order-confirmation` (optional but recommended for emails)

**How to migrate from Prathmesh to Aman:**
1. In **Prathmesh** project:
   - Go to Edge Functions.
   - Note which functions exist and their names.
2. In **Aman** project:
   - Either re‑deploy the same functions using Supabase CLI from `Migration_Data/supabase/functions/**`.
   - Or recreate them manually in the Supabase dashboard (copy the code if you have access).
3. Set any required **secrets** (API keys, Stripe keys, SMTP, etc.) in Aman:
   - Supabase → Settings → API or Edge Functions → Secrets.

Once you share screenshots of the functions list for both orgs, I can help generate a precise \"do this in Aman\" list.

---

### 7. App-specific wiring (what I can automate)

Once Supabase (Aman) is aligned with Prathmesh, I can safely automate the last bits in the app:

- **OrderTracking page**  
  - Replace placeholder with full page from `Migration_Data/src/pages/OrderTracking.tsx`.  
  - Wire realtime subscription so status updates live.  
  - Adjust imports to use `@/lib/supabaseClient`.

- **send-order-confirmation** in `OrderConfirmation.tsx`  
  - Add `supabase.functions.invoke('send-order-confirmation', {...})` after order is loaded.  
  - Mirror payload from `Migration_Data/src/pages/OrderConfirmation.tsx`.

You don’t need to remember all this – when you say “now port OrderTracking” or “add confirmation emails”, I’ll handle the code changes, and this guide stays focused on Supabase project setup.

---

### 8. Recommended order for you

1. **Confirm `.env.local` in `frontend/` is correct** (Aman URL + anon key).
2. **Run/verify migrations** in Aman using SQL from `Migration_Data/supabase/migrations/` (or `docs/database/*.sql`).  
3. **Enable realtime** for the required tables in Aman.
4. **Deploy Edge Functions** in Aman (`create-order`, `create-checkout-session`, `generate-insights`, `restore-stock`, `send-order-confirmation`).
5. **Send screenshots** of both projects (Aman + Prathmesh) for: Tables, Replication, Edge Functions.
6. **Ask me to port code steps** (OrderTracking, send-order-confirmation, or anything else).

Once we have your screenshots, we can turn any \"TODO\" in this guide into exact copy‑paste commands for Aman.

_________________________________________________________________________________________________________

What you’re seeing are **two different layers** that work together:

### 1. What Supabase is doing

Supabase (Aman / Prathmesh projects) is handling:

- **Database tables**: vendors, products, orders, etc.
- **Realtime**: order updates, notifications, messages.
- **Auth**: Supabase auth (sessions, users).
- **Edge Functions**: things like `create-order`, `create-checkout-session`, `restore-stock`, etc.

All of that is **backend infrastructure**, not the actual deployed web app.

### 2. What “Lovable” is doing

“Lovable” is a **hosting / app platform** (their own service) where:

- The **frontend** (React app) is deployed.
- Sometimes a small **backend** (API routes or serverless functions) is also running.
- They configure environment variables there (e.g. Supabase URL/key, Stripe keys).
- It serves `https://...` that you open in the browser and where scanning QR, storefront, dashboard, etc. “just work”.

So for the **Prathmesh demo**:

- The app code is deployed on **Lovable**.
- That app talks to **Prathmesh’s Supabase project** for data, auth, realtime, Edge Functions.
- QR scanning “works” because:
  - The QR code encodes a storefront URL hosted on Lovable.
  - That URL, when opened, reads data from Supabase.

### 3. For your Aman setup

What we did today:

- Made **Aman Supabase** look like **Prathmesh Supabase** (tables, realtime).
- Updated docs so you know which functions + pages to hook up.

What’s still separate:

- Where you **deploy your frontend**:
  - Could be Lovable, Vercel, Netlify, Render, etc.
  - Wherever you deploy, you’ll set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to Aman’s project.
- Once deployed, QR codes generated from `vendor_profiles.qr_code_url` will point to **your deployed URL**, and then the frontend will talk to Aman Supabase.

If you want, next time we can:

- Look at how the Prathmesh app is configured on Lovable (env vars, build command).
- Then create a matching deployment for **your** repo (on Lovable or another host) so your Aman project becomes the live backend.
_________________________________________________________________________________________________________
---

### 9. Table‑by‑table checklist (status)

We’ll track table matching here as we go.

#### 9.1 `customer_profiles` ✅ matched

- **Aman (your project):**
  - Columns: `id`, `user_id`, `name`, `phone`, `email`, `phone_verified`, `email_verified`, `is_guest_converted`, `metadata`, `created_at`, `updated_at`
  - Extra fields (`phone_verified`, `email_verified`, `is_guest_converted`, `metadata`) are OK and useful.
- **Prathmesh (source project):**
  - Columns: `id`, `user_id`, `name`, `phone`, `email`, `created_at`, `updated_at`
- **Decision:** Keep Aman schema as‑is. Code should use `phone` (not `mobile_number`). No changes needed to the table.

#### 9.2 `guest_sessions` ✅ matched

- **Aman:**
  - Columns: `id`, `session_token`, `customer_name`, `mobile_number`, `email`, `is_active`, `converted_to_user_id`, `created_at`, `expires_at`
  - This matches `docs/database/schema.sql` for `guest_sessions`.
- **Prathmesh:**
  - Same logical table; defined in shared schema.
- **Decision:** Keep `guest_sessions` exactly as it is. Required for guest checkout flows.

#### 9.3 `notifications` ✅ matched

- **Aman:**
  - Columns: `id`, `user_id`, `vendor_id`, `title`, `message`, `type`, `is_read`, `created_at`
- **Prathmesh:**
  - Same columns and types as Aman.
- **Decision:** Table is now aligned with Prathmesh. No further changes needed.

#### 9.3 `notifications` ✅ matched

- **Aman:**
  - Columns: `id`, `user_id`, `vendor_id`, `title`, `message`, `type`, `is_read`, `created_at`
- **Prathmesh:**
  - Same columns and types as Aman.
- **Decision:** Table is now aligned with Prathmesh. No further changes needed.

#### 9.4 `order_feedback` ✅ matched

- **Aman:**
  - Columns: `id`, `order_id`, `vendor_id`, `rating`, `comment`, `created_at`
- **Prathmesh:**
  - Same logical columns (`id`, `order_id`, `vendor_id`, `rating`, `comment`, `created_at`); in Aman we point `vendor_id` to `vendor_profiles.id`, which is correct for this project.
- **Decision:** Table exists and matches schema. RLS + policies created; no further changes needed.

#### 9.5 `order_items` ✅ matched

- **Aman:**
  - Columns (from your screenshot): `id`, `order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`, `created_at`
- **Prathmesh:**
  - Same columns and types as Aman.
- **Decision:** Table is aligned; no changes needed.

#### 9.6 `order_messages` ✅ matched

- **Aman:**
  - Columns: `id`, `order_id`, `sender_type`, `sender_name`, `message`, `created_at`
- **Prathmesh:**
  - Same columns and types as Aman.
- **Decision:** Table is aligned; used by messaging hooks/components. No changes needed.

#### 9.7 `orders` ✅ good (no change needed)

- **Aman (your project):**
  - Columns: `id`, `vendor_id`, `customer_id`, `guest_session_id`, `items` (jsonb), `total_amount`, `status` (text), `payment_status` (text), `payment_method` (text), `customer_phone`, `customer_name`, `created_at`, `updated_at`, `order_number`, `delivery_address`, `customer_email`, `notes`.
  - This matches the repo schema in `docs/database/schema.sql` and is what the **frontend** code is written for (JSONB `items`, payment fields, contact info, etc.).

- **Prathmesh (source project):**
  - Columns: `id`, `vendor_id`, `customer_name`, `customer_email`, `customer_phone`, `order_number`, `status` (enum `order_status`), `total_amount`, `notes`, `created_at`, `updated_at`, `customer_id`, `accepted_at`, `processing_started_at`, `completed_at`, `estimated_completion_time`.

- **Decision:**  
  - Keep **Aman** schema as‑is – it is aligned with `schema.sql` and the current app code.  
  - Extra columns in Aman (`items`, `payment_status`, `payment_method`, `delivery_address`, `notes`, etc.) are fine and required by the new UI.  
  - Enum vs text for `status` is also OK; we don’t need to change Aman to use the `order_status` enum as long as we keep to the allowed status values in the app.

#### 9.8 `payments` ✅ matched

- **Both Aman and Prathmesh:**
  - Columns:  
    `id` (uuid, PK),  
    `order_id` (uuid, FK → `orders.id`),  
    `amount` (numeric),  
    `payment_method` (enum `payment_method`),  
    `payment_status` (enum `payment_status`),  
    `transaction_id` (text, nullable),  
    `stripe_payment_intent_id` (text, nullable),  
    `created_at` (timestamptz),  
    `updated_at` (timestamptz)
- **Technical check:**
  - Enum types for `payment_method` and `payment_status` match what the app expects (e.g. method: `card|upi|wallet|cash`, status: `pending|paid|failed|refunded`).
  - This schema is compatible with the frontend `PaymentsNew` page and `orderService` logic.
- **Decision:** `payments` is correctly defined and consistent between Aman and Prathmesh. No table changes needed.

#### 9.9 `products` ✅ matched

- **Aman:**
  - Columns: `id`, `vendor_id`, `name`, `description`, `price`, `category`, `image_url`,
    `is_available`, `created_at`, `updated_at`, `stock_quantity`, `low_stock_threshold`
- **Prathmesh:**
  - Same set of columns (order of `category` / `image_url` differs but that doesn’t matter).
- **Decision:** Products table is fully aligned and also matches `docs/database/schema.sql`. No changes needed.

#### 9.10 `user_roles` ✅ matched

- **Aman (your project):**
  - Columns: `user_id`, `role`, `created_at`
  - Design: `user_id` is the logical primary key (one row per user), role stored as plain `text`.
- **Prathmesh (source project):**
  - Columns: `id`, `user_id`, `role` (enum `app_role`), `created_at`
  - Uses a separate `id` column and an enum type, but logically still “one role per user”.
- **PocketShop schema (`docs/database/schema.sql`):**
  - Uses `user_id` as **PRIMARY KEY** and `role` as `text` with `CHECK (role IN ('vendor','customer'))`.
- **Decision:** Your Aman structure (no `id`, PK on `user_id`) is the one the app expects and is correct.  
  Optional hardening: ensure `user_id` is set as PRIMARY KEY + FK to `auth.users(id)`, `created_at` has `DEFAULT now()`, and add a CHECK constraint on `role` for allowed values.

#### 9.11 `vendor_staff` ✅ matched

- **Aman (your project):**
  - Columns: `id`, `vendor_id`, `user_id`, `role` (text), `created_at`, `created_by`
  - `vendor_id` → `vendor_profiles.id`, `user_id` / `created_by` → `auth.users.id`.
- **Prathmesh (source project):**
  - Columns: `id`, `vendor_id`, `user_id`, `role` (enum `app_role`), `created_at`, `created_by`
  - Same structure but uses an enum type instead of text for `role`.
- **Decision:** Keep Aman schema (role as `text`). It is simpler and matches this repo’s `schema.sql`.  
  Optional: later add a CHECK constraint like `role IN ('owner','manager','staff')` if you want stricter validation.

#### 9.12 `vendor_profiles` ✅ canonical vendor table

- **Aman:** `vendor_profiles` has 24 columns (business info, contact, QR, onboarding, metadata) exactly as defined in `docs/database/schema.sql`.
- **Prathmesh:** uses a simpler `vendors` table.
- **Decision:** `vendor_profiles` is our single source of truth for vendors in this project.  
  We do **not** create a separate `vendors` table in Aman; all FKs and code use `vendor_profiles.id`.

#### 9.13 `vendors_public` ✅ matched

- **Aman:** `vendors_public` is a VIEW over `vendor_profiles` with columns  
  `id, business_name, description, business_category, logo_url, address, is_active, qr_code_url, created_at, updated_at`.
- **Prathmesh:** `vendors_public` exposes the same public subset (business name, category, logo, address, active flag, QR, timestamps).
- **Decision:** View matches the intent of Prathmesh; no further changes needed.

---

**Tables status summary:**  
All required tables are present and aligned in Aman:  
`customer_profiles, guest_sessions, notifications, order_feedback, order_items, order_messages, orders, payments, products, user_roles, vendor_profiles, vendor_staff, vendors_public`.  
Next Supabase steps are about **Edge Functions + testing flows**, not tables.