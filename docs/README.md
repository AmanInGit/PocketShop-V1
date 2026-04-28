# PocketShop Documentation

This folder contains the project documentation, organized so each type of file has a clear place.

## Documentation Map

### `architecture/`

Repository and codebase structure references.

- `repository-structure.md`
- `frontend-structure.md`

### `database/`

Database guidance and active SQL reference material.

- `database-overview.md`
- `schema.sql`
- `triggers.sql`
- `policies/`
- `migrations/`
- `reference/`

### `implementation/`

Current execution priorities and feature planning.

- `feature-roadmap.md`

### `planning/`

Working plans that help explain delivery focus.

- `vendor-execution-plan.md`

### `status/`

Status notes for important implementation tracks.

- `table-ordering-status.md`

### `testing/`

Testing references and test-coverage guidance.

- `routing-test-guide.md`

### `troubleshooting/`

Operational troubleshooting references.

- `troubleshooting-overview.md`
- `service-health-monitor.md`
- `oauth/`

### `setup/`

Deployment-related setup notes only.

- `deployment-guide.md`

### `guides/`

General walkthroughs and product flow references.

- `END_TO_END_FLOW.md`

### `requirements/`

Product requirement references and review notes.

- `vendor-dashboard-and-orders.md`

### `sql/archive/`

Archived SQL scripts kept for reference. These files are separated from the active application structure so the repository is easier to understand during review.

### `api/postman/`

API collection assets.

- `PocketShop_API.postman_collection.json`

## Reading Order

If you are reviewing the project for the first time, start with:

1. `../README.md`
2. `architecture/repository-structure.md`
3. `database/database-overview.md`
4. `implementation/feature-roadmap.md`
5. `guides/END_TO_END_FLOW.md`

## Notes

- `frontend/` and `supabase/` are the live technical areas of the product.
- `docs/database/` now separates active schema, policies, and migrations more clearly.
- archived SQL is preserved in `docs/sql/archive/` for context, not presented as active runtime code.
- environment-specific setup checklists with sensitive-looking values were removed during cleanup.
- misleading placeholder backend documentation has been removed so the repository reflects the actual architecture more clearly.
