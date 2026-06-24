# Contributing

This document covers both the architectural conventions and the step-by-step
recipes for adding or changing code in ParcelFlow. The principles come first;
the recipes follow. Use the recipe that matches your task, use the exact paths
shown, and finish with the [verification checklist](#verification-checklist).

> Golden rule: **find the closest existing example and mirror it.** This
> codebase is highly consistent — almost every new thing has a twin already in
> the tree. Search for it before writing anything new.

---

## Where things live

```
app/
  api/<resource>/route.ts            collection endpoints (GET list, POST create)
  api/<resource>/[id]/route.ts       item endpoints (PATCH, DELETE)
  api/orders/[id]/<action>/route.ts  order lifecycle wrappers (see Recipe F)
  <role>/<page>/page.tsx             a screen for a role (dashboard|merchant|warehouse|rider)
features/<name>/
  components/                        presentational pieces for this domain
  dialogs/                           dialogs that drive this domain's mutations
  hooks/use-<resource>.ts            the SWR resource hook (the ONLY data source)
  transitions.ts                     orders only — the state machine
components/                          generic, feature-agnostic UI only
lib/
  db/schema.ts                       Drizzle tables — source of truth for entities
  types.ts                           re-exports entity types from schema
  validation.ts                      zod schemas + parseBody
  api-auth.ts                        requireSession()
  nav-config.ts                      sidebar entries per role
  constants.ts, pricing.ts           cross-cutting domain logic
  mailer.ts, mail-templates.ts       transactional email
  storage/                           file upload backends (local / R2)
config/
  site.json, site.ts                 brand name, tagline, icon
  content.ts                         page titles/descriptions (copy)
```

---

## 1. Feature-based folder structure

Domain code lives under `features/<name>/`, **not** in kind-based folders like
`components/dialog/` or `components/badge/`. Each feature owns its UI, hooks, and
domain logic:

```
features/
  orders/
    components/    presentational pieces (badges, cells, timelines)
    dialogs/       dialogs that drive this domain's mutations
    hooks/         use-orders.ts (the resource hook — see §3)
    transitions.ts the order state machine (see §2)
  riders/
  merchants/
  warehouses/
  payouts/
  divisions/
  pickup-locations/
  team/
  account/         hooks/use-auth.tsx (the auth context)
  security/
```

`components/` keeps **only generic, feature-agnostic** building blocks
(`ui/**`, `data-table.tsx`, `page-header.tsx`, `status-badge.tsx`,
`form-dialog.tsx`, `navigation/**`, etc.). `lib/` keeps cross-cutting concerns
(`types.ts`, `constants.ts`, `db/**`, `validation.ts`, `pricing.ts`, the SWR
`hooks/fetcher.ts` and `hooks/use-data-error.ts`, auth glue, mailer, storage).

### Only split a component into a folder when there's real content

A component stays a single flat `.tsx` file. Promote it to a folder
(`index.tsx` + `types.ts`) **only when it has genuine local types or constants**
worth isolating. Do not create empty or near-empty `types.ts` files.

```
# Good: has a real local Props interface
features/riders/dialogs/edit-rider-dialog/
  index.tsx     component
  types.ts      EditRiderDialogProps

# Good: no local types/constants -> stays flat
features/merchants/dialogs/pricing-dialog.tsx
```

Constants/options shared by sibling components live in their own flat module
rather than being duplicated. For example, the rider task-type labels and
`<Select>` options used by both the create and edit rider dialogs live in
`features/riders/dialogs/task-type.ts`.

Entity types (`Order`, `Rider`, `Merchant`, …) are derived from
`lib/db/schema.ts` and re-exported from `lib/types.ts` — the single source of
truth. Only component-local Props/input shapes that don't already exist there
belong in a feature's `types.ts`. Do not fragment `lib/types.ts` or
`lib/constants.ts`.

---

## 2. Order state machine (`features/orders/transitions.ts`)

Every order lifecycle transition is a **declarative definition**, not a
hand-written route handler. A transition declares who may run it, what body it
accepts, what guards must hold, and what fields it writes:

```ts
const transitions = {
  approve: {
    authorize: (session) => session.role === "ADMIN",
    schema: approveSchema, // optional zod schema for the body
    guard: async ({ order }) => {
      // ordered checks; first failure wins
      if (order.status !== "PENDING")
        return { error: "Order is not pending", status: 409 }
    },
    buildUpdate: ({ body, now }) => ({ status: "APPROVED", approvedAt: now }),
  },
  // ...10 transitions total
}
```

The shared runner `applyOrderTransition(name, orderId, req)` performs the
identical sequence for all of them: resolve session → authorize → parse body
→ **(inside one transaction)** load order with a row lock → run guard → write
update → return the updated order. **Route files are thin wrappers** — they
only name the transition:

```ts
// app/api/orders/[id]/approve/route.ts
import { applyOrderTransition } from "@/features/orders/transitions"
export const PATCH = (req, ctx) => applyOrderTransition("approve", req, ctx)
```

To add a lifecycle action: add one entry to `transitions`, add a one-line route
wrapper, and add a spec case in
`app/api/orders/[id]/__tests__/transitions.spec.ts`. Never duplicate the
auth/parse/guard/update plumbing inline.

### Transaction boundary + row lock

The fetch → guard → write sequence inside `applyOrderTransition` runs inside
`db.transaction(async (tx) => { ... })`, and the initial fetch uses
`.for("update")` to lock the order row for the duration of the transaction:

```ts
return await db.transaction(async (tx) => {
  const [orderRow] = await tx
    .select()
    .from(order)
    .where(eq(order.id, orderId))
    .for("update")
    .limit(1)
  if (!orderRow)
    return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const guardError = await def.guard({ order: orderRow, session: me, body })
  if (guardError)
    return NextResponse.json(
      { error: guardError.error },
      { status: guardError.status },
    )

  const [updated] = await tx
    .update(order)
    .set(await def.buildUpdate({ order: orderRow, session: me, body }))
    .where(eq(order.id, orderId))
    .returning()
  return NextResponse.json(updated)
})
```

Without this, two concurrent transitions on the same order (two admins
approving at once, a rider double-submitting a delivery outcome) could both
read the same pre-write status, both pass the guard, and both write —
corrupting state (e.g. double-incrementing `deliveryAttempts`, or an approve
and a reject both succeeding). The lock makes the second request block until
the first commits, then re-fetches the now-updated row, so its guard correctly
sees the new status and fails closed instead of racing.

This is the project's general pattern for any guard-then-write sequence, not
just orders — see the matching shape in `app/api/payouts/[id]/approve/route.ts`
and `.../paid/route.ts`. When you add a new endpoint that reads a row, checks
its status, and conditionally writes to it, wrap the read + guard + write in
one `db.transaction()` with `.for("update")` on the initial read. A plain
`db.transaction()` with no lock (as in Recipe B's bulk-insert sequence-number
read, or the payout-request/payout-reject multi-table writes) is enough when
the only risk is multiple _inserts_ racing on a derived value, not a
stale-read guard on a row that already exists.

**Mocked `db` in tests**: if a spec hand-mocks `@/lib/db` (see
`transitions.spec.ts`), the mock's `transaction` must run the callback against
the same mock object so it shares state with every `select`/`update`
assertion, and `.for()` on the select chain must be a no-op passthrough —
otherwise adding a transaction boundary breaks every test that exercises the
wrapped code path.

---

## 3. Per-resource SWR hooks

There is **no global data context**. Each resource has a focused hook in
`features/<name>/hooks/use-<resource>.ts` built on SWR. A hook owns: the fetch
key, the typed data, loading/error state, any derived selectors, the
mutation functions for that resource, and — for searchable resources — the
`query` state described below.

```ts
export function useMerchants() {
  const { data, error, isLoading, mutate } = useSWR<Merchant[]>(
    "/api/merchants",
    fetcher,
  )
  const merchants = data ?? []

  async function approveMerchant(id: string) {
    // optimistic update + revalidate via mutate()
  }

  return { merchants, isLoading, error, approveMerchant }
}
```

Rules:

- **Read data only through these hooks** — never re-introduce `fetch()` +
  `useState`/`useEffect` loading plumbing in components. (The one exception is
  the pre-auth `app/register` flow, which runs before a session exists and so
  cannot use these session-scoped hooks.)
- **Cross-resource mutations** coordinate caches explicitly. When a mutation
  changes more than one resource (e.g. a payout request touches both payouts and
  orders), call `mutate()` on every affected key, not just the primary one.
- Authentication/session lives in `features/account/hooks/use-auth.tsx`
  (`useAuth()`), the one piece of shared state that remains a React context.
- The global "failed to load" banner is driven by `lib/hooks/use-data-error.ts`,
  which aggregates the error state of every resource key.

### Search state lives in the hook, not the page

Resources with a search box (`orders`, `merchants`, `riders`, `warehouses`,
`team`, `divisions`, `payouts`) follow one pattern, mirrored exactly across
all seven hooks — copy `use-orders.ts` rather than improvising:

```ts
const KEY = "/api/orders"

export function useOrders() {
  const { currentUser } = useAuth()
  // 1. Base key — untouched. Every mutation and useDataError still dedupes
  //    against this exact string; never repoint it at the search key.
  const { data, error, isLoading, mutate } = useSWR<Order[]>(
    currentUser ? KEY : null,
    jsonFetcher,
    swrOptions,
  )

  // 2. Debounced query state, owned by the hook.
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // 3. A second, parallel SWR call for the search results — only active once
  //    there's a non-empty debounced query. Separate cache entry from KEY.
  const trimmedQuery = debouncedQuery.trim()
  const searchKey =
    currentUser && trimmedQuery
      ? `${KEY}?q=${encodeURIComponent(trimmedQuery)}`
      : null
  const { data: searchData, isLoading: isSearchLoading } = useSWR<Order[]>(
    searchKey,
    jsonFetcher,
    swrOptions,
  )

  // 4. `orders` is search-aware; `allOrders` is always the full base list.
  const orders = trimmedQuery ? (searchData ?? []) : (data ?? [])
  const allOrders = data ?? []

  return {
    orders,
    allOrders,
    query,
    setQuery,
    isLoading: trimmedQuery ? isSearchLoading : isLoading,
    error,
    mutate,
    // ...mutations, all still writing through the base `mutate`/`KEY`
  }
}
```

Rules:

- **Never widen scope.** Search is `?q=` appended to the same role-scoped API
  route — it narrows what a role-scoped `where` already returns, never
  bypasses it. Every resource's `GET` composes the search clause onto the
  existing role scoping with `and(roleScopedWhere, searchClause)`, in the
  same order the role scoping is already applied — see Recipe E's template.
- **Always export both `orders` and `allOrders`** (substitute the resource
  name). Any derived value that should stay stable while the user searches —
  stat cards, tab/badge counts, role-derived singletons like `currentRider` or
  `currentWarehouse`, cross-resource usage counts — must be computed from the
  `allX` list, never from the search-aware one. Get this wrong and a stat card
  silently shrinks to the size of the search box's matches.
- **Mutations always target `KEY`**, the literal base-key string, not the
  dynamic `?q=...` key. The bound `mutate` from the base `useSWR` call already
  does this correctly — don't reroute it.
- A page with a search `<Input>` destructures `query`/`setQuery` from the
  hook; it never keeps its own `useState` for this. Tab/status filters stay
  client-side `useMemo`s layered **on top of** the hook's `orders` (or
  equivalent), not on `allOrders`.

