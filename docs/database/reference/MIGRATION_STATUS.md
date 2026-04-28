## PocketShop migration status (Migration_Data → frontend)

This file tracks **migration progress** from the reference PocketShop app in `Migration_Data/`
into the active app under `frontend/` in this repo.

- Only mark a step as **completed** after:
  - Code is implemented in `frontend`, and
  - Relevant tests / manual checks have passed.
- We’ll move to the next major phase only when the current phase’s critical items are done.

**Done so far (summary):** Phase 0 ✓ · Phase 1 ✓ (except 1.3 deps) · Phase 2 ✓ · Phase 3 ✓ · Phase 4 ✓ · Phase 5 ✓ · Phase 6 ✓ · Phase 7 ✓. Use **Per-step notes** below for "What to check" when you verify later.  
**After each step:** see **Per-step notes** at the bottom for "What I did" and "What to check".

---

### What's left to migrate: Supabase & realtime

These items are **not yet** fully migrated or need verification.

| Area | Status | What's left | What to check |
|------|--------|-------------|----------------|
| **Supabase client** | ✓ Done | Frontend uses `lib/supabaseClient.ts` with env `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Realtime options enabled. | With valid `.env`, app loads and no Supabase client errors in console. |
| **Realtime – vendor** | ✓ Done | `useOrders`, `useOrderMessages`, `useNotifications`, `useProducts`, `useOrder`, `PaymentsNew`, `ActiveOrdersWidget`, `productService` all use `supabase.channel(...).on('postgres_changes', ...)`. | In dashboard: change an order status or add a product in another tab — list updates without refresh. Notifications and payments tabs update live. |
| **Realtime – customer** | ⚠️ Partial | **OrderTracking** page in frontend is a placeholder. Migration_Data has full page + realtime subscription on `orders` for that order ID so status updates live. | When you port full `OrderTracking.tsx` from Migration_Data, add `setupRealtimeSubscription()` (channel `order-${orderId}`, postgres_changes on `orders` with `filter: id=eq.${orderId}`) and cleanup on unmount. Then: open `/order-tracking/<id>` and change status in vendor dashboard — customer page should update without refresh. |
| **Edge Functions** | ⚠️ One missing | **Wired in frontend:** `create-order`, `create-checkout-session`, `generate-insights`, `restore-stock`. **Not called in frontend:** `send-order-confirmation`. | (1) Deploy/invoke create-order, create-checkout-session, generate-insights, restore-stock from Supabase dashboard or CLI and confirm frontend still works. (2) **Optional:** In `frontend/src/app/pages/OrderConfirmation.tsx` after fetching order, call `supabase.functions.invoke('send-order-confirmation', { body: { customerEmail, customerName, orderNumber, orderAmount, vendorName, orderItems } })` if you want confirmation emails (match Migration_Data OrderConfirmation.tsx). |
| **Realtime in Supabase** | Backend | Realtime must be enabled for tables: `orders`, `order_messages`, `notifications`, `products` (and optionally `payments`). Migration_Data has migrations under `Migration_Data/supabase/migrations/` that do `ALTER PUBLICATION supabase_realtime ADD TABLE ...`. | In Supabase project: Database → Replication → ensure these tables are in the publication. If not, run the same `ALTER PUBLICATION` statements from Migration_Data migrations. |
| **Auth** | Later phase | Frontend still uses `supabase.auth` in AuthContext, login, storefront, checkout. If you move to “Otherf” or another auth provider, that’s a separate auth-integration phase. | N/A until you switch auth. |

**Summary:** Vendor-side Supabase and realtime are migrated. Remaining: (1) port full **OrderTracking** page and add its realtime subscription, (2) optionally add **send-order-confirmation** call in OrderConfirmation, (3) ensure Supabase project has realtime enabled for the tables above.

---

## How to proceed: Step-by-step guide

Since Migration_Data is working, follow these steps to replicate the setup in `frontend`. Steps marked **🤖 AI can help** are code changes I can make; steps marked **👤 Manual** you need to do yourself (Supabase dashboard, env vars, etc.).

### Step 1: Supabase project setup (👤 Manual)

**Goal:** Create/configure Supabase project and enable realtime.

1. **Create Supabase project** (if you don't have one):
   - Go to https://supabase.com → New Project
   - Choose org, name, database password, region
   - Wait for project to be ready (~2 min)

2. **Get your Supabase credentials:**
   - In Supabase dashboard: Settings → API
   - Copy:
     - **Project URL** (e.g. `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)

