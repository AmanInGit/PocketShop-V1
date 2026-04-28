# PocketShop Deployment Guide

This guide describes the intended deployment shape for PocketShop without storing organization-specific URLs, keys, or project identifiers.

## Deployment model

PocketShop is deployed as:

- `frontend/` on a static hosting platform such as Vercel
- `supabase/` as the backend platform for database, auth, realtime, storage, and Edge Functions

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
