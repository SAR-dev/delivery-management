# Contributing

This document describes the three architectural conventions that the codebase
follows after its structural refactor. New code should follow these patterns
rather than reverting to copy-paste plumbing or a central "god object".

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
`hooks/fetcher.ts` and `hooks/use-data-error.ts`, auth glue).

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

The shared runner `applyOrderTransition(name, req, ctx)` performs the identical
sequence for all of them: resolve session → authorize → parse body → load order
→ run guard → write update → return the updated order. **Route files are thin
wrappers** — they only name the transition:

```ts
// app/api/orders/[id]/approve/route.ts
import { applyOrderTransition } from "@/features/orders/transitions"
export const PATCH = (req, ctx) => applyOrderTransition("approve", req, ctx)
```

To add a lifecycle action: add one entry to `transitions`, add a one-line route
wrapper, and add a spec case in
`app/api/orders/[id]/__tests__/transitions.spec.ts`. Never duplicate the
auth/parse/guard/update plumbing inline.

## 3. Per-resource SWR hooks

There is **no global data context**. Each resource has a focused hook in
`features/<name>/hooks/use-<resource>.ts` built on SWR. A hook owns: the fetch
key, the typed data, loading/error state, any derived selectors, and the
mutation functions for that resource.

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

## Checks before opening a PR

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint .
pnpm test:run    # vitest run (includes the order-transition spec suite)
pnpm build       # next build
```

All four must pass with zero errors. The transition spec suite encodes the
exact API behavior — if a change there is intentional, update the spec in the
same PR; otherwise treat a failure as a regression.
