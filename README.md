# Delivery Management Platform (Mock Frontend)

A B2B parcel-delivery management platform built with **Next.js (App Router)**. This is a
**frontend-only prototype**: there is no real backend or database. All state lives in memory
and is seeded from mock data, mirroring an existing backend API design (see the project's
backend README / `B2B_Delivery_Order_Flow` docs for the source of truth).

> **For AI assistants:** Read this file first. The whole app is driven by one React context
> (`lib/platform-context.tsx`) over typed data (`lib/types.ts`) seeded from `lib/mock-data.ts`.
> To add a backend behavior, extend those three files, then build/extend the matching page.

---

## Tech Stack

- **Next.js** App Router (`app/`), React client components, TypeScript
- **Tailwind CSS v4** + **shadcn/ui** components (`components/ui/`)
- **sonner** for toasts, **next-themes** available
- No database — state is in-memory via React Context, persisted only for the session
  (current user id in `sessionStorage`).

---

## Core Architecture

Everything flows through a single provider. There is **no data fetching** — components read
state and call actions from `usePlatform()`.

```
lib/types.ts          → all domain types (Role, User, Merchant, Order, Rider, ...)
lib/mock-data.ts      → seed data + demo credentials (the "database")
lib/pricing.ts        → pure pricing helpers (delivery charge, security money, formatTk)
lib/platform-context.tsx → in-memory store + all actions (the "API layer")
```

### `lib/platform-context.tsx` — the heart of the app

Exposes `usePlatform()` returning state + actions. Current surface:

| Area | State | Actions |
|------|-------|---------|
| Auth | `currentUser`, `isReady` | `login`, `logout` |
| Security money | `securityConfig` | `updateSecurityConfig` |
| Team | `team` | `createAccount`, `toggleAccountActive`, `togglePricingPermission` |
| Merchants | `merchants`, `currentMerchant` | `registerMerchant`, `approveMerchant`, `suspendMerchant`, `reactivateMerchant`, `setMerchantPricing` |
| Orders | `orders`, `pickupLocations` | `createOrder`, `approveAndAssignOrder`, `markOrderPickedUp`, `receiveOrderAtWarehouse`, `assignDeliveryRider`, `markOutForDelivery`, `markDelivered`, `markDeliveryFailed`, `reattemptFailedOrder`, `returnFailedOrder` |
| Riders | `riders`, `currentRider` | `markOrderPickedUp`, `markOutForDelivery`, `markDelivered`, `markDeliveryFailed` |
| Warehouses | `warehouses`, `currentWarehouse`, `warehouseDeliveryRiders`, `warehouseFailedOrders`, `warehouseUnsettledOrders` | `receiveOrderAtWarehouse`, `assignDeliveryRider`, `reattemptFailedOrder`, `returnFailedOrder`, `settleOrderCod` |
| Payouts (Phase 9) | `payoutRequests`, `merchantPayableOrders`, `merchantPayoutRequests` | `settleOrderCod`, `requestPayout`, `approvePayout`, `rejectPayout`, `markPayoutPaid` |

Most mutating actions return `{ ok: boolean; error?: string }`. Use that for toast feedback.

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
/login                   → mock login (has demo role quick-fill buttons; credentials hidden)
/register                → merchant self-registration (creates PENDING merchant)

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
role's home if the current user doesn't belong) plus a sidebar:
`components/sidebar.tsx` (admin), `merchant-sidebar.tsx`, `rider-sidebar.tsx`,
`warehouse-sidebar.tsx`.

---

## Order Lifecycle (state machine)

`OrderStatus` in `lib/types.ts`:

```
PENDING → APPROVED → PICKED_UP → IN_WAREHOUSE → IN_TRANSIT
        → OUT_FOR_DELIVERY → DELIVERED
                           → FAILED_ATTEMPT → RETURNED
```

Implemented so far (by "phase" from the backend spec):

- **Merchant order creation** — `createOrder` → `PENDING` (computes `deliveryCharge` via
  `calcDeliveryCharge` and `securityMoney` via `calcSecurityMoney`).
- **Phase 4 (Admin):** `approveAndAssignOrder(orderId, riderId)` → `APPROVED` + assigns
  `pickupRiderId`. UI: `components/approve-order-dialog.tsx` on `/dashboard/orders`.
- **Phase 5 (Rider):** `markOrderPickedUp(orderId)` → `PICKED_UP`. Guards: order must be
  `APPROVED` and assigned to the current rider. UI: `/rider` + `components/pickup-confirm-dialog.tsx`.
- **Phase 6 (Warehouse — Parcel Submitted to Warehouse, Rider → Warehouse):**
  `receiveOrderAtWarehouse(orderId)` → `IN_WAREHOUSE`. The Warehouse Admin logs an incoming
  parcel that a rider has handed over; the action stamps `warehouseId`,
  `receivedAtWarehouseAt`, and `receivedByWarehouse`, ending the rider's pickup duty for that
  parcel. Guards: order must be `PICKED_UP` and the current user must be a Warehouse Admin
  with a resolved `currentWarehouse`. UI: `/warehouse` (Incoming / Received tabs) +
  `components/warehouse-receive-dialog.tsx`.
- **Phase 7 (Warehouse — Delivery Rider Assignment):** `assignDeliveryRider(orderId, riderId)`
  → `IN_TRANSIT`. The Warehouse Admin dispatches an `IN_WAREHOUSE` parcel to a delivery rider
  based at their warehouse; the action stamps `deliveryRiderId`, `dispatchedAt`, and
  `dispatchedBy`. Guards: order must be `IN_WAREHOUSE` and held at the admin's warehouse, and
  the rider must be active and based at that warehouse (`warehouseDeliveryRiders`). UI:
  `/warehouse/dispatch` (Ready / Dispatched tabs) + `components/warehouse-dispatch-dialog.tsx`.