---

## 4. Storage (`lib/storage/`)

File uploads go through a single entry point — **never import the local or R2
drivers directly**:

```ts
import { saveFile } from "@/lib/storage"

const { publicUrl } = await saveFile(relativePath, buffer, mimeType)
```

The active backend is selected by the `STORAGE_PROVIDER` env var (`"local"` or
`"r2"`). `"local"` writes to disk and serves files via `/api/uploads`; `"r2"`
uploads to Cloudflare R2. Defaults to `"local"` when the var is unset.

On the client side, use `uploadImage()` from `lib/upload-image.ts`. It compresses
the file before sending and targets the correct folder (avatar vs. photo). The
`<ImageUpload>` component in `components/image-upload.tsx` wraps this for form use.

Never write backend-specific upload logic outside `lib/storage/`.

---

## 5. Environment validation (`lib/env.ts`)

All required env vars are declared and validated in `lib/env.ts`. The
`instrumentation.ts` hook calls `validateEnv()` at server startup so the app
**refuses to boot** with a clear error rather than failing mid-request.

When you add a new env var:

1. Add a `required()` / `oneOf()` / `minLength()` call in `lib/env.ts`.
2. Document it in `.env.example`.

Never read `process.env` for a required variable without a corresponding entry
in `validateEnv()`.

