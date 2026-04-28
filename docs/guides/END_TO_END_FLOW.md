# PocketShop End-to-End Flow

> **Purpose:** Map the complete application flow for bug hunting and QA.

---

## 1. Application Bootstrap

```
main.tsx → App.tsx → Router → AuthProvider → CartProvider → AppContent → AppRoutes
```

- **Entry:** `frontend/src/app/main.tsx` renders `App`
- **Providers (order matters):** QueryClient → Router → AuthProvider → CartProvider
- **Auth init:** AuthContext calls `supabase.auth.getSession()` and `loadVendorProfile()` (10s timeout)
- **Loading:** `LoadingScreen` shown until auth check completes
- **Routing:** Routes generated from `publicRoutes`, `onboardingRoutes`, `protectedRoutes`

---

## 2. Public User Flow (Customer)

### 2.1 Landing Page (`/`)
- **File:** `frontend/src/app/pages/LandingPage.tsx`
- Search locations (Google Places), city discovery, "For Business" CTA → `/business`
- PWA install prompt (if available)

### 2.2 Business Landing Page (`/business`)
- **File:** `frontend/src/app/pages/BusinessLandingPage.tsx`
- If **logged in + email confirmed:** redirects via `getOnboardingRedirectPath()` → dashboard or onboarding stage 1
- If **logged in + email NOT confirmed:** stays on page (no redirect)
- CTAs: "Sign In" → `/login`, "Get Started" → `/register`

### 2.3 Public Storefront (`/storefront/:vendorId`)
- **File:** `frontend/src/features/storefront/pages/PublicStorefront.tsx`
- Fetches vendor + products from Supabase
- Cart (CartContext), checkout (CheckoutForm), guest/customer checkout
- **Data:** `vendor_profiles`, `products` (by vendor_id)

### 2.4 Order Confirmation (`/order-confirmation`)
- **File:** `frontend/src/app/pages/OrderConfirmation.tsx`
- Lazy-loaded; typically reached after checkout

---

## 3. Auth Flow (Vendor)

### 3.1 Login (`/login`)
- **File:** `frontend/src/features/auth/pages/LoginPage.tsx`
- **Guarded by:** `AuthRouteGuard` (redirects away if already logged in + confirmed)
- **Methods:** Email/password, Google OAuth, Phone OTP
- **Post-login redirect:** `getRedirectPath(userId)` → checks `location.state.from` or `getOnboardingRedirectPath()`

**AuthRouteGuard logic:**
1. Not logged in → show login/register
2. Logged in but email not confirmed → show login (do NOT redirect)
3. Logged in + confirmed → DB check → redirect to dashboard or onboarding stage 1

### 3.2 Register (`/register`)
- **File:** Same `LoginPage.tsx` with `mode: 'register'`
- **Form:** businessName, email, mobileNumber, password, confirmPassword
- **On submit:** `signUp()` → Supabase `auth.signUp` with `emailRedirectTo: /vendor/onboarding/stage-1`
- **If email confirmation required:** shows `RegisterConfirm` component
- **If no confirmation needed:** redirects via `getRedirectPath(user.id)`
- **Storage:** `localStorage.pendingVendorProfile` (businessName, mobileNumber, email)

### 3.3 Register Confirm (post-registration)
- **File:** `frontend/src/features/auth/components/RegisterConfirm.tsx`
- Resend confirmation email
- "Continue to Login" → `/login`
- **Note:** After user confirms email, Supabase redirects to `emailRedirectTo` (stage 1)

### 3.4 OAuth & OTP
- **Google:** `signInWithGoogle()` → redirects to `/login` after OAuth
- **Phone OTP:** `sendOTP()` → `verifyOTP()` → redirect via `getRedirectPath()`

---

## 4. Onboarding Flow (Vendor)

### 4.1 Route Protection
- **Component:** `OnboardingProtectedRoute`
- **File:** `frontend/src/features/common/components/shared/OnboardingProtectedRoute.tsx`
- **Logic:**
  - Not logged in → redirect to `/login` with `state.from`
  - Email not confirmed → redirect to `/login` with `message: 'confirm_email'`
  - Uses `onboardingStatus` from AuthContext (cached) or fetches from `vendor_profiles.onboarding_status`
  - Stage validation: Stage 2 needs stage 1 complete, etc.
  - If onboarding completed → redirect to dashboard