- **Phase 8 (Delivery Rider → Customer — Delivery Attempt):** the assigned delivery rider runs
  the last mile. `markOutForDelivery(orderId)` → `OUT_FOR_DELIVERY` (increments
  `deliveryAttempts`); then either `markDelivered(orderId, proofRef?)` → `DELIVERED` (stamps
  `deliveredAt`, a mock `deliveryProofRef`, and `amountCollected`) or
  `markDeliveryFailed(orderId, note)` → `FAILED_ATTEMPT` (requires a reason `note`). All three
  guard that the order is assigned to the current rider and in the correct prior status. UI:
  `/rider/deliveries` (To deliver / Completed tabs) + `components/delivery-attempt-dialog.tsx`.
- **Phase 8B (Warehouse Admin — Failed Delivery Resolution):** when a delivery rider records a
  `FAILED_ATTEMPT`, the parcel surfaces back in its warehouse's exceptions queue
  (`warehouseFailedOrders`) for the Warehouse Admin to decide its fate. Two actions:
  `reattemptFailedOrder(orderId)` → `OUT_FOR_DELIVERY` (clears the prior failure note, stamps
  `failedResolvedAt`/`failedResolvedBy`, increments `deliveryAttempts`) sends the parcel back
  out with its delivery rider; `returnFailedOrder(orderId, reason)` → `RETURNED` (requires a
  `reason`, stamps `returnedAt`/`returnReason`) closes the parcel — **no COD is collected and
  no merchant payout is issued**. Both guard that the order is `FAILED_ATTEMPT` and held at the
  admin's warehouse. UI: `/warehouse/exceptions` (Needs action / Returned tabs) +
  `components/failed-delivery-dialog.tsx`.
- **Phase 9 (COD Reconciliation & Merchant Payout):** money flow after a successful delivery.
  Split across three roles:
  - **Warehouse Admin — COD settlement:** `settleOrderCod(orderId)` stamps `codSettledAt` /
    `codSettledBy` on a `DELIVERED` parcel, recording that the delivery rider has handed over
    the collected cash. The platform retains the delivery charge + security money; the
    **product cost** becomes payable to the merchant. Guards: order must be `DELIVERED`, held
    at the admin's warehouse, and not already settled. Eligible orders surface via
    `warehouseUnsettledOrders`. UI: `/warehouse/reconciliation`.
  - **Merchant — payout request:** `requestPayout({ payoutMethod, payoutDetails })` bundles all
    of the merchant's delivered + COD-settled, unlocked orders (`merchantPayableOrders`) into a
    new `PayoutRequest` (`PENDING`), summing `productCost` as the `amount` owed and **locking**
    those orders (`payoutRequestId`) so they can't be requested twice. UI: `/merchant/finance`
    + `components/payout-request-dialog.tsx`.
  - **Super Admin — review:** `approvePayout(id)` → `APPROVED`, `rejectPayout(id, reason)` →
    `REJECTED` (requires a reason, **unlocks** the orders so they're payable again), and
    `markPayoutPaid(id)` → `PAID`. UI: `/dashboard/payouts`.
  Delivery charge and security money are platform revenue and are **never** part of a payout;
  `RETURNED` parcels are never settled or paid out. New types: `PayoutRequest`,
  `PayoutRequestStatus`. Status display: `components/payout-status-badge.tsx`.

---

## Demo Credentials

All defined in `lib/mock-data.ts` (`*_DEMO_CREDENTIALS`). The login page shows one quick-fill
button per role (Super Admin, Merchant, Rider, Warehouse Admin) — the raw email/password are
no longer displayed on screen. Values below are for reference.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | see `DEMO_CREDENTIALS` | — |
| Merchant | `imran@threadline.com` | `merchant123` |
| Rider (pickup) | `shahin@parcelflow.io` | `rider123` |
| Rider (delivery) | `kamrul@parcelflow.io` | `rider123` |
| Warehouse Admin | `rifat@parcelflow.io` | `warehouse123` |

Mock auth: any seeded merchant/rider email works with the shared demo password for that role.
The demo pickup rider (`shahin` / `rdr_02`) has seeded `APPROVED` orders so the pickup queue is
populated; the demo delivery rider (`kamrul` / `rdr_d_01`) has seeded `IN_TRANSIT` and
`OUT_FOR_DELIVERY` orders so the delivery queue is populated.

---

## How to Add a New Backend Behavior (recipe)

1. **Types** — add/extend interfaces and status values in `lib/types.ts`.
2. **Seed data** — add fields/records in `lib/mock-data.ts` so screens aren't empty.
3. **Action** — add state + a `useCallback` action in `lib/platform-context.tsx`, add it to
   `PlatformContextValue`, and expose it in the provider's value object. Return
   `{ ok, error? }` and enforce role/status guards inside the action.
4. **UI** — build/extend the page under the right role's `app/<role>/` folder; reuse
   `components/page-header.tsx`, `order-status-badge.tsx`, and `components/ui/*`.
5. **Verify** — log in with the relevant demo account and exercise the flow in the browser.

---

## Conventions

- **Currency:** Taka, formatted with `formatTk()` from `lib/pricing.ts`.
- **Status badges:** `components/order-status-badge.tsx`, `merchant-status-badge.tsx`,
  `role-badge.tsx` centralize status → color/label mapping. Add new statuses there.
- **Styling:** use design tokens (`bg-background`, `text-foreground`, etc.) and shadcn
  components; avoid hardcoded colors.
- **Mock only:** never introduce real fetch/DB calls unless explicitly asked — keep parity
  with the in-memory pattern.