---

## 6. Email (`lib/mailer.ts`)

Transactional email goes through `sendMail()` from `lib/mailer.ts`. It uses
Gmail SMTP with retry/backoff and logs failed sends to the `failed_mail` table.
HTML templates live in `lib/mail-templates.ts`.

```ts
import { sendMail } from "@/lib/mailer"

await sendMail({
  to: "user@example.com",
  subject: "Your order",
  html: template,
})
```

Never call nodemailer (or any SMTP client) directly outside `lib/mailer.ts`.

---

## 7. Site identity (`config/site.json` + `config/site.ts`)

Brand name, tagline, description, and icon live in `config/site.json`. Import the
typed `siteConfig` or the `SiteIcon` alias from `config/site.ts` — do not read
the JSON directly in components.

---

## 8. Recipes — step-by-step playbook

### Recipe A — Add a field to an existing entity

Example: the `rider.taskType` column added recently.

1. **Schema** — add the column in `lib/db/schema.ts`. Use a `text(... { enum })`
   for enums and export the values array if the UI needs it:
   ```ts
   export const riderTaskTypes = ["PICKUP", "DELIVERY", "BOTH"] as const
   // ...
   taskType: text("taskType", { enum: riderTaskTypes })
     .notNull()
     .default("DELIVERY")
   ```
