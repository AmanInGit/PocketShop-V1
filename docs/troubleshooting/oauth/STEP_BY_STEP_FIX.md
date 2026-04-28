# Step-by-Step OAuth Fix Guide

Follow these steps **in order**. Don't skip any step.

---

## STEP 1: Check Environment Variables

**File:** `frontend/.env.local`

1. Open `frontend/.env.local` (create if missing)
2. Make sure it has:
   ```env
   VITE_SUPABASE_URL=https://ovfcyvyavpzkijyfhezp.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```
3. **No quotes, no spaces** around values
4. Save the file
5. **Restart dev server** (stop and start `npm run dev`)

**✅ Check:** Browser console should show `Supabase Config: { url: '✓ Set', key: '✓ Set' }`

---

## STEP 2: Verify Supabase Site URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Check **Site URL**:
   - Should be: `http://localhost:5173`
   - If different, change it to `http://localhost:5173`
5. Click **Save**

---

## STEP 3: Verify Supabase Redirect URLs

**Still in Supabase → Authentication → URL Configuration:**

1. Scroll to **Redirect URLs** section
2. Check if you have:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/**`
3. **If missing:**
   - Click **"+ Add URL"**
   - Type: `http://localhost:5173/auth/callback`
   - Click **Save**
4. **If already there:** Make sure it's exactly `http://localhost:5173/auth/callback` (no trailing slash)

---

## STEP 4: Verify Google Provider in Supabase

1. Still in Supabase Dashboard
2. Go to **Authentication** → **Providers**
3. Find **Google** provider
4. Check:
   - **Enabled:** Toggle should be **ON** (green)
   - **Client ID (for OAuth):** Should be `993790013015-k95j2chj71vkjlvlvkrg0t2f167mlumh.apps.googleusercontent.com`
   - **Client Secret (for OAuth):** Should be set (shows as `****`)

---

## STEP 5: Get Google Client Secret

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (PocketShop)
3. Go to **APIs & Services** → **Credentials**
4. Click on **"Web client 1"** (your OAuth Client ID)
5. Scroll to **"Client secrets"** section
6. **If you see a secret** (shows as `****|lt0`):
   - Click the eye icon to reveal it
   - Copy it
   - **OR** create a new one (see next step)
7. **If no secret or want fresh one:**
   - Click **"+ Add secret"**
   - Copy the secret **immediately** (only shown once!)
   - Save it somewhere safe

---

## STEP 6: Update Supabase with Google Secret

1. Go back to Supabase Dashboard
2. **Authentication** → **Providers** → **Google**
3. Paste the **Client Secret** you copied from Google Cloud Console
4. **Toggle "Enabled" OFF, then ON** (forces refresh)
5. Click **Save**

---

## STEP 7: Verify Google Cloud Console Redirect URIs

1. Go back to Google Cloud Console
2. **APIs & Services** → **Credentials** → **"Web client 1"**
3. Scroll to **"Authorized redirect URIs"**
4. **Check if you have:**
   ```
   https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback
   ```
5. **If missing:**
   - Click **"+ Add URI"**
   - Paste: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback`
   - Click **Save** (at bottom of page)

---

## STEP 8: Verify Google Cloud Console JavaScript Origins

**Still in Google Cloud Console → Your OAuth Client:**

1. Scroll to **"Authorized JavaScript origins"**
2. **Check if you have:**
   ```
   http://localhost:5173
   ```
3. **If missing:**
   - Click **"+ Add URI"**
   - Type: `http://localhost:5173`
   - Click **Save**

---

## STEP 9: Check OAuth Consent Screen

1. In Google Cloud Console
2. Go to **APIs & Services** → **OAuth consent screen**
3. Check **"Publishing status"**:
   - **If "Testing":**
     - Scroll to **"Test users"**
     - Click **"+ Add users"**
     - Add your email address
     - Click **Save**
   - **If "In production":** You're good

---

## STEP 10: Clear Browser Cache

1. Open your browser
2. Press **Ctrl + Shift + Delete** (or Cmd + Shift + Delete on Mac)
3. Select **"Cached images and files"**
4. Click **Clear data**
5. **OR** use Incognito/Private window

---

## STEP 11: Test OAuth

1. Make sure dev server is running: `npm run dev`
2. Open browser: `http://localhost:5173/login`
3. Open **DevTools** → **Console** tab (keep it open)
4. Click **"Sign in with Google"**
5. Complete Google sign-in
6. **Watch console for:**
   - ✅ Good: `[OAuth Callback] Session found`
   - ❌ Bad: Error messages (note what they say)

---

## STEP 12: If Still Not Working

**Check Supabase Logs:**
1. Supabase Dashboard → **Logs** → **Auth Logs**
2. Look for errors around the time you tried sign-in
3. Note any error messages

**Check Browser Network Tab:**
1. DevTools → **Network** tab
2. Try sign-in again
3. Look for **red/failed** requests
4. Click failed request → **Response** tab
5. Read error message

---

## ✅ QUICK CHECKLIST

Before testing, verify:

- [ ] `.env.local` has correct Supabase URL and key
- [ ] Dev server restarted after `.env.local` changes
- [ ] Supabase Site URL: `http://localhost:5173`
- [ ] Supabase Redirect URLs: `http://localhost:5173/auth/callback`
- [ ] Supabase Google Provider: Enabled = ON
- [ ] Supabase Google Client ID matches Google Cloud Console
- [ ] Supabase Google Client Secret matches Google Cloud Console
- [ ] Google Cloud Redirect URIs: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback`
- [ ] Google Cloud JavaScript Origins: `http://localhost:5173`
- [ ] OAuth Consent Screen: Test user added (if Testing mode)
- [ ] Browser cache cleared

---

## 🆘 COMMON ISSUES

### "Unable to exchange external code"
**Fix:** Regenerate Client Secret (Steps 5-6)

### "redirect_uri_mismatch"
**Fix:** Add Supabase callback URL to Google Cloud Console (Step 7)

### "No tokens in URL"
**Fix:** Check Supabase Redirect URLs (Step 3)

### Timeout
**Fix:** Check all URLs match exactly (no trailing slashes, correct port)

---

**Follow these steps in order. Don't skip any step.**
