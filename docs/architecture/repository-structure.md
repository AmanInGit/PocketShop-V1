# Repository Structure

PocketShop is organized around the parts that actually power the product today.

## Primary directories

```text
PocketShop-V1/
├── frontend/              # React + TypeScript + Vite application
├── supabase/              # Supabase Edge Functions and project-side backend assets
├── docs/                  # Documentation, plans, testing notes, and archived SQL
├── scripts/               # Utility scripts
├── Migration_Data/        # Reference source material, not part of the shipped app
├── package.json           # Root workspace scripts
├── package-lock.json      # Workspace lockfile
├── LICENSE
└── README.md
```

## Why this structure is clearer

- There is no fake standalone backend application directory anymore.
- The repository now reflects the real deployment model: `frontend/` plus `supabase/`.
- All markdown support material is grouped in `docs/`.
- SQL files that are not part of the active repository flow are separated into `docs/sql/archive/`.

## Live product areas

### `frontend/`

Contains the production web application:

- customer storefront
- vendor dashboard
- checkout and payment UI
- analytics pages
- reusable components
- frontend tests

### `supabase/`

Contains server-side platform logic handled through Supabase:

- Edge Functions
- payment session creation
- Stripe webhook handling
- project-side backend integration logic

## Supporting areas

### `docs/`

Contains documentation only. Reviewers can use it to understand architecture, status, testing, database notes, and legacy references without mixing those materials into the app folders.

### `Migration_Data/`

Reference material that is intentionally kept outside the live app structure.

## Review guidance

For product review, focus on:

1. `frontend/`
2. `supabase/`
3. `README.md`
4. `docs/`
