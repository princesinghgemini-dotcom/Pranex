# Pranex implementation plan

## Current baseline (2026-10-26)
- GitHub repository: `princesinghgemini-dotcom/Pranex` (public, main branch).
- Supabase project: `sngxhgoczkbseoymesvt` (`pranex`, ap-south-1, PostgreSQL 17).
- Existing schema already contains organizations/members, categories, products, variants, batch inventory, orders/sub-orders, payment transactions, shipments, integration events, audit logs, and quote enquiries. Do not create a parallel schema without reconciliation.
- Existing Next.js 15 / React 19 application is an operations dashboard with inventory and catalogue foundations. The buyer storefront and real payment/fulfilment workflow are incomplete.
- Vercel Git project creation/linking was attempted but the connected Vercel integration returned 403 permission denied. No deployment or environment update is claimed.

## Phases and acceptance criteria

### Phase 0 — Connection and release hygiene
- [x] Identify existing GitHub, Supabase, and Vercel resources.
- [x] Inspect current database schema and app baseline.
- [ ] Link GitHub repo to Vercel with authorized Vercel access.
- [ ] Add Supabase URL + publishable key to Vercel Development, Preview, and Production environments.
- [ ] Add local `.env.local` from `.env.example`; never commit secrets.
- [ ] Run Supabase security/performance advisors and record remediation.

### Phase 1 — Buyer marketplace shell
- [x] Add a responsive Hindi-first storefront route.
- [x] Wire category/product/variant reads to Supabase PostgREST using the existing schema.
- [x] Add search, category filtering, and browser-memory cart preview.
- [ ] Verify public read policies and populate approved demo catalogue records.
- [ ] Add visual regression and mobile viewport checks.

### Phase 2 — Authentication and organization access
- OTP sign-in with Supabase Auth, organization creation/join, member roles, verification status.
- API/server-side authorization for buyer/vendor/admin surfaces; tenant isolation tests for every exposed table and RPC.
- Private storage bucket and short-lived signed URLs for KYC documents.

### Phase 3 — Vendor and catalog operations
- Vendor onboarding and document review; product/variant submissions and admin moderation.
- Seller-specific price lists, eligibility-aware price visibility, MOQ and batch expiry/FEFO.
- Audit trail for review decisions and all privileged changes.

### Phase 4 — Transactional commerce
- Server-side quote calculation (prices, GST, MOQ, freight, stock) and idempotent checkout.
- Atomic stock reservation/allocation and parent order + vendor suborders.
- Razorpay order creation, signature verification, webhook inbox/deduplication, refunds and reconciliation.
- No payment success state from client callback alone.

### Phase 5 — Fulfilment and settlement
- Shiprocket shipment creation, tracking webhook/event handling and retry queue.
- Ledger for seller payable, platform fees, refunds, transfers and settlements.
- Partial cancellation/return and multi-vendor exception handling.

### Phase 6 — Group buying and launch
- Group-buy campaign thresholds, deadlines, join/lock/failure policies and refunds.
- Hindi/English content review, accessibility, responsive QA, rate limits, bot controls, logging/alerts, backups and incident runbooks.
- Release gates: tests, typecheck, lint, production build, RLS tests, provider sandbox tests, reconciliation tests.

## Security and engineering rules
- Money in integer paise; never trust client prices, tax, stock, vendor IDs, or order totals.
- Every exposed public-schema table has RLS and explicit grants/policies. No service-role key in browser or any `NEXT_PUBLIC_*` variable.
- Payment/shipping credentials stay server-side; verify signed webhooks and process each provider event idempotently.
- Tenant boundaries are enforced in the database and server; a vendor may only see their own records.
- Database migrations are version-controlled and reviewed; do not blindly reapply a new schema over the existing production-like schema.
- Search and listing endpoints must paginate and use appropriate indexes; avoid N+1 reads.

## Current storefront limitations
The new `/marketplace` page is an initial UI and catalogue-read integration. The cart is in memory and does not create an order, reserve stock, calculate final tax/shipping, or accept payment. Prices shown are MRP only if present; this is not a substitute for eligibility-aware wholesale pricing. Authentication and checkout are not enabled.