### 4.2 Onboarding Status Values
```
incomplete → basic_info → operational_details → planning_selected → completed
```
- **basic_info** = Stage 1 done
- **operational_details** = Stage 2 done
- **planning_selected** = Stage 3 done
- **completed** = All done

### 4.3 Stage 1 (`/vendor/onboarding/stage-1`)
- **File:** `frontend/src/features/vendor/onboarding/stage-1/OnboardingStage1.tsx`
- **Form:** restaurantName, ownerName, restaurantType, businessCategory
- **DB:** Creates or updates `vendor_profiles`, sets `onboarding_status: 'basic_info'`
- **Context:** `useOnboarding()`, `setOnboardingStatus('basic_info')`
- **Next:** `navigate(ROUTES.VENDOR_ONBOARDING_STAGE_2)`

### 4.4 Stage 2 (`/vendor/onboarding/stage-2`)
- **File:** `OnboardingStage2.tsx`
- **Form:** address, city, state, postalCode, country, workingDays, operationalHours
- **DB:** Updates `vendor_profiles`, sets `onboarding_status: 'operational_details'`
- **Next:** Stage 3

### 4.5 Stage 3 (`/vendor/onboarding/stage-3`)
- **File:** `OnboardingStage3.tsx`
- **Form:** Plan selection (free/pro)
- **DB:** Updates `vendor_profiles.metadata.selected_plan`, `onboarding_status: 'planning_selected'`
- **Next:** Completion

### 4.6 Completion (`/vendor/onboarding/completion`)
- **File:** `OnboardingCompletion.tsx`
- **Form:** Terms acceptance
- **DB:** Updates `onboarding_status: 'completed'`, `is_active: true`
- **Post-complete:** `setOnboardingStatus('completed')`, `window.location.href = ROUTES.VENDOR_DASHBOARD`

---

## 5. Dashboard Flow (Vendor)

### 5.1 Dashboard Entry (`/vendor/dashboard/*`)
- **Route:** Protected with `requiresAuth: true`, `requiresOnboarding: true`
- **File:** `frontend/src/features/vendor/pages/VendorDashboard.tsx`
- **Guards:** Redirects to login if not authenticated; to onboarding stage 1 if onboarding incomplete
- **Uses:** Cached `onboardingStatus` from AuthContext when available

### 5.2 Sub-routes (internal)
- Overview: `Dashboard` (DashboardOverview)
- Orders: `Orders`
- Inventory: `Inventory`, `AddProduct`, `EditProduct`
- Insights: `Analytics`
- Storefront: `Storefront`
- Payouts: `Payouts`
- Settings: `Settings`

---

## 6. Backend / Data

### 6.1 Supabase
- **Client:** `frontend/src/lib/supabaseClient.ts`
- **Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Auth:** persistSession, autoRefreshToken, detectSessionInUrl

### 6.2 Key Tables
- `vendor_profiles` – business info, onboarding_status
- `auth.users` – Supabase auth
- `user_roles` – vendor/customer
- `products`, `orders`, etc.

### 6.3 Triggers (docs/database/triggers.sql)
- `handle_new_vendor()` – On auth.users INSERT with user_type=vendor → create vendor_profile
- Uses `raw_user_meta_data->>'mobile_number'`, `->>'business_name'`, etc.
- **Default mobile_number:** `''` if not provided

---

## 7. Redirect Logic Summary

| Scenario | Redirect To |
|----------|-------------|
| Not logged in, hit protected route | `/login` + state.from |
| Logged in, email not confirmed, hit protected | `/login` + message: confirm_email |
| Logged in, confirmed, onboarding incomplete | `/vendor/onboarding/stage-1` |
| Logged in, confirmed, onboarding complete | `/vendor/dashboard` |
| Logged in, hit /login or /register | Same as above (AuthRouteGuard) |
| Onboarding stage 2 without stage 1 done | `/vendor/onboarding/stage-1` |
| Onboarding stage 3 without stage 2 done | `/vendor/onboarding/stage-2` |
| Completion without all stages done | Appropriate stage |
| Onboarding complete, hit onboarding route | `/vendor/dashboard` |

---

## 8. Known / Potential Bug Areas

