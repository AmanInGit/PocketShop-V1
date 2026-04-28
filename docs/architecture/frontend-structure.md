# Frontend Structure

PocketShop's frontend is a React, TypeScript, and Vite application organized by product responsibility instead of by file type alone.

## Top-level layout

```text
frontend/
├── public/               # Static assets served directly
├── src/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vercel.json
```

## `src/` organization

- `app/`: app shell, top-level pages, and global entry pages
- `routes/`: route configuration and route typing
- `features/`: feature-based modules such as auth, vendor, analytics, storefront, and shared domain utilities
- `components/`: reusable UI components shared across flows
- `constants/`: central constants such as route definitions
- `contexts/`: global React context providers
- `hooks/`: shared hooks
- `lib/`: framework and third-party integration setup, including Supabase
- `services/`: shared application service contracts and helpers
- `types/`: common TypeScript types
- `utils/`: cross-cutting utilities
- `data/`: static or demo data
- `assets/`: images and styling assets
- `__tests__/`: frontend test suites and setup helpers

## Feature orientation

The codebase is primarily arranged by product features, which makes it easier to review business flows end to end:

- `features/auth`
- `features/vendor`
- `features/analytics`
- `features/common`
- `features/storefront`

## Practical benefit

This structure keeps:

- business flows close to their services and hooks
- shared UI separated from feature-specific code
- routing and shell concerns independent from domain implementation

That makes the repo easier to review and easier to extend without scattering related files across too many folders.
