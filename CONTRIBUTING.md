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
  api/orders/bulk/route.ts           bulk order creation (Merchant only, up to MAX_BULK_ORDERS)
  api/orders/[id]/<action>/route.ts  order lifecycle wrappers (see Recipe F)
  api/orders/[id]/receiver-note/route.ts  public endpoint — recipient adds a delivery note (no session)
  <role>/<page>/page.tsx             a screen for a role (dashboard|merchant|warehouse|rider)
features/<name>/
  components/                        presentational pieces for this domain
  dialogs/                           dialogs that drive this domain's mutations
  hooks/use-<resource>.ts            the SWR resource hook (the ONLY data source)
  transitions.ts                     orders only — the state machine
components/                          generic, feature-agnostic UI only
  confirm-dialog.tsx                 reusable confirmation dialog (title/desc/variant/loading)
  skeleton.tsx                       skeleton loader for table rows / placeholder content
proxy.ts                             edge proxy — upload rate-limiting (matcher: /api/uploads)
lib/
  db/index.ts                        Drizzle client — reads DB_PROVIDER, initialises pg or libsql
  db/schema.ts                       re-exports schema.postgres or schema.turso based on DB_PROVIDER
  db/schema.postgres.ts              PostgreSQL table definitions (pg-core types)
  db/schema.turso.ts                 SQLite/Turso table definitions (sqlite-core types)
  db/seed/                           per-entity seed modules (divisions, riders, orders, etc.)
  types.ts                           re-exports entity types from schema
  validation.ts                      zod schemas + parseBody (missing/empty body is treated as `{}`)
  api-auth.ts                        requireSession()
  api-response.ts                    standardized error responses (unauthorized, forbidden, notFound, etc.)
  audit.ts                           logAudit() — the only audit_log writer
  pagination.ts                      PaginatedResponse<T>, parsePagination(), parseStatusFilter(), parseSort(), applySort()
  rate-limit.ts                      sliding-window rate limiter + getClientIp()
  csv.ts                             CSV generation and download helpers
  nav-config.ts                      sidebar entries per role
  constants.ts, pricing.ts           cross-cutting domain logic
  mailer.ts, mail-templates.ts       transactional email (+ email_log history)
  storage/                           file upload backends (local / R2)
  hooks/fetcher.ts                   SWR fetcher, RESOURCE_KEYS, swrOptions
  hooks/use-debounced-value.ts       shared debounce hook used by all search hooks
  hooks/use-data-error.ts            aggregates error state for the global banner
config/
  site.json, site.ts                 brand name, tagline, icon
  content.ts                         page titles/descriptions (copy)
drizzle/
  postgres/                          PostgreSQL migration files
  turso/                             Turso/SQLite migration files
scripts/
  check-schema-sync.ts               drift detection between schema.postgres and schema.turso
  check-auth.ts                      verifies the Better Auth session table is reachable
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
  audit-logs/      hooks/use-audit-logs.ts — read-only, Admin/Super Admin only
  email-logs/      hooks/use-email-logs.ts — read-mostly, Admin/Super Admin only
