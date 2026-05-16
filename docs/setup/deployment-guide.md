# PocketShop Deployment Guide

This guide describes the intended deployment shape for PocketShop without storing organization-specific URLs, keys, or project identifiers.

## Deployment model

PocketShop is deployed as:

- `frontend/` on a static hosting platform such as Vercel or Cloudflare Pages
- `supabase/` as the backend platform for database, auth, realtime, storage, and Edge Functions

## Cloudflare (Workers Builds)

If your dashboard shows **Build command** and **Deploy command** (required), you are on **Workers Builds**, not classic Pages-only Git deploy.

Use these settings (Workers & Pages → pocketshop → Settings → Build):

| Setting | Value |
|--------|--------|
| Path (root directory) | `frontend` |
| Build command | `npm ci && npm run build` |
| **Deploy command** | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` *(optional; default is fine)* |

Do **not** use `npx wrangler pages deploy dist` — that calls the Pages API and fails with `Authentication error [code: 10000]` unless the token has Pages-only scopes. Use `wrangler deploy` with `frontend/wrangler.toml` (assets + SPA routing).

### API token (fixes code 10000)

In **Settings → Build → API token**, choose **Create new token** (Cloudflare-managed). Remove any custom `CLOUDFLARE_API_TOKEN` from build environment variables if it overrides the managed token with wrong permissions.

### Build variables (required for the app)

Under **Build variables and secrets** (not runtime-only vars), set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY` (optional)

Redeploy after changing them. Vite inlines these at build time.

### SPA routing

`frontend/wrangler.toml` sets `not_found_handling = "single-page-application"`. `frontend/public/_redirects` is a fallback for other hosts.

## Main services

- Supabase for database and backend platform features
- Stripe for payments
- optional email and AI integrations through additional Edge Functions

## Frontend hosting checklist

- deploy the `frontend/` directory as a Vite application
- make sure SPA rewrites are enabled so client routes load correctly
- configure frontend environment variables from `frontend/.env.example`
- confirm production auth redirect URLs match the deployed domain

## Supabase checklist

- create or connect the correct Supabase project
- apply required schema, policy, and migration SQL from `docs/database/`
- configure authentication providers
- deploy the required Edge Functions
- set function secrets using `supabase/functions/.env.example` as the reference

## Payment checklist

- configure Stripe API secrets on the server side only
- point the Stripe webhook to the deployed `stripe-webhook` function
- verify `FRONTEND_URL` matches the real production frontend domain

## Architecture summary

```text
Customer browser
    -> Frontend app
    -> Supabase
    -> Edge Functions
    -> External services such as Stripe
```

## Related docs

- `../database/database-overview.md`
- `../database/reference/`
