# Delivery Management Platform

A B2B parcel-delivery management platform built with **Next.js (App Router)**, backed by a
real **Neon Postgres** database via **Drizzle ORM**, with authentication handled by
**Better Auth**. Role-based dashboards cover the full parcel lifecycle from merchant order
creation through pickup, warehousing, delivery, COD reconciliation, and merchant payouts.

> **For AI assistants:** Read this file first. The UI is driven by one React context
> (`lib/platform-context.tsx`) that **fetches** from REST route handlers under `app/api/*`.
> Those routes are the API layer; they read/write the database through Drizzle
> (`lib/db/schema.ts`) and enforce auth/role guards via `requireSession()`
> (`lib/api-auth.ts`). To add a behavior: add a schema/migration, add a route handler with a
> zod schema, then wire an action in the context and build the page.

---

## Tech Stack

- **Next.js 16** App Router (`app/`), React client components, TypeScript
- **Neon Postgres** + **Drizzle ORM** (`lib/db/`, `drizzle/` migrations)
- **Better Auth** for email + password auth and sessions (`lib/auth.ts`)
- **zod** for request-body validation (`lib/validation.ts`)
- **Tailwind CSS v4** + **shadcn/ui** components (`components/ui/`)
- **sonner** for toasts, **next-themes** available

---

## Getting Started

### Environment

The app requires a Neon connection string and a Better Auth secret:

```
DATABASE_URL=postgres://...        # provided by the Neon integration
BETTER_AUTH_SECRET=...             # openssl rand -base64 32
```

### Database setup

```bash
pnpm install
pnpm db:push     # push the Drizzle schema to the database
pnpm db:seed     # seed roles, warehouses, merchants, riders, orders, payouts
```

`pnpm dev` starts the app. Use the demo accounts below to sign in.

---

## Core Architecture

State flows through a single provider that **fetches from the API** — components read state
and call actions from `usePlatform()`; they never query the database directly.

```
lib/types.ts             → domain types (Role, User, Merchant, Order, Rider, ...)
lib/db/schema.ts         → Drizzle tables (the database, incl. Better Auth tables)
lib/db/index.ts          → Drizzle client bound to DATABASE_URL
lib/db/seed.ts           → seed script (pnpm db:seed)
lib/auth.ts              → Better Auth server config
lib/api-auth.ts          → requireSession(): resolves the session user + role/profile
lib/validation.ts        → zod schemas + parseBody() helper (returns 400 on bad input)
lib/pagination.ts        → parsePagination(): optional limit/offset query params
lib/pricing.ts           → pure pricing helpers (delivery charge, security money, formatTk)
app/api/**/route.ts      → REST API layer (auth-guarded, zod-validated mutations)
lib/platform-context.tsx → client store: loads data from the API + all mutating actions
```

### API layer (`app/api/*`)

Every mutation is a route handler that calls `requireSession()` for auth/role checks,
validates the request body with a zod schema via `parseBody()` (returning `400` with
per-field issues on bad input), performs the Drizzle write, and returns the updated row.
Multi-row money operations (payout request / reject) run inside transactions so orders are
locked/unlocked atomically. Order codes (`PF-XXXXXX`) are generated **server-side** from the
current max to avoid collisions. List endpoints (`GET /api/orders`, `GET /api/merchants`)
accept optional `limit`/`offset` query params for pagination.

### `lib/platform-context.tsx` — the client store

On login it loads all platform resources in parallel from the API; on failure it exposes a
`dataError` plus `refreshData()` so the UI can degrade gracefully (see
`components/data-error-banner.tsx`, rendered in each role layout). Order-lifecycle actions are
**optimistic** — they apply the expected status immediately and roll back if the server
rejects the transition. `usePlatform()` returns:

| Area | State | Actions |
|------|-------|---------|
| Auth / loading | `currentUser`, `isReady`, `dataError`, `refreshData` | `login`, `logout` |
| Security money | `securityConfig` | `updateSecurityConfig` |
| Team | `team` | `createAccount`, `toggleAccountActive`, `togglePricingPermission` |
| Merchants | `merchants`, `currentMerchant` | `approveMerchant`, `suspendMerchant`, `reactivateMerchant`, `setMerchantPricing` |
| Orders | `orders`, `pickupLocations` | `createOrder`, `approveAndAssignOrder`, `markOrderPickedUp`, `receiveOrderAtWarehouse`, `assignDeliveryRider`, `markOutForDelivery`, `markDelivered`, `markDeliveryFailed`, `reattemptFailedOrder`, `returnFailedOrder` |
| Riders | `riders`, `currentRider` | (shares order actions) |
| Warehouses | `warehouses`, `currentWarehouse`, `warehouseDeliveryRiders`, `warehouseFailedOrders`, `warehouseUnsettledOrders` | `receiveOrderAtWarehouse`, `assignDeliveryRider`, `reattemptFailedOrder`, `returnFailedOrder`, `settleOrderCod` |
| Payouts | `payoutRequests`, `merchantPayableOrders`, `merchantPayoutRequests` | `settleOrderCod`, `requestPayout`, `approvePayout`, `rejectPayout`, `markPayoutPaid` |

