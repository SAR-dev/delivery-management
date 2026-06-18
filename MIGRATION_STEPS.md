# Migration Plan: Mock Data → Real Database

**Project:** ParcelFlow Delivery Management Platform  
**Stack:** Next.js App Router · Drizzle ORM · PostgreSQL · Better Auth  
**Scope:** Replace `lib/platform-context.tsx` (in-memory React state) with real API routes backed by the existing Drizzle schema (`lib/db/schema.ts`)

---

## Overview

The app already has a complete, well-designed Drizzle schema and a `db` connection in `lib/db/index.ts`. The schema matches the mock data 1:1 (types are derived directly from it). The migration is purely about wiring: replacing context actions with API calls, and moving logic from the client context into server-side route handlers.

The existing `lib/types.ts` and `lib/pricing.ts` are untouched throughout — they are already database-derived and backend-safe.

---

## Phase 0 — Environment Setup

**Goal:** Get a working local Postgres instance and run the initial migration.

1. **Provision a database.** Use any of: local Docker Postgres, Supabase, Neon, Railway, or PlanetScale-compatible Postgres.

2. **Set environment variables** in `.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/parcelflow
   BETTER_AUTH_SECRET=<random-32-char-string>
   BETTER_AUTH_URL=http://localhost:3000
   ```

3. **Install dependencies** (if not already present):
   ```bash
   npm install drizzle-kit @paralleldrive/cuid2
   ```

4. **Create a `drizzle.config.ts`** at the project root:
   ```ts
   import { defineConfig } from "drizzle-kit";
   export default defineConfig({
     schema: "./lib/db/schema.ts",
     out: "./drizzle",
     dialect: "postgresql",
     dbCredentials: { url: process.env.DATABASE_URL! },
   });
   ```