2. **Type** — if a named union helps, add it to `lib/types.ts`:
   ```ts
   export type RiderTaskType = (typeof rider.$inferSelect)["taskType"]
   ```
3. **Validation** — add the field to the relevant zod schema in
   `lib/validation.ts` (create schema, and an update schema if editable).
4. **API** — read/write the new field in the matching route(s).
5. **Hook** — add it to the create/update input types in `use-<resource>.ts`.
6. **UI** — surface it in the dialog(s) and any table columns / detail views.
7. **Seed** — add the field to `lib/db/seed.ts` sample rows.
8. **Apply the DB change** — see [Applying schema changes](#applying-schema-changes).

> If the column is `NOT NULL` and existing rows would violate it, either give it
> a `.default(...)` or backfill before pushing (the push will otherwise fail).

### Recipe B — Add a brand-new resource (full CRUD)

Example structure to mirror: **divisions** (simple) or **merchants** (rich).

1. **Schema** — add the `pgTable` in `lib/db/schema.ts`, with `createId()` PK and
   relations via `.references()`.
2. **Type** — re-export from `lib/types.ts`:
   `export type Thing = typeof thing.$inferSelect`.
3. **Validation** — add `thingCreateSchema` / `thingUpdateSchema` in
   `lib/validation.ts`.
4. **API routes**:
   - `app/api/things/route.ts` → `GET` (list) + `POST` (create). Start every
     handler with `requireSession()`; gate writes by `me.role`.
   - `app/api/things/[id]/route.ts` → `PATCH` / `DELETE` as needed.
   - Scope reads/writes by `me.warehouseId` (or owner id) when the resource is
     role-scoped — **enforce it server-side; Neon has no RLS.**
5. **Hook** — `features/things/hooks/use-things.ts`. Copy the shape of
   `use-divisions.ts`: SWR keyed on the API path (gated on `currentUser`),
   `data ?? []`, and `useCallback` mutations that do an optimistic
   `mutate(..., { revalidate: false })`. If the resource needs a search box,
   copy `use-orders.ts` instead and follow [§3's search subsection](#search-state-lives-in-the-hook-not-the-page).
6. **UI** — a page (Recipe C) and dialogs (Recipe D).
7. **Seed** — add sample rows to `lib/db/seed.ts`.

### Recipe C — Add a page / screen

1. Create `app/<role>/<name>/page.tsx`. `<role>` is `dashboard`, `merchant`,
   `warehouse`, or `rider`. Mirror a sibling page in the same role folder.
2. Use `PageHeader` for the title/description and pull copy from
   `config/content.ts` (add a key there rather than hard-coding strings):
   ```tsx
   <PageHeader
     title={pageContent.warehouse.riders.title(firstName)}
     description={pageContent.warehouse.riders.description(warehouseName)}
   />
   ```
3. Get data from the resource hook(s) — never fetch in the page directly.
4. Use shared building blocks: `DataTable`, `StatCardList`, `StatusBadge`,
   `FormDialog`. If the resource is searchable, destructure `query`/`setQuery`
   from the hook and render the search `<Input>` (with a `Search` icon, see
   `app/dashboard/orders/page.tsx`) above the table — don't keep a local
   `useState` for it. `DataTable`'s own footer already places pagination on
   the left and the CSV button on the right (disabled when no `csv` prop is
   passed); don't rebuild that layout per page.
5. **Add the nav entry** in `lib/nav-config.ts` under the correct role array
   (`href`, `label`, `icon`, `exact`). Pick an icon already imported there or
   add the import.

### Recipe D — Add a dialog (create / edit / confirm)

1. Put it in `features/<name>/dialogs/`. Flat file
   (`create-thing-dialog.tsx`) unless it needs a local Props interface or
   constants — then a folder with `index.tsx` + `types.ts`.
2. Build on `components/form-dialog.tsx`, not the raw dialog primitive.
3. Drive all mutations through the resource hook; show errors via `toast` and
   the hook's `{ ok, error }` result.
4. **Shared options/labels** used by sibling dialogs go in a flat module beside
   them (e.g. `features/riders/dialogs/task-type.ts`), never duplicated.
5. For role-conditional controls, take a prop (e.g.
   `canReassignWarehouse?: boolean`) rather than reading the role inside the
   dialog.

### Recipe E — Add a server endpoint (non-order)

Every handler follows the same template:

```ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { thing } from "@/lib/db/schema"
import { thingCreateSchema, parseBody } from "@/lib/validation"
import { and, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

// Accept `req: Request` even if the resource has no search yet — adding `?q=`
// later then doesn't require touching the function signature.
export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // Scope role-limited readers server-side.
  let where = undefined
  if (me.role === "WAREHOUSE_ADMIN") {
    if (!me.warehouseId) return NextResponse.json([])
    // ...build the role-scoped where
  }

  // Optional free-text search, layered on top of the role-scoped where —
  // search narrows what a role already sees, never widens it.
  const search = new URL(req.url).searchParams.get("q")?.trim()
  if (search) {
    const likeQ = `%${search}%`
    const searchClause = or(ilike(thing.name, likeQ) /* ...other fields */)
    where = where ? and(where, searchClause) : searchClause
  }

  const rows = where
    ? await db.select().from(thing).where(where)
    : await db.select().from(thing)
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })
  if (me.role !== "ADMIN" && me.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const parsed = await parseBody(req, thingCreateSchema)
  if (parsed.error) return parsed.error
  // ...insert + return NextResponse.json(created, { status: 201 })
}
```

Rules: `requireSession()` first; validate the body with `parseBody` + a zod
schema; return `{ error }` with `401` / `403` / `404` / `409` as appropriate;
return the created/updated row so the hook can update its cache. **If the
handler reads a row, checks its status, and conditionally writes to it**
(an approve/reject/mark-paid style endpoint), wrap the read + guard + write in
`db.transaction()` with `.for("update")` on the initial read — see
[§2's transaction subsection](#transaction-boundary--row-lock) for why and the
exact shape. Plain inserts or multi-table writes that don't re-check a status
still want `db.transaction()`, just without the lock.

### Recipe F — Add an order lifecycle action

**Do not** write a custom route handler. Orders use the declarative state
machine in `features/orders/transitions.ts`.

1. Add one entry to the `transitions` object: `authorize`, optional `schema`,
   ordered `guard`, and `buildUpdate`.
2. Add a one-line wrapper route
   `app/api/orders/[id]/<action>/route.ts`:
   ```ts
   import { applyOrderTransition } from "@/features/orders/transitions"
   export const PATCH = (req, ctx) => applyOrderTransition("<action>", req, ctx)
   ```
3. Add a spec case in
   `app/api/orders/[id]/__tests__/transitions.spec.ts`.
4. Expose it through `use-orders.ts` and the relevant UI.

Never duplicate the auth/parse/guard/update plumbing inline — the shared
runner already handles the transaction boundary and row lock (see
[§2](#transaction-boundary--row-lock)), so a new transition only needs to
define its `guard`/`buildUpdate`, never its own `db.transaction()` call.

---

## Applying schema changes

The DB connection string lives in `.env.development.local` (not `.env`), so load
it explicitly when running DB scripts from the shell:

```bash
set -a && . ./.env.development.local && set +a && pnpm db:push
set -a && . ./.env.development.local && set +a && pnpm db:seed
```

- `pnpm db:push` applies `schema.ts` to Neon. A `NOT NULL` add fails if existing
  rows violate it — backfill first (a quick `UPDATE` via the Neon SQL tooling) or
  give the column a default.
- The seed is **idempotent** — it skips rows that already exist. After changing
  seed values for existing ids, either reset the data or run a targeted `UPDATE`.

---

## Naming & style conventions

- Files: `kebab-case.tsx` / `kebab-case.ts`. Hooks: `use-<resource>.ts`
  exporting `useResource()`. Dialogs: `<verb>-<thing>-dialog.tsx`.
- Components/types: `PascalCase`. Variables/functions: `camelCase`.
- Prefer `type` aliases derived from the schema over hand-written interfaces.
- Comment the **why**, not the **what** — match the terse, intent-explaining
  comment style already in the routes and hooks.
- Tailwind: follow the design tokens and the rules in the design guidelines
  (3–5 colors, flexbox-first, spacing scale, no inline hex).

---

## Verification checklist

Run all five before opening a PR — they must pass with zero errors:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .
pnpm format:check  # prettier --check .
pnpm test:run      # vitest run (includes the order-transition spec suite)
pnpm build         # next build
```

For anything user-visible, also verify in the browser: load the page, exercise
the primary path, and confirm the behavior works. A clean compile is **not**
proof the behavior is correct.
