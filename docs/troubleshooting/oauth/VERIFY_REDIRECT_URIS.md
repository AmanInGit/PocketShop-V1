# Verify Google Cloud Console Redirect URIs

## Critical Check: Authorized Redirect URIs

Even if Client ID/Secret match, the redirect URIs must be configured correctly.

### Step 1: Open Your OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on **"Web client 1"** (your OAuth Client ID)

### Step 2: Check Authorized Redirect URIs

Scroll down to **"Authorized redirect URIs"** section.

**You MUST have EXACTLY this URL:**
```
https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback
```

**Check:**
- ✅ No trailing slash
- ✅ Exact match (case-sensitive)
- ✅ `https://` not `http://`
- ✅ Full domain: `ovfcyvyavpzkijyfhezp.supabase.co`
- ✅ Path: `/auth/v1/callback`

### Step 3: If Missing, Add It

1. Click **"+ Add URI"** under "Authorized redirect URIs"
2. Paste: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback`
3. Click **Save** (at the bottom of the page)

### Step 4: Also Check Authorized JavaScript Origins

Under **"Authorized JavaScript origins"**, you should have:
```
http://localhost:5173
```

**Note:** This is for your app, not Supabase. Supabase doesn't need this.

---

## Why This Matters

The OAuth flow works like this:

1. User clicks "Sign in with Google" → Goes to Google
2. Google redirects to: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback?code=...`
3. **If this URL is NOT in Google's "Authorized redirect URIs", Google will reject it**
4. Supabase gets the code, exchanges it for tokens
5. Supabase redirects to your app: `http://localhost:5173/auth/callback#access_token=...`

**If step 2 fails (redirect URI not authorized), you get "Unable to exchange external code"**

---

## Quick Checklist

- [ ] Google Cloud Console → Your OAuth Client → Authorized redirect URIs
- [ ] Contains: `https://ovfcyvyavpzkijyfhezp.supabase.co/auth/v1/callback`
- [ ] No other similar URLs (remove old/incorrect ones)
- [ ] Clicked **Save** after checking/adding
- [ ] Cleared browser cache
- [ ] Tested again