5. **Generate and run the migration:**
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```
   This creates all tables: `user`, `session`, `account`, `verification`, `profile`, `warehouse`, `rider`, `merchant`, `pickup_location`, `security_config`, `order`, `payout_request`.

6. **Create `lib/db/seed.ts`** and port the constants from `lib/mock-data.ts` into real `db.insert()` calls — warehouses, security config row (`id = 'default'`), demo users via Better Auth's `createUser`, and the seed orders. Run once:
   ```bash
   npx tsx lib/db/seed.ts
   ```

**Checkpoint:** `npx drizzle-kit studio` shows populated tables. Demo login works via Better Auth.

---

## Phase 1 — Auth (Replace Mock Login)

**Files touched:** `lib/auth.ts` (already exists), `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts`, `app/login/page.tsx`, `app/register/page.tsx`, `lib/platform-context.tsx`

The project already has Better Auth scaffolded. This phase activates it end-to-end.

1. **Verify `lib/auth.ts`** passes `database: pool` from `lib/db/index.ts` — Better Auth manages its own `user`, `session`, `account`, `verification` tables directly via the pool.

2. **Confirm `app/api/auth/[...all]/route.ts`** is the standard Better Auth handler. No changes needed if already in place.

3. **Replace the mock `login` action** in `platform-context.tsx`:  
   Remove the credential-matching logic against `DEMO_CREDENTIALS` / `MERCHANT_DEMO_CREDENTIALS` / etc. Call `authClient.signIn.email()` from `lib/auth-client.ts` instead.

4. **Replace the mock `logout` action**: call `authClient.signOut()`.

5. **Load the current user** on mount by calling `authClient.getSession()` and fetching the joined `profile` row from `/api/users/me` (create this route, see Phase 2).

6. **Remove** these imports from `platform-context.tsx`:
   ```ts
   SUPER_ADMIN, DEMO_CREDENTIALS, MERCHANT_DEMO_CREDENTIALS,
   RIDER_DEMO_CREDENTIALS, WAREHOUSE_DEMO_CREDENTIALS, MERCHANT_USERS,
   RIDER_USERS, DEFAULT_MERCHANT_PRICING
   ```

**Checkpoint:** Demo login/logout works. `currentUser` is populated from the real DB via session.

---

## Phase 2 — Core Read API Routes

**Goal:** Create server-side GET routes so the client can fetch live data instead of reading from mock arrays.

Create the following Next.js route handlers under `app/api/`. Each uses `db` from `lib/db/index.ts` and returns JSON. Auth guard: every route reads the Better Auth session via `auth.api.getSession({ headers })` and returns `401` if absent.

| Route                                      | Drizzle query                                                                                              | Replaces mock                         |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------|---------------------------------------|
| `GET /api/users/me`                        | Join `user` + `profile` for session userId                                                                 | `SUPER_ADMIN`, `MERCHANT_USERS`, etc. |
| `GET /api/warehouses`                      | `db.select().from(warehouse)`                                                                              | `WAREHOUSES`                          |
| `GET /api/team`                            | `db.select().from(profile).where(inArray(role, ["ADMIN","WAREHOUSE_ADMIN","SUPER_ADMIN"])).leftJoin(user)` | `INITIAL_TEAM`                        |
| `GET /api/merchants`                       | `db.select().from(merchant)`                                                                               | `INITIAL_MERCHANTS`                   |
| `GET /api/merchants/[id]/pickup-locations` | `db.select().from(pickupLocation).where(eq(merchantId, id))`                                               | `INITIAL_PICKUP_LOCATIONS`            |
| `GET /api/orders`                          | `db.select().from(order)` (with role-based filters)                                                        | `INITIAL_ORDERS`                      |
| `GET /api/riders`                          | `db.select().from(rider)`                                                                                  | `INITIAL_RIDERS`                      |
| `GET /api/security-config`                 | `db.select().from(securityConfig).where(eq(id, "default"))`                                                | `INITIAL_SECURITY_MONEY_CONFIG`       |
| `GET /api/payouts`                         | `db.select().from(payoutRequest)`                                                                          | `INITIAL_PAYOUT_REQUESTS`             |

**Role-based filtering for orders** (apply in the query `WHERE` clause):
- `MERCHANT` → filter by `merchantId = profile.merchantId`
- `RIDER` → filter by `pickupRiderId = profile.riderId` OR `deliveryRiderId = profile.riderId`
- `WAREHOUSE_ADMIN` → filter by `warehouseId = profile.warehouseId`
- `ADMIN` / `SUPER_ADMIN` → no filter

**In `platform-context.tsx`**, replace each `useState` initialised from mock data with a `useEffect` that calls `fetch("/api/...")` on mount:
```ts
// Before
const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS)