```

`components/` keeps **only generic, feature-agnostic** building blocks
(`ui/**`, `data-table.tsx`, `page-header.tsx`, `status-badge.tsx`,
`confirm-dialog.tsx`, `form-dialog.tsx`, `skeleton.tsx`, `navigation/**`,
etc.). `lib/` keeps
cross-cutting concerns (`types.ts`, `constants.ts`, `db/**`, `validation.ts`,
`pricing.ts`, the SWR `hooks/fetcher.ts` and `hooks/use-debounced-value.ts`,
`hooks/use-data-error.ts`, auth glue, mailer, storage).

**One documented exception:** `components/data-table.tsx` imports
`useAuth()` from `features/account` to default its `pageSize` prop to the
signed-in account's saved rows-per-page preference
(`profile.tableRowsPerPage`, see Recipe A's example below). This was a
deliberate tradeoff — the alternative was threading `pageSize` through all 18+
page-level call sites — and it's the only place in `components/` allowed to
reach into `features/`. Don't use this as precedent for other components;
ask before adding a second one.

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
  // ...11 transitions total:
  // approve, dispatch, picked-up, receive, out-for-delivery,
  // delivered, failed, reattempt, return, settle-cod, cancel
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
`app/api/orders/[id]/transitions.spec.ts`. Never duplicate the
auth/parse/guard/update plumbing inline.

> **`receiver-note`** is deliberately outside the state machine — it is a
> public endpoint (no session) that lets a parcel recipient add a delivery
> note via the tracking page. It is not a lifecycle transition and does not
> appear in `transitions.ts`.

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
`db.transaction()` with no lock (as in `app/api/orders/route.ts`'s single-order
`POST` and `app/api/orders/bulk/route.ts`'s bulk insert, both of which read
`MAX(code)` and insert inside the same transaction, or the
payout-request/payout-reject multi-table writes) is enough when the only risk
is multiple _inserts_ racing on a derived value, not a stale-read guard on a
row that already exists.

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
mutation functions, and **the pagination/search/filter state** for server-side
paginated tables. All API endpoints return `PaginatedResponse<T>`
(`{ data, total, limit, offset }`) and the hook manages `page`, `limit`,
`query`, and `statuses` state, building the URL with query params.

```ts
export function useMerchants() {
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_TABLE_ROWS_PER_PAGE)
  const [statuses, setStatuses] = useState<string[] | undefined>(undefined)
  const debouncedQuery = useDebouncedValue(query)

  const url = buildUrl(KEY, {
    limit,
    offset: (page - 1) * limit,
    q: debouncedQuery.trim() || undefined,
    statuses,
  })

  const {
    data: response,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedResponse<Merchant>>(
    currentUser ? url : null,
    jsonFetcher,
    swrOptions,
  )
  const merchants = response?.data ?? []
  const total = response?.total ?? 0

  async function approveMerchant(id: string) {
    // optimistic update + revalidate via mutate()
  }

  return {
    merchants,
    total,
    isLoading,
    error,
    approveMerchant,
    query,
    setQuery,
    page,
    setPage,
    limit,
    setLimit,
    statuses,
    setStatuses,
  }
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
  which aggregates the error state of every resource key. Pass an optional
  `keys` array to scope it to specific resources.

### Server-side search and pagination

Every API GET endpoint supports `?q=`, `?limit=`, `?offset=`, and `?status=`
query params. The hook manages all of this state and passes it to the
`DataTable` via props:

```tsx
<DataTable
  id="my-table"
  serverPaginated
  columns={columns}
  data={merchants}
  total={total}
  page={page}
  pageSize={limit}
  onPageChange={setPage}
  onPageSizeChange={setLimit}
  searchQuery={query}
  onSearchChange={setQuery}
  getRowKey={(r) => r.id}
/>
```

### Server-side sorting

Endpoints that support sorting accept `?sort=<columnId>&sortDir=asc|desc`.
Use `parseSort()` and `applySort()` from `lib/pagination.ts`:

```ts
import { parseSort, applySort } from "@/lib/pagination"

const sort = parseSort(req, {
  name: thing.name,
  createdAt: thing.createdAt,
})

let query = db.select().from(thing).where(where)
if (sort) query = applySort(query, sort)
```

`parseSort` accepts a `columnMap` that maps client-side column IDs (from
`DataTable`) to Drizzle column references. Unknown column IDs are silently
ignored. If the hook exposes a `sort`/`setSort` pair, pass it through to the
`DataTable` the same way as `page`/`setPage`.

Rules:

- **All tables get `id`** and use `serverPaginated` mode. The `DataTable`
  handles page navigation, search input, and CSV export. Column visibility is
  persisted in localStorage per table `id`.
- **Hooks own the pagination/search state.** The `DataTable` never manages its
  own page or search — it receives and reports via props.
- **Tab/status filters** pass a `statuses` array to the hook, which adds
  `?status=A,B,C` to the URL. The hook resets `page` to 1 on tab change.
- **Stat cards and tab counts** use the `all*` variants (unpaginated full
  lists) so they stay stable regardless of the current page or search.
- **Column definitions** for complex tables should be extracted to a feature
  component file (`features/<name>/components/<resource>-table-columns.tsx`)
  as a set of **column-builder factory functions**, each producing one
  `DataTableColumn<T>`. Factories that need page-scoped data (name lookups,
  etc.) take a small lookup function as a parameter rather than reaching into
  hooks themselves — keeping them pure and reusable across pages. A convenience
  hook (e.g. `useOrderColumns()`) may compose the standard set for one canonical
  page, but the factories themselves are the source of truth. See
  `features/orders/components/order-table-columns.tsx` for the canonical
  example: it exports `orderCodeColumn()`, `merchantColumn()`, `receiverColumn()`,
  `riderColumn()`, `parcelColumn()`, `warehouseColumn()`, `deliveryAddressColumn()`,
  `collectibleColumn()`, `notesColumn()`, and `statusColumn()`, which all six
  order-table pages import individually and compose into their own `columns`
  array. Page-specific columns (action menus, financial breakdowns, resolution
  notes) are not centralized — they stay inline in the page file.

### Order table patterns by role

All six order tables share the same `useOrders()` hook and column factories,
but each view composes a different subset of columns and applies different
tab/status filters suited to that role's workflow:

| View                     | File                                | Tabs / filter                              | Column set                                                                                                                                                                             | Actions                                     |
| ------------------------ | ----------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Admin orders**         | `app/dashboard/orders/page.tsx`     | PENDING · APPROVED · ALL                   | `useOrderColumns()` (all base columns) + inline actions                                                                                                                                | Approve (PENDING only), Cancel              |
| **Warehouse orders**     | `app/warehouse/orders/page.tsx`     | ALL · IN_PROGRESS · DELIVERED · EXCEPTIONS | `orderCodeColumn`, `merchantColumn`, `receiverColumn`, `warehouseColumn`, `deliveryAddressColumn`, `collectibleColumn`, `statusColumn`, `riderColumn(pickup)`, `riderColumn(delivery)` | Cancel only                                 |
| **Warehouse exceptions** | `app/warehouse/exceptions/page.tsx` | FAILED_ATTEMPT · RETURNED statuses         | Subset focused on delivery outcome                                                                                                                                                     | Failed delivery, Return actions             |
| **Rider pickup queue**   | `app/rider/pickup/page.tsx`         | TO_COLLECT · COLLECTED                     | Inline: order code, merchant, pickup location, parcel, warehouse, city, status                                                                                                         | Mark picked up (APPROVED only)              |
| **Rider delivery queue** | `app/rider/delivery/page.tsx`       | TO_DELIVER · COMPLETED                     | Inline: order code, recipient, delivery address, parcel, collectible, status                                                                                                           | Out for delivery, Delivered, Failed attempt |
| **Merchant overview**    | `app/merchant/page.tsx`             | None (client-filtered, unpaginated)        | Inline: tracking, pickup location, recipient, weight, delivery charge, collectible, notes, status                                                                                      | Cancel (PENDING only)                       |

Key differences to know when adding a column or action:

- **Merchant overview** uses `allOrders` (the full unpaginated list) filtered
  client-side to `currentMerchant.id`. It does **not** use `serverPaginated`
  — it is the one order table that paginates locally. Adding server-side
  pagination there would require a dedicated merchant-scoped API query.
- **Rider views** define all columns inline and intentionally omit financial
  columns (`collectibleColumn`, `securityMoney`) and admin-only columns.
  Don't pull `useOrderColumns()` into rider pages.
- **Warehouse orders** renders both pickup and delivery rider columns side by
  side via `riderColumn("pickup", riderName)` and
  `riderColumn("delivery", riderName)`. The Admin view uses `useOrderColumns()`
  which composes the same factories as a convenience hook.
- **Tab counts** on rider and warehouse views derive from `allOrders` (the
  full unfiltered fetch), so badge numbers stay stable while the user pages
  or searches. `setStatuses(...)` is called in a `useEffect` on tab change
  and always resets `page` to 1.
- **CSV export** is present only on the Admin orders table (`csvData` +
  `csv` props). Warehouse and rider tables omit it — those roles don't need
  a data export.

- **Mutations always target `KEY`**, the literal base-key string. The bound
  `mutate` from the base `useSWR` call already does this correctly — don't
  reroute it.
- **`_globalMutate` must use a filter function**, not a string prefix.
  SWR's `mutate` does prefix matching by default, so passing a bare key
  (e.g. `_globalMutate(KEY)`) will also revalidate unrelated hooks whose
  keys start with the same string. Use a filter to scope it:

  ```ts
  // Wrong — revalidates every SWR key that starts with "/api/team"
  _globalMutate(KEY)

  // Correct — only revalidates keys that exactly match "/api/team"
  _globalMutate((key: string) => key === KEY)
  ```

  This matters especially when a hook has multiple SWR subscriptions (e.g.
  `useTeam` has both a paginated key and an `allTeam` key — both use
  `/api/team` as a prefix).

---

## 3.5. Audit log (`lib/audit.ts`)

Every state-changing mutation made by an Admin or Super Admin (and, where a
role shares a write path with them — e.g. Warehouse Admin riders, RIDER order
transitions) should be recorded to the `audit_log` table through the single
entry point:

```ts
import { logAudit } from "@/lib/audit"

await logAudit({
  actor: { userId: me.userId, name: me.name, role: me.role },
  action: "MERCHANT_APPROVED", // SCREAMING_SNAKE_CASE verb
  entityType: "merchant", // lowercase, matches the schema table name
  entityId: updated.id,
  description: `Approved merchant ${updated.businessName}`, // human-readable, shown directly in the table
  metadata: { ... }, // optional structured context (old/new values, etc.)
})
```

Rules:

- **Call it after the write succeeds**, not before — never log an action that
  didn't actually happen (e.g. a guard rejected it, or the row wasn't found).
  In a `db.transaction()` flow, capture the committed row into a plain
  variable/object _inside_ the transaction callback and check it for
  non-null _after_ the transaction resolves, then log — don't log from
  inside the callback itself, since a transaction can still be rolled back
  by the caller after the callback returns.
- **`logAudit()` never throws.** A logging failure must not break the request
  it's describing — it only writes to `console.error`. Don't wrap calls in
  your own `try/catch`; the helper already swallows errors.
- **One call per mutation**, placed in the route file (or, for orders, in
  `applyOrderTransition` itself — that single hook covers all ten
  transitions, so don't add per-transition calls).
- `action` is a short machine-readable verb in `SCREAMING_SNAKE_CASE`,
  generally `<ENTITY>_<VERB>` (`WAREHOUSE_CREATED`, `RIDER_DEACTIVATED`,
  `PAYOUT_REJECTED`). `entityType` is the lowercase, singular table name
  (`merchant`, `payout_request`, `order`) — used for search/filtering, not
  shown directly to the reader.
- Resources that are purely merchant/rider self-service (e.g.
  `pickup_location`) are **not** audited — this trail exists to track actions
  _by_ the privileged roles, not every write in the system.

The trail itself is read-only and visible only to Admin and Super Admin, at
`/dashboard/audit-logs` (`app/api/audit-logs/route.ts`,
`features/audit-logs/hooks/use-audit-logs.ts`). It has no create/update/delete
UI — `logAudit()` is the only writer, by design.

---

## 3.6. API response helpers (`lib/api-response.ts`)

Every API route uses standardized response helpers instead of raw
`NextResponse.json()` for error responses:

```ts
import {
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  conflict,
} from "@/lib/api-response"

if (!me) return unauthorized()
if (me.role !== "ADMIN") return forbidden()
if (!row) return notFound()
```

Available helpers: `unauthorized()` (401), `forbidden(msg?)` (403),
`notFound(msg?)` (404), `badRequest(msg)` (400), `conflict(msg)` (409),
`serverError(msg?)` (500), `errorResponse(msg, status)` (generic).

Use `NextResponse.json()` only for **successful** responses (200, 201) and
custom error shapes (e.g. validation errors with a `rows` array). All 401/403/404
responses must go through these helpers.

### Rate limiting (`lib/rate-limit.ts`)

Write-heavy endpoints (order creation, bulk creation, payout requests, etc.)
are protected by a sliding-window rate limiter:

```ts
import { rateLimit, getClientIp } from "@/lib/rate-limit"

const ip = getClientIp(req)
const { allowed } = rateLimit(`orders:${ip}`, { windowMs: 60_000, max: 10 })
if (!allowed) return errorResponse("Too many requests", 429)
```

The rate limiter is in-memory (single-instance). For multi-instance
deployages, swap the internal `Map` for a Redis/Upstash store.

---

## 3.7. Confirmation dialogs (`components/confirm-dialog.tsx`)

Reusable confirmation dialog for destructive or semi-destructive actions
(approve, suspend, cancel, settle, etc.). It wraps `@base-ui/react/dialog`
and renders a title, description, action button with loading spinner, and
cancel button.

```tsx
import { ConfirmDialog } from "@/components/confirm-dialog"

;<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Approve merchant"
  description={`Approve "${merchant.businessName}"? They will gain access to the platform.`}
  confirmText="Approve"
  loading={submitting}
  onConfirm={async () => {
    setSubmitting(true)
    const res = await approveMerchant(merchant.id)
    setSubmitting(false)
    if (!res.ok) return toast.error(res.error)
    toast.success("Merchant approved.")
    setOpen(false)
  }}
/>
```

Props: `open`, `onOpenChange`, `title`, `description`, `confirmText`,
`variant` (`"default"` | `"destructive"`), `loading`, `onConfirm`.

Rules:

- Use `ConfirmDialog` for **any action that changes state** — never rely on
  the browser's built-in `window.confirm()`.
- Place the dialog state (`open`/`setOpen`) in the page or parent component
  that owns the triggering button. The dialog receives the state as props.
- Always pass `loading={submitting}` so the confirm button shows a spinner
  and is disabled during the API call.
- **Never** nest `ConfirmDialog` inside a `DropdownMenu` — close the menu
  first (via state) or trigger from a standalone button. Nested popovers
  break focus management.

### DropdownMenu action columns

Table action columns use `DropdownMenu` from `@base-ui/react/dropdown-menu`
for consistency. The pattern:

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

{
  id: "actions",
  header: "",
  align: "right",
  headClassName: "w-12",
  cell: (row) => (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => handleAction(row)}>
            <Pencil className="size-4" />
            Action label
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
}
```

Rules:

- Trigger is always `<MoreHorizontal>` icon in a ghost icon button.
- `align="end"` so the menu opens to the left of the trigger on narrow
  screens.
- `w-48` on the content for consistent width across all action menus.
- Items that open a destructive confirmation should close the menu first
  (via `onSelect` setting state) before showing the `ConfirmDialog`.

---

## 3.8. DataTable loading skeleton

The `DataTable` component accepts a `loading` boolean prop. When `true`, it
renders skeleton placeholder rows instead of data rows, matching the current
column layout:

```tsx
const { data, isLoading } = useSWR<PaginatedResponse<Thing>>(...)

<DataTable
  id="things"
  serverPaginated
  loading={isLoading}
  columns={columns}
  data={data}
  ...
/>
```

The skeleton uses `components/skeleton.tsx` (a `<div>` with a shimmer
animation via Tailwind). Each cell gets a skeleton `<div>` whose width is
proportional to a random fraction, so the loading state looks like real
content at a glance.

Rules:

- **Every `DataTable` must pass `loading={isLoading}`** from its SWR hook.
  This gives users immediate visual feedback while data fetches, instead of
  a blank table or a full-page spinner.
- The `loading` prop is distinct from `serverPaginated` — both can be true
  simultaneously (server-paginated table on initial load).
- Don't use the skeleton for sub-second transitions (tab switches on cached
  data) — SWR's `isLoading` is `true` only on the initial fetch or when the
  key changes, so it won't flicker on cached re-renders.

---

## 3.9. Switch toggle loading UI

Active-status switches (team members, divisions, warehouses) show a spinner
next to the switch while the API call is in flight:

```tsx
const [togglingId, setTogglingId] = useState<string | null>(null)

async function handleToggleActive(item: Thing) {
  setTogglingId(item.id)
  const res = await updateThing(item.id, { isActive: !item.isActive })
  setTogglingId(null)
  if (!res.ok) return toast.error(res.error)
  toast.success(`${item.name} ${item.isActive ? "disabled" : "enabled"}.`)
}

// In the column cell:
;<div className="flex items-center gap-2">
  <Switch
    checked={item.isActive}
    disabled={togglingId === item.id}
    onCheckedChange={() => handleToggleActive(item)}
  />
  {togglingId === item.id ? (
    <Loader2 className="text-muted-foreground size-3 animate-spin" />
  ) : (
    <Badge variant={item.isActive ? "default" : "secondary"}>
      {item.isActive ? "Active" : "Disabled"}
    </Badge>
  )}
</div>
```

Rules:

- Track which row is toggling with `togglingId` state (or equivalent).
- **Disable the switch** during the API call to prevent double-submits.
- Show a `<Loader2 className="animate-spin" />` spinner next to the switch,
  replacing the text label/badge. The spinner is `size-3` (12px) to stay
  proportional to the switch.
- **Do not wrap switches in `ConfirmDialog`** — switches are designed for
  quick toggles. If the action needs confirmation, use a button that opens
  the dialog instead.

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

### Upload rate limiting

`proxy.ts` runs as the edge proxy and rate-limits `POST /api/uploads` to 20
requests per minute per IP using an in-process sliding-window counter. For
multi-instance deployments, swap the in-memory `Map` for a Redis/Upstash store.
The matcher is configured in `proxy.ts`'s `config` export — don't widen it
without a reason.

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

Key env vars:

- `NEXT_PUBLIC_SITE_URL` — the app's canonical public URL for auth callbacks,
  SEO metadata, OG tags, and sitemaps. Falls back to `site.json` if unset.
- `VERCEL_PROJECT_NAME` — scopes preview deployment trusted origins in
  `lib/auth.ts`. Falls back to a broader `*.vercel.app` match if unset.

---

## 6. Email (`lib/mailer.ts`)

Transactional email goes through `sendMail()` from `lib/mailer.ts`. It uses
Gmail SMTP with retry/backoff. Every fully-resolved send (delivered, or all
retries exhausted) is recorded to the `email_log` table — this is the
Admin/Super Admin "Email logs" history at `/dashboard/email-logs`. Failed
sends are additionally stored in `failed_mail`, kept for any future
manual-resend tooling. HTML templates live in `lib/mail-templates.ts`.

```ts
import { sendMail } from "@/lib/mailer"

await sendMail({
  to: "user@example.com",
  subject: "Your order",
  html: template,
})
```

Never call nodemailer (or any SMTP client) directly outside `lib/mailer.ts`,
and never insert into `email_log` / `failed_mail` from anywhere else —
`sendMail()` is the only writer. The one allowed exception is
`app/api/email-logs/[id]/route.ts`, which lets an Admin/Super Admin manually
flip a `FAILED` row to `SENT` after confirming delivery or resending by hand —
that mutation calls `logAudit()` (see [§3.5](#35-audit-log-libaudits)) so the
override itself is traceable.

---

## 7. Site identity (`config/site.json` + `config/site.ts`)

Brand name, tagline, description, and icon live in `config/site.json`. Import the
typed `siteConfig` or the `SiteIcon` alias from `config/site.ts` — do not read
the JSON directly in components.

---

## 8. Recipes — step-by-step playbook

### Recipe A — Add a field to an existing entity

Example: the `rider.taskType` column added recently.

1. **Schema** — add the column in **both** `lib/db/schema.postgres.ts` and
   `lib/db/schema.turso.ts`. The postgres file uses pg-core types (`text`,
   `boolean`, `doublePrecision`, `jsonb`, …); the turso file uses sqlite-core
   equivalents (`text`, `integer`, `real`, `text({ mode: "json" })`, …).
   Use a `text(... { enum })` for enums and export the values array if the UI needs it:
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
7. **Seed** — add the field to the relevant seed file under `lib/db/seed/`
   (e.g. `lib/db/seed/riders.ts`).
8. **Apply the DB change** — see [Applying schema changes](#applying-schema-changes).

> If the column is `NOT NULL` and existing rows would violate it, either give it
> a `.default(...)` or backfill before pushing (the push will otherwise fail).

**Variant — a field on `profile` the user edits about themselves** (not a
resource entity): example, `profile.tableRowsPerPage`. The shape differs from
the above in three ways:

- There's no per-resource hook to extend — the field is read/written through
  `features/account/hooks/use-auth.tsx` and `app/api/users/me/route.ts`
  instead, alongside the existing name/avatar fields.
- `app/api/users/me/route.ts`'s `PATCH` writes to **two tables**
  (`user` for name/image, `profile` for everything else). Once a second field
  lives on `profile`, that handler is a genuine multi-table write — wrap it in
  `db.transaction()` per [§2's transaction subsection](#transaction-boundary--row-lock),
  even though today's UI only ever sends one field group per request.
- Skip the seed step if the column has a sane `.default(...)` — Drizzle
  applies it on insert when the seed script doesn't set the field explicitly,
  so there's nothing to backfill in `lib/db/seed/`.

### Recipe B — Add a brand-new resource (full CRUD)

Example structure to mirror: **divisions** (simple) or **merchants** (rich).

1. **Schema** — add the `pgTable` / `sqliteTable` in **both**
   `lib/db/schema.postgres.ts` and `lib/db/schema.turso.ts`, with `createId()` PK and
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
   - If this is a resource Admin/Super Admin manage (not pure
     merchant/rider self-service), call `logAudit()` after each write
     succeeds — see [§3.5](#35-audit-log-libaudits).
5. **Hook** — `features/things/hooks/use-things.ts`. Copy the shape of
   `use-divisions.ts`: SWR keyed on the API path (gated on `currentUser`),
   `data ?? []`, and `useCallback` mutations that do an optimistic
   `mutate(..., { revalidate: false })`. If the resource needs search/pagination,
   copy `use-orders.ts` instead and follow [§3's server-side search subsection](#server-side-search-and-pagination).
6. **UI** — a page (Recipe C) and dialogs (Recipe D).
7. **Seed** — add sample rows to the relevant file under `lib/db/seed/`.

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
   `FormDialog`. Every `<DataTable>` uses server-side pagination:

   ```tsx
   <DataTable
     id="warehouse-orders"
     serverPaginated
     columns={columns}
     data={orders}
     total={total}
     page={page}
     pageSize={limit}
     onPageChange={setPage}
     onPageSizeChange={setLimit}
     searchQuery={query}
     onSearchChange={setQuery}
     getRowKey={(o) => o.id}
   />
   ```

   - **`id`** — a unique string that enables column visibility settings
     (persisted to localStorage) and shows a settings gear in the toolbar.
   - **`serverPaginated`** — enables server-side pagination. The hook manages
     `page`, `limit`, `query`, and `statuses` state; the DataTable handles
     page navigation, search input, and CSV export via props.

   `DataTable`'s toolbar places the search input on the top-right and the
   settings gear + CSV download in the footer. Don't rebuild that layout per
   page. Don't pass a `pageSize` prop unless this table genuinely needs a
   different size than the rest of the app — it already defaults to the
   signed-in account's saved preference (Account settings → Tables, 1-250,
   default 20). An explicit `pageSize` is for deliberately small, fixed
   widgets (see the dashboard summary lists in `app/rider/page.tsx`,
   `pageSize={5}`), not a substitute for the account setting.

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
import { unauthorized, forbidden, notFound } from "@/lib/api-response"
import { db } from "@/lib/db"
import { thing } from "@/lib/db/schema"
import { thingCreateSchema, parseBody } from "@/lib/validation"
import {
  paginateResponse,
  parsePagination,
  parseStatusFilter,
} from "@/lib/pagination"
import { and, ilike, or } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()

  const { limit, offset } = parsePagination(req)
  const statuses = parseStatusFilter(req)

  // Scope role-limited readers server-side.
  let where = undefined
  if (me.role === "WAREHOUSE_ADMIN") {
    if (!me.warehouseId) return NextResponse.json(paginateResponse([], 0))
    // ...build the role-scoped where
  }

  // Optional free-text search, layered on top of the role-scoped where.
  const search = new URL(req.url).searchParams.get("q")?.trim()
  if (search) {
    const likeQ = `%${search}%`
    const searchClause = or(ilike(thing.name, likeQ) /* ...other fields */)
    where = where ? and(where, searchClause) : searchClause
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(thing)
    .where(where)
  const rows = await db
    .select()
    .from(thing)
    .where(where)
    .limit(limit)
    .offset(offset)
  return NextResponse.json(paginateResponse(rows, count, limit, offset))
}

