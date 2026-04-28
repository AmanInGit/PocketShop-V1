# OAuth Google Sign-In Troubleshooting Checklist

Follow this checklist step-by-step to fix OAuth sign-in issues.

---

## ✅ Step 1: Google Cloud Console Configuration

### 1.1 Authorized JavaScript Origins
**Location:** Google Cloud Console → APIs & Services → Credentials → Your OAuth Client

**Must have:**
- `http://localhost:5173` (or your dev port)
- `https://your-domain.com` (for production)

**How to check:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, verify `http://localhost:5173` is listed

**If missing:** Click **"+ Add URI"** and add it.

---

### 1.2 Authorized Redirect URIs
**Must have (exactly these):**
- `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback` ✅ (Supabase callback - keep this)
- `http://localhost:5173/auth/callback` ✅ (Your app callback - add this)

**Remove these (old/incorrect):**
- ❌ `http://localhost:5173/vendor/auth`
- ❌ `http://localhost:5173/vendor/onboarding/stage-1`
- ❌ `http://localhost:5173/vendor/dashboard`

**How to check:**
1. Same page as above
2. Under **Authorized redirect URIs**, verify the two URLs above are present
3. Remove any old URLs

**Save changes** after updating.

---

## ✅ Step 2: Supabase Dashboard Configuration

### 2.1 Site URL
**Location:** Supabase Dashboard → Authentication → URL Configuration

**Must match your dev server port:**
- If app runs on port **5173**: `http://localhost:5173`
- If app runs on port **3000**: `http://localhost:3000`

**How to check:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Check **Site URL** matches your dev server port

---

