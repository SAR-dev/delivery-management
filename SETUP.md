# ParcelFlow Setup Notes

Quick-load reference so the project can be bootstrapped fast in future chats.

## What this is

- **App:** ParcelFlow — B2B delivery / parcel management app.
- **Repo:** https://github.com/SAR-dev/delivery-management.git
- **Stack:** Next.js 16 (App Router) · Drizzle ORM · Better Auth · Tailwind v4 · shadcn · SWR · zod.
- **Database:** PostgreSQL (e.g. Neon) **or** Turso (SQLite) — switched via `DB_PROVIDER`.
- **Package manager:** `pnpm`.

## Choosing a database provider

Set `DB_PROVIDER` in your env file before running any `db:*` commands:

| `DB_PROVIDER` | Driver | Required vars |
|---|---|---|
| `postgres` (default) | `pg` | `POSTGRES_DATABASE_URL` |
| `turso` | `@libsql/client` | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |

## Required environment variables

### PostgreSQL (`DB_PROVIDER=postgres`)

```env
DB_PROVIDER=postgres
POSTGRES_DATABASE_URL=postgresql://user:pass@host:5432/dbname
BETTER_AUTH_SECRET=<generate below>
```

### Turso (`DB_PROVIDER=turso`)

```env
DB_PROVIDER=turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
BETTER_AUTH_SECRET=<generate below>
```

Generate `BETTER_AUTH_SECRET`:
```bash
printf "BETTER_AUTH_SECRET='%s'\n" "$(openssl rand -base64 32)" >> .env.development.local
```

> Note: db/seed scripts use `dotenv/config` which loads `.env`, NOT `.env.development.local`.
> So when running CLI commands, source the env file first (see below).

## Bootstrap steps (in order)

```bash
# 1. install deps
pnpm install

# 2. make env vars available to the CLI
set -a && . ./.env.development.local && set +a

# 3. push schema (use --force to skip the TTY confirmation prompt)
pnpm exec drizzle-kit push --force

# 4. seed data
pnpm db:seed
```

## Key files

- `lib/db/index.ts` — Drizzle client; reads `DB_PROVIDER` and initialises the correct driver.
- `lib/db/schema.ts` — re-exports the correct schema based on `DB_PROVIDER`.
- `lib/db/schema.postgres.ts` — PostgreSQL schema (pg-core types).
- `lib/db/schema.turso.ts` — SQLite/Turso schema (sqlite-core types).
- `lib/db/seed.ts` — seed script (~1200 lines), creates users via Better Auth.
- `lib/auth.ts` — Better Auth config; uses `pool` for postgres, `drizzleAdapter` for turso.
- `drizzle.config.ts` — drizzle-kit config; switches dialect based on `DB_PROVIDER`.
- `drizzle/postgres/` — PostgreSQL migration files.
- `drizzle/turso/` — Turso/SQLite migration files.

## Database schema (tables created by db:push)

`user`, `account`, `session`, `verification` (Better Auth), plus app tables:
`profile`, `warehouse`, `rider`, `merchant`, `pickup_location`, `security_config`,
`order`, `payout_request`.

## Seeded data (from db:seed)

Warehouses, riders, merchants, pickup locations, security config, users + profiles
(super admin, admins, warehouse admins, merchants, riders), 18 orders, 2 payout requests.

## Drizzle CLI — provider-specific shortcuts

```bash
# Push schema
pnpm db:push:pg       # DB_PROVIDER=postgres
pnpm db:push:turso    # DB_PROVIDER=turso

# Generate migrations
pnpm db:generate:pg
pnpm db:generate:turso

# Drizzle Studio
pnpm db:studio:pg
pnpm db:studio:turso
```

The plain `pnpm db:push` / `db:generate` / `db:studio` commands still work —
they read `DB_PROVIDER` from the environment.

## Gotchas

- `pnpm db:push` is interactive — use `pnpm exec drizzle-kit push --force` for non-interactive runs.
- Always `set -a && . ./.env.development.local && set +a` before running `db:*` scripts.
- Recursive `rm -rf` is blocked in this environment; use the Delete tool for file removal.
- The two schemas are separate files (`schema.postgres.ts` / `schema.turso.ts`) — keep them in sync when adding columns.