export async function POST(req: Request) {
  const me = await requireSession()
  if (!me) return unauthorized()
  if (me.role !== "ADMIN" && me.role !== "SUPER_ADMIN") return forbidden()
  const parsed = await parseBody(req, thingCreateSchema)
  if (parsed.error) return parsed.error
  // ...insert + return NextResponse.json(created, { status: 201 })
}
```

Rules: `requireSession()` first; use `unauthorized()`/`forbidden()` for
auth errors; validate the body with `parseBody` + a zod schema; return the
created/updated row so the hook can update its cache. **`parseBody`
normalises a missing or unparseable request body to `{}`** before running the
schema — so schemas where every field is optional (e.g. `orderCancelSchema`)
parse successfully even when the client sends no body at all. This is a Zod 4
requirement: `z.object({...}).safeParse(undefined)` fails even if all fields
are optional, so the normalisation happens in `parseBody` rather than in each
schema. **If the
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
2. Add a route wrapper at `app/api/orders/[id]/<action>/route.ts`.
   Next.js 15 makes `params` a `Promise`, so you must await it before
   passing the id:

   ```ts
   import { applyOrderTransition } from "@/features/orders/transitions"

   export async function PATCH(
     req: Request,
     { params }: { params: Promise<{ id: string }> },
   ) {
     const { id } = await params
     return applyOrderTransition("<action>", id, req)
   }
   ```

3. Add a spec case in
   `app/api/orders/[id]/transitions.spec.ts`.
4. Expose it through `use-orders.ts` and the relevant UI.

Never duplicate the auth/parse/guard/update plumbing inline — the shared
runner already handles the transaction boundary and row lock (see
[§2](#transaction-boundary--row-lock)), so a new transition only needs to
define its `guard`/`buildUpdate`, never its own `db.transaction()` call. It's
also already audited: `applyOrderTransition` calls `logAudit()` once, after
the transaction commits, for every transition — add the new name's
human-readable label to `TRANSITION_LABELS` in `transitions.ts` and you're
done; don't add a second `logAudit()` call in the route wrapper.

---

## Applying schema changes

The DB connection string lives in `.env.development.local` (not `.env`). The
project uses `dotenv-cli` to load it when running DB scripts — the `db:push`,
`db:seed`, etc. npm scripts already include `dotenv -e .env.development.local`:

```bash
pnpm db:push
pnpm db:seed
```

If you need to run a raw command that requires the env, use `dotenv-cli`:

```bash
pnpm dotenv -e .env.development.local -- drizzle-kit push
```

**When you add or change a column, update both schema files** —
`lib/db/schema.postgres.ts` and `lib/db/schema.turso.ts`. They use different
type systems (pg-core vs sqlite-core) but must represent the same shape.

Provider-specific shortcuts:

```bash
# Push schema to the active DB
pnpm db:push:pg      # DB_PROVIDER=postgres
pnpm db:push:turso   # DB_PROVIDER=turso

