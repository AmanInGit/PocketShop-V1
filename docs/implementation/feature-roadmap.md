# Feature Roadmap

This document summarizes the most important implementation priorities and cleanup themes reflected in the current repository.

## Product areas already present

- customer storefront browsing
- customer checkout flow
- order tracking
- vendor dashboard
- inventory and storefront management
- analytics foundations
- payment status handling
- Supabase-backed payment integration work

## Immediate priority areas

1. Harden identity continuity across guest and OTP-based customer flows.
2. Finalize payment state handling so Stripe webhook-confirmed outcomes become the source of truth.
3. Keep order state naming and transitions consistent across UI and backend-connected flows.
4. Align analytics and dashboard metrics with confirmed payment and order state data.
5. Clearly separate completed features from partial or future settings functionality.

## Review framing

PocketShop has strong frontend surface area already, but some product areas are at different stages of completeness. For a reviewer, the most important distinction is:

- what is already implemented and demonstrable
- what is structurally present but still being hardened
- what is intentionally preserved as reference rather than active production logic

## Current documentation objective

The repository and docs have been reorganized so these distinctions are easier to understand at a glance.
