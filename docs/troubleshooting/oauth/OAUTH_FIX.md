# Fix: "Unable to exchange external code" Error

## Problem
Supabase is returning: `error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code`

This means Supabase can't exchange the Google OAuth code for tokens.

## Solution: Verify Google OAuth Credentials in Supabase

### Step 1: Get Your Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID: `993790013015-k95j2chj71vkjlvlvkrg0t2f167mlumh.apps.googleusercontent.com`
4. **Copy the Client ID** (it's visible)
5. **Copy the Client Secret**:
   - If you see `****|lt0`, click **"+ Add secret"** to create a new one
   - Copy the secret immediately (it's only shown once!)
   - Save it securely

### Step 2: Update Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** provider
5. **Verify/Update these fields:**

   **Client ID (for OAuth):**
   ```
   993790013015-k95j2chj71vkjlvlvkrg0t2f167mlumh.apps.googleusercontent.com
   ```
   - Must match Google Cloud Console exactly

   **Client Secret (for OAuth):**
   ```
   [Paste the secret from Google Cloud Console]
   ```
   - Must be the current/active secret
   - If you created a new secret, use the new one

6. **Toggle "Enabled" to OFF, then back ON** (forces refresh)
7. Click **Save**

### Step 3: Verify Google Cloud Console Redirect URIs

In Google Cloud Console → Your OAuth Client → **Authorized redirect URIs**, ensure you have:

```
https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback
```

**This is the Supabase callback URL** - Google redirects here first, then Supabase redirects to your app.

### Step 4: Test Again

1. **Clear browser cache** (important!)
2. Go to `http://localhost:5173/login`
3. Click "Sign in with Google"
4. Complete Google sign-in
5. Check console - should see session established

---

## Common Issues

### Issue: "Client Secret doesn't match"
**Fix:** Copy the secret from Google Cloud Console again. Make sure:
- No extra spaces
- No quotes
- Complete secret (not truncated)

### Issue: "Redirect URI mismatch"
**Fix:** In Google Cloud Console, ensure:
- `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback` is in **Authorized redirect URIs**
- No trailing slash
- Exact match

### Issue: "Client ID not found"
**Fix:** Verify Client ID in Supabase matches Google Cloud Console exactly:
- `993790013015-k95j2chj71vkjlvlvkrg0t2f167mlumh.apps.googleusercontent.com`
- No extra characters
- Case-sensitive

---

## Quick Checklist

- [ ] Google Cloud Console: Client ID copied
- [ ] Google Cloud Console: Client Secret copied (current/active)
- [ ] Supabase: Client ID matches Google Cloud Console exactly
- [ ] Supabase: Client Secret matches Google Cloud Console exactly
- [ ] Supabase: Google provider Enabled = ON
- [ ] Supabase: Saved changes
- [ ] Google Cloud Console: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback` in Redirect URIs
- [ ] Browser cache cleared
- [ ] Tested again
