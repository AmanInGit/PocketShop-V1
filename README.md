# PocketShop

PocketShop is a QR-first commerce platform for local businesses. It turns a simple scan into a full browser-based ordering experience where customers can browse a storefront, place orders, track status, and pay online without installing an app.

This `README.md` is meant to explain the project clearly. It is not just a deployment note. Later, screenshots, architecture images, UI previews, and flow diagrams can be added here without changing the overall structure.

The project is built around a clear split:

- `frontend/` contains the customer and vendor web application.
- `supabase/` contains the server-side layer through Supabase database resources and Edge Functions.
- `docs/` contains every non-root markdown document plus archived SQL reference material.

## Why PocketShop

PocketShop is designed for fast-moving local commerce scenarios such as restaurants, cafes, dine-in tables, and small storefront businesses that need:

- QR-based discovery with zero app install friction
- a vendor dashboard for live operational control
- order and payment flows backed by Supabase
- a deployment model that stays lightweight and easy to manage

## What The Project Does

PocketShop gives a business a digital storefront that customers can open instantly from a QR code.

From the customer side, the app is built to support:

- browsing a live storefront
- adding products to cart
- checkout and payment flow
- order confirmation and tracking
- a fast, app-free mobile experience

From the vendor side, the app is built to support:

- onboarding and account setup
- product and inventory management
- dashboard visibility for live operations
- order handling and status updates
- storefront management and business settings
- analytics and business insight screens

## Core Product Highlights

- QR-powered storefront entry for customers
- Progressive web app experience
- vendor onboarding and dashboard workflows
- live order tracking and status updates
- payment session creation and webhook handling through Supabase Edge Functions
- analytics and reporting foundations for business insight
- support for dine-in and table-ordering flows

## Who It Is For

PocketShop is especially suitable for:

- restaurants and cafes
- dine-in table ordering
- small retail storefronts
- local service businesses that want a lightweight digital ordering layer

The main idea is simple: reduce friction for customers while giving vendors an operational dashboard they can actually use day to day.

## Architecture

PocketShop does not have a traditional standalone backend application in this repository.

Instead, the live platform is structured like this:

```text
PocketShop-V1/
├── frontend/          # React + TypeScript + Vite application
├── supabase/          # Edge Functions and Supabase project assets
├── docs/              # Documentation, plans, guides, and archived SQL
├── scripts/           # Utility scripts
├── package.json       # Root workspace commands
└── README.md          # Main project guide
```

### Frontend

The app in `frontend/` contains:

- customer storefront flows
- vendor dashboard flows
- checkout and payment UI
- analytics screens
- route guards, shared UI, feature modules, and tests

### Server-side platform

The server-side responsibilities are handled through Supabase:

- PostgreSQL database
- authentication
- realtime subscriptions
- storage
- Edge Functions such as:
  - `supabase/functions/create-checkout-session`
  - `supabase/functions/stripe-webhook`

This repository now reflects that architecture directly, instead of implying a separate backend codebase that does not actually exist.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Supabase
- Stripe
- Google Maps Places APIs
- Jest + React Testing Library

## Repository Layout

### Root

- `README.md`: the main professional overview for the project
- `package.json`: root workspace commands targeting the live frontend workspace
- `LICENSE`: project license

### `frontend/`

Contains the production web application and test suite.

### `supabase/`

Contains Supabase Edge Functions and related server-side integration code.

### `docs/`

Contains all supporting written material:

- architecture notes
- database guidance
- implementation planning
- testing guides
- troubleshooting references
- archived SQL scripts that are not part of the active app structure

## Documentation Structure

Inside `docs/`, files are separated by purpose:

- `architecture/` for repository and codebase structure
- `database/` for active SQL reference, policies, and migrations
- `implementation/` for roadmap-style notes
- `planning/` and `status/` for project execution context
- `guides/` for product flow explanations
- `testing/` for testing notes
- `troubleshooting/` for operational support docs
- `sql/archive/` for older or legacy SQL kept only as reference

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- a Supabase project
- a Google Maps API key if you use location features
- Stripe credentials if you use the payment flow

### Install

```bash
npm install
```

### Run the frontend locally

```bash
npm run dev
```

The app runs from the `frontend` workspace and typically starts at `http://localhost:5173`.

## Environment Setup

### Frontend environment variables

Use `frontend/.env.example` as the reference for local frontend configuration:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Supabase Edge Function secrets

Use `supabase/functions/.env.example` as the reference for server-side function secrets:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
STRIPE_SECRET_KEY=sk_live_or_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=https://your-frontend-domain.example
```

Never expose service-role or Stripe secrets to the frontend.

## Scripts

From the repository root:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

Useful frontend-only commands:

```bash
npm run typecheck --workspace=frontend
npm run preview --workspace=frontend
```

## Deployment

### Frontend

Deploy `frontend/` as a Vite application on Vercel.

Recommended settings:

- root directory: `frontend`
- framework preset: `Vite`
- install command: `npm install`
- build command: `npm run build`
- output directory: `dist`

`frontend/vercel.json` is included so browser-history routes resolve correctly on direct navigation and page refresh.

### Cloudflare (Workers Builds)

- Path: `frontend`
- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy`
- Build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- API token: use **Create new token** in build settings (do not use `wrangler pages deploy`)

See `docs/setup/deployment-guide.md` for details.

### Supabase

Deploy and manage:

- database changes in Supabase
- secrets in Supabase project settings
- Edge Functions from the `supabase/functions/` directory

## Documentation

All supporting markdown documentation lives in `docs/`.

Start here:

- `docs/README.md` for the documentation map
- `docs/architecture/repository-structure.md` for the cleaned repository structure
- `docs/database/database-overview.md` for database and SQL guidance
- `docs/implementation/feature-roadmap.md` for current implementation priorities

This makes it easier to keep the repository root clean while still preserving project detail for review, development, and future documentation updates.

## Current State

PocketShop already includes substantial product surface area, but some workstreams are still evolving, especially around payment finalization, analytics accuracy, and a few operational flows. The documentation has been reorganized so those active and legacy areas are easier to understand during review.

## License

PocketShop is released under the MIT License. See `LICENSE`.
