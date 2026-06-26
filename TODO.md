# TODO — Codebase Improvements

## Critical Issues

- [ ] **Fix rider initial password** — Currently uses display name as password (`app/api/riders/route.ts:84`). Generate a random password instead.
- [ ] **Fix payout reject race condition** — Status guard runs outside transaction (`app/api/payouts/[id]/reject/route.ts:24-37`). The approve route uses `SELECT ... FOR UPDATE` inside the transaction but reject doesn't. Both should be consistent.

## High Priority

- [ ] **Add rate limiting to API routes** — Currently only auth endpoints have rate limiting (10 req/60s). All mutation endpoints (order creation, transitions, payout requests) are unprotected.
- [ ] **Add test coverage** — Only 1 spec file exists (`app/api/orders/[id]/transitions.spec.ts`). Zero component, hook, or utility tests. Add `@testing-library/react` and start with:
  - `lib/pricing.ts` (pure functions, easy wins)
  - `lib/csv.ts`
  - `components/data-table.tsx`
  - Key hooks (`useOrders`, `useRiders`, etc.)
- [ ] **Optimize resource fetching** — All 11 SWR resources are fetched on every authenticated page load (`lib/hooks/fetcher.ts:10-22`). Only fetch what the current page needs.
- [ ] **Fix duplicate subqueries in search** — `app/api/orders/route.ts:58-79`, `app/api/payouts/route.ts:18-27`, `app/api/riders/route.ts:25-34` each run count + select for the same condition. Use the subquery directly without the count guard.

## Medium Priority

- [ ] **Fix `any` types** — 11 instances in transaction callbacks (`tx: any`). Use Drizzle's inferred transaction types. Re-enable `@typescript-eslint/no-explicit-any` in ESLint.
- [ ] **Add `error.tsx` boundaries** — Missing in `app/dashboard/`, `app/warehouse/`, `app/merchant/`, `app/rider/` sections. Errors fall through to root boundary, losing route context.
- [ ] **Enable image optimization** — `next.config.mjs` has `images: { unoptimized: true }`. Revisit for production to reduce payloads.
- [ ] **Tighten CSP** — Remove `unsafe-inline` and `unsafe-eval` from `script-src` in `next.config.mjs` if possible.
- [ ] **Standardize API error responses** — Some routes return `NextResponse.json(null, { status: 401 })`, others return `{ error: "..." }`. Pick one pattern and apply consistently.

## Low Priority / DX

- [ ] **Sync dual schema files** — `lib/db/schema.postgres.ts` and `lib/db/schema.turso.ts` must be kept in sync manually. Add a CI check or script to detect drift.
- [ ] **Split monolithic seed file** — `lib/db/seed.ts` is 1500+ lines. Split into per-entity seed files.
- [ ] **Add typecheck to pre-commit** — Currently only Prettier runs via `lint-staged`. Add `tsc --noEmit` to catch type errors before commit.
- [ ] **Refactor dialog state pattern** — 6 components use `eslint-disable react-hooks/set-state-in-effect` to reset form state on dialog open. Use a `key` prop on the dialog to remount instead.
- [ ] **Add pagination to list endpoints** — `GET /api/riders`, `GET /api/payouts`, `GET /api/warehouses` return all records without pagination.
