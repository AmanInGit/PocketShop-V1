# Database Overview

PocketShop uses Supabase as its backend platform. That means database behavior, authentication, realtime features, storage, and server-side integrations are centered around the Supabase project rather than a custom backend application inside this repository.

## Current model

- database: PostgreSQL through Supabase
- auth: Supabase Auth
- realtime: Supabase Realtime
- server-side logic: Supabase Edge Functions

## Where database-related material lives

- `supabase/`: active server-side integration code
- `docs/database/schema.sql`: schema reference
- `docs/database/triggers.sql`: trigger reference
- `docs/database/policies/`: active RLS and policy-related SQL
- `docs/database/migrations/`: active migration and fix SQL kept for project reference
- `docs/sql/archive/`: archived SQL scripts kept as historical material

## Important clarification

The SQL files preserved in `docs/sql/archive/` are separated from the main app folders because they are not presented as the active runtime source of truth for the current repository structure. They remain useful for:

- historical review
- schema/reference understanding
- examiner review of prior database work

By contrast, the SQL inside `docs/database/` is the clearer "current project reference" area.

## Payment-related server-side functions

Two important Supabase Edge Functions already exist in the repository:

- `supabase/functions/create-checkout-session`
- `supabase/functions/stripe-webhook`

These are part of the operational backend layer for payment flows.

## Recommendation for future maintenance

Keep active database change workflows aligned with Supabase project management and treat the archived SQL folder as reference-only unless a script is intentionally promoted back into an active migration process.
