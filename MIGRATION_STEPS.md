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

## Phase 1 — Auth (Replace Mock Login) ✅ Implemented

**Files touched:** `lib/auth.ts` (already exists), `lib/auth-client.ts` (already exists), `app/api/auth/[...all]/route.ts` (already exists), `app/login/page.tsx`, `app/register/page.tsx`, `lib/platform-context.tsx`

The project already has Better Auth fully scaffolded — `auth.ts`, `auth-client.ts`, and the catch-all route handler are already correct and need no edits. This phase is entirely about ripping the mock credential-matching out of `platform-context.tsx` and wiring it to the real Better Auth client + a new `/api/users/me` route. There is also one schema gap to close first: Better Auth's `user` table has no `role`/`merchantId`/`riderId`/`warehouseId` columns — that data lives in the app-owned `profile` table, joined by `user.id`.

### 1.1 Confirm the scaffolding is correct (no changes expected)

- `lib/auth.ts` — `betterAuth({ database: pool, plugins: [admin()], emailAndPassword: { enabled: true, autoSignIn: true }, ... })`. The `admin()` plugin is what lets a `SUPER_ADMIN`/`ADMIN` later create accounts for other roles via `authClient.admin.createUser(...)` instead of an open self-serve sign-up.
- `lib/auth-client.ts` — exports `authClient` plus the destructured `signIn`, `signUp`, `signOut`, `useSession` helpers from `createAuthClient()`.
- `app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth.handler)`. This single catch-all already serves every Better Auth endpoint (`/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session`, etc).

If `npx drizzle-kit studio` (Phase 0) shows `user`, `session`, `account`, `verification` tables already created, this phase needs zero backend route work — only client wiring.

### 1.2 Create `GET /api/users/me`