# Generate migration files (for production migrations)
pnpm db:generate:pg
pnpm db:generate:turso

# Open Drizzle Studio (visual DB browser)
pnpm db:studio:pg
pnpm db:studio:turso
```

The plain `pnpm db:push` reads `DB_PROVIDER` from the environment and routes
to the correct dialect automatically.

- `pnpm db:push` applies the schema to the active database. A `NOT NULL` add
  fails if existing rows violate it — backfill first or give the column a default.
- The seed is **idempotent** — it skips rows that already exist. After changing
  seed values for existing ids, either reset the data or run a targeted `UPDATE`.
- `pnpm db:seed:min` runs the seed with a minimal dataset — useful for quick
  local setup when you don't need all 18 sample orders and full history.
- **After every schema edit**, run `pnpm db:check-sync` to confirm the two
  schema files stay in sync. The `pnpm check` convenience script runs
  typecheck, lint, format, `db:check-sync`, and repomix in one shot.

---

## Docker deployment

The `Dockerfile` produces a multi-stage, minimal image based on Node 22 Alpine.
`docker-compose.yml` runs two services: `web` (the Next.js app) and
`cloudflared` (Cloudflare Tunnel, for exposing the app without opening a public
port). Uploaded files are persisted in a named Docker volume (`uploads_data`)
mounted at `/app/uploads`.

```bash
# Build and start
docker compose up -d --build

