# Routing Test Guide

PocketShop includes routing-focused frontend tests to validate protected navigation, authentication flow behavior, onboarding enforcement, and error handling.

## Coverage areas

- protected route behavior
- authentication redirects
- onboarding stage enforcement
- error handling and recovery
- navigation and route transition behavior

## Test support

The routing tests use shared helpers for:

- router rendering
- authenticated and unauthenticated state setup
- loading and error state setup
- mocked onboarding responses

## Common commands

From the `frontend` workspace:

```bash
npm test -- src/__tests__/routing
npm test -- --watch
npm test -- --coverage
```

## Purpose

This guide exists in `docs/testing/` so testing information is easy to find during review without keeping extra markdown files inside source directories.