Mutating actions return `{ ok: boolean; error?: string }` — use that for toast feedback.
Merchant self-registration is a public `POST /api/merchants` called directly from
`/register` (not a context action).

Helper: `homeForRole(role)` → route a user lands on after login
(`/dashboard` for admins, `/merchant`, `/rider`, `/warehouse`).

---

## Roles & Routes

| Role | Lands on | Notes |
|------|----------|-------|
| `SUPER_ADMIN` | `/dashboard` | Full access: team, merchants, orders, security money, merchant payouts |
| `ADMIN` | `/dashboard` | Order approval, merchant pricing (if permitted) |
| `WAREHOUSE_ADMIN` | `/warehouse` | Receive picked-up parcels, dispatch a delivery rider, resolve failed deliveries, settle delivery-rider COD |
| `MERCHANT` | `/merchant` | Create/track own orders, view finances, request payouts |
| `RIDER` | `/rider` | Pickup queue + delivery queue (out-for-delivery, delivered, failed) |

### Route map (`app/`)

```
/                        → redirects based on auth/role
/login                   → email + password login (demo role quick-fill buttons)
/register                → merchant self-registration (POST /api/merchants → PENDING merchant)

/dashboard               → admin home (layout guards: redirects non-admins)
/dashboard/orders        → all orders; approve + assign pickup rider
/dashboard/merchants     → approve / suspend / set pricing
/dashboard/team          → create Admin / Warehouse Admin accounts
/dashboard/security-money→ Super Admin configures platform fee rules
/dashboard/payouts       → Super Admin reviews merchant payout requests
                           (Pending / Approved / History tabs): approve, reject (unlocks
                           orders), or mark an approved request as PAID

/merchant                → merchant order list
/merchant/orders/new     → create order (live pricing + security money calc)
/merchant/finance        → financial dashboard: available funds (delivered + COD-settled
                           orders), in-review/paid totals, and payout request history;
                           request a payout for all currently payable orders

/rider                   → rider pickup queue (To collect / Collected tabs)
/rider/deliveries        → delivery queue (To deliver / Completed); take parcels out for
                           delivery and record DELIVERED / FAILED_ATTEMPT outcomes

/warehouse               → warehouse intake queue (Incoming / Received tabs); receive
                           PICKED_UP parcels into the admin's warehouse → IN_WAREHOUSE
/warehouse/dispatch      → dispatch desk (Ready / Dispatched); assign a delivery rider to an
                           IN_WAREHOUSE parcel → IN_TRANSIT
/warehouse/exceptions    → exceptions desk (Needs action / Returned); resolve FAILED_ATTEMPT
                           parcels → re-attempt (OUT_FOR_DELIVERY) or return (RETURNED)
/warehouse/reconciliation→ COD reconciliation (Awaiting settlement / Settled); record that a
                           delivery rider has handed over the cash collected for a DELIVERED
                           parcel → stamps codSettledAt, making the product cost payable to
                           the merchant
```

Each role's section has a `layout.tsx` that guards access (redirects to `/login` or the
role's home if the current user doesn't belong), renders `components/data-error-banner.tsx`,
and shows a sidebar: `components/sidebar.tsx` (admin), `merchant-sidebar.tsx`,
`rider-sidebar.tsx`, `warehouse-sidebar.tsx`.

---

## Order Lifecycle (state machine)

`OrderStatus` in `lib/types.ts`:

```
PENDING → APPROVED → PICKED_UP → IN_WAREHOUSE → IN_TRANSIT
        → OUT_FOR_DELIVERY → DELIVERED
                           → FAILED_ATTEMPT → RETURNED
```

Each transition maps to an auth-guarded, zod-validated route handler and an optimistic
context action:

- **Merchant order creation** — `createOrder` → `POST /api/orders` → `PENDING`. The server
  validates the body, enforces the merchant's max weight, computes `deliveryCharge`
  (`calcDeliveryCharge`) and `securityMoney` (`calcSecurityMoney`), and generates the
  `PF-XXXXXX` code from the current max.
- **Admin approval:** `approveAndAssignOrder(orderId, riderId)` → `PATCH /api/orders/[id]/approve`
  → `APPROVED` + assigns `pickupRiderId`. UI: `components/approve-order-dialog.tsx`.