# Rebuild after a code change
docker compose up -d --build web
```

Environment variables are loaded from `.env` (not `.env.development.local`).
Copy `.env.example` to `.env` and fill in your values before running.

The `CLOUDFLARE_TUNNEL_TOKEN` env var is required for the `cloudflared`
service. If you're running locally without a tunnel, you can remove the
`cloudflared` service block from `docker-compose.yml` or set the token to any
non-empty string to keep the rest of the compose file valid.

The tunnel hostname and routing rules live in `config.yml` — edit it to match
your actual Cloudflare Tunnel configuration.

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

---

## Testing

Tests run with Vitest. The config (`vitest.config.ts`) uses the **`node`
environment**, not jsdom — meaning browser globals like `window` and
`document` are not available by default. Component tests that need them
should set `@vitest-environment jsdom` in a file-level docblock, or use
`@testing-library/react` which handles the DOM environment itself via the
`test-setup.ts` cleanup hook.

Spec files follow the `*.{test,spec}.{ts,tsx}` glob and can live anywhere in
the tree. Current specs:

| File                                      | What it covers                                  |
| ----------------------------------------- | ----------------------------------------------- |
| `app/api/orders/[id]/transitions.spec.ts` | All 11 order transitions end-to-end             |
| `components/data-table.spec.tsx`          | DataTable rendering and column visibility       |
| `lib/csv.spec.ts`                         | CSV generation helpers                          |
| `lib/pricing.spec.ts`                     | Delivery charge and security money calculations |

Run the full suite with `pnpm test:run`. For watch mode during development,
`pnpm test` keeps Vitest running and re-runs affected tests on save.

---

## Verification checklist

Run all five before opening a PR — they must pass with zero errors:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint:check    # eslint . (read-only; use pnpm lint to auto-fix)
pnpm format:check  # prettier --check .
pnpm test:run      # vitest run (includes the order-transition spec suite)
pnpm build         # next build
```

You can also run `pnpm check` as a convenience — it chains typecheck, lint
(with `--fix`), format (with `--write`), `db:check-sync`, and repomix.
Use the individual `*:check` variants in CI so nothing is silently auto-fixed.

For anything user-visible, also verify in the browser: load the page, exercise
the primary path, and confirm the behavior works. A clean compile is **not**
proof the behavior is correct.