### 8.1 `getOnboardingRedirectPath` – Always returns stage 1 for incomplete
- **File:** `frontend/src/features/common/utils/onboardingCheck.ts`
- **Issue:** For `basic_info`, `operational_details`, `planning_selected`, it returns `ROUTES.VENDOR_ONBOARDING_STAGE_1` instead of the actual next stage.
- **Impact:** User who completed stage 1 logs in → sent to stage 1 again (must click "Next" to reach stage 2).
- **Fix idea:** Return stage 2/3/completion based on status.

### 8.2 `mobile_number` UNIQUE + empty string
- **Schema:** `vendor_profiles.mobile_number TEXT NOT NULL UNIQUE`
- **Trigger:** Inserts `COALESCE(..., '')` when not provided.
- **OnboardingStage1:** Creates profile with `mobile_number: ''`.
- **Issue:** Only one vendor can have `''`. Second vendor with no mobile would violate UNIQUE.
- **Mitigation:** Register form requires mobile; trigger may fail on edge cases.

### 8.3 Protected routes without OnboardingProtectedRoute
- **File:** `frontend/src/utils/routeHelpers.tsx`
- **Issue:** Routes with `requiresAuth: true` but no `onboardingStage` or `requiresOnboarding` are NOT wrapped in OnboardingProtectedRoute. Currently only dashboard has `requiresOnboarding: true`, so this may be OK. Double-check any new protected routes.

### 8.4 OAuth redirect URL mismatch
- **File:** `frontend/src/features/auth/services/authService.ts`
- **Line:** `redirectTo: \`${window.location.origin}/login\``
- **Note:** ROUTES.LOGIN is `/login` – matches. But if base path changes, this could break.

### 8.5 `window.location.href` vs `navigate()`
- **OnboardingCompletion:** Uses `window.location.href = ROUTES.VENDOR_DASHBOARD` (full reload).
- **Others:** Use `navigate(redirectPath)`.
- **Impact:** Full reload clears React state; ensures fresh auth/onboarding read. May be intentional.

### 8.6 Debug logging in production
- **OnboardingProtectedRoute:** Multiple `console.log` statements.
- **AuthContext, LoginPage, etc.:** Various `console.log`.
- **Recommendation:** Gate behind `import.meta.env.DEV` or remove for production.

### 8.7 VendorDashboard double-check
- **VendorDashboard** re-checks onboarding and redirects to stage 1.
- **OnboardingProtectedRoute** already does this for the route.
- **Risk:** Redundant; potential for brief flash of loading/redirect if both run.

### 8.8 `planning_selected` vs `completed` in mapStatusToStages
- **File:** `OnboardingProtectedRoute.tsx`
- **Logic:** `planning_selected` is treated as all 3 stages complete (stage3Completed: true).
- **Completion page:** Sets status to `completed` only after terms accepted.
- **So:** User can reach completion page with `planning_selected`; completion page then sets `completed`. Flow is correct.

---

## 9. Files to Focus On for Bug Hunting

| Area | Key Files |
|------|-----------|
| Auth | AuthContext.tsx, LoginPage.tsx, AuthRouteGuard.tsx, authService.ts |
| Onboarding | OnboardingProtectedRoute.tsx, onboardingCheck.ts, OnboardingStage1/2/3, OnboardingCompletion |
| Routes | routeHelpers.tsx, publicRoutes, protectedRoutes, onboardingRoutes |
| Dashboard | VendorDashboard.tsx, DashboardLayout |
| Storefront | PublicStorefront.tsx, CheckoutForm, CartContext |
| DB | schema.sql, triggers.sql, RLS policies |

---

## 10. Quick Test Checklist

- [ ] Register → confirm email → lands on stage 1
- [ ] Complete stage 1 → lands on stage 2
- [ ] Complete stage 2 → lands on stage 3
- [ ] Complete stage 3 → lands on completion
- [ ] Accept terms on completion → lands on dashboard
- [ ] Log out → hit dashboard → redirects to login
- [ ] Log in with incomplete onboarding → redirects to correct stage (currently stage 1)
- [ ] Log in with complete onboarding → redirects to dashboard
- [ ] Hit /login when logged in → redirects away
- [ ] Hit /register when logged in + confirmed → redirects away
- [ ] OAuth login → redirects correctly
- [ ] Phone OTP login → redirects correctly
- [ ] Public storefront loads for valid vendorId
- [ ] Cart + checkout flow (guest/customer)
- [ ] Email not confirmed → no redirect to dashboard/onboarding
