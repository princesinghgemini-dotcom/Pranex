# Pranex Commerce OS

Pranex is an early-stage commerce operations workspace for agri and veterinary supply chains. The current repository is a rebuilt foundation committed directly through GitHub; it is **not yet a production-ready transactional platform**.

## Current scope

- Responsive operations overview dashboard.
- Inventory ledger preview with batch-level stock, reserved quantities, expiry risk, and FEFO display ordering.
- Supabase SQL foundation for organization membership, batch records, append-only inventory movements, tenant-scoped row policies, and a validated receipt RPC.
- Native Node.js tests for core security invariants in the migration.

## Technology

- Next.js App Router, React, TypeScript
- Supabase/PostgreSQL migration foundation
- Node.js built-in test runner

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm test
npm run dev
```

The dashboard uses sample data. Do not treat sample counts as live inventory, and do not enable stock writes until the migration has been reviewed and applied in a development Supabase project with authenticated tenant-isolation tests.

## Inventory controls and limitations

- Inventory movement rows are designed as append-only records; corrections should be represented as compensating movements, not edits to historical rows.
- The receipt RPC derives the user from `auth.uid()` and checks membership/role before writing.
- Batch balance is calculated from movement deltas rather than a mutable balance field.
- FEFO is currently a presentation ordering in the UI. Order allocation must be implemented as a transaction-safe, row-locking database workflow before it can be relied on for fulfilment.
- Idempotency and concurrent receipt behavior require integration tests against PostgreSQL before production use.
- The migration creates a minimal `organizations` and `organization_members` schema. If integrating into an existing database, reconcile these definitions with the live schema before applying; do not blindly apply over a separately evolved schema.

## Release gates

Before production use, complete and verify:
1. Authenticated end-to-end tenant isolation tests for every exposed table and RPC.
2. PostgreSQL migration execution and security advisor review.
3. Transactional FEFO allocation with row locks, no-negative-stock enforcement, and idempotent order fulfilment.
4. Real API integration, audit logging, input validation, rate limiting, and observability.
5. Dependency install, lint, TypeScript check, production build, and CI.
6. Payment, shipping, and order workflows only after provider credentials, signature validation, webhook idempotency, and reconciliation are implemented.

## Status

The GitHub branch contains a direct rebuild. Historical commits that existed only in the exhausted remote workspace have not been reconstructed. No production deployment is implied by these commits.