- **Rider pickup:** `markOrderPickedUp` → `PATCH /api/orders/[id]/picked-up` → `PICKED_UP`
  (order must be `APPROVED` and assigned to the current rider).
- **Warehouse intake:** `receiveOrderAtWarehouse` → `PATCH /api/orders/[id]/receive` →
  `IN_WAREHOUSE` (stamps `warehouseId`, `receivedAtWarehouseAt`, `receivedByWarehouse`).
- **Warehouse dispatch:** `assignDeliveryRider(orderId, riderId)` →
  `PATCH /api/orders/[id]/dispatch` → `IN_TRANSIT` (stamps `deliveryRiderId`, `dispatchedAt`,
  `dispatchedBy`; rider must be active and based at the admin's warehouse).
- **Delivery attempt:** `markOutForDelivery` → `.../out-for-delivery` → `OUT_FOR_DELIVERY`,
  then `markDelivered(orderId, proofRef?)` → `.../delivered` → `DELIVERED` (stamps
  `deliveredAt`, proof ref, `amountCollected`) or `markDeliveryFailed(orderId, note)` →
  `.../failed` → `FAILED_ATTEMPT` (note required).
- **Failed-delivery resolution:** `reattemptFailedOrder` → `.../reattempt` →
  `OUT_FOR_DELIVERY` or `returnFailedOrder(orderId, reason)` → `.../return` → `RETURNED`
  (reason required; no COD collected, no payout).
- **COD reconciliation & payouts:**
  - **Warehouse Admin:** `settleOrderCod` → `PATCH /api/orders/[id]/settle-cod` stamps
    `codSettledAt`/`codSettledBy` on a `DELIVERED` parcel. The platform keeps the delivery
    charge + security money; the **product cost** becomes payable to the merchant.
  - **Merchant:** `requestPayout({ payoutMethod, payoutDetails })` → `POST /api/payouts`
    bundles all delivered + COD-settled, unlocked orders into a `PENDING` `PayoutRequest`
    inside a transaction, summing `productCost` and **locking** the orders.
  - **Super Admin:** `approvePayout` → `.../approve` (`APPROVED`), `rejectPayout(id, reason)`
    → `.../reject` (`REJECTED`, **unlocks** orders, transactional), `markPayoutPaid` →
    `.../paid` (`PAID`).
  Delivery charge and security money are platform revenue and are **never** part of a payout;
  `RETURNED` parcels are never settled or paid out.

---

## Demo Credentials

Seeded by `pnpm db:seed`. The login page shows one quick-fill button per role.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | see seed output | — |
| Merchant | `imran@threadline.com` | `merchant123` |
| Rider (pickup) | `shahin@parcelflow.io` | `rider123` |
| Rider (delivery) | `kamrul@parcelflow.io` | `rider123` |
| Warehouse Admin | `rifat@parcelflow.io` | `warehouse123` |

The demo pickup rider has seeded `APPROVED` orders and the demo delivery rider has seeded
`IN_TRANSIT` / `OUT_FOR_DELIVERY` orders so both queues are populated.

---

## How to Add a New Backend Behavior (recipe)

1. **Schema** — add/extend tables in `lib/db/schema.ts`, then `pnpm db:push` (and update
   `lib/db/seed.ts` if screens need seed data).
2. **Validation** — add a zod schema to `lib/validation.ts`.
3. **Route** — add a handler under `app/api/...`; call `requireSession()` for auth/role
   guards, `parseBody(req, schema)` for input (returns `400` on bad input), do the Drizzle
   write, and return the updated row. Use a transaction for multi-row money operations.
4. **Action** — add a `useCallback` action in `lib/platform-context.tsx` that fetches the
   route and syncs state from the returned row; add it to `PlatformContextValue` and the
   provider value. Return `{ ok, error? }`.
5. **UI** — build/extend the page under the right role's `app/<role>/` folder; reuse
   `components/page-header.tsx`, `order-status-badge.tsx`, and `components/ui/*`.
6. **Verify** — sign in with the relevant demo account and exercise the flow in the browser.

---

## Conventions

- **Currency:** Taka, formatted with `formatTk()` from `lib/pricing.ts`.
- **Auth:** email + password via Better Auth; every API route resolves the caller with
  `requireSession()` and scopes queries by role / `userId` (there is no RLS).
- **Validation:** every POST/PATCH route validates its body with a zod schema and returns
  `400` on bad input.
- **Status badges:** `components/order-status-badge.tsx`, `merchant-status-badge.tsx`,
  `role-badge.tsx` centralize status → color/label mapping. Add new statuses there.
- **Styling:** use design tokens (`bg-background`, `text-foreground`, etc.) and shadcn
  components; avoid hardcoded colors.
