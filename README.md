# PocketShop

> Transform QR codes into powerful, app-free virtual storefronts for local businesses.

## Overview

PocketShop is a Progressive Web Application (PWA) that enables local businesses to create digital storefronts accessible via QR codes. Customers can browse menus, place orders, and make payments—all without downloading any apps.

### Key Features

- **Zero-App Experience** – Storefronts in the browser
- **Real-Time Order Management** – Kanban-style vendor dashboard
- **QR Code Integration** – Dynamic, interactive storefronts
- **Location Services** – Detect location, suggest nearby places
- **Analytics** – Revenue, sales trends, peak hours
- **Multi-Business Support** – Restaurants, cafes, salons, retail

## Project Structure

```
PocketShop-V1/
├── frontend/     # React + TypeScript (Vite)
├── backend/      # Supabase
├── docs/         # Internal documentation (gitignored except reports)
└── scripts/      # Utility scripts
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Maps**: Google Maps API, Places Autocomplete
- **State**: React Context API
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Google Maps API key (for location)

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd PocketShop-V1/frontend
   npm install
   ```

2. **Environment variables** – Create `frontend/.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. **Run**
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`

### Database Setup

Run the schema and RLS scripts from `docs/database/` in your Supabase SQL editor. Report-related SQL is in `docs/reports/sql/`.

## Features (Implemented)

- Auth: Email/password, Google OAuth, phone OTP
- Vendor onboarding: 3 stages + completion
- Vendor dashboard: Dashboard, Orders, Inventory, Analytics, Storefront, Payouts, Settings
- Customer storefront: Browse, cart, checkout (cash, UPI, wallet, card)
- Order management: Status flow, order detail, payment status
- Real-time: Orders, products, payments, notifications
- PWA: Offline support, install prompt
- Location: Detector, Places Autocomplete

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
npm run lint     # Linter
```

## License

MIT – see [LICENSE](LICENSE)

## Contributing

Contributions are welcome! To get started:

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Make your changes, then run the linter and tests:
   ```bash
   npm run lint
   npm run test
   ```
4. Open a pull request describing what you changed and why.

Please keep PRs focused and minimal. Report bugs or suggest features via [GitHub Issues](../../issues).

**Author**: Aman