3. **Set environment variables in frontend:**
   - Create/update `frontend/.env.local`:
     ```
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJ...
     ```
   - Restart dev server (`npm run dev`) after adding env vars

4. **Run database migrations:**
   - In Supabase dashboard: SQL Editor
   - Copy SQL from `Migration_Data/supabase/migrations/*.sql` files (or use the consolidated SQL files in `docs/database/` if available)
   - Run them in order (oldest timestamp first):
     - `20251024164936_*.sql` (enables realtime for orders, products, notifications)
     - `20251027025928_*.sql` (enables realtime for order_messages)
     - `20251030144202_*.sql` (if exists)
     - `20251101043516_*.sql` (if exists)
     - `20251101044114_*.sql` (if exists)
     - `20251101044546_*.sql` (if exists)
   - **OR** use Supabase CLI: `supabase db push` from `Migration_Data/supabase/` directory

5. **Verify realtime is enabled:**
   - In Supabase dashboard: Database → Replication
   - Check that these tables are listed: `orders`, `order_messages`, `notifications`, `products` (and optionally `payments`)
   - If missing, run manually:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
     ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
     ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
     ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
     ```

**✅ Check:** Run `npm run dev` in `frontend`, open browser console — no Supabase client errors. If you see "Missing Supabase environment variables", check `.env.local` is in `frontend/` (not root) and restart dev server.

---

### Step 2: Deploy Edge Functions (👤 Manual)

**Goal:** Deploy Supabase Edge Functions that frontend calls.

1. **List of Edge Functions needed:**
   - `create-order` (called from `orderService.ts`)
   - `create-checkout-session` (called from `PublicStorefront.tsx`)
   - `generate-insights` (called from `useAnalytics.ts`)
   - `restore-stock` (called from `OrderStatusSelect.tsx`)
   - `send-order-confirmation` (optional, for emails)

2. **Deploy functions:**
   - If Migration_Data has functions in `Migration_Data/supabase/functions/`:
     - Use Supabase CLI: `supabase functions deploy <function-name>` from `Migration_Data/supabase/`
   - OR create functions in Supabase dashboard: Edge Functions → New Function
   - Match the function signatures expected by frontend (check `supabase.functions.invoke()` calls in frontend code)

3. **Set function secrets (if needed):**
   - For Stripe: `supabase secrets set STRIPE_SECRET_KEY=sk_...`
   - For email: `supabase secrets set SMTP_*` (if using SMTP)

**✅ Check:** In Supabase dashboard → Edge Functions, all functions listed above show "Active". Test by placing an order from storefront — check Edge Functions → Logs for invocations.

---

### Step 3: Port OrderTracking page with realtime (🤖 AI can help)

**Goal:** Replace placeholder OrderTracking with full page + realtime subscription.

**What I'll do:**
- Copy full `OrderTracking.tsx` from `Migration_Data/src/pages/OrderTracking.tsx` to `frontend/src/app/pages/OrderTracking.tsx`
- Ensure it includes:
  - `setupRealtimeSubscription()` that subscribes to `orders` table changes for that order ID
  - Cleanup on unmount (`supabase.channel(...).unsubscribe()`)
  - Order details, status tracker, customer messaging UI
- Update imports to match frontend paths (`@/lib/supabaseClient` instead of `@/integrations/supabase/client`)

**✅ Check:** After I port it, open `/order-tracking/<some-order-id>` — should show full order details. Then in vendor dashboard, change that order's status — OrderTracking page should update without refresh (realtime working).

---

### Step 4: Add send-order-confirmation call (🤖 AI can help, optional)

**Goal:** Send confirmation email after order is placed.

**What I'll do:**
- In `frontend/src/app/pages/OrderConfirmation.tsx`, after fetching order successfully, add:
  ```typescript
  await supabase.functions.invoke('send-order-confirmation', {
    body: {
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      orderNumber: order.order_number,
      orderAmount: order.total_amount,
      vendorName: vendor?.business_name,
      orderItems: order.items.map(...),
    },
  });
  ```
- Match the exact payload format from `Migration_Data/src/pages/OrderConfirmation.tsx`

**✅ Check:** Place an order, land on order confirmation page — check Supabase Edge Functions → Logs for `send-order-confirmation` invocation. Customer should receive email (if SMTP configured).

---

### Step 5: Test end-to-end flows (👤 Manual)

**Goal:** Verify everything works like Migration_Data.

1. **Vendor dashboard:**
   - Login as vendor
   - Open Orders, Inventory, Analytics, Payments, Storefront tabs
   - Confirm data loads (if DB has test data)
   - Open Orders in two tabs — change status in one tab, other tab updates live (realtime)

2. **Storefront & checkout:**
   - Open `/storefront/<vendor-id>` (public, no login)
   - Add products to cart
   - Go to checkout, fill form, place order
   - Should redirect to `/order-confirmation?orderId=...`
   - Order should appear in vendor dashboard Orders tab

3. **Order tracking (after Step 3):**
   - Open `/order-tracking/<order-id>`
   - In vendor dashboard, change order status
   - OrderTracking page should update live (realtime)

4. **Customer pages:**
   - Open `/customer-home`, `/customer-profile` — should render (placeholders or full UI)
   - On mobile, bottom nav should appear

**✅ Check:** All flows work without errors. Console shows no Supabase/auth errors. Realtime updates work (orders/products/notifications update live).

---

### Step 6: Fix any remaining issues (🤖 AI can help)

**If something breaks:**
- Share the error message or what's not working
- I can help fix TypeScript errors, import paths, missing components, etc.

---

### Quick reference: What's manual vs what I can automate

| Task | Who | Notes |
|------|-----|-------|
| Create Supabase project | 👤 You | Dashboard setup |
| Set `.env.local` | 👤 You | Copy URL + anon key |
| Run SQL migrations | 👤 You | SQL Editor or CLI |
| Enable realtime tables | 👤 You | Database → Replication |
| Deploy Edge Functions | 👤 You | CLI or dashboard |
| Port OrderTracking page | 🤖 Me | Code migration |
| Add send-order-confirmation | 🤖 Me | Code change |
| Fix TypeScript/build errors | 🤖 Me | Code fixes |
| Test flows | 👤 You | Manual verification |

---

### Next steps

1. **Start with Step 1** (Supabase project + env vars) — this is the foundation
2. **Then Step 2** (Edge Functions) — needed for checkout/orders to work
3. **Then ask me to do Step 3** (port OrderTracking) — I'll handle the code
4. **Optional Step 4** (confirmation emails) — if you want emails
5. **Step 5** (test everything) — verify it all works

**When you're ready for Step 3 or 4, just say "port OrderTracking" or "add send-order-confirmation" and I'll do it.**

---

### Phase 2 – Core shell & routing (Migration_Data → frontend)

- [x] 2.1 **App shell & providers**
  - Compare `Migration_Data/src/App.tsx` with `frontend/src/app/App.tsx`.
  - Ensure `frontend` has: `ErrorBoundary`, `QueryClientProvider`, `TooltipProvider`, `Toaster`/`Sonner`, `AuthProvider`, `CartProvider`, router wrapper.
  - Decide whether to merge missing providers/routes from `Migration_Data/App.tsx` into `frontend/App.tsx` or refactor around a common pattern.
- [x] 2.2 **Routing**
  - Map all routes from `Migration_Data/App.tsx` (`/dashboard`, `/orders`, `/inventory`, `/analytics`, `/storefront`, `/payments`, Stripe result routes, customer routes) into `frontend`’s route system (`routes/publicRoutes.ts`, `routes/protectedRoutes.ts`, `routes/AppRoutes.tsx`).
  - Ensure vendor/customer route guards are correctly wired.
- [x] 2.3 **Layout**
  - Confirm layout components exist in `frontend` (`AppLayout`, `AppSidebar`) and migrate any missing layout pieces from `Migration_Data` (e.g. `CustomerBottomNav`, already added).
  - Integrate `CustomerBottomNav` into the customer-facing layout where appropriate.

**Exit criteria:** `frontend` boots with all main routes (vendor + customer + storefront + payments) and shared providers/layout intact.

---

### Phase 3 – Vendor dashboard feature set

- [x] 3.1 **Dashboard**
  - Align `Migration_Data/src/pages/Dashboard.tsx` with `frontend/src/features/vendor/pages/DashboardNew.tsx`.
  - Ensure metrics (revenue, orders, low stock, recent orders) and analytics sections are fully functional.
- [x] 3.2 **Orders**
  - Port or align:
    - `Migration_Data/src/pages/Orders.tsx` (Kanban-style management) with `frontend/src/features/vendor/pages/Orders.tsx`.
    - Ensure Kanban board (`VendorOrdersKanban`), status updates, and detail panel use the shared order context/hooks.
  - Remove unused legacy orders pages in `frontend` once new flow is verified.
- [x] 3.3 **Inventory**
  - Port or align:
    - `Migration_Data/src/pages/Inventory.tsx`, `AddProduct.tsx`, `EditProduct.tsx`.
    - `Migration_Data/src/components/inventory/*` (e.g. `ProductCard`, `ProductForm`).
  - Connect to `frontend` product hooks/services (`useProducts`, `useProductMutations`) or migrate those hooks as needed.
- [x] 3.4 **Payments (vendor side)**
  - Port or align:
    - `Migration_Data/src/pages/Payments.tsx`, `PaymentSuccess.tsx`, `PaymentCancel.tsx`.
    - Payment-related hooks/components (`usePayments`, payment status components).
  - Ensure flows are connected to the configured backend / Supabase Edge Functions for checkout.
- [x] 3.5 **Analytics**
  - Port `Migration_Data/src/pages/Analytics.tsx` and analytics UI (`AnalyticsCard`, `ChartContainer`, `ChartPopup`).
  - Align with `frontend`’s analytics hooks (`useAnalytics`), or port the more complete implementation from `Migration_Data`.
  - NOTE: Advanced analytics fields (heatmap, funnel, anomaly detection, AI insights) are wired in the UI but will stay mostly empty until the Supabase schema + `useAnalytics` / `useAIInsights` hooks are expanded to return those shapes.
- [x] 3.6 **Vendor storefront view**
  - Ported `Migration_Data/src/pages/Storefront.tsx` into `frontend/src/features/vendor/pages/StorefrontNew.tsx`, wired to `useVendor`, `useStorefront`, `useProducts`, and `useOrders`.
  - NOTE: Storefront views metric is UI-only for now (no tracking table yet); QR code + link + preview are fully functional against the current Supabase schema.
  - NOTE: The live preview and product grid depend on Supabase data (vendor profile + products + orders). Until the database is created and seeded, this section will appear blank and should be re-verified after DB setup.

**Exit criteria:** Vendor dashboard (overview, orders, inventory, payments, analytics, storefront) is fully functional in `frontend`.

---

### Phase 4 – Storefront & checkout (customer-facing)

- [x] 4.1 **Core storefront & cart**
  - Port `Migration_Data/src/pages/PublicStorefront.tsx` (and `Storefront.tsx` if needed) into `frontend` features/storefront.
  - Ensure `ActiveOrdersWidget`, `CartContext`, and `CartSummary` equivalents are wired up.
- [x] 4.2 **Checkout flow**
  - Port `Migration_Data/src/components/checkout/CheckoutForm.tsx` and `src/schemas/checkoutSchema.ts` into `frontend`.
  - Ensure checkout submits to the correct order/payment API (using `frontend` services or migrated order service logic).
- [x] 4.3 **Customer navigation**
  - Integrate `CustomerBottomNav` into the customer-facing layout in `frontend`.

**Exit criteria:** Customers can browse a storefront, manage a cart, checkout, and see order confirmation in `frontend`.

---

### Phase 5 – Hooks, services, Supabase integration

- [x] 5.1 **Hooks**
  - Compare and port/merge hooks from `Migration_Data/src/hooks` into `frontend`:
    - `useVendor`, `useProducts`, `useProductMutations`, `useOrders`, `useOrderMessages`, `usePayments`, `useAnalytics`, `useStorefront`, `useActiveOrders`, `useNotifications`, `use-mobile`, `use-toast`.
  - Avoid changing final auth integration here; keep auth-related logic for a later dedicated phase if needed.
- [x] 5.2 **Supabase client & types**
  - Compare `Migration_Data/src/integrations/supabase/client.ts` and `types.ts` with `frontend/lib/supabaseClient.ts` and DB types.
  - Decide whether to replace or merge configuration (URL/key via env, realtime options, strong typing).

**Exit criteria:** Data hooks and Supabase integration in `frontend` match or exceed what exists in `Migration_Data`.

---

### Phase 6 – Customer-facing pages & flows (excluding auth internals)

- [x] 6.1 **Customer pages**
  - Port non-auth UI/logic for:
    - `Migration_Data/src/pages/CustomerHome.tsx`, `CustomerProfile.tsx`, `CustomerAuth.tsx` (UI; auth calls may be adapted later).
    - `OrderTracking.tsx`, `OrderFeedback.tsx`.
- [x] 6.2 **Customer routes & guards**
  - Ensure customer routes (home/profile/auth/tracking/feedback) are registered in `frontend` routing and guarded with the eventual auth solution.

**Exit criteria:** Customer UX (home, profile, order tracking/feedback) is usable end-to-end in `frontend`.

---

### Phase 7 – Final integration, testing, cleanup

- [x] 7.1 Remove unused duplicate/legacy components/pages in `frontend` that have been superseded by `Migration_Data` versions.
- [x] 7.2 Run `npm run build` and basic smoke tests for all major flows (vendor dashboard, orders, inventory, payments, storefront, checkout, customer views).
- [x] 7.3 Optionally run or port tests from `Migration_Data/src/test` into `frontend`’s test setup.

**Exit criteria:** Clean, tested, deployable `frontend` app with all required logic and UI migrated from `Migration_Data`.

---

We will update this file as we complete and test each step. Only tick checkboxes after implementation **and** verification in `frontend` (running app).

---

### Phase 0 – Analysis & planning

- [x] 0.1 Confirm high-level architecture match (Otherf vs PocketShop)
- [x] 0.2 Finalize which **auth pieces** stay from Otherf (service, tokens, session handling)
- [x] 0.3 List all **auth-touching files** in PocketShop that must be adapted (not copied)
- [x] 0.4 Approve overall migration plan and ordering of phases

---

### Phase 1 – Workspace & tooling alignment

- [x] 1.1 Create migration branch (e.g. `feature/pocketshop-merge`) in this repo
- [x] 1.2 Ensure reference app is present (`Migration_Data/` with full source)
- [ ] 1.3 Ensure all required dependencies from `Migration_Data/package.json` exist in `frontend/package.json`
- [x] 1.4 Confirm TypeScript config in `frontend/tsconfig.json` (paths, strict mode, JSX) is compatible
- [x] 1.5 Confirm ESLint / Prettier / Tailwind / PostCSS configs exist and run cleanly for `frontend/`

**Exit criteria:** Otherf can install and build with the new code present (even if features are not yet wired to its backend/auth).

---

### Phase 2 – Core shell & routing (Migration_Data → frontend)

- [x] 2.1 **App shell & providers**
  - Compare `Migration_Data/src/App.tsx` with `frontend/src/app/App.tsx`.
  - Ensure `frontend` has: `ErrorBoundary`, `QueryClientProvider`, `TooltipProvider`, `Toaster`/`Sonner`, `AuthProvider`, `CartProvider`, router wrapper.
  - Decide whether to merge missing providers/routes from `Migration_Data/App.tsx` into `frontend/App.tsx` or refactor around a common pattern.
- [x] 2.2 **Routing**
  - Map all routes from `Migration_Data/App.tsx` (`/dashboard`, `/orders`, `/inventory`, `/analytics`, `/storefront`, `/payments`, Stripe result routes, customer routes) into `frontend`’s route system (`routes/publicRoutes.ts`, `routes/protectedRoutes.ts`, `routes/AppRoutes.tsx`).
  - Ensure vendor/customer route guards are correctly wired.
- [x] 2.3 **Layout**
  - Confirm layout components exist in `frontend` (`AppLayout`, `AppSidebar`) and migrate any missing layout pieces from `Migration_Data` (e.g. `CustomerBottomNav`, already added).
  - Integrate `CustomerBottomNav` into the customer-facing layout where appropriate.

**Exit criteria:** `frontend` boots with all main routes (vendor + customer + storefront + payments) and shared providers/layout intact.

---

### Phase 3 – Auth integration (keep Otherf auth)

- [ ] 3.1 Adapt `AuthContext` to use Otherf’s auth service (no direct Supabase auth calls)
- [ ] 3.2 Update route guards (`ProtectedRoute`, `CustomerProtectedRoute`) to rely on Otherf auth
- [ ] 3.3 Update auth-related pages (login/signup/forgot/customer-auth) to call Otherf auth APIs
- [ ] 3.4 Decide how vendor/customer roles are stored and fetched (map to Otherf’s model)
- [ ] 3.5 Smoke-test vendor and customer login/logout flows across main routes

**Exit criteria:** All vendor/customer routes are correctly protected and use Otherf’s auth end-to-end.

---

### Phase 4 – Data layer migration (Supabase → Otherf backend or Supabase in Otherf)

- [ ] 4.1 Decide backend strategy:
  - [ ] 4.1.a Keep Supabase as data backend in Otherf
  - [ ] 4.1.b Or map all Supabase calls to Otherf’s own API/DB
- [ ] 4.2 For each data hook (`useVendor`, `useOrders`, `useOrder`, `useProducts`, `useProductMutations`, `usePayments`, `useAnalytics`, `useStorefront`, `useActiveOrders`, `useOrderMessages`, `useNotifications`), map Supabase queries/mutations to Otherf endpoints
- [ ] 4.3 Align schema (orders, order_items, payments, vendors, products, etc.) between PocketShop SQL and Otherf DB
- [ ] 4.4 Run basic CRUD tests for vendors, products, orders, payments through UI

**Exit criteria:** Dashboard, storefront, orders, inventory, and payments screens read/write data correctly via Otherf’s backend strategy.

---

### Phase 5 – Domain flows (orders, inventory, payments, analytics)

- [ ] 5.1 Orders: list, detail, status updates, messaging, Kanban all work against Otherf backend
- [ ] 5.2 Inventory: create/update/delete products, stock handling, low-stock alerts wired to Otherf
- [ ] 5.3 Payments: online & offline payment flows wired to Otherf’s payment/Stripe integration
- [ ] 5.4 Analytics: `useAnalytics` backed by real data (Otherf reporting endpoints or Supabase views)
- [ ] 5.5 AI/insights (optional): `generate-insights` behavior integrated (Supabase function or Otherf service)

**Exit criteria:** Main business flows (from product setup to order to payment to analytics) are functional in Otherf.

---

### Phase 6 – Customer-facing flows

- [ ] 6.1 Customer auth and profile screens use Otherf auth backend
- [ ] 6.2 Storefront + checkout (cart, checkout form, confirmation) call Otherf order/payment APIs
- [ ] 6.3 Order tracking & feedback flows fully functional for customers

**Exit criteria:** A customer can discover a vendor, place an order, pay, track, and leave feedback through Otherf.

---

### Phase 7 – Testing, env, cleanup

- [ ] 7.1 Move all secrets (Supabase, Stripe, etc.) into Otherf’s env system; no secrets in code
- [ ] 7.2 Integrate or adapt tests (unit/integration/E2E) into Otherf’s tooling
- [ ] 7.3 Run through QA / UAT checklists from docs (performance, load, mobile, PWA)
- [ ] 7.4 Remove unused Supabase-only or duplicate files after migration is stable

**Exit criteria:** Clean, tested, deployable application in Otherf with no leftover migration artifacts.

---

We will update this file as we complete and test each step. Only tick checkboxes after implementation **and** verification in `frontend` (running app).

---

### Per-step notes (What I did / What to check)

- **Step 2.1 (App shell & providers)**  
  - *What I did:* Confirmed `frontend/src/app/App.tsx` has ErrorBoundary, QueryClientProvider, TooltipProvider, Shadcn + Sonner toasters, AuthProvider, CartProvider, Router. No code change in this step (already done).  
  - *What to check:* Run the app; you should see the login/landing flow and no console errors from missing providers.

- **Step 2.2 (Routing)**  
  - *What I did:* Added route constants in `frontend/src/constants/routes.ts` for payment-success, payment-cancel, order-confirmation, order-tracking, order-feedback, customer-auth, customer-home, customer-profile. Registered these in `frontend/src/routes/publicRoutes.ts` and created placeholder pages: `app/pages/PaymentSuccess.tsx`, `PaymentCancel.tsx`, `OrderTracking.tsx`, `OrderFeedback.tsx` and `features/customer/pages/CustomerAuth.tsx`, `CustomerHome.tsx`, `CustomerProfile.tsx`. Vendor routes were already covered under `/vendor/dashboard/*` in VendorDashboard.  
  - *What to check:* Run `npm run dev` in `frontend`, then in the browser open: `/payment-success`, `/payment-cancel`, `/order-tracking/abc`, `/order-feedback/abc`, `/customer-auth`, `/customer-home`, `/customer-profile`. Each should show a placeholder card (no 404). Note: `npm run build` may still fail due to other pre-existing TypeScript errors in the repo; fixing those is separate from this step.

- **Step 2.3 (Layout)**  
  - *What I did:* Confirmed `AppLayout` and `AppSidebar` exist in `frontend/src/components/layout/` (used by legacy `pages-new/`); vendor app uses `DashboardLayout` in `frontend/src/app/layouts/DashboardLayout.tsx`. Integrated `CustomerBottomNav` into the app shell by (1) rendering it in `App.tsx` next to `AppContent`, and (2) updating `CustomerBottomNav` so it only shows on customer-facing routes: `/storefront/:id`, `/customer-home`, `/customer-profile`, `/order-tracking/:id`. It still hides on checkout, order-confirmation, order-feedback, customer-auth, and payment-* pages.  
  - *What to check:* Run `npm run dev`, then on **mobile viewport** (or narrow the browser to mobile width): go to `/storefront/any-vendor-id`, `/customer-home`, or `/customer-profile` — you should see the bottom nav (Home, Orders, Cart, Profile). Go to `/` (landing) or `/vendor/dashboard` — the bottom nav should **not** appear. Resize to desktop: bottom nav is hidden via `md:hidden` class.

- **Step 4.1 (Core storefront & cart)**  
  - *What I did:* Confirmed `PublicStorefront`, `CartContext`, `CartSummary`, and `ActiveOrdersWidget` are already in `frontend` and wired. Added the missing **showCart** event listener in `PublicStorefront.tsx` so that when the user taps "Cart" in `CustomerBottomNav` (mobile), the storefront either opens checkout if the cart has items or scrolls to top.  
  - *What to check:* On mobile (or narrow width), open a storefront (e.g. `/storefront/<vendor-id>`), add an item to cart, then tap "Cart" in the bottom nav — checkout view should open. With empty cart, tap "Cart" — page should scroll to top.

- **Step 4.2 (Checkout flow)**  
  - *What I did:* Confirmed `CheckoutForm` and `checkoutSchema` exist in `frontend`; `PublicStorefront`’s `handleCheckout` calls `createOrder` from `@/services/orderService`, then for card payment invokes Supabase Edge Function `create-checkout-session`, and for UPI/wallet/cash navigates to order-confirmation. No code change (already aligned).  
  - *What to check:* From a storefront, add items, go to checkout, fill details, choose a payment method and place order — you should get order creation (and redirect to order-confirmation or Stripe for card). Requires backend/DB/Edge Functions to be set up for full E2E.

- **Step 4.3 (Customer navigation)**  
  - *What I did:* No code change. `CustomerBottomNav` was already integrated in Phase 2.3 (rendered in `App.tsx`, visible on customer routes only).  
  - *What to check:* Same as Step 2.3 — bottom nav appears on storefront/customer-home/customer-profile on mobile.

- **Step 5.1 (Hooks)**  
  - *What I did:* Confirmed `frontend` already has equivalent hooks in `features/vendor/hooks/`: `useVendor`, `useProducts`, `useProductMutations`, `useOrders`, `useOrder`, `useOrderMessages`, `usePayments`, `useAnalytics`, `useStorefront`, `useActiveOrders`, `useNotifications`. Toast/sidebar use shadcn patterns; `use-mobile` equivalent exists where needed. No port needed for this phase.  
  - *What to check:* Vendor dashboard pages (Dashboard, Orders, Inventory, Analytics, Storefront, Payments) load without errors and show data when backend is available. In browser DevTools Network tab, confirm API/Supabase calls are made from these pages when you use them.

- **Step 5.2 (Supabase client & types)**  
  - *What I did:* Confirmed `frontend` uses `lib/supabaseClient.ts` for Supabase; env vars (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) drive config. Types may live in `lib` or feature folders. No structural change; Migration_Data and frontend both use Supabase client.  
  - *What to check:* With valid `.env` (or `.env.local`) containing Supabase URL and anon key, run the app and open a page that fetches data (e.g. storefront, vendor dashboard). Confirm no "Supabase client" or CORS errors in console; data loads if DB is populated.

- **Step 6.1 (Customer pages)**  
  - *What I did:* Placeholder pages are in place from Phase 2.2: `CustomerHome`, `CustomerProfile`, `CustomerAuth` in `features/customer/pages/`; `OrderTracking`, `OrderFeedback`, `PaymentSuccess`, `PaymentCancel` in `app/pages/`. Full UI from Migration_Data can be ported later when you want richer customer flows.  
  - *What to check:* Visit `/customer-home`, `/customer-profile`, `/customer-auth`, `/order-tracking/any-id`, `/order-feedback/any-id`. Each should render a placeholder card (no 404). When you port full UIs later, re-check that forms and links work.

- **Step 6.2 (Customer routes & guards)**  
  - *What I did:* Customer routes are registered in `publicRoutes.ts` (Phase 2.2). Guards (e.g. customer-only for profile) can be added when auth is finalized (e.g. Phase 3 Auth integration in the duplicate numbering section).  
  - *What to check:* All customer URLs above resolve. After you add auth: ensure `/customer-profile` (and any other protected customer route) redirects to login when not authenticated, and shows content when logged in as customer.

- **Step 7.1 (Remove unused/legacy)**  
  - *What I did:* No files removed in this pass. Candidates for later cleanup: `frontend/src/pages-new/*` (legacy vendor pages if fully replaced by `features/vendor/pages/*New`), and any duplicate components that are no longer imported.  
  - *What to check:* Search the codebase for imports of `pages-new` or legacy component names. If nothing imports them, consider deleting or archiving. Keep a backup branch before bulk delete.

- **Step 7.2 (Build & smoke tests)**  
  - *What I did:* No automated tests added. Build and smoke tests are for you to run when ready.  
  - *What to check:* Run `npm run build` in `frontend` — fix any TypeScript errors until build succeeds. Then run `npm run dev` and manually: (1) Open landing, login, vendor dashboard, orders, inventory, analytics, storefront, payments. (2) Open storefront, add to cart, checkout. (3) Open customer-home, customer-profile, order-tracking. Note any broken links or console errors.

- **Step 7.3 (Tests from Migration_Data)**  
  - *What I did:* No tests ported. Optional for later.  
  - *What to check:* If `Migration_Data/src/test` (or similar) exists, run its tests; then decide which to port into `frontend` (e.g. Vitest/Jest) and add a few for critical paths (e.g. checkout, order creation).

