# ParcelFlow

A B2B delivery and logistics management platform. It covers the full parcel lifecycle across four roles: admin, merchant, warehouse, and rider.

## Tech Stack

- **Next.js 16** (App Router) + React + TypeScript
- **PostgreSQL** (e.g. Neon) **or** **Turso** (SQLite) — switched via `DB_PROVIDER` env var
- **Drizzle ORM** for type-safe queries
- **Better Auth** for email + password authentication
- **Image uploads** (avatars, delivery proof, pickup-location photos) — stored on local disk or Cloudflare R2
- **Tailwind CSS** + shadcn/ui components

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

3. Choose a database provider and set the required vars:

   **PostgreSQL** (default — e.g. Neon):
   ```env
   DB_PROVIDER=postgres
   POSTGRES_DATABASE_URL=postgresql://user:pass@host:5432/dbname
   BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
   ```

   **Turso** (SQLite edge database):
   ```env
   DB_PROVIDER=turso
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-token
   BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
   ```

   Everything else in `.env.example` is either optional or has a safe default —
   see the comments there for R2 storage, mail, tunnel, etc. The app validates
   required vars on boot (`lib/env.ts`) and refuses to start with a clear error
   if something's missing.

4. Image uploads work out of the box with the default `STORAGE_PROVIDER=local` —
   files are written to `./uploads` (override with `LOCAL_UPLOADS_DIR`) and served from
   `app/uploads/[...path]/route.ts`. No extra setup needed.

5. Set up the database:

   ```bash
   pnpm db:push   # apply the schema
   pnpm db:seed   # load sample data
   ```

6. Start the dev server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

The commands you'll use day-to-day:

| Command | What it does |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm db:push` | Push schema to the active DB (reads `DB_PROVIDER`) |
| `pnpm db:push:pg` | Push schema — PostgreSQL only |
| `pnpm db:push:turso` | Push schema — Turso only |
| `pnpm db:seed` | Seed the database with sample data |

For everything else (build, lint, typecheck, format, test, generate migrations,
Drizzle Studio, etc.) see the full, current list in [`package.json`](./package.json)'s
`scripts` block — that's the source of truth, so it can't go stale here.

## Roles & Areas

| Role      | Area         | What they do                                                         |
| --------- | ------------ | -------------------------------------------------------------------- |
| Admin     | `/dashboard` | Orders, merchants, riders, payouts, team, reconciliation             |
| Merchant  | `/merchant`  | Create orders, track deliveries, request payouts                     |
| Warehouse | `/warehouse` | Intake, dispatch, order progress, hub riders, exceptions, cash recon |
| Rider     | `/rider`     | Pickup queue and delivery queue                                      |

### Riders

Every rider belongs to exactly one **home warehouse** and has a **task type**
that is independent of that warehouse:

| Task type  | Does                                      |
| ---------- | ----------------------------------------- |
| `PICKUP`   | Collects parcels from merchants           |
| `DELIVERY` | Runs the final-mile delivery from the hub |
| `BOTH`     | Handles either leg                        |

Admins see and manage the full rider roster and can reassign both a rider's
task type and home warehouse. Warehouse Admins see and manage only the riders
based at **their own hub** — they can edit details, task type, and active
status, but cannot move a rider to a different warehouse. These scopes are
enforced server-side in the rider API routes (Neon has no RLS).

Public order tracking is available at `/track`.

## Demo Logins

> **Note:** These accounts are created by `pnpm db:seed`. They are sample
> credentials for local development only — never use them in production.

After seeding, sign in at `/login` with any of the following:

| Role            | Name            | Email                      | Password        |
| --------------- | --------------- | -------------------------- | --------------- |
| Super Admin     | Nadia Rahman    | `superadmin@parcelflow.io` | `superadmin123` |
| Admin           | Tanvir Hossain  | `tanvir@parcelflow.io`     | `admin123`      |
| Admin           | Sadia Karim     | `sadia@parcelflow.io`      | `admin123`      |
| Warehouse Admin | Rifat Chowdhury | `rifat@parcelflow.io`      | `warehouse123`  |
| Warehouse Admin | Maliha Akter    | `maliha@parcelflow.io`     | `warehouse123`  |
| Merchant        | Imran Kabir     | `imran@threadline.com`     | `merchant123`   |
| Merchant        | Farzana Yasmin  | `farzana@greenleaf.com`    | `merchant123`   |
| Rider           | Jahangir Alam   | `jahangir@parcelflow.io`   | `rider123`      |
| Rider           | Shahin Mia      | `shahin@parcelflow.io`     | `rider123`      |
| Rider           | Rasel Khan      | `rasel@parcelflow.io`      | `rider123`      |
| Rider           | Kamrul Islam    | `kamrul@parcelflow.io`     | `rider123`      |

> Maliha Akter is seeded as an inactive account, useful for testing
> disabled-user handling.

## Project Structure

```
app/          Routes for each role + auth and tracking
  uploads/    Serves locally-stored uploaded files (local storage driver)
components/   Shared UI, including the reusable DataTable
lib/
  auth.ts     Better Auth config (uses pool for postgres, drizzleAdapter for turso)
  db/
    index.ts          Drizzle client — initialises pg or libsql based on DB_PROVIDER
    schema.ts         Re-exports the correct schema based on DB_PROVIDER
    schema.postgres.ts  PostgreSQL table definitions
    schema.turso.ts     SQLite/Turso table definitions
  storage/    Upload config + local-disk and R2 storage drivers
drizzle/
  postgres/   PostgreSQL migration files
  turso/      Turso/SQLite migration files
```

## Deployment notes

**Database provider** is selected at runtime via `DB_PROVIDER` in your `.env` file.
`docker-compose.yml` passes it through automatically and defaults to `postgres` if unset:

```env
# PostgreSQL
DB_PROVIDER=postgres
POSTGRES_DATABASE_URL=postgresql://user:pass@host:5432/dbname

# — or —

# Turso
DB_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

**Image uploads** are written to local disk under `LOCAL_UPLOADS_DIR` (defaults to
`./uploads`) and served by `app/uploads/[...path]/route.ts`. In Docker, this
directory is mounted as a named volume (`uploads_data`, see
`docker-compose.yml`) so uploaded files survive container rebuilds and
redeploys — without that volume, every redeploy would wipe avatars, delivery
proofs, and pickup-location photos.

If you run more than one app instance/container behind a load balancer, point
`LOCAL_UPLOADS_DIR` at a shared network volume so every instance sees the same
files, or switch to `STORAGE_PROVIDER=r2` (Cloudflare R2) which is inherently shared.
