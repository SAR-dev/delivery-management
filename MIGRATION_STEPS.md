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
