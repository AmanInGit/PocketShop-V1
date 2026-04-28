# Service Health Monitor

PocketShop depends on several external services. This doc describes how to monitor their health and what to do when something fails.

---

## Services to Monitor

| Service | What it does | Failure impact |
|---------|--------------|----------------|
| **Supabase** | DB, Auth, Realtime, Storage | App unusable |
| **Stripe** | Payments | Checkout fails for card/UPI |
| **Resend** | Order confirmation emails | Emails not sent |
| **Lovable AI Gateway** | AI insights | Analytics insights fail |
| **Frontend hosting** | Serves the app | App unreachable |

---

## Approach 1: Status Pages (Manual)

| Service | Status Page |
|---------|-------------|
| Supabase | https://status.supabase.com |
| Stripe | https://status.stripe.com |
| Resend | https://resend.com/status (or status page) |
| Lovable | Check Lovable docs / support |

Bookmark these and check when users report issues.

---

## Approach 2: Health Check Endpoint (Simple)

Add a simple health check route that pings critical services and returns status.

**Endpoint idea:** `GET /health` or `GET /api/health`

**Checks:**
1. Supabase – `supabase.from('products').select('id').limit(1)` (or lightweight query)
2. Stripe – Optional: `stripe.balance.retrieve()` (requires secret key; better from backend)
3. Resend – Optional: test API (requires API key; better from Edge Function)

**Recommendation:** Start with Supabase only from the frontend (anon key is public anyway). Stripe/Resend checks should run server-side (Edge Function) if you want full coverage.

---

## Approach 3: Admin Health Page (UI)

Create an admin-only page (e.g. `/vendor/health` or `/admin/health`) that:

- Calls a simple Edge Function `health-check` that:
  - Queries Supabase (DB reachable)
  - Optionally checks Stripe (if key set)
  - Optionally checks Resend (if key set)
  - Returns JSON: `{ supabase: "ok", stripe: "ok", resend: "ok" }`
- Renders green/red indicators per service
- Shows last checked timestamp

**When to use:** After migration is stable, for ops visibility.

---

## Approach 4: Minimal Frontend-Only Check

No backend changes. In the app:

- On load or in a debug panel, call `supabase.from('products').select('id').limit(1)`
- If it fails → show a banner: "We're having connectivity issues. Please try again."
- Optionally: retry or offline indicator

---

## Quick Start: What to Do Now

1. **Immediate:** Bookmark Supabase and Stripe status pages.
2. **Optional:** Add a simple "Supabase reachable" check in `App.tsx` or a `HealthCheck` component that runs once on mount and shows a warning if Supabase is unreachable.
3. **Later:** Implement full admin health page + Edge Function when you need deeper visibility.

---

## Example: Simple Supabase Health Check (Frontend)

```ts
// Simple check - no new files, just add where needed
const checkSupabase = async () => {
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};
```

Use this to show a banner or disable critical UI when Supabase is down.