### 2.2 Redirect URLs
**Must include:**
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/**` (wildcard for all paths)

**How to check:**
1. Same page as above
2. Under **Redirect URLs**, verify both URLs are listed
3. If missing, click **"+ Add URL"** and add them

**Save changes** after updating.

---

### 2.3 Google Provider Enabled
**Location:** Supabase Dashboard → Authentication → Providers

**Must be enabled:**
1. Go to **Authentication** → **Providers**
2. Find **Google** provider
3. Toggle it **ON**
4. Enter your **Client ID** and **Client Secret** from Google Cloud Console
5. **Save**

**If you don't have Client ID/Secret:**
- Go to Google Cloud Console → Credentials
- Copy the **Client ID** (visible)
- Click **"+ Add secret"** if no secret exists, or view existing secret
- Copy both to Supabase

---

## ✅ Step 3: Environment Variables

**File:** `frontend/.env.local` (create if missing)

**Must have:**
```env
VITE_SUPABASE_URL=https://ovfcyvyavpzkijyfhezp.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**How to verify:**
1. Open `frontend/.env.local`
2. Check both variables are set (no quotes, no spaces)
3. Find values in Supabase Dashboard → Project Settings → API

**After changing:** Restart dev server (`npm run dev`)

**Check browser console:** On app load, you should see:
```
Supabase Config: { url: '✓ Set', key: '✓ Set' }
```

If you see `✗ Missing`, env vars aren't loaded. Restart dev server.

---

## ✅ Step 4: Code Verification

### 4.1 Auth Service Redirect
**File:** `frontend/src/features/auth/services/authService.ts`

**Line 47 should be:**
```typescript
redirectTo: `${window.location.origin}/auth/callback`,
```

**Not:**
- ❌ `redirectTo: ${window.location.origin}/login`
- ❌ `redirectTo: ${window.location.origin}/vendor/auth`

---

### 4.2 Route Exists
**File:** `frontend/src/routes/publicRoutes.ts`

**Should have:**
```typescript
{
  path: ROUTES.AUTH_CALLBACK,  // '/auth/callback'
  component: AuthCallbackPage,
  ...
}
```

---

### 4.3 Supabase Client Config
**File:** `frontend/src/lib/supabaseClient.ts`

**Should have:**
```typescript
auth: {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,  // ← Important for OAuth
}
```

---

## ✅ Step 5: Browser Testing

### 5.1 Clear Browser Data
**Before testing:**
1. Open DevTools (F12)
2. Right-click refresh button → **Empty Cache and Hard Reload**
3. Or: **Application** tab → **Clear storage** → **Clear site data**

**Why:** Old sessions/cookies can interfere.

---

### 5.2 Test OAuth Flow
1. Open app at `http://localhost:5173/login`
2. Open **DevTools** → **Console** tab (keep it open)
3. Click **"Sign in with Google"**
4. Complete Google sign-in
5. **Watch the URL** after redirect:
   - ✅ Good: `http://localhost:5173/auth/callback#access_token=...` (has hash)
   - ✅ Good: `http://localhost:5173/auth/callback?code=...` (has query)
   - ❌ Bad: `http://localhost:5173/auth/callback` (no hash/query = no tokens)

---

### 5.3 Check Console Errors
**After clicking "Sign in with Google":**

**Good signs:**
- No errors
- Redirects to Google
- After Google, redirects back to `/auth/callback`

**Bad signs:**
- `redirect_uri_mismatch` → Google redirect URI not configured correctly
- `invalid_client` → Google Client ID/Secret wrong in Supabase
- `access_denied` → User cancelled or OAuth consent screen issue
- `Missing Supabase environment variables` → `.env.local` not loaded

---

### 5.4 Check Network Tab
**After redirect back to app:**

1. Open **DevTools** → **Network** tab
2. Filter by **Fetch/XHR**
3. Look for requests to `*.supabase.co`
4. Check for **red/failed** requests
5. Click failed request → **Response** tab → read error message

**Common errors:**
- `401 Unauthorized` → Supabase anon key wrong
- `404 Not Found` → Supabase URL wrong
- `CORS error` → Site URL mismatch in Supabase

---

## ✅ Step 6: Common Issues & Fixes

### Issue: "redirect_uri_mismatch"
**Fix:** 
- Add `http://localhost:5173/auth/callback` to Google Cloud Console → Authorized redirect URIs
- Make sure it matches **exactly** (no trailing slash, correct port)

---

### Issue: "Sign-in timed out"
**Fix:**
- Check Supabase Redirect URLs includes `http://localhost:5173/auth/callback`
- Check browser console for errors
- Check Network tab for failed Supabase requests
- Try clearing browser cache

---

### Issue: Redirects to login after Google sign-in
**Possible causes:**
1. Session not established → Check Network tab for Supabase errors
2. Email not confirmed → OAuth users should be auto-confirmed (code handles this)
3. Onboarding check fails → Check browser console for errors

**Fix:** Check browser console and Network tab for specific errors.

---

### Issue: Google OAuth button does nothing
**Fix:**
- Check browser console for errors
- Verify Google provider is enabled in Supabase
- Verify Client ID/Secret are correct in Supabase
- Check that `signInWithGoogle()` is called (add `console.log` before the call)

---

## ✅ Step 7: Debug Mode

Add this to `AuthCallbackPage.tsx` temporarily to see what's happening:

```typescript
useEffect(() => {
  console.log('[OAuth] Current URL:', window.location.href);
  console.log('[OAuth] Hash:', window.location.hash);
  console.log('[OAuth] Query:', window.location.search);
  
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('[OAuth] Session:', data.session);
    console.log('[OAuth] Error:', error);
  });
}, []);
```

**What to look for:**
- URL should have `#access_token=...` or `?code=...`
- Session should exist after a few seconds
- No errors in console

---

## ✅ Step 8: Final Checklist

Before testing again, verify:

- [ ] Google Cloud Console: `http://localhost:5173` in JavaScript origins
- [ ] Google Cloud Console: `http://localhost:5173/auth/callback` in Redirect URIs
- [ ] Supabase: Site URL matches dev port (5173 or 3000)
- [ ] Supabase: `http://localhost:5173/auth/callback` in Redirect URLs
- [ ] Supabase: Google provider enabled with correct Client ID/Secret
- [ ] `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Dev server restarted after changing `.env.local`
- [ ] Browser cache cleared
- [ ] Code has `redirectTo: .../auth/callback` (not `/login`)
- [ ] Route `/auth/callback` exists in `publicRoutes.ts`
- [ ] `detectSessionInUrl: true` in `supabaseClient.ts`

---

## 🆘 Still Not Working?

**Collect this info:**
1. Browser console errors (copy all red errors)
2. Network tab → Failed requests → Response tab (copy error message)
3. URL after Google redirect (copy full URL)
4. Supabase Dashboard → Authentication → Users (is user created?)
5. Supabase Dashboard → Logs (any auth errors?)

**Common final fixes:**
- Try incognito/private window (rules out extensions)
- Try different browser
- Check Supabase project isn't paused
- Verify Google OAuth consent screen is published (if required)
