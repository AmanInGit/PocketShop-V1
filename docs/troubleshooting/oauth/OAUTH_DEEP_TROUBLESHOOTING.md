# Deep OAuth Troubleshooting - "Unable to exchange external code"

If Client ID, Secret, and Redirect URIs are all correct but still getting errors, check these:

## 1. OAuth Consent Screen Configuration

**Location:** Google Cloud Console → APIs & Services → OAuth consent screen

### Check:
- **User Type:** Should be "External" (for testing) or "Internal" (if using Google Workspace)
- **Publishing Status:** 
  - If "Testing" → Add your email to "Test users"
  - If "In production" → Should work for all users
- **Scopes:** Should include at least:
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`

### Fix:
1. Go to OAuth consent screen
2. If in "Testing" mode, add your email to "Test users"
3. Or publish the app (if ready)

---

## 2. Regenerate Client Secret

Sometimes secrets get corrupted or there's a sync issue.

### Steps:
1. Google Cloud Console → Credentials → Your OAuth Client
2. Under "Client secrets", click **"+ Add secret"**
3. Copy the NEW secret immediately
4. Go to Supabase → Authentication → Providers → Google
5. Paste the NEW secret
6. Click **Save**
7. **Delete the old secret** (optional, but recommended)

---

## 3. Verify Supabase Project Status

**Check if Supabase project is paused:**
1. Supabase Dashboard → Project Settings → General
2. Check project status - should be "Active"
3. If paused, resume it

---

## 4. Check Supabase Logs

**Location:** Supabase Dashboard → Logs → Auth Logs

Look for:
- Errors related to Google OAuth
- "Invalid client" errors
- "Redirect URI mismatch" errors

---

## 5. Test with Different Browser/Incognito

Sometimes browser extensions or cached data cause issues:
1. Open **Incognito/Private window**
2. Go to `http://localhost:5173/login`
3. Try Google sign-in again

---

## 6. Verify Environment Variables

**Check `.env.local`:**
```env
VITE_SUPABASE_URL=https://ovfcyvyavpzkijyfhezp.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

**Verify:**
- No extra spaces
- No quotes around values
- Correct project URL
- Restart dev server after changes

---

## 7. Check Google Cloud Console API Status

**Location:** Google Cloud Console → APIs & Services → Enabled APIs

**Ensure these are enabled:**
- Google+ API (if still available)
- Or Google Identity Services API

---

## 8. Try Creating a New OAuth Client

If nothing works, create a fresh OAuth client:

1. Google Cloud Console → Credentials → "+ Create Credentials" → OAuth client ID
2. Application type: **Web application**
3. Name: "PocketShop OAuth 2"
4. Authorized JavaScript origins: `http://localhost:5173`
5. Authorized redirect URIs:
   - `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/callback`
6. Create
7. Copy new Client ID and Secret
8. Update Supabase with new credentials
9. Test

---

## 9. Check Network Tab for Actual Error

1. Open DevTools → Network tab
2. Try Google sign-in
3. Look for requests to `accounts.google.com` or `oauth2.googleapis.com`
4. Check response - might show actual error from Google

---

## 10. Verify Supabase Redirect URL Format

In Supabase → Authentication → URL Configuration:

**Redirect URLs should include:**
- `http://localhost:5173/auth/callback`
- `http://localhost:5173/**`

**Site URL should be:**
- `http://localhost:5173`

---

## Most Likely Fixes (in order):

1. ✅ **OAuth Consent Screen** - Add test user or publish
2. ✅ **Regenerate Client Secret** - Create new secret and update Supabase
3. ✅ **Check Supabase Logs** - See actual error from Google
4. ✅ **Try Incognito** - Rule out browser issues
5. ✅ **Create New OAuth Client** - Fresh start

---

## Still Not Working?

**Collect this info:**
1. Supabase Dashboard → Logs → Auth Logs (copy any errors)
2. Browser DevTools → Network tab → Filter by "google" → Check failed requests
3. Google Cloud Console → Credentials → Your OAuth Client → Check "Last used" date
4. Try the OAuth flow and note the exact error message