This is the one new route this phase needs (the rest of Phase 2's routes come later). It resolves a Better Auth session into the app's full `User` shape (role, merchant/rider/warehouse linkage) by joining `profile`:

```ts
// app/api/users/me/route.ts
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json(null, { status: 401 })

  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) return NextResponse.json(null, { status: 404 })

  return NextResponse.json({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: row.role,
    isActive: row.isActive,
    merchantId: row.merchantId,
    riderId: row.riderId,
    warehouseId: row.warehouseId,
    canManagePricing: row.canManagePricing,
  })
}
```

Adjust the exact `profile` column names to match `lib/db/schema.ts`; the shape returned here must satisfy the existing `User` type in `lib/types.ts` unchanged.

### 1.3 Replace mock session bootstrapping in `platform-context.tsx`

Today, mount-time restoration reads a raw user id out of `sessionStorage` and looks it up in an in-memory `knownUsers` array:

```ts
// Before
useEffect(() => {
  if (typeof window !== "undefined") {
    const savedId = window.sessionStorage.getItem(SESSION_KEY)
    const user = knownUsers.find((u) => u.id === savedId)
    if (user) setCurrentUser(user)
  }
  setIsReady(true)
}, [])
```

Replace it with a real session check against Better Auth, then hydrate from `/api/users/me`:

```ts
// After
useEffect(() => {
  async function bootstrap() {
    const { data: session } = await authClient.getSession()
    if (session) {
      const res = await fetch("/api/users/me")
      if (res.ok) {
        setCurrentUser(await res.json())
      }
    }
    setIsReady(true)
  }
  bootstrap()
}, [])
```

`SESSION_KEY` / `sessionStorage` can be deleted entirely — Better Auth already persists its own session cookie, so there is nothing left for the app to manage manually.

### 1.4 Replace the mock `login` action

The current `login` is **synchronous** and does manual email/password matching against four separate demo-credential constants (`DEMO_CREDENTIALS`, `MERCHANT_DEMO_CREDENTIALS`, `RIDER_DEMO_CREDENTIALS`, `WAREHOUSE_DEMO_CREDENTIALS`), each gating a different hardcoded user list (`SUPER_ADMIN`, `MERCHANT_USERS`, `RIDER_USERS`, `INITIAL_TEAM`). All four branches collapse into one real call:

```
// Before (sync, returns { ok, user?, error? } directly)
const login = useCallback((email: string, password: string) => {
  const normalized = email.trim().toLowerCase()
  if (normalized === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    setCurrentUser(SUPER_ADMIN)
    window.sessionStorage.setItem(SESSION_KEY, SUPER_ADMIN.id)
    return { ok: true, user: SUPER_ADMIN }
  }
  // ...three more near-identical blocks for merchant/rider/warehouse users
}, [merchantUsers])

// After (async — the interface value's signature must change to Promise<...>)
const login = useCallback(async (email: string, password: string) => {
  const { data, error } = await authClient.signIn.email({ email, password })
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Invalid email or password." }
  }
  const res = await fetch("/api/users/me")
  if (!res.ok) {
    return { ok: false, error: "Could not load your account." }
  }
  const user = await res.json()
  if (!user.isActive) {
    return { ok: false, error: "This account has been deactivated." }
  }
  setCurrentUser(user)
  return { ok: true, user }
}, [])
```

Because `login` becomes `async`, update:
- The `PlatformContextValue` interface: `login: (email: string, password: string) => Promise<{ ok: boolean; user?: User; error?: string }>`.
- `app/login/page.tsx`'s `handleSubmit` — it currently does `const result = login(email, password)` synchronously inside a non-async handler; change the handler to `async function handleSubmit(e: React.FormEvent)` and `const result = await login(email, password)`, keeping the existing `submitting` state around the call.

### 1.5 Replace the mock `logout` action

```
// Before
const logout = useCallback(() => {
  setCurrentUser(null)
  window.sessionStorage.removeItem(SESSION_KEY)
  router.push("/login")
}, [router])

// After
const logout = useCallback(async () => {
  await authClient.signOut()
  setCurrentUser(null)
  router.push("/login")
}, [router])
```

Update the interface signature to `logout: () => Promise<void>` and check call sites (e.g. a sidebar "Sign out" button) — if they call `logout()` without `await`, that's fine since the UI just needs the redirect to fire after the cookie clears, but prefer awaiting it so the redirect doesn't race the sign-out request.

### 1.6 Handle registration (`app/register/page.tsx`)

This page currently creates a merchant user entirely in memory (added to local `merchantUsers` state via `registerMerchant`, see Phase 3). For Phase 1 purposes, just make sure whatever account-creation path it uses ends in a real Better Auth user:
- Self-serve merchant sign-up → `authClient.signUp.email({ email, password, name })`. `autoSignIn: true` in `auth.ts` means the user is logged in immediately after.
- Staff accounts created by an admin (`createAccount` in the context, used by `create-account-dialog.tsx`) → use the `admin()` plugin's server-side `authClient.admin.createUser({ email, password, name, role })` so an existing admin can provision accounts without that triggering a session swap. This wiring belongs to Phase 3 (`createAccount`), but note it here since it shares the same Better Auth surface — don't build a second parallel "create user" mechanism.

### 1.7 Remove now-dead mock imports

Once 1.3–1.5 are done, these become unused in `platform-context.tsx`:
```ts
SUPER_ADMIN, DEMO_CREDENTIALS, MERCHANT_DEMO_CREDENTIALS,
  RIDER_DEMO_CREDENTIALS, WAREHOUSE_DEMO_CREDENTIALS, MERCHANT_USERS,
  RIDER_USERS, DEFAULT_MERCHANT_PRICING
```
Also delete the `knownUsers` array and the `SESSION_KEY` constant — both were only in service of the manual session-restore logic removed in 1.3. Leave `INITIAL_TEAM`, `INITIAL_MERCHANTS`, etc. imported for now; those are removed in their respective Phase 2/3/4 steps, not here.

**Checkpoint:** Visiting `/login` and signing in with a seeded user's real email/password (created by `lib/db/seed.ts` in Phase 0, not the old shared demo passwords) sets a Better Auth session cookie, `currentUser` populates from `/api/users/me`, and a hard refresh keeps you logged in. Signing out clears the cookie and redirects to `/login`.

---

## Phase 2 — Core Read API Routes

**Goal:** Create server-side GET routes so the client can fetch live data instead of reading from mock arrays, and wire `platform-context.tsx` to load from them once a session exists.

**Files touched:** `app/api/warehouses/route.ts`, `app/api/team/route.ts`, `app/api/merchants/route.ts`, `app/api/pickup-locations/route.ts`, `app/api/riders/route.ts`, `app/api/security-config/route.ts`, `app/api/payouts/route.ts`, `app/api/orders/route.ts` (all new), `lib/platform-context.tsx`

### 2.0 Shared auth guard

Every route below repeats the same three lines. Pull them into a helper so route handlers stay short and consistent:

```ts
// lib/api-auth.ts
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1)

  if (!row) return null

  return { userId: session.user.id, ...row }
}
```

This returns the same role/merchantId/riderId/warehouseId shape `/api/users/me` already computes, so every route below can do `const me = await requireSession(); if (!me) return 401` and immediately has `me.role`, `me.merchantId`, etc. for filtering.

### 2.1 `GET /api/warehouses`

```ts
// app/api/warehouses/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { warehouse } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const rows = await db.select().from(warehouse)
  return NextResponse.json(rows)
}
```

No role filter — every authenticated role needs to read warehouse names somewhere (dashboard counts, the Warehouse Admin's own warehouse, dispatch destination pickers).

### 2.2 `GET /api/team`

Replaces `INITIAL_TEAM` — the staff directory (`SUPER_ADMIN`, `ADMIN`, `WAREHOUSE_ADMIN` roles), joined with `user` for name/email:

```ts
// app/api/team/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { profile, user } from "@/lib/db/schema"
import { inArray, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json([], { status: 200 }) // not an error — just nothing to show
  }

  const rows = await db
    .select()
    .from(profile)
    .innerJoin(user, eq(profile.userId, user.id))
    .where(inArray(profile.role, ["SUPER_ADMIN", "ADMIN", "WAREHOUSE_ADMIN"]))

  // innerJoin returns { profile: {...}, user: {...} } per row — flatten to
  // match the existing User shape (same flattening /api/users/me does).
  const team = rows.map(({ profile: p, user: u }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: p.role,
    phone: p.phone,
    isActive: p.isActive,
    canManagePricing: p.canManagePricing,
    warehouseId: p.warehouseId,
    merchantId: p.merchantId,
    riderId: p.riderId,
  }))

  return NextResponse.json(team)
}
```

Only `SUPER_ADMIN`/`ADMIN` get real rows back; everyone else gets an empty array rather than a 403, since `team` is read by layouts that mount for every role but only the admin console actually renders it.

### 2.3 `GET /api/merchants`

```ts
// app/api/merchants/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // A MERCHANT user only ever needs their own business; everyone else
  // (ADMIN/SUPER_ADMIN approving/pricing merchants, riders/warehouse staff
  // resolving a merchant name on an order) needs the full list.
  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db.select().from(merchant).where(eq(merchant.id, me.merchantId))
    return NextResponse.json(rows)
  }

  const rows = await db.select().from(merchant)
  return NextResponse.json(rows)
}
```

### 2.4 `GET /api/pickup-locations` (replaces the per-merchant route from the original plan)

The original Phase 2 sketch proposed `GET /api/merchants/[id]/pickup-locations`. Looking at how `pickupLocations` is actually consumed in `platform-context.tsx`, that doesn't fit: it's exposed as one flat array used in two different places —
- `components/approve-order-dialog.tsx` looks up *any* order's pickup location by id, regardless of which merchant it belongs to (an Admin approving orders across all merchants).
- `app/merchant/orders/new/page.tsx` filters the same flat array down to `currentMerchant.id` client-side.

A single merchant-scoped endpoint can't serve the Admin case without N+1 calls. Use one route with an optional query param instead:

```ts
// app/api/pickup-locations/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { pickupLocation } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const merchantId = new URL(req.url).searchParams.get("merchantId")
  const effectiveMerchantId =
    me.role === "MERCHANT" ? me.merchantId : merchantId

  const rows = effectiveMerchantId
    ? await db.select().from(pickupLocation).where(eq(pickupLocation.merchantId, effectiveMerchantId))
    : await db.select().from(pickupLocation)

  return NextResponse.json(rows)
}
```

A `MERCHANT` always gets pinned to their own locations no matter what query param is passed (defense in depth); everyone else can optionally scope with `?merchantId=`, and the context fetches with no param to get the full list it needs for the approve dialog.

### 2.5 `GET /api/riders`

```ts
// app/api/riders/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { rider } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const rows = await db.select().from(rider)
  return NextResponse.json(rows)
}
```

No filtering — Admins assign pickup riders, Warehouse Admins dispatch delivery riders scoped to their warehouse (filtered client-side via `warehouseDeliveryRiders`, already derived in context from `riders` + `currentWarehouse`), and a logged-in `RIDER` resolves their own `currentRider` by matching `me.riderId` against this same list. Splitting this further isn't worth it for a list this small; revisit under Phase 5 pagination if the rider roster grows.

### 2.6 `GET /api/security-config`

```ts
// app/api/security-config/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { securityConfig } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  const [row] = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
    .limit(1)

  return NextResponse.json(row ?? null)
}
```

### 2.7 `GET /api/payouts`

```ts
// app/api/payouts/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { payoutRequest } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  if (me.role === "MERCHANT" && me.merchantId) {
    const rows = await db
      .select()
      .from(payoutRequest)
      .where(eq(payoutRequest.merchantId, me.merchantId))
    return NextResponse.json(rows)
  }

  // SUPER_ADMIN reviews/approves payouts platform-wide; everyone else who
  // isn't a merchant has no use for this list, but an empty array is
  // harmless and avoids a special-cased error for roles that never call it.
  if (me.role !== "SUPER_ADMIN") return NextResponse.json([])

  const rows = await db.select().from(payoutRequest)
  return NextResponse.json(rows)
}
```

### 2.8 `GET /api/orders` (role-based filtering)

This is the one route where the filtering rules matter operationally — every other role's dashboard is built by slicing this same list client-side, so the server must return exactly the rows each role is allowed to see:

```ts
// app/api/orders/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  switch (me.role) {
    case "MERCHANT": {
      if (!me.merchantId) return NextResponse.json([])
      const rows = await db.select().from(order).where(eq(order.merchantId, me.merchantId))
      return NextResponse.json(rows)
    }
    case "RIDER": {
      if (!me.riderId) return NextResponse.json([])
      const rows = await db
        .select()
        .from(order)
        .where(or(eq(order.pickupRiderId, me.riderId), eq(order.deliveryRiderId, me.riderId)))
      return NextResponse.json(rows)
    }
    case "WAREHOUSE_ADMIN": {
      if (!me.warehouseId) return NextResponse.json([])
      const rows = await db.select().from(order).where(eq(order.warehouseId, me.warehouseId))
      return NextResponse.json(rows)
    }
    case "ADMIN":
    case "SUPER_ADMIN": {
      const rows = await db.select().from(order)
      return NextResponse.json(rows)
    }
    default:
      return NextResponse.json([])
  }
}
```

Two things worth flagging rather than silently working around:
- A `WAREHOUSE_ADMIN` filtered strictly by `warehouseId` won't see `PENDING`/`APPROVED` orders that haven't reached their warehouse yet, even though `app/warehouse/dispatch/page.tsx` or similar may expect to see inbound parcels assigned to riders heading their way. Check each warehouse page's actual query against `orders` before assuming this single filter covers every warehouse view — it may need an `or(...)` similar to the rider case (e.g. also matching orders where the assigned pickup/delivery rider's `warehouseId` equals theirs). Don't add that speculatively; confirm against the real page logic first.
- This single filter only handles the *current* role. If a future feature lets one logged-in person hold multiple roles (e.g. a Warehouse Admin who's also a rider), this route's `switch` would need to change to an `or()` across applicable conditions — not a concern today since `profile.role` is a single column, just don't assume the shape is more flexible than it is.

### 2.9 Wire `platform-context.tsx` to load from these routes

Today every list (`team`, `merchants`, `orders`, `riders`, `warehouses`, `payoutRequests`, `securityConfig`) is seeded synchronously from mock constants and is available before any session exists. Once it's coming from auth-guarded routes, loading has to wait for `currentUser` to be known — fetching before that just throws `401`s into the void on the login page itself, since `PlatformProvider` wraps the whole app including unauthenticated routes.

Replace the mock-seeded `useState`s:

```ts
// Before
const [team, setTeam] = useState<User[]>(INITIAL_TEAM)
const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS)
const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(INITIAL_PAYOUT_REQUESTS)
const [pickupLocations] = useState<PickupLocation[]>(INITIAL_PICKUP_LOCATIONS)
const [riders] = useState<Rider[]>(INITIAL_RIDERS)
const [warehouses] = useState<Warehouse[]>(WAREHOUSES)
const [securityConfig, setSecurityConfig] = useState<SecurityMoneyConfig>(INITIAL_SECURITY_MONEY_CONFIG)
```

with empty/blank initial values, then load everything in one effect keyed on `currentUser`:

```ts
// After
const [team, setTeam] = useState<User[]>([])
const [merchants, setMerchants] = useState<Merchant[]>([])
const [orders, setOrders] = useState<Order[]>([])
const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([])
const [riders, setRiders] = useState<Rider[]>([])
const [warehouses, setWarehouses] = useState<Warehouse[]>([])
const [securityConfig, setSecurityConfig] = useState<SecurityMoneyConfig | null>(null)

useEffect(() => {
  if (!currentUser) {
    // Logged out (or not yet loaded) — make sure stale data from a
    // previous session doesn't leak across a logout/login swap.
    setTeam([]); setMerchants([]); setOrders([]); setPayoutRequests([])
    setPickupLocations([]); setRiders([]); setWarehouses([]); setSecurityConfig(null)
    return
  }

  let cancelled = false

  async function loadAll() {
    const [
      teamRes, merchantsRes, ordersRes, payoutsRes,
      pickupLocationsRes, ridersRes, warehousesRes, securityConfigRes,
    ] = await Promise.all([
      fetch("/api/team"),
      fetch("/api/merchants"),
      fetch("/api/orders"),
      fetch("/api/payouts"),
      fetch("/api/pickup-locations"),
      fetch("/api/riders"),
      fetch("/api/warehouses"),
      fetch("/api/security-config"),
    ])
    if (cancelled) return

    if (teamRes.ok) setTeam(await teamRes.json())
    if (merchantsRes.ok) setMerchants(await merchantsRes.json())
    if (ordersRes.ok) setOrders(await ordersRes.json())
    if (payoutsRes.ok) setPayoutRequests(await payoutsRes.json())
    if (pickupLocationsRes.ok) setPickupLocations(await pickupLocationsRes.json())
    if (ridersRes.ok) setRiders(await ridersRes.json())
    if (warehousesRes.ok) setWarehouses(await warehousesRes.json())
    if (securityConfigRes.ok) setSecurityConfig(await securityConfigRes.json())
  }

  loadAll()
  return () => { cancelled = true }
}, [currentUser])
```

Notes on this change:
- `securityConfig`'s type becomes `SecurityMoneyConfig | null` in both the `useState` and the `PlatformContextValue` interface — every consumer (`updateSecurityConfig`'s UI, the security-money settings page) needs a null check or an `isReady`-style loading guard, since the value is genuinely absent until the fetch resolves. Don't paper over this with a fake default object; a missing security config row is a real Phase 0 seeding bug worth surfacing, not hiding.
- This effect intentionally re-runs on *every* `currentUser` change, not just mount — so logging out and back in as a different role re-fetches everything with that role's filters, instead of leaving the previous user's `orders`/`payoutRequests` slice in state.
- This is still client-fetched, not Server Components — consistent with the rest of this migration plan (Phase 5 notes Server Components as a later optional hardening step, not part of this phase).
- Once this lands, `INITIAL_TEAM`, `INITIAL_MERCHANTS`, `INITIAL_PICKUP_LOCATIONS`, `INITIAL_ORDERS`, `INITIAL_RIDERS`, `WAREHOUSES`, `INITIAL_SECURITY_MONEY_CONFIG`, and `INITIAL_PAYOUT_REQUESTS` are no longer referenced in `platform-context.tsx` — remove them from the `mock-data` import. Leave `DEFAULT_MERCHANT_PRICING` imported; `registerMerchant` (Phase 3) still uses it.

**Checkpoint:** After Phase 1 login, the dashboard, order list, merchant list, rider list, and security-money settings all show real DB rows (from `lib/db/seed.ts`) instead of the mock constants, scoped correctly per role. Logging out and logging back in as a different role shows that role's own slice of `orders`/`payouts`, not leftover data from the previous session.

---


## Phase 3 — Mutation API Routes (Actions → POST/PATCH)

Replace each mutating action in `platform-context.tsx` with a `fetch` call to a new API route. The server handler validates the request, runs the Drizzle `insert`/`update`, and returns the updated row so the client can sync state without a full reload.

**Pattern for every route handler:** call `requireSession()` first, guard with role checks, validate the body, run the DB operation, return the updated row as JSON. If the DB write fails, return a 500 rather than optimistically updating state.

**Pattern for every context action:** replace the in-memory `setState` call with a `fetch`, update local state only after a successful response. The context interface signatures all stay the same — only the implementations change.

Before starting, add `name` to the return of `requireSession()` in `lib/api-auth.ts` — every route below needs it for `approvedBy`, `dispatchedBy`, `updatedBy`, and similar audit columns. The current implementation only returns `profile` columns; `session.user.name` comes from Better Auth's `user` table which the profile query doesn't join:

```ts
// lib/api-auth.ts — add name to return value
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const [row] = await db.select().from(profile).where(eq(profile.userId, session.user.id)).limit(1)
  if (!row) return null
  return { ...row, userId: session.user.id, name: session.user.name }
}
```

---

### 3.1 Auth & Team

#### `POST /api/team` — `createAccount`

Creates a new `ADMIN` or `WAREHOUSE_ADMIN` staff account. Two writes must happen in sequence: first create the Better Auth user (so credentials are stored in the `account` table), then insert the app-level `profile` row with role + warehouse linkage. Use Better Auth's admin plugin `auth.api.createUser()` so the caller's own session is not disrupted. Only `SUPER_ADMIN` and `ADMIN` can call this route.

```ts
// app/api/team/route.ts
import { requireSession } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, phone, role: newRole, warehouseId, canManagePricing, password } = body

  if (!name || !email || !phone || !newRole || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (newRole !== "ADMIN" && newRole !== "WAREHOUSE_ADMIN") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  // Use the admin plugin so the caller's own session cookie is untouched.
  const { data: created, error } = await auth.api.createUser({
    body: { name, email, password, role: newRole },
  })
  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 400 })
  }

  await db.insert(profile).values({
    userId: created.user.id,
    role: newRole,
    phone,
    isActive: true,
    canManagePricing: newRole === "ADMIN" ? (canManagePricing ?? false) : false,
    warehouseId: newRole === "WAREHOUSE_ADMIN" ? (warehouseId ?? null) : null,
  })

  // Return the full joined User shape so the context can push it into `team`
  // without a separate refetch.
  const [profileRow] = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, created.user.id))
    .limit(1)

  return NextResponse.json({
    id: created.user.id,
    name: created.user.name,
    email: created.user.email,
    emailVerified: created.user.emailVerified,
    createdAt: created.user.createdAt,
    updatedAt: created.user.updatedAt,
    role: profileRow.role,
    phone: profileRow.phone,
    isActive: profileRow.isActive,
    canManagePricing: profileRow.canManagePricing,
    warehouseId: profileRow.warehouseId,
    merchantId: profileRow.merchantId,
    riderId: profileRow.riderId,
  }, { status: 201 })
}
```

In `platform-context.tsx`, `createAccount` currently returns `void` synchronously and calls `setTeam` directly with a fake ID. Replace it with an `async` call to the route:

```ts
// Before
const createAccount = useCallback((input: NewAccountInput) => {
  const id = `usr_${...}`
  // ... build account object from input ...
  setTeam((prev) => [account, ...prev])
}, [])

// After
const createAccount = useCallback(async (input: NewAccountInput & { password: string }) => {
  const res = await fetch("/api/team", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) return
  const newUser = await res.json()
  setTeam((prev) => [newUser, ...prev])
}, [])
```

Update the `PlatformContextValue` interface: `createAccount: (input: NewAccountInput & { password: string }) => Promise<void>`. Update `create-account-dialog.tsx` to pass `password` in its submit handler and `await` the call if it manages a loading state.

---

#### `PATCH /api/team/[id]/active` — `toggleAccountActive`

Reads the current `isActive` value and flips it server-side, so the client doesn't need to pass the new value — matching the toggle semantics of the existing context action.

```ts
// app/api/team/[id]/active/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [current] = await db
    .select({ isActive: profile.isActive })
    .from(profile)
    .where(eq(profile.userId, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [updated] = await db
    .update(profile)
    .set({ isActive: !current.isActive })
    .where(eq(profile.userId, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

In `platform-context.tsx`:

```ts
// Before
const toggleAccountActive = useCallback((id: string) => {
  setTeam((prev) => prev.map((u) => u.id === id ? { ...u, isActive: !u.isActive } : u))
}, [])

// After
const toggleAccountActive = useCallback(async (id: string) => {
  const res = await fetch(`/api/team/${id}/active`, { method: "PATCH" })
  if (!res.ok) return
  const updatedProfile = await res.json()
  setTeam((prev) => prev.map((u) => u.id === id ? { ...u, isActive: updatedProfile.isActive } : u))
}, [])
```

---

#### `PATCH /api/team/[id]/pricing` — `togglePricingPermission`

Only `SUPER_ADMIN` may change pricing permission. The route enforces this and also verifies the target is an `ADMIN` — the toggle is a no-op for other roles in the mock, so the server should reject it explicitly rather than silently succeed.

```ts
// app/api/team/[id]/pricing/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { profile } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [current] = await db
    .select({ role: profile.role, canManagePricing: profile.canManagePricing })
    .from(profile)
    .where(eq(profile.userId, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN users have pricing permission" }, { status: 400 })
  }

  const [updated] = await db
    .update(profile)
    .set({ canManagePricing: !current.canManagePricing })
    .where(eq(profile.userId, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

In `platform-context.tsx`:

```ts
// Before
const togglePricingPermission = useCallback((id: string) => {
  setTeam((prev) => prev.map((u) =>
    u.id === id && u.role === "ADMIN" ? { ...u, canManagePricing: !u.canManagePricing } : u
  ))
}, [])

// After
const togglePricingPermission = useCallback(async (id: string) => {
  const res = await fetch(`/api/team/${id}/pricing`, { method: "PATCH" })
  if (!res.ok) return
  const updatedProfile = await res.json()
  setTeam((prev) => prev.map((u) =>
    u.id === id ? { ...u, canManagePricing: updatedProfile.canManagePricing } : u
  ))
}, [])
```

---

### 3.2 Security Config

#### `PATCH /api/security-config` — `updateSecurityConfig`

The security config is a single-row table (`id = 'default'`), seeded in Phase 0. Add the `PATCH` handler alongside the existing `GET` in the same file. Only `SUPER_ADMIN` and `ADMIN` users with `canManagePricing` may write it.

```ts
// app/api/security-config/route.ts — add PATCH alongside existing GET
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { securityConfig } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  const canWrite =
    me.role === "SUPER_ADMIN" ||
    (me.role === "ADMIN" && me.canManagePricing)
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { lowValueThreshold, lowValueFlatFee, highValuePercentage } = body

  if (
    typeof lowValueThreshold !== "number" ||
    typeof lowValueFlatFee !== "number" ||
    typeof highValuePercentage !== "number"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const [updated] = await db
    .update(securityConfig)
    .set({
      lowValueThreshold,
      lowValueFlatFee,
      highValuePercentage,
      updatedAt: new Date().toISOString(),
      updatedBy: me.name,
    })
    .where(eq(securityConfig.id, "default"))
    .returning()

  return NextResponse.json(updated)
}
```

In `platform-context.tsx`, `updateSecurityConfig` currently mutates state synchronously. Make it `async` and update state from the returned row:

```ts
// Before
const updateSecurityConfig = useCallback((next) => {
  setSecurityConfig((prev) => {
    if (!prev) return prev
    return { ...prev, ...next, updatedAt: new Date().toISOString(), updatedBy: currentUser?.name ?? "Super Admin" }
  })
}, [currentUser?.name])

// After
const updateSecurityConfig = useCallback(async (next) => {
  const res = await fetch("/api/security-config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(next),
  })
  if (!res.ok) return
  const updated = await res.json()
  setSecurityConfig(updated)
}, [])
```

Update the `PlatformContextValue` interface: `updateSecurityConfig: (...) => Promise<void>`.

---

### 3.3 Merchants

#### `POST /api/merchants` — `registerMerchant`

The registration flow does three things: insert a `merchant` row, create a Better Auth user for the owner, and insert a `profile` row linking them. The route must be **unauthenticated** — no `requireSession()` guard — because it is called from the public sign-up page.

```ts
// app/api/merchants/route.ts — add POST alongside existing GET
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { merchant, profile } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { businessName, ownerName, email, phone, address, password } = body

  if (!businessName || !ownerName || !email || !phone || !address || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // 1. Insert the merchant row first (no dependency on the Better Auth user).
  const [newMerchant] = await db
    .insert(merchant)
    .values({
      businessName,
      ownerName,
      email,
      phone,
      address,
      status: "PENDING",
      baseRate: 0,
      extraRatePerKg: 0,
      freeWeightKg: 1,
      maxWeightKg: 3,
    })
    .returning()

  // 2. Create the Better Auth user.
  const { data: created, error } = await auth.api.createUser({
    body: { name: ownerName, email, password, role: "MERCHANT" },
  })
  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create user account" },
      { status: 400 },
    )
  }

  // 3. Link the Better Auth user to the merchant row via the profile table.
  await db.insert(profile).values({
    userId: created.user.id,
    role: "MERCHANT",
    phone,
    isActive: true,
    canManagePricing: false,
    merchantId: newMerchant.id,
  })

  return NextResponse.json(newMerchant, { status: 201 })
}
```

In `app/register/page.tsx`, replace the context call with a direct fetch, then sign in using `authClient.signUp.email()`. Because `autoSignIn: true` is set in `auth.ts`, `signUp` establishes a session automatically — no separate login call needed:

```ts
// app/register/page.tsx — handleSubmit (simplified)
const res = await fetch("/api/merchants", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ businessName, ownerName, email, phone, address, password }),
})
if (!res.ok) {
  const { error } = await res.json()
  setError(error)
  return
}
// autoSignIn logs the user in immediately after sign-up.
const { error: signUpError } = await authClient.signUp.email({ email, password, name: ownerName })
if (signUpError) { setError(signUpError.message); return }
router.push("/merchant")
```

Remove `registerMerchant` from `PlatformContextValue` entirely — it's now handled at the page level. Also remove the `merchantUsers` state from `PlatformProvider`, which was only used by the mock credential-matching login (removed in Phase 1).

---

#### `PATCH /api/merchants/[id]/approve` — `approveMerchant`

```ts
// app/api/merchants/[id]/approve/route.ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [current] = await db
    .select({ status: merchant.status })
    .from(merchant)
    .where(eq(merchant.id, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING merchants can be approved" }, { status: 400 })
  }

  const [updated] = await db
    .update(merchant)
    .set({
      status: "ACTIVE",
      approvedBy: me.name,
      approvedAt: new Date().toISOString(),
    })
    .where(eq(merchant.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

In `platform-context.tsx`:

```ts
// Before
const approveMerchant = useCallback((id: string) => {
  setMerchants((prev) => prev.map((m) =>
    m.id === id ? { ...m, status: "ACTIVE", approvedBy: currentUser?.name ?? "Super Admin", approvedAt: new Date().toISOString() } : m
  ))
}, [currentUser?.name])

// After
const approveMerchant = useCallback(async (id: string) => {
  const res = await fetch(`/api/merchants/${id}/approve`, { method: "PATCH" })
  if (!res.ok) return
  const updated = await res.json()
  setMerchants((prev) => prev.map((m) => m.id === id ? updated : m))
}, [])
```

---

#### `PATCH /api/merchants/[id]/suspend` — `suspendMerchant`

```ts
// app/api/merchants/[id]/suspend/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [updated] = await db
    .update(merchant)
    .set({ status: "SUSPENDED" })
    .where(eq(merchant.id, params.id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/merchants/[id]/reactivate` — `reactivateMerchant`

Identical structure to `/suspend` but sets `status: "ACTIVE"`. Create `app/api/merchants/[id]/reactivate/route.ts` with the same auth guard and a single `.set({ status: "ACTIVE" })`.

---

#### `PATCH /api/merchants/[id]/pricing` — `setMerchantPricing`

Only `SUPER_ADMIN` and `ADMIN` users with `canManagePricing` may set pricing. Validate that `freeWeightKg` does not exceed `maxWeightKg` before writing, since the client-side `calcDeliveryCharge` would produce negative extra-weight values otherwise.

```ts
// app/api/merchants/[id]/pricing/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  const canWrite =
    me.role === "SUPER_ADMIN" ||
    (me.role === "ADMIN" && me.canManagePricing)
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { baseRate, extraRatePerKg, freeWeightKg, maxWeightKg } = body

  if (
    typeof baseRate !== "number" ||
    typeof extraRatePerKg !== "number" ||
    typeof freeWeightKg !== "number" ||
    typeof maxWeightKg !== "number"
  ) {
    return NextResponse.json({ error: "Invalid pricing payload" }, { status: 400 })
  }
  if (freeWeightKg > maxWeightKg) {
    return NextResponse.json({ error: "freeWeightKg cannot exceed maxWeightKg" }, { status: 400 })
  }

  const [updated] = await db
    .update(merchant)
    .set({ baseRate, extraRatePerKg, freeWeightKg, maxWeightKg })
    .where(eq(merchant.id, params.id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
```

---

### 3.4 Orders

All order mutation routes share the same pattern: fetch the current order row to verify its status, update only the columns that change in this lifecycle step, and return the updated row. The validation logic that was spread across the context's `useCallback`s (checking current status, verifying rider ownership, etc.) moves verbatim into the corresponding route handler.

#### `POST /api/orders` — `createOrder`

All pricing computation moves to the server. The client sends the raw `CreateOrderInput`; the server fetches the merchant row and the security config, runs `calcDeliveryCharge` / `calcSecurityMoney` from `lib/pricing.ts`, generates the `PF-` code from a DB-level `MAX(code)`, and inserts. This prevents a client from submitting tampered pricing values.

```ts
// app/api/orders/route.ts — add POST alongside existing GET
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { merchant, order, securityConfig } from "@/lib/db/schema"
import { calcDeliveryCharge, calcSecurityMoney } from "@/lib/pricing"
import { eq, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json({ error: "Only merchants can create orders" }, { status: 403 })
  }

  const body = await req.json()
  const {
    pickupLocationId, recipientName, recipientPhone,
    deliveryAddress, deliveryCity, parcelWeightKg, deliveryType, productCost,
  } = body

  const [merchantRow] = await db
    .select()
    .from(merchant)
    .where(eq(merchant.id, me.merchantId))
    .limit(1)

  if (!merchantRow) return NextResponse.json({ error: "Merchant not found" }, { status: 404 })
  if (merchantRow.status !== "ACTIVE") {
    return NextResponse.json({
      error: merchantRow.status === "PENDING"
        ? "Your merchant account is pending approval."
        : "Your merchant account is suspended and cannot create orders.",
    }, { status: 400 })
  }
  if (parcelWeightKg <= 0) {
    return NextResponse.json({ error: "Parcel weight must be greater than 0." }, { status: 400 })
  }
  if (parcelWeightKg > merchantRow.maxWeightKg) {
    return NextResponse.json({
      error: `Parcel weight exceeds the ${merchantRow.maxWeightKg} KG limit.`,
    }, { status: 400 })
  }
  if (productCost < 0) {
    return NextResponse.json({ error: "Product cost cannot be negative." }, { status: 400 })
  }

  const { total: deliveryCharge } = calcDeliveryCharge(merchantRow, parcelWeightKg)

  const [configRow] = await db
    .select()
    .from(securityConfig)
    .where(eq(securityConfig.id, "default"))
    .limit(1)

  if (!configRow) return NextResponse.json({ error: "Security config not found" }, { status: 500 })
  const securityMoney = calcSecurityMoney(configRow, productCost)
  const totalCollectible = productCost + deliveryCharge + securityMoney

  // MAX(code) is a DB-level operation, avoiding collisions under concurrent inserts
  // that the client-side `orders.reduce` over in-memory state couldn't prevent.
  const [{ maxCode }] = await db
    .select({ maxCode: sql<string>`max(code)` })
    .from(order)
  const maxSeq = maxCode ? Number.parseInt(maxCode.replace(/^PF-0*/, ""), 10) : 100258
  const seq = (Number.isFinite(maxSeq) ? maxSeq : 100258) + 1
  const code = `PF-${String(seq).padStart(6, "0")}`

  const [newOrder] = await db
    .insert(order)
    .values({
      code,
      merchantId: me.merchantId,
      pickupLocationId,
      recipientName,
      recipientPhone,
      deliveryAddress,
      deliveryCity,
      parcelWeightKg,
      deliveryType: deliveryType ?? "STANDARD",
      productCost,
      deliveryCharge,
      securityMoney,
      totalCollectible,
      status: "PENDING",
      deliveryAttempts: 0,
    })
    .returning()

  return NextResponse.json(newOrder, { status: 201 })
}
```

In `platform-context.tsx`, `createOrder` currently performs validation and pricing client-side and returns synchronously. Make it `async`, delegate everything to the route, and push the returned order into state only on success:

```ts
// Before
const createOrder = useCallback((input) => {
  if (!currentMerchant) return { ok: false, error: "No merchant context." }
  // ... validation, calcDeliveryCharge, calcSecurityMoney, setOrders ...
  return { ok: true, order }
}, [securityConfig, orders])

// After
const createOrder = useCallback(async (input) => {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error ?? "Failed to create order." }
  setOrders((prev) => [data, ...prev])
  return { ok: true, order: data }
}, [])
```

---

#### `PATCH /api/orders/[id]/approve` — `approveAndAssignOrder`

```ts
// app/api/orders/[id]/approve/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { riderId } = await req.json()
  if (!riderId) return NextResponse.json({ error: "riderId is required" }, { status: 400 })

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING orders can be approved" }, { status: 400 })
  }

  const [riderRow] = await db.select().from(rider).where(eq(rider.id, riderId)).limit(1)
  if (!riderRow || !riderRow.isActive) {
    return NextResponse.json({ error: "Select an active pickup rider." }, { status: 400 })
  }
  if (riderRow.warehouseId) {
    return NextResponse.json({
      error: "Select a pickup rider — this rider is a warehouse delivery rider.",
    }, { status: 400 })
  }

  // Weight compliance against the merchant's current pricing settings.
  const [merchantRow] = await db
    .select({ maxWeightKg: merchant.maxWeightKg })
    .from(merchant)
    .where(eq(merchant.id, orderRow.merchantId))
    .limit(1)

  if (merchantRow && orderRow.parcelWeightKg > merchantRow.maxWeightKg) {
    return NextResponse.json({
      error: `Parcel weight exceeds the ${merchantRow.maxWeightKg} KG limit and cannot be approved.`,
    }, { status: 400 })
  }

  const now = new Date().toISOString()
  const [updated] = await db
    .update(order)
    .set({ status: "APPROVED", approvedBy: me.name, approvedAt: now, pickupRiderId: riderId, assignedAt: now })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/picked-up` — `markOrderPickedUp`

The rider guard here is double-layered: the session must belong to a `RIDER` role *and* the order's `pickupRiderId` must match their `riderId`. This matches the existing context check.

```ts
// app/api/orders/[id]/picked-up/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.pickupRiderId !== me.riderId) {
    return NextResponse.json({ error: "This pickup is not assigned to you." }, { status: 403 })
  }
  if (orderRow.status !== "APPROVED") {
    return NextResponse.json({ error: "Only APPROVED orders can be picked up." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({ status: "PICKED_UP", pickedUpAt: new Date().toISOString() })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/receive` — `receiveOrderAtWarehouse`

```ts
// app/api/orders/[id]/receive/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "PICKED_UP") {
    return NextResponse.json({ error: "Only PICKED_UP parcels can be received." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "IN_WAREHOUSE",
      warehouseId: me.warehouseId,
      receivedAtWarehouseAt: new Date().toISOString(),
      receivedByWarehouse: me.name,
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/dispatch` — `assignDeliveryRider`

```ts
// app/api/orders/[id]/dispatch/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { riderId } = await req.json()

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "IN_WAREHOUSE") {
    return NextResponse.json({ error: "Only IN_WAREHOUSE parcels can be dispatched." }, { status: 400 })
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json({ error: "This parcel is held at a different warehouse." }, { status: 400 })
  }

  const [riderRow] = await db.select().from(rider).where(eq(rider.id, riderId)).limit(1)
  if (!riderRow || !riderRow.isActive) {
    return NextResponse.json({ error: "Select an active delivery rider." }, { status: 400 })
  }
  if (riderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json({ error: "Select a delivery rider based at this warehouse." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "IN_TRANSIT",
      deliveryRiderId: riderId,
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: me.name,
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/out-for-delivery` — `markOutForDelivery`

Increments `deliveryAttempts` server-side using the current DB value, not a client-supplied count.

```ts
// app/api/orders/[id]/out-for-delivery/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.deliveryRiderId !== me.riderId) {
    return NextResponse.json({ error: "This delivery is not assigned to you." }, { status: 403 })
  }
  if (orderRow.status !== "IN_TRANSIT") {
    return NextResponse.json({ error: "Only IN_TRANSIT parcels can go out for delivery." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "OUT_FOR_DELIVERY",
      outForDeliveryAt: new Date().toISOString(),
      deliveryAttempts: (orderRow.deliveryAttempts ?? 0) + 1,
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/delivered` — `markDelivered`

```ts
// app/api/orders/[id]/delivered/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { proofRef } = await req.json().catch(() => ({}))

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.deliveryRiderId !== me.riderId) {
    return NextResponse.json({ error: "This delivery is not assigned to you." }, { status: 403 })
  }
  if (orderRow.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json({ error: "Only OUT_FOR_DELIVERY parcels can be marked delivered." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      deliveryProofRef: proofRef ?? `proof_${orderRow.code.toLowerCase()}.jpg`,
      amountCollected: orderRow.totalCollectible,
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/failed` — `markDeliveryFailed`

```ts
// app/api/orders/[id]/failed/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "RIDER" || !me.riderId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { note } = await req.json()
  if (!note?.trim()) {
    return NextResponse.json({ error: "A reason note is required." }, { status: 400 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.deliveryRiderId !== me.riderId) {
    return NextResponse.json({ error: "This delivery is not assigned to you." }, { status: 403 })
  }
  if (orderRow.status !== "OUT_FOR_DELIVERY") {
    return NextResponse.json({ error: "Only OUT_FOR_DELIVERY parcels can be marked failed." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({
      status: "FAILED_ATTEMPT",
      failedAttemptAt: new Date().toISOString(),
      failureNote: note.trim(),
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/reattempt` — `reattemptFailedOrder`

Clears `failureNote` and `failedAttemptAt` from the previous attempt and increments `deliveryAttempts` again before sending the parcel back out.

```ts
// app/api/orders/[id]/reattempt/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "FAILED_ATTEMPT") {
    return NextResponse.json({ error: "Only FAILED_ATTEMPT parcels can be reattempted." }, { status: 400 })
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json({ error: "This parcel is held at a different warehouse." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const [updated] = await db
    .update(order)
    .set({
      status: "OUT_FOR_DELIVERY",
      failureNote: null,
      failedAttemptAt: null,
      failedResolvedAt: now,
      failedResolvedBy: me.name,
      outForDeliveryAt: now,
      deliveryAttempts: (orderRow.deliveryAttempts ?? 0) + 1,
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/return` — `returnFailedOrder`

```ts
// app/api/orders/[id]/return/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { reason } = await req.json()
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A return reason is required." }, { status: 400 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "FAILED_ATTEMPT") {
    return NextResponse.json({ error: "Only FAILED_ATTEMPT parcels can be returned." }, { status: 400 })
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json({ error: "This parcel is held at a different warehouse." }, { status: 400 })
  }

  const now = new Date().toISOString()
  const [updated] = await db
    .update(order)
    .set({
      status: "RETURNED",
      failedResolvedAt: now,
      failedResolvedBy: me.name,
      returnedAt: now,
      returnReason: reason.trim(),
    })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/orders/[id]/settle-cod` — `settleOrderCod`

```ts
// app/api/orders/[id]/settle-cod/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "WAREHOUSE_ADMIN" || !me.warehouseId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [orderRow] = await db.select().from(order).where(eq(order.id, params.id)).limit(1)
  if (!orderRow) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (orderRow.status !== "DELIVERED") {
    return NextResponse.json({ error: "Only DELIVERED parcels can be settled." }, { status: 400 })
  }
  if (orderRow.warehouseId !== me.warehouseId) {
    return NextResponse.json({ error: "This parcel belongs to a different warehouse." }, { status: 400 })
  }
  if (orderRow.codSettledAt) {
    return NextResponse.json({ error: "This parcel's COD is already settled." }, { status: 400 })
  }

  const [updated] = await db
    .update(order)
    .set({ codSettledAt: new Date().toISOString(), codSettledBy: me.name })
    .where(eq(order.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

### 3.5 Payouts

#### `POST /api/payouts` — `requestPayout`

The payout request bundles all currently payable orders into one record and simultaneously locks them to prevent double-inclusion. Both writes — inserting the `payout_request` row and updating the `order` rows — must succeed together. Use a Drizzle transaction.

```ts
// app/api/payouts/route.ts — add POST alongside existing GET
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { order, payoutRequest } from "@/lib/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "MERCHANT" || !me.merchantId) {
    return NextResponse.json({ error: "Only merchants can request payouts" }, { status: 403 })
  }

  const { payoutMethod, payoutDetails } = await req.json()
  if (!payoutMethod?.trim() || !payoutDetails?.trim()) {
    return NextResponse.json({ error: "Provide a payout method and account details." }, { status: 400 })
  }

  const payableOrders = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.merchantId, me.merchantId),
        eq(order.status, "DELIVERED"),
        sql`${order.codSettledAt} is not null`,
        isNull(order.payoutRequestId),
      ),
    )

  if (payableOrders.length === 0) {
    return NextResponse.json({ error: "No settled funds available to request." }, { status: 400 })
  }

  const amount = payableOrders.reduce((sum, o) => sum + o.productCost, 0)

  const [{ maxCode }] = await db
    .select({ maxCode: sql<string>`max(code)` })
    .from(payoutRequest)
  const maxSeq = maxCode ? Number.parseInt(maxCode.replace(/^PR-0*/, ""), 10) : 2041
  const seq = (Number.isFinite(maxSeq) ? maxSeq : 2041) + 1
  const code = `PR-${String(seq).padStart(4, "0")}`

  // Transaction: insert the request and lock its orders atomically.
  const newRequest = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(payoutRequest)
      .values({
        code,
        merchantId: me.merchantId!,
        orderIds: payableOrders.map((o) => o.id),
        amount,
        status: "PENDING",
        payoutMethod: payoutMethod.trim(),
        payoutDetails: payoutDetails.trim(),
      })
      .returning()

    await tx
      .update(order)
      .set({ payoutRequestId: inserted.id })
      .where(
        and(
          eq(order.merchantId, me.merchantId!),
          eq(order.status, "DELIVERED"),
          sql`${order.codSettledAt} is not null`,
          isNull(order.payoutRequestId),
        ),
      )

    return inserted
  })

  return NextResponse.json(newRequest, { status: 201 })
}
```

In `platform-context.tsx`, `requestPayout` currently updates both `payoutRequests` and `orders` local state. After migration, the server handles both atomically. On the client, update state from the returned request — the `orderIds` field on the response tells you which orders to lock:

```ts
// After
const requestPayout = useCallback(async (input) => {
  const res = await fetch("/api/payouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error }
  setPayoutRequests((prev) => [data, ...prev])
  const lockedIds = new Set<string>(data.orderIds)
  setOrders((prev) => prev.map((o) => lockedIds.has(o.id) ? { ...o, payoutRequestId: data.id } : o))
  return { ok: true, request: data }
}, [])
```

---

#### `PATCH /api/payouts/[id]/approve` — `approvePayout`

Only `SUPER_ADMIN` may approve payouts.

```ts
// app/api/payouts/[id]/approve/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [current] = await db
    .select({ status: payoutRequest.status })
    .from(payoutRequest)
    .where(eq(payoutRequest.id, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING requests can be approved." }, { status: 400 })
  }

  const [updated] = await db
    .update(payoutRequest)
    .set({ status: "APPROVED", reviewedBy: me.name, reviewedAt: new Date().toISOString() })
    .where(eq(payoutRequest.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

#### `PATCH /api/payouts/[id]/reject` — `rejectPayout`

Rejecting a request must also unlock its orders so they can be included in a future request. Do both in a transaction.

```ts
// app/api/payouts/[id]/reject/route.ts
export async function PATCH(req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { reason } = await req.json()
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 })
  }

  const [current] = await db
    .select()
    .from(payoutRequest)
    .where(eq(payoutRequest.id, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "PENDING") {
    return NextResponse.json({ error: "Only PENDING requests can be rejected." }, { status: 400 })
  }

  const updated = await db.transaction(async (tx) => {
    // Unlock orders before updating the request status.
    await tx
      .update(order)
      .set({ payoutRequestId: null })
      .where(eq(order.payoutRequestId, params.id))

    const [rejected] = await tx
      .update(payoutRequest)
      .set({
        status: "REJECTED",
        reviewedBy: me.name,
        reviewedAt: new Date().toISOString(),
        rejectReason: reason.trim(),
      })
      .where(eq(payoutRequest.id, params.id))
      .returning()

    return rejected
  })

  return NextResponse.json(updated)
}
```

In `platform-context.tsx`, `rejectPayout` currently nulls out `payoutRequestId` on the locked orders in local state. After migration, read `orderIds` from the returned rejected request and null them out locally:

```ts
// After
const rejectPayout = useCallback(async (requestId, reason) => {
  const res = await fetch(`/api/payouts/${requestId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error }
  setPayoutRequests((prev) => prev.map((p) => p.id === requestId ? data : p))
  const unlockedIds = new Set<string>(data.orderIds)
  setOrders((prev) => prev.map((o) => unlockedIds.has(o.id) ? { ...o, payoutRequestId: null } : o))
  return { ok: true }
}, [])
```

---

#### `PATCH /api/payouts/[id]/paid` — `markPayoutPaid`

```ts
// app/api/payouts/[id]/paid/route.ts
export async function PATCH(_req, { params }) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [current] = await db
    .select({ status: payoutRequest.status })
    .from(payoutRequest)
    .where(eq(payoutRequest.id, params.id))
    .limit(1)

  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (current.status !== "APPROVED") {
    return NextResponse.json({ error: "Only APPROVED requests can be marked paid." }, { status: 400 })
  }

  const [updated] = await db
    .update(payoutRequest)
    .set({ status: "PAID", paidAt: new Date().toISOString() })
    .where(eq(payoutRequest.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
```

---

### 3.6 Interface signature changes in `platform-context.tsx`

Every action that was synchronous needs its signature updated in `PlatformContextValue`, and every call site needs `await`. The complete set of changes:

| Action | Before | After |
|---|---|---|
| `createAccount` | `(input) => void` | `(input & { password }) => Promise<void>` |
| `toggleAccountActive` | `(id) => void` | `(id) => Promise<void>` |
| `togglePricingPermission` | `(id) => void` | `(id) => Promise<void>` |
| `updateSecurityConfig` | `(next) => void` | `(next) => Promise<void>` |
| `approveMerchant` | `(id) => void` | `(id) => Promise<void>` |
| `suspendMerchant` | `(id) => void` | `(id) => Promise<void>` |
| `reactivateMerchant` | `(id) => void` | `(id) => Promise<void>` |
| `setMerchantPricing` | `(id, pricing) => void` | `(id, pricing) => Promise<void>` |
| `createOrder` | `(input) => { ok, order?, error? }` | `(input) => Promise<{ ok, order?, error? }>` |
| `approveAndAssignOrder` | `(orderId, riderId) => { ok, error? }` | `(orderId, riderId) => Promise<{ ok, error? }>` |
| `markOrderPickedUp` | `(orderId) => { ok, error? }` | `(orderId) => Promise<{ ok, error? }>` |
| `receiveOrderAtWarehouse` | `(orderId) => { ok, error? }` | `(orderId) => Promise<{ ok, error? }>` |
| `assignDeliveryRider` | `(orderId, riderId) => { ok, error? }` | `(orderId, riderId) => Promise<{ ok, error? }>` |
| `markOutForDelivery` | `(orderId) => { ok, error? }` | `(orderId) => Promise<{ ok, error? }>` |
| `markDelivered` | `(orderId, proofRef?) => { ok, error? }` | `(orderId, proofRef?) => Promise<{ ok, error? }>` |
| `markDeliveryFailed` | `(orderId, note) => { ok, error? }` | `(orderId, note) => Promise<{ ok, error? }>` |
| `reattemptFailedOrder` | `(orderId) => { ok, error? }` | `(orderId) => Promise<{ ok, error? }>` |
| `returnFailedOrder` | `(orderId, reason) => { ok, error? }` | `(orderId, reason) => Promise<{ ok, error? }>` |
| `settleOrderCod` | `(orderId) => { ok, error? }` | `(orderId) => Promise<{ ok, error? }>` |
| `requestPayout` | `(input) => { ok, request?, error? }` | `(input) => Promise<{ ok, request?, error? }>` |
| `approvePayout` | `(requestId) => { ok, error? }` | `(requestId) => Promise<{ ok, error? }>` |
| `rejectPayout` | `(requestId, reason) => { ok, error? }` | `(requestId, reason) => Promise<{ ok, error? }>` |
| `markPayoutPaid` | `(requestId) => { ok, error? }` | `(requestId) => Promise<{ ok, error? }>` |

All call sites in page and dialog components that do `const result = action(...)` need `const result = await action(...)`, with the enclosing handler function marked `async`. Components that show a loading spinner or disable a submit button during the call should wrap the `await` in a try/finally to clear loading state on both success and error.

`registerMerchant` is removed from the interface entirely — it has moved to `app/register/page.tsx`.

---

**Checkpoint:** Every action persists to the database and survives a hard page refresh. Open two browser tabs logged in as the same role — an action performed in one tab should be visible after a refresh in the other. Logging out and back in as a different role shows the correct role-filtered slice of orders and payouts with no stale data from the previous session.

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
