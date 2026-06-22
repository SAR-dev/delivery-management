# Adding Code & Folders — Playbook

This is the step-by-step guide for adding or changing code in ParcelFlow.
`CONTRIBUTING.md` states the **principles** (feature folders, the order state
machine, per-resource SWR hooks); this document is the **recipes** that apply
them. Follow the recipe that matches your task, use the exact paths shown, and
finish with the [verification checklist](#verification-checklist).

> Golden rule: **find the closest existing example and mirror it.** This
> codebase is highly consistent — almost every new thing has a twin already in
> the tree. Search for it before writing anything new.

---

## Where things live (map)

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
config/content.ts                    page titles/descriptions (copy)
```

### Decision rules

- **Domain-specific code → `features/<name>/`.** Never put domain UI in
  `components/`. `components/` is only for generic building blocks (`data-table`,
  `page-header`, `form-dialog`, `stat-card-list`, `status-badge`, `ui/**`,
  `navigation/**`).
- **Entity types come from `lib/db/schema.ts`** and are re-exported through
  `lib/types.ts`. Do not hand-write an `Order`/`Rider`/etc. type. Only
  component-local Props/input shapes live in a feature.
- **A component is a flat `.tsx` file** until it has a _real_ local Props
  interface or constants — only then promote it to a folder with `index.tsx` +
  `types.ts`. Never create empty `types.ts`/`const.ts` files.
- **Read data only through `use-<resource>` hooks.** Never reintroduce
  `fetch()` + `useState`/`useEffect` loading plumbing in a component. (Only
  exception: the pre-auth `app/register` flow.)

---

## Recipe A — Add a field to an existing entity

Example: the `rider.taskType` column added recently.

1. **Schema** — add the column in `lib/db/schema.ts`. Use a `text(... { enum })`
   for enums and export the values array if the UI needs it:
   ```ts
   export const riderTaskTypes = ["PICKUP", "DELIVERY", "BOTH"] as const
   // ...
   taskType: text("taskType", { enum: riderTaskTypes }).notNull().default("DELIVERY")
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

---

## Recipe B — Add a brand-new resource (full CRUD)

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
   `data ?? []`, and `useCallback` mutations that do an optimistic `mutate(...,
{ revalidate: false })`.
6. **UI** — a page (Recipe C) and dialogs (Recipe D).
7. **Seed** — add sample rows to `lib/db/seed.ts`.

---

## Recipe C — Add a page / screen

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
   `FormDialog`.
5. **Add the nav entry** in `lib/nav-config.ts` under the correct role array
   (`href`, `label`, `icon`, `exact`). Pick an icon already imported there or
   add the import.

---

## Recipe D — Add a dialog (create/edit/confirm)

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

---

## Recipe E — Add a server endpoint (non-order)

Template — every handler starts the same way:

```ts
import { requireSession } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { thing } from "@/lib/db/schema"
import { thingCreateSchema, parseBody } from "@/lib/validation"
import { NextResponse } from "next/server"

export async function GET() {
  const me = await requireSession()
  if (!me) return NextResponse.json(null, { status: 401 })

  // Scope role-limited readers server-side.
  if (me.role === "WAREHOUSE_ADMIN") {
    if (!me.warehouseId) return NextResponse.json([])
    // ...filtered query
  }
  const rows = await db.select().from(thing)
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
return the created/updated row so the hook can update its cache.

---

## Recipe F — Add an order lifecycle action

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

Never duplicate the auth/parse/guard/update plumbing inline.

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

Run all four before considering a change done — they must pass with zero errors:

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test:run    # vitest run (includes the order-transition spec suite)
pnpm build       # next build
```

For anything user-visible, also verify in the browser (the `agent-browser`
skill): load the page, exercise the primary path, and screenshot it. A clean
compile is **not** proof the behavior works.
