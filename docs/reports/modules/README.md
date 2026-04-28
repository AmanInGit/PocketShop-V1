# Module Documentation Index

This folder contains one document per vendor dashboard module.

## Available module docs

- `DASHBOARD.md`
- `ORDERS.md`
- `INVENTORY.md`
- `ANALYTICS.md`
- `STOREFRONT.md`
- `PAYMENTS.md`
- `SETTINGS.md`

## How to use these docs

- Start with module purpose and current scope.
- Check "What is done" to understand live behavior.
- Check "Module interactions" before adding features.
- Use "What is remaining" as the execution backlog.

## Start here (next execution order)

- `SETTINGS.md`: finalize identity and compliance prerequisites.
- `STOREFRONT.md`: enforce OTP identity continuity in customer flow.
- `ORDERS.md`: make pending-payment state and status transitions strict.
- `PAYMENTS.md`: add Stripe checkout + webhook source-of-truth flow.
- `DASHBOARD.md` and `ANALYTICS.md`: validate metrics against webhook-confirmed payments.

## Current progress

- Phone identity normalization is completed in app flows and migration docs.
- Customer schema variance (`phone` vs `mobile_number`) is handled for current environment.
- Current active step: history authorization hardening for OTP sessions.
- Next step after this: Stripe checkout + webhook implementation.