// After
const [merchants, setMerchants] = useState<Merchant[]>([])
useEffect(() => {
  fetch("/api/merchants").then(r => r.json()).then(setMerchants)
}, [])
```

**Checkpoint:** Dashboard stats, order list, merchant list, rider list all show real DB data.

---

## Phase 3 — Mutation API Routes (Actions → POST/PATCH)

Replace each mutating action in `platform-context.tsx` with a `fetch` call to a new API route. The server handler runs the Drizzle `insert`/`update`, then returns the updated row so the client can sync state.

### Auth & Team

| Action                    | Route                    | Method | Drizzle op                                           |
|---------------------------|--------------------------|--------|------------------------------------------------------|
| `createAccount`           | `/api/team`              | POST   | `db.insert(profile)` after creating Better Auth user |
| `toggleAccountActive`     | `/api/team/[id]/active`  | PATCH  | `db.update(profile).set({ isActive })`               |
| `togglePricingPermission` | `/api/team/[id]/pricing` | PATCH  | `db.update(profile).set({ canManagePricing })`       |

### Security Config

| Action                 | Route                  | Method | Drizzle op                                                   |
|------------------------|------------------------|--------|--------------------------------------------------------------|
| `updateSecurityConfig` | `/api/security-config` | PATCH  | `db.update(securityConfig).set(...).where(eq(id,"default"))` |

### Merchants

| Action               | Route                            | Method | Drizzle op                                                                         |
|----------------------|----------------------------------|--------|------------------------------------------------------------------------------------|
| `registerMerchant`   | `/api/merchants`                 | POST   | `db.insert(merchant)` + Better Auth user + `db.insert(profile)`                    |
| `approveMerchant`    | `/api/merchants/[id]/approve`    | PATCH  | `db.update(merchant).set({ status:"ACTIVE", approvedBy, approvedAt })`             |
| `suspendMerchant`    | `/api/merchants/[id]/suspend`    | PATCH  | `db.update(merchant).set({ status:"SUSPENDED" })`                                  |
| `reactivateMerchant` | `/api/merchants/[id]/reactivate` | PATCH  | `db.update(merchant).set({ status:"ACTIVE" })`                                     |
| `setMerchantPricing` | `/api/merchants/[id]/pricing`    | PATCH  | `db.update(merchant).set({ baseRate, extraRatePerKg, freeWeightKg, maxWeightKg })` |

### Orders

| Action                    | Route                               | Method | Drizzle op                                                                                                                        |
|---------------------------|-------------------------------------|--------|-----------------------------------------------------------------------------------------------------------------------------------|
| `createOrder`             | `/api/orders`                       | POST   | `db.insert(order)` with server-computed `code`, `deliveryCharge`, `securityMoney`, `totalCollectible` using `lib/pricing.ts`      |
| `approveAndAssignOrder`   | `/api/orders/[id]/approve`          | PATCH  | `db.update(order).set({ status:"APPROVED", approvedBy, approvedAt, pickupRiderId, assignedAt })`                                  |
| `markOrderPickedUp`       | `/api/orders/[id]/picked-up`        | PATCH  | `db.update(order).set({ status:"PICKED_UP", pickedUpAt })`                                                                        |
| `receiveOrderAtWarehouse` | `/api/orders/[id]/receive`          | PATCH  | `db.update(order).set({ status:"IN_WAREHOUSE", warehouseId, receivedAtWarehouseAt, receivedByWarehouse })`                        |
| `assignDeliveryRider`     | `/api/orders/[id]/dispatch`         | PATCH  | `db.update(order).set({ status:"IN_TRANSIT", deliveryRiderId, dispatchedAt, dispatchedBy })`                                      |
| `markOutForDelivery`      | `/api/orders/[id]/out-for-delivery` | PATCH  | `db.update(order).set({ status:"OUT_FOR_DELIVERY", outForDeliveryAt })`                                                           |
| `markDelivered`           | `/api/orders/[id]/delivered`        | PATCH  | `db.update(order).set({ status:"DELIVERED", deliveredAt, amountCollected, deliveryProofRef })`                                    |
| `markDeliveryFailed`      | `/api/orders/[id]/failed`           | PATCH  | `db.update(order).set({ status:"FAILED_ATTEMPT", failedAttemptAt, failureNote, deliveryAttempts: sql\`delivery_attempts + 1\` })` |
| `reattemptFailedOrder`    | `/api/orders/[id]/reattempt`        | PATCH  | `db.update(order).set({ status:"IN_TRANSIT", failedResolvedAt, failedResolvedBy })`                                               |
| `returnFailedOrder`       | `/api/orders/[id]/return`           | PATCH  | `db.update(order).set({ status:"RETURNED", returnedAt, returnReason, failedResolvedAt, failedResolvedBy })`                       |
| `settleOrderCod`          | `/api/orders/[id]/settle-cod`       | PATCH  | `db.update(order).set({ codSettledAt, codSettledBy })`                                                                            |

### Payouts

| Action           | Route                       | Method | Drizzle op                                                                                  |
|------------------|-----------------------------|--------|---------------------------------------------------------------------------------------------|
| `requestPayout`  | `/api/payouts`              | POST   | `db.insert(payoutRequest)` with server-generated `code` (PR-XXXX)                           |
| `approvePayout`  | `/api/payouts/[id]/approve` | PATCH  | `db.update(payoutRequest).set({ status:"APPROVED", reviewedBy, reviewedAt })`               |
| `rejectPayout`   | `/api/payouts/[id]/reject`  | PATCH  | `db.update(payoutRequest).set({ status:"REJECTED", reviewedBy, reviewedAt, rejectReason })` |
| `markPayoutPaid` | `/api/payouts/[id]/paid`    | PATCH  | `db.update(payoutRequest).set({ status:"PAID", paidAt })`                                   |

**In `platform-context.tsx`**, replace each action body with a `fetch` call and update local state from the returned row:
```ts
// Before (mock mutation)
async function approveMerchant(id: string) {
  setMerchants(prev => prev.map(m => m.id === id ? { ...m, status: "ACTIVE" } : m))
}

// After (real mutation)
async function approveMerchant(id: string) {
  const res = await fetch(`/api/merchants/${id}/approve`, { method: "PATCH" })
  const updated = await res.json()
  setMerchants(prev => prev.map(m => m.id === id ? updated : m))
}
```

**Checkpoint:** Every action in every role's flow persists to the database and survives a page refresh.

---

## Phase 4 — Remove Mock Data

Once all routes pass manual testing:

1. **Delete `lib/mock-data.ts`.**

2. **Remove all imports** of `mock-data` from:
    - `lib/platform-context.tsx`
    - `app/login/page.tsx`
    - `app/dashboard/page.tsx`
    - `app/dashboard/team/page.tsx`
    - `components/create-account-dialog.tsx`

3. The `WAREHOUSES` import in the dashboard and team pages was used to count warehouses — replace with the `warehouses` array now loaded from `/api/warehouses` via context.

4. **Verify** no remaining `import ... from "@/lib/mock-data"` anywhere:
   ```bash
   grep -r "mock-data" app/ components/ lib/ --include="*.ts" --include="*.tsx"
   ```

---

## Phase 5 — Hardening

These are not blocking but should be done before production:

- **Input validation:** Add `zod` schemas to all POST/PATCH route handlers and return `400` on bad input.
- **Optimistic UI:** For actions that feel slow (order status updates), show an optimistic state update in context and roll back on error.
- **Order code generation:** Move `PF-XXXXXX` code generation to the server (sequence or padded count from DB) to avoid collisions.
- **Error boundaries:** Wrap data-fetching effects with error state so the UI degrades gracefully.
- **Server Components:** High-read pages (order list, merchant list) can be converted to React Server Components that call `db` directly, removing the need for those GET API routes entirely.
- **Pagination:** Add `limit`/`offset` query params to `/api/orders` and `/api/merchants` once row counts grow.

---

## Summary of Files Changed

| File                                   | Change                                                                      |
|----------------------------------------|-----------------------------------------------------------------------------|
| `lib/mock-data.ts`                     | **Deleted** in Phase 4                                                      |
| `lib/platform-context.tsx`             | Auth calls → Better Auth client; `useState` init → empty; actions → `fetch` |
| `app/login/page.tsx`                   | Remove mock credential imports                                              |
| `app/dashboard/page.tsx`               | Remove `WAREHOUSES` import; use context `warehouses`                        |
| `app/dashboard/team/page.tsx`          | Same                                                                        |
| `components/create-account-dialog.tsx` | Same                                                                        |
| `app/api/**`                           | **New** — all route handlers created in Phases 1–3                          |
| `lib/db/seed.ts`                       | **New** — one-time seed script                                              |
| `drizzle.config.ts`                    | **New**                                                                     |

**Files that are never touched:** `lib/types.ts`, `lib/db/schema.ts`, `lib/db/index.ts`, `lib/pricing.ts`, all `components/ui/`, all page UI markup.
