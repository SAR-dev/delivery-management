---
name: react-data-readiness-bugs
description: Use this skill when debugging UI flashes, premature "not found" / empty states, or fields briefly showing wrong/invalid values (e.g. red validation borders) in React pages that depend on context data loaded asynchronously (auth/session + a separate data-fetch effect). Common in this project's merchant/business pages and similar context-driven pages (platform-context.tsx, currentMerchant-style derived state). Covers two recurring root causes: (1) conflating "auth ready" with "data ready", and (2) initializing form state with empty defaults and syncing via useEffect instead of lazy useState init.
---

# React Data-Readiness & Render-Timing Bugs

Recurring bug family in this codebase: components assume data is available
at a point in the React render lifecycle where it isn't yet, causing brief
incorrect UI states (flashes) that self-correct a tick later.

## Pattern 1: "Not found" / empty state flashes before data loads

### Symptom

A "not found" (or similar empty-state) card briefly appears on fresh page
load before the real data renders.

### Root cause

Code only checks one readiness flag (e.g. `isReady`, which just means
auth/session bootstrap finished) but the actual data used to derive the
UI (e.g. `currentMerchant`, derived from a `merchants` array) comes from a
**separate** effect (`loadAll()`) that runs after `isReady` is already true.

Bad:

```tsx
if (!currentMerchant) {
  if (!isReady) return null
  // show not-found card  <-- fires while merchants array is still empty
}
```

Sequence that breaks it:

1. `bootstrap()` finishes → `isReady = true`
2. Render happens, `merchants = []` → `currentMerchant = null` → not-found shown
3. `loadAll()` finishes → `merchants` populated → `currentMerchant` resolves

### Fix

Add a second, explicit readiness flag that only flips true once the data
fetch itself completes (e.g. `isDataReady` in the shared context, set at
the end of a successful `loadAll()`). Gate rendering on **both** flags:

```tsx
if (!isReady || !isDataReady) return null
```

### How to spot it elsewhere

Search for guard clauses that branch on a single `isReady`/`loading` flag
to decide whether to show an empty/error/not-found state, where the value
being checked (`currentMerchant`, `currentX`) is actually derived from a
second async source. If there are two independent async sources (session
readiness vs. list-loading), there should be two flags, and both must be
true before any "empty" conclusion is rendered.

## Pattern 2: Form fields flash invalid/red on client-side navigation (but not on fresh reload)

### Symptom

Navigating to a page client-side (via router, not a full reload) makes
form inputs briefly show as invalid (red borders via `aria-invalid`, etc.)
before snapping to the correct values. A hard reload of the same page is
fine.

### Root cause

State is initialized with empty defaults, then populated in a `useEffect`
keyed on the data object:

```tsx
const [businessName, setBusinessName] = useState("")
useEffect(() => {
  if (!currentMerchant) return
  setBusinessName(currentMerchant.businessName)
}, [currentMerchant])
```

- Fresh reload: `currentMerchant` is `null` while data loads, so the form
  doesn't render yet. By the time it does, the effect already ran — no
  visible flash.
- Client-side nav: `currentMerchant` is already in context at mount time.
  The component renders immediately with the empty-string initial state,
  validation (`aria-invalid`) fires on the empty required fields, _then_
  the effect runs on the next tick and fixes it — producing a visible
  flash.

### Fix

Initialize state lazily from the already-available data instead of with
an empty default, using the function form of `useState`:

```tsx
const [businessName, setBusinessName] = useState(
  () => currentMerchant?.businessName ?? "",
)
const [email, setEmail] = useState(() => currentMerchant?.email ?? "")
const [phone, setPhone] = useState(() => currentMerchant?.phone ?? "")
const [address, setAddress] = useState(() => currentMerchant?.address ?? "")
```

The lazy initializer runs once at mount. If `currentMerchant` is already
populated at that point (client-side nav case), fields are correct from
the very first render — no empty-then-filled flash, no false
`aria-invalid`.

Keep the existing `useEffect` sync in place — it's still needed to update
the fields if `currentMerchant` changes _after_ the component has already
mounted (e.g. data refetch).

### How to spot it elsewhere

Look for `useState("")` / `useState(0)` / other empty-default
initializations on fields whose "real" value comes from a context/prop
that may already be populated at mount, paired with a `useEffect` that
only sets the value after the fact. Any such pair is a candidate for this
flash bug — convert the initializer to a lazy function that reads from
the source data immediately, and keep the effect only as a follow-up sync.

## General principle

Before trusting a "loading" or "ready" flag, check **what** it actually
guards. A single boolean often only covers one async dependency (e.g.
auth), while the rendered UI also depends on a second, independently
async piece of data (a list fetch, a context value populated post-mount).
Symptoms to watch for:

- Brief incorrect/empty/error UI on first paint that "self-heals" a moment later.
- Bug reproduces on client-side navigation but not on hard reload (or vice versa) — this asymmetry is the biggest tell that it's a render-timing issue, not a logic issue.
